import { GameEngine, TURN_STATES } from "../shared/engine.js";
import { BotAI } from "../shared/BotAI.js";
import { SAIGON_BOARD_DATA } from "../shared/data/board-data.js";

function generateToken() {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

export class GameRoom {
  constructor(roomId, options = {}) {
    this.id = roomId;
    this.status = "LOBBY"; // "LOBBY" | "PLAYING" | "FINISHED"
    this.hostId = null;
    this.clients = new Map(); // playerId -> { ws, info, reconnectToken, connected: boolean }
    this.engine = null;
    this.options = {
      isEndless: !!options.isEndless,
      fastMode: !!options.fastMode,
      turnTimeoutSec:
        Number(options.turnTimeoutSec) > 0
          ? Math.min(Math.max(Number(options.turnTimeoutSec), 1), 120)
          : 25,
      maxRounds: options.maxRounds
        ? Math.min(Math.max(Number(options.maxRounds), 10), 100)
        : null,
    };
    this.seed = options.seed || Math.floor(Math.random() * 0xffffffff);
    this.botTimer = null;
    this.turnTimer = null;
    this.cleanupTimer = null;
    this.turnDeadline = null;
    this.turnId = 1;
  }

  getPublicRoomInfo() {
    return {
      id: this.id,
      status: this.status,
      hostId: this.hostId,
      options: this.options,
      players: Array.from(this.clients.values()).map((c) => ({
        id: c.info.id,
        name: c.info.name,
        token: c.info.token,
        isBot: !!c.info.isBot,
        personality: c.info.personality,
        isReady: !!c.info.isReady,
        connected: c.connected,
      })),
      playerCount: this.clients.size,
    };
  }

  getMaskedState(rawState = this.engine?.state) {
    if (!rawState) return null;
    const { seed, chanceDeck, chestDeck, ...publicState } = rawState;
    return {
      ...publicState,
      chanceDeckRemaining: Array.isArray(chanceDeck) ? chanceDeck.length : 0,
      chestDeckRemaining: Array.isArray(chestDeck) ? chestDeck.length : 0,
    };
  }

  join(ws, { playerName, token, reconnectToken = null, isBot = false, personality = "balanced" }) {
    // 1. Kiểm tra tái kết nối (Reconnect)
    if (reconnectToken) {
      for (const [pId, client] of this.clients.entries()) {
        if (client.reconnectToken === reconnectToken) {
          client.ws = ws;
          client.connected = true;
          if (ws) ws.playerId = pId;

          if (this.cleanupTimer) {
            clearTimeout(this.cleanupTimer);
            this.cleanupTimer = null;
          }

          this.broadcast({
            type: "PLAYER_RECONNECTED",
            playerId: pId,
            name: client.info.name,
          });

          return {
            success: true,
            isReconnect: true,
            playerId: pId,
            reconnectToken: client.reconnectToken,
            room: this.getPublicRoomInfo(),
            gameState: this.engine ? this.getMaskedState() : null,
          };
        }
      }
    }

    if (this.status !== "LOBBY") {
      return { success: false, error: "Phòng đã bắt đầu trận đấu" };
    }

    if (this.clients.size >= 4) {
      return { success: false, error: "Phòng đã đầy (tối đa 4 người)" };
    }

    // Làm sạch và kiểm tra tên người chơi (chống XSS & khống chế tối đa 20 ký tự)
    let cleanName = typeof playerName === "string" ? playerName.replace(/[<>]/g, "").trim() : "";
    if (cleanName.length > 20) cleanName = cleanName.substring(0, 20);

    // Gán ID người chơi
    const existingIds = Array.from(this.clients.keys());
    let nextIndex = 1;
    while (existingIds.includes(`p${nextIndex}`)) nextIndex++;
    const playerId = `p${nextIndex}`;

    // Token bàn cờ Sài Gòn (cà phê sữa đá, nón lá, xe vespa, xích lô, ...)
    const availableTokens = [
      "token_coffee",
      "token_nonla",
      "token_motorbike",
      "token_xichlo",
      "token_banhmi",
      "token_hutieu",
      "token_boat",
    ].filter(
      (t) => !Array.from(this.clients.values()).some((c) => c.info.token === t),
    );
    const assignedToken = token || availableTokens[0] || "token_coffee";

    const newReconnectToken = generateToken();
    const isFirstPlayer = this.clients.size === 0;

    const clientData = {
      ws,
      connected: !isBot,
      reconnectToken: newReconnectToken,
      info: {
        id: playerId,
        name: cleanName || (isBot ? `Bot ${playerId}` : `Người chơi ${nextIndex}`),
        token: assignedToken,
        isBot: !!isBot,
        personality: isBot ? personality : null,
        isReady: isFirstPlayer || isBot, // Host và Bot mặc định ready
      },
    };

    if (isFirstPlayer) {
      this.hostId = playerId;
    }

    this.clients.set(playerId, clientData);
    if (ws) ws.playerId = playerId;

    this.broadcast({
      type: "ROOM_STATE",
      room: this.getPublicRoomInfo(),
      message: `${clientData.info.name} đã tham gia phòng`,
    });

    return {
      success: true,
      playerId,
      reconnectToken: newReconnectToken,
      room: this.getPublicRoomInfo(),
    };
  }

  addBot(personality = "balanced") {
    return this.join(null, {
      playerName: `Bot ${personality.toUpperCase()}`,
      isBot: true,
      personality,
    });
  }

  removeBot(botId) {
    if (this.status !== "LOBBY") return false;
    const client = this.clients.get(botId);
    if (client && client.info.isBot) {
      this.clients.delete(botId);
      this.broadcast({
        type: "ROOM_STATE",
        room: this.getPublicRoomInfo(),
        message: `Đã xóa ${client.info.name}`,
      });
      return true;
    }
    return false;
  }

  setReady(playerId, isReady) {
    const client = this.clients.get(playerId);
    if (!client || this.status !== "LOBBY") return false;
    client.info.isReady = !!isReady;
    this.broadcast({
      type: "ROOM_STATE",
      room: this.getPublicRoomInfo(),
    });
    return true;
  }

  leave(playerId) {
    const client = this.clients.get(playerId);
    if (!client) return;

    if (this.status === "LOBBY") {
      this.clients.delete(playerId);
      if (this.hostId === playerId) {
        const nextHost = this.clients.keys().next().value;
        this.hostId = nextHost || null;
      }
      this.broadcast({
        type: "ROOM_STATE",
        room: this.getPublicRoomInfo(),
        message: `${client.info.name} đã rời phòng`,
      });
    } else {
      // Trong trận: Đánh dấu mất kết nối, chuyển giao lượt cho BotAI tạm thời
      client.connected = false;
      this.broadcast({
        type: "PLAYER_DISCONNECTED",
        playerId,
        name: client.info.name,
      });

      // Nếu đang là lượt của người này -> Kích hoạt Bot tự đánh
      if (this.engine && this.engine.getCurrentPlayer()?.id === playerId) {
        this.scheduleBotTurn(1500);
      }
    }
  }

  startGame(requestingPlayerId) {
    if (this.status !== "LOBBY") {
      return { success: false, error: "Trận đấu đã bắt đầu rồi" };
    }
    if (this.hostId !== requestingPlayerId) {
      return { success: false, error: "Chỉ chủ phòng mới có quyền bắt đầu" };
    }
    if (this.clients.size < 2) {
      return { success: false, error: "Cần ít nhất 2 người chơi hoặc thêm bot" };
    }

    const unready = Array.from(this.clients.values()).find(
      (c) => !c.info.isReady,
    );
    if (unready) {
      return {
        success: false,
        error: `Còn người chơi (${unready.info.name}) chưa sẵn sàng!`,
      };
    }

    const playerConfigs = Array.from(this.clients.values()).map((c) => ({
      id: c.info.id,
      name: c.info.name,
      token: c.info.token,
      isBot: c.info.isBot,
      personality: c.info.personality,
    }));

    this.engine = new GameEngine(playerConfigs, {
      seed: this.seed,
      fastMode: this.options.fastMode,
      isEndless: this.options.isEndless,
      timestamp: () => new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    });

    this.turnId = 1;
    this.engine.state.turnId = this.turnId;

    this.status = "PLAYING";

    this.broadcast({
      type: "GAME_STARTED",
      state: this.getMaskedState(),
      room: this.getPublicRoomInfo(),
    });

    // Nếu người đầu tiên là bot -> bot tự đánh
    const firstPlayer = this.engine.getCurrentPlayer();
    if (firstPlayer.isBot) {
      this.scheduleBotTurn(1000);
    } else {
      this.resetTurnTimer();
    }

    return { success: true };
  }

  handleAction(playerId, action) {
    if (this.status !== "PLAYING" || !this.engine) {
      return { success: false, error: "Trận đấu chưa bắt đầu" };
    }

    const curPlayer = this.engine.getCurrentPlayer();

    // 1. Kiểm tra quyền thao tác theo lượt
    const turnOnlyActions = [
      "ROLL_DICE",
      "COMPLETE_MOVEMENT",
      "BUY_PROPERTY",
      "DECLINE_BUY",
      "END_TURN",
      "PAY_JAIL_FINE",
      "USE_JAIL_CARD",
      "CLOSE_CARD",
      "BUILD_HOUSE",
      "SELL_HOUSE",
      "MORTGAGE_PROPERTY",
      "UNMORTGAGE_PROPERTY",
    ];
    if (turnOnlyActions.includes(action.type) && curPlayer.id !== playerId) {
      return { success: false, error: "Chưa tới lượt của bạn" };
    }

    // 1b. Khóa an toàn mã lượt cho END_TURN (chống client gửi nhầm / timer cũ / lag mạng)
    if (action.type === "END_TURN" && action.turnId !== undefined && action.turnId !== this.turnId) {
      return { success: false, error: "Mã lượt không hợp lệ hoặc đã qua lượt" };
    }

    // 1c. Kiểm tra quyền sở hữu bất động sản (chống sửa đất người khác)
    if (["BUILD_HOUSE", "SELL_HOUSE", "MORTGAGE_PROPERTY", "UNMORTGAGE_PROPERTY"].includes(action.type)) {
      const tileProp = this.engine.state.properties[action.tileId];
      if (!tileProp || tileProp.owner !== playerId) {
        return { success: false, error: "Bạn không sở hữu bất động sản này" };
      }
    }

    // 1d. Kiểm tra quyền đấu giá (đúng người, đúng lượt)
    if (["BID_AUCTION", "PASS_AUCTION"].includes(action.type)) {
      if (!this.engine.state.auction) {
        return { success: false, error: "Không có phiên đấu giá nào đang diễn ra" };
      }
      action.playerId = playerId;
      if (
        this.engine.state.auction.currentTurnPlayerId &&
        this.engine.state.auction.currentTurnPlayerId !== playerId
      ) {
        return { success: false, error: "Chưa tới lượt bạn trong phiên đấu giá" };
      }
    }

    // 1e. Kiểm tra giao dịch: bắt buộc người khởi xướng (sender) phải là chính người gửi request
    if (action.type === "EXECUTE_TRADE") {
      const senderId = action.offer?.sender?.id || action.offer?.senderId;
      if (senderId !== playerId) {
        return { success: false, error: "Bạn chỉ có thể thực hiện đề nghị giao dịch do chính mình gửi" };
      }
    }

    // 2. Chống gian lận xúc xắc: Server tự sinh ngẫu nhiên qua engine.rng(), client không được bơm số
    if (action.type === "ROLL_DICE") {
      delete action.val1;
      delete action.val2;
    }

    // 3. Khử can thiệp vị trí: Tự động tính landing position hợp lệ trên server
    if (action.type === "COMPLETE_MOVEMENT") {
      const diceTotal = this.engine.state.lastRoll ? this.engine.state.lastRoll.total : 0;
      action.position = (curPlayer.position + diceTotal) % 40;
    }

    // 4. Kiểm tra nợ nần
    if (["PAY_DEBT", "AUTO_RESOLVE_DEBT", "CONCEDE_BANKRUPTCY"].includes(action.type)) {
      if (this.engine.state.pendingAction?.playerId !== playerId) {
        return { success: false, error: "Bạn không có khoản nợ này" };
      }
    }

    // 5. Áp dụng action vào Engine
    const result = this.engine.applyAction(action);
    if (!result.success) {
      return result;
    }

    // Tăng mã lượt nếu lượt đã hoàn thành
    if (result.event === "TURN_ENDED" || (action.type === "END_TURN" && result.success)) {
      this.turnId++;
      this.engine.state.turnId = this.turnId;
    }

    // Phát sóng kết quả action tới toàn bộ người trong phòng
    this.broadcast({
      type: "ACTION_RESULT",
      playerId,
      action,
      result,
      state: this.getMaskedState(),
    });

    // Kiểm tra kết thúc ván
    if (this.engine.state.isGameOver || result.event === "GAME_OVER_MAX_ROUNDS") {
      this.status = "FINISHED";
      this.clearTimers();
      this.broadcast({
        type: "GAME_OVER",
        winner: this.engine.state.winner,
        state: this.getMaskedState(),
      });
      return result;
    }

    // Xử lý lượt tiếp theo: nếu tới lượt bot hoặc người chơi mất kết nối -> Bot tự đánh
    const nextPlayer = this.engine.getCurrentPlayer();
    const nextClient = this.clients.get(nextPlayer.id);

    if (nextPlayer.isBot || (nextClient && !nextClient.connected)) {
      this.scheduleBotTurn(800);
    } else {
      this.resetTurnTimer();
    }

    return result;
  }

  scheduleBotTurn(delayMs = 800) {
    if (this.botTimer) clearTimeout(this.botTimer);
    this.botTimer = setTimeout(() => {
      this.executeBotStep();
    }, delayMs);
  }

  executeBotStep() {
    if (this.status !== "PLAYING" || !this.engine) return;
    const curPlayer = this.engine.getCurrentPlayer();
    const client = this.clients.get(curPlayer.id);
    const isAfkHuman = client && !client.connected;

    if (!curPlayer.isBot && !isAfkHuman) return;

    const turnState = this.engine.state.turnState;
    const pending = this.engine.state.pendingAction;

    if (turnState === TURN_STATES.WAIT_ROLL) {
      if (curPlayer.inJail) {
        if (curPlayer.hasJailCard) {
          this.handleAction(curPlayer.id, { type: "USE_JAIL_CARD" });
          return;
        }
        if (curPlayer.money >= 500_000 && curPlayer.jailTurns >= 2) {
          this.handleAction(curPlayer.id, { type: "PAY_JAIL_FINE" });
          return;
        }
      }
      this.handleAction(curPlayer.id, { type: "ROLL_DICE" });
      return;
    }

    if (turnState === TURN_STATES.ROLLING || turnState === TURN_STATES.MOVING) {
      const diceTotal = this.engine.state.lastRoll ? this.engine.state.lastRoll.total : 0;
      const targetPos = (curPlayer.position + diceTotal) % 40;
      this.handleAction(curPlayer.id, { type: "COMPLETE_MOVEMENT", position: targetPos });
      return;
    }

    if (turnState === TURN_STATES.ACTION_REQUIRED && pending) {
      if (pending.type === "BUY_PROMPT") {
        const tile = pending.tile;
        const decision = BotAI.shouldBuyProperty(curPlayer, tile, this.engine.state);
        const actionType = decision.shouldBuy && pending.canAfford ? "BUY_PROPERTY" : "DECLINE_BUY";
        this.handleAction(curPlayer.id, { type: actionType });
        return;
      }

      if (pending.type === "CARD_PROMPT") {
        this.handleAction(curPlayer.id, { type: "CLOSE_CARD" });
        return;
      }

      if (pending.type === "DEBT_PROMPT") {
        this.handleAction(curPlayer.id, { type: "AUTO_RESOLVE_DEBT" });
        return;
      }
    }

    if (turnState === TURN_STATES.END_TURN) {
      // 1. Bot cân nhắc chuộc đất bị thế chấp nếu có dư tiền an toàn
      if (curPlayer.isBot) {
        const unmortgageTargets = BotAI.getUnmortgageDecisions(curPlayer, this.engine.state);
        if (unmortgageTargets && unmortgageTargets.length > 0) {
          const tileId = unmortgageTargets[0];
          this.handleAction(curPlayer.id, { type: "UNMORTGAGE_PROPERTY", tileId });
          return;
        }
      }

      // 2. Bot cân nhắc xây nhà trước khi hết lượt
      if (curPlayer.isBot && curPlayer.money > 1_500_000) {
        const buildTargets = BotAI.getBuildDecisions(curPlayer, this.engine.state);
        if (buildTargets && buildTargets.length > 0) {
          const tileId = buildTargets[0];
          this.handleAction(curPlayer.id, { type: "BUILD_HOUSE", tileId });
          return;
        }
      }

      this.handleAction(curPlayer.id, { type: "END_TURN", turnId: this.turnId });
    }
  }

  resetTurnTimer() {
    this.clearTimers();
    const timeoutSec = this.options.turnTimeoutSec || 25;
    this.turnDeadline = Date.now() + timeoutSec * 1000;

    this.turnTimer = setTimeout(() => {
      this.handleTurnTimeout();
    }, timeoutSec * 1000);
  }

  handleTurnTimeout() {
    if (this.status !== "PLAYING" || !this.engine) return;
    const curPlayer = this.engine.getCurrentPlayer();
    const pending = this.engine.state.pendingAction;

    // Timeout fallback action
    if (pending && pending.defaultAction) {
      this.handleAction(curPlayer.id, pending.defaultAction);
      if (this.engine.state.turnState === TURN_STATES.END_TURN) {
        this.handleAction(curPlayer.id, { type: "END_TURN", turnId: this.turnId });
      }
    } else if (this.engine.state.turnState === TURN_STATES.WAIT_ROLL) {
      this.handleAction(curPlayer.id, { type: "ROLL_DICE" });
    } else if (
      this.engine.state.turnState === TURN_STATES.ROLLING ||
      this.engine.state.turnState === TURN_STATES.MOVING
    ) {
      const diceTotal = this.engine.state.lastRoll
        ? this.engine.state.lastRoll.total
        : 0;
      const targetPos = (curPlayer.position + diceTotal) % 40;
      this.handleAction(curPlayer.id, {
        type: "COMPLETE_MOVEMENT",
        position: targetPos,
      });
    } else if (this.engine.state.turnState === TURN_STATES.ACTION_REQUIRED) {
      if (pending?.type === "BUY_PROMPT") {
        this.handleAction(curPlayer.id, { type: "DECLINE_BUY" });
      } else if (pending?.type === "DEBT_PROMPT") {
        this.handleAction(curPlayer.id, { type: "AUTO_RESOLVE_DEBT" });
      } else if (pending?.type === "CARD_PROMPT") {
        this.handleAction(curPlayer.id, { type: "CLOSE_CARD" });
      }
      if (this.engine.state.turnState === TURN_STATES.END_TURN) {
        this.handleAction(curPlayer.id, { type: "END_TURN", turnId: this.turnId });
      }
    } else if (this.engine.state.turnState === TURN_STATES.END_TURN) {
      this.handleAction(curPlayer.id, { type: "END_TURN", turnId: this.turnId });
    }
  }

  clearTimers() {
    if (this.botTimer) {
      clearTimeout(this.botTimer);
      this.botTimer = null;
    }
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  broadcast(message, excludePlayerId = null) {
    const payload = typeof message === "string" ? message : JSON.stringify(message);
    for (const [playerId, client] of this.clients.entries()) {
      if (excludePlayerId && playerId === excludePlayerId) continue;
      if (client.ws && client.ws.readyState === 1) { // 1 = OPEN
        try {
          client.ws.send(payload);
        } catch (e) {
          console.error(`Lỗi gửi tin tới ${playerId}:`, e.message);
        }
      }
    }
  }

  sendTo(playerId, message) {
    const client = this.clients.get(playerId);
    if (client && client.ws && client.ws.readyState === 1) {
      const payload = typeof message === "string" ? message : JSON.stringify(message);
      try {
        client.ws.send(payload);
      } catch (e) {
        console.error(`Lỗi gửi tin tới ${playerId}:`, e.message);
      }
    }
  }
}

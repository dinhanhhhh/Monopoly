/**
 * main.js - Tích hợp đầy đủ GameEngine, Cockpit Dashboard 3 Cột, AI Bot & Dock Điều Khiển
 */

import { SAIGON_BOARD_DATA } from "../../shared/data/board-data.js";
import { GameEngine } from "../../shared/engine.js";
import { GameRules } from "../../shared/rules.js";
import { formatVND } from "../../shared/constants.js";
import { BotAI } from "../../shared/BotAI.js";
import { BoardRenderer } from "./render/BoardRenderer.js";
import { GAME_TOKENS } from "./render/TokensData.js";
import { TokenRenderer } from "./render/TokenRenderer.js";
import { DiceRenderer } from "./render/DiceRenderer.js";
import { HUD } from "./ui/HUD.js";
import { TitleDeedModal } from "./ui/TitleDeedModal.js";
import { CardModal } from "./ui/CardModal.js";
import { AuctionModal } from "./ui/AuctionModal.js";
import { TradeModal } from "./ui/TradeModal.js";
import { GameSetupModal } from "./ui/GameSetupModal.js";
import { RulebookModal } from "./ui/RulebookModal.js";
import { JailModal } from "./ui/JailModal.js";
import { PortfolioModal } from "./ui/PortfolioModal.js";
import { CardDeckModal } from "./ui/CardDeckModal.js";
import { AchievementManager } from "./ui/AchievementManager.js";
import { MatchRecapModal } from "./ui/MatchRecapModal.js";
import { VintageRadioWidget } from "./ui/VintageRadioWidget.js";
import { DebtResolutionModal } from "./ui/DebtResolutionModal.js";
import { sound } from "./audio/SoundEffects.js";
import { getPlayerAvatar } from "./render/AvatarsData.js";

function initGameApp() {
  const boardElement = document.getElementById("monopoly-board");

  if (!boardElement) {
    console.error("Không tìm thấy bàn cờ!");
    return;
  }

  // Khởi tạo các Modal
  const titleDeedModal = new TitleDeedModal();
  const cardModal = new CardModal();
  const debtResolutionModal = new DebtResolutionModal();
  const auctionModal = new AuctionModal();
  const tradeModal = new TradeModal();
  const gameSetupModal = new GameSetupModal();
  const rulebookModal = new RulebookModal();
  const jailModal = new JailModal();
  const portfolioModal = new PortfolioModal();
  const cardDeckModal = new CardDeckModal();
  const achievementManager = new AchievementManager({ sound });
  const matchRecapModal = new MatchRecapModal();
  const vintageRadio = new VintageRadioWidget();

  let netWorthHistory = [];

  // Khởi tạo HUD 2 cánh
  const hud = new HUD(
    document.getElementById("sidebar-left"),
    document.getElementById("sidebar-right"),
  );

  let engine = null;
  let boardRenderer = new BoardRenderer(boardElement);
  boardRenderer.render(SAIGON_BOARD_DATA);
  let tokenRenderer = null;
  let diceRenderer = null;

  // Các nút điều khiển Dock
  const btnBuy = document.getElementById("btn-action-buy");
  const btnBuild = document.getElementById("btn-action-build");
  const btnTrade = document.getElementById("btn-action-trade");
  const btnPass = document.getElementById("btn-action-pass");
  const btnRoll = document.getElementById("btn-roll");

  // Banner ô đang đứng
  const standingNameEl = document.getElementById("standing-tile-name");
  const standingPriceEl = document.getElementById("standing-tile-price");
  const standingStatusEl = document.getElementById("standing-tile-status");

  // Game log
  const logContainer = document.getElementById("game-log-messages");
  let savedLogs = [];

  // Timer
  let secondsElapsed = 0;
  let timerInterval = null;
  let turnCount = 1;

  function formatMoney(amount, withSign = false) {
    return formatVND(amount, withSign);
  }

  let lastGameLogMsg = "";
  function addGameLog(message, player = null, record = true) {
    if (!logContainer || !message) return;
    const cleanMsg = message.trim();
    if (cleanMsg === lastGameLogMsg) return; // Loại bỏ dòng trùng lặp
    lastGameLogMsg = cleanMsg;

    const curPlayer = player || (engine ? engine.getCurrentPlayer() : null);
    const pIdx =
      curPlayer && engine ? engine.state.players.indexOf(curPlayer) : 0;
    const avatarInfo = curPlayer
      ? getPlayerAvatar(curPlayer.id, pIdx >= 0 ? pIdx : 0)
      : getPlayerAvatar("p1", 0);

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    if (record) {
      savedLogs.push({
        message: cleanMsg,
        playerId: curPlayer?.id || "p1",
        pIdx: pIdx >= 0 ? pIdx : 0,
        timeStr,
      });
      if (savedLogs.length > 35) savedLogs.shift();
    }

    const item = document.createElement("div");
    item.className = "log-entry-row";
    item.innerHTML = `
      <div class="log-avatar-thumb">
        ${avatarInfo.svg}
      </div>
      <div class="log-entry-content">
        <div class="log-entry-text">${cleanMsg}</div>
        <div class="log-entry-time">${timeStr}</div>
      </div>
    `;

    logContainer.prepend(item);
    while (logContainer.children.length > 35) {
      logContainer.removeChild(logContainer.lastChild);
    }
  }

  function startTimer(initialSeconds = 0) {
    if (timerInterval) clearInterval(timerInterval);
    secondsElapsed = initialSeconds;
    const timerEl = document.getElementById("game-timer");
    const updateDisplay = () => {
      const mins = String(Math.floor(secondsElapsed / 60)).padStart(2, "0");
      const secs = String(secondsElapsed % 60).padStart(2, "0");
      if (timerEl) timerEl.textContent = `${mins}:${secs}`;
    };
    updateDisplay();
    timerInterval = setInterval(() => {
      secondsElapsed++;
      updateDisplay();
    }, 1000);
  }

  /**
   * Lưu lại một lát cắt tài sản ròng của tất cả người chơi cho biểu đồ Infographic
   */
  function recordNetWorthSnapshot() {
    if (!engine || !engine.state || !engine.state.players) return;
    const snapshot = { turn: turnCount, values: {} };
    engine.state.players.forEach((p) => {
      snapshot.values[p.id] = GameRules.calculateNetWorth(
        p,
        engine.state.properties,
      );
    });
    netWorthHistory.push(snapshot);
    if (netWorthHistory.length > 80) {
      netWorthHistory.shift();
    }
  }

  /**
   * Tự động lưu trạng thái ván cờ vào LocalStorage
   */
  function autoSaveGame() {
    if (!engine || !engine.state) return;
    const activePlayers = (engine.state.players || []).filter(
      (p) => !p.isBankrupt,
    );
    if (activePlayers.length <= 1) {
      try {
        localStorage.removeItem("monopoly_saigon_save");
      } catch (e) {}
      return;
    }
    const cleanState = JSON.parse(JSON.stringify(engine.state));
    // Nếu lưu lúc xúc xắc đang lăn hoặc đang di chuyển, đặt lại thành chờ lắc xúc xắc
    if (
      cleanState.turnState === "ROLLING" ||
      cleanState.turnState === "MOVING"
    ) {
      cleanState.turnState = "WAIT_ROLL";
    }
    const saveData = {
      state: cleanState,
      turnCount,
      secondsElapsed,
      netWorthHistory,
      savedLogs,
      savedAt: Date.now(),
    };
    try {
      localStorage.setItem("monopoly_saigon_save", JSON.stringify(saveData));
    } catch (err) {
      console.warn("Lỗi khi lưu ván chơi vào LocalStorage:", err);
    }
  }

  /**
   * Hiệu ứng tiền bay nổi (Floating Cash Badge)
   */
  function showFloatingCash(playerId, amount) {
    if (!amount || amount === 0) return;
    const isGain = amount > 0;
    const sign = isGain ? "+" : "-";
    const absVal = Math.abs(amount);
    const text = `${sign}${formatMoney(absVal)}`;

    // 1. Bay lên từ thẻ người chơi ở Cột Trái (HUD)
    const hudCard = document.getElementById(`hud-player-${playerId}`);
    if (hudCard) {
      const rect = hudCard.getBoundingClientRect();
      const badge = document.createElement("div");
      badge.className = `floating-cash-badge ${isGain ? "gain" : "loss"}`;
      badge.textContent = text;
      badge.style.left = `${rect.left + rect.width / 2 - 40}px`;
      badge.style.top = `${rect.top + 8}px`;
      document.body.appendChild(badge);
      setTimeout(() => badge.remove(), 1600);
    }

    // 2. Bay lên từ quân cờ trên bàn cờ
    const tokenEl = tokenRenderer?.tokenElements?.[playerId];
    if (tokenEl) {
      const tRect = tokenEl.getBoundingClientRect();
      const tBadge = document.createElement("div");
      tBadge.className = `floating-cash-badge ${isGain ? "gain" : "loss"}`;
      tBadge.textContent = text;
      tBadge.style.left = `${tRect.left + tRect.width / 2 - 40}px`;
      tBadge.style.top = `${tRect.top - 12}px`;
      document.body.appendChild(tBadge);
      setTimeout(() => tBadge.remove(), 1600);
    }
  }

  /**
   * Kích hoạt bong bóng biểu cảm động (Emote bubble) đồng thời trên quân cờ & HUD avatar
   * @param {string} playerId
   * @param {string} emoji
   * @param {number} duration
   */
  function triggerPlayerEmote(playerId, emoji, duration = 2600) {
    if (tokenRenderer && tokenRenderer.showEmote) {
      tokenRenderer.showEmote(playerId, emoji, duration);
    }
    if (hud && hud.showEmote) {
      hud.showEmote(playerId, emoji, duration);
    }
  }

  function updateStandingBanner(tile, statusText = "") {
    if (!tile) return;
    if (standingNameEl) standingNameEl.textContent = tile.name;
    const dotEl = document.querySelector(".cockpit-tile-dot");
    if (standingPriceEl) {
      if (tile.id === 20) {
        standingPriceEl.textContent = `Hũ: ${formatMoney(engine?.state?.jackpotPot || 1_000_000)}`;
        standingPriceEl.style.display = "inline";
        if (dotEl) dotEl.style.display = "inline";
      } else if (tile.price) {
        standingPriceEl.textContent = formatMoney(tile.price);
        standingPriceEl.style.display = "inline";
        if (dotEl) dotEl.style.display = "inline";
      } else {
        standingPriceEl.textContent = "";
        standingPriceEl.style.display = "none";
        if (dotEl) dotEl.style.display = "none";
      }
    }
    if (standingStatusEl) {
      standingStatusEl.textContent = "";
      standingStatusEl.style.display = "none";
    }
  }

  function updateDeckCounts() {
    const chanceCountEl = document.getElementById("chance-deck-count");
    const chestCountEl = document.getElementById("chest-deck-count");
    if (chanceCountEl && engine?.state?.chanceDeck) {
      chanceCountEl.textContent = `${engine.state.chanceDeck.length} thẻ`;
    }
    if (chestCountEl && engine?.state?.chestDeck) {
      chestCountEl.textContent = `${engine.state.chestDeck.length} thẻ`;
    }
  }

  function resetDockActions() {
    if (btnBuy) {
      btnBuy.disabled = true;
      btnBuy.querySelector(".act-title").textContent = "Mua Đất";
      btnBuy.onclick = null;
    }
    if (btnPass) {
      btnPass.disabled = true;
      btnPass.onclick = null;
    }
  }

  /**
   * Xem chi tiết Bằng Khoán & thực hiện các hành động Xây nhà / Thế chấp
   */
  function inspectTileDeed(tile, targetPlayer = null) {
    if (!["property", "railroad", "utility"].includes(tile.type)) return;
    const currentPlayer = targetPlayer || engine.getCurrentPlayer();
    const owner = engine.getOwner(tile.id);
    const propState = engine.state.properties[tile.id] || {};
    const isOwner = owner && owner.id === currentPlayer.id;

    const buildCheck = isOwner
      ? GameRules.canBuildHouse(tile, currentPlayer, engine.state.properties)
      : null;
    const sellCheck = isOwner
      ? GameRules.canSellHouse(tile, currentPlayer, engine.state.properties)
      : null;
    const mortgageCheck = isOwner
      ? GameRules.canMortgage(tile, currentPlayer, engine.state.properties)
      : null;
    const unmortgageCheck = isOwner
      ? GameRules.canUnmortgage(tile, currentPlayer, engine.state.properties)
      : null;

    titleDeedModal.show(tile, {
      isBuyPrompt: false,
      player: currentPlayer,
      owner,
      propState,
      buildCheck,
      sellCheck,
      mortgageCheck,
      unmortgageCheck,
      onBuild: () => {
        const res = engine.applyAction({
          type: "BUILD_HOUSE",
          tileId: tile.id,
        });
        if (res.success) {
          boardRenderer.updateBuildings(
            engine.state.properties,
            engine.state.players,
          );
          hud.update(engine.state, handleShowPortfolio);
          sound.playBuildHouse();
          showFloatingCash(currentPlayer.id, -tile.houseCost);
          triggerPlayerEmote(currentPlayer.id, "😎", 2600);
          addGameLog(res.message);
          showToast(res.message);
          autoSaveGame();
        }
      },
      onSell: () => {
        const res = engine.applyAction({ type: "SELL_HOUSE", tileId: tile.id });
        if (res.success) {
          boardRenderer.updateBuildings(
            engine.state.properties,
            engine.state.players,
          );
          hud.update(engine.state, handleShowPortfolio);
          showFloatingCash(currentPlayer.id, Math.floor(tile.houseCost / 2));
          addGameLog(res.message);
          showToast(res.message);
          autoSaveGame();
        }
      },
      onMortgage: () => {
        const res = engine.applyAction({
          type: "MORTGAGE_PROPERTY",
          tileId: tile.id,
        });
        if (res.success) {
          boardRenderer.updateOwners(
            engine.state.properties,
            engine.state.players,
          );
          hud.update(engine.state, handleShowPortfolio);
          addGameLog(res.message);
          showToast(res.message);
          autoSaveGame();
        }
      },
      onUnmortgage: () => {
        const res = engine.applyAction({
          type: "UNMORTGAGE_PROPERTY",
          tileId: tile.id,
        });
        if (res.success) {
          boardRenderer.updateOwners(
            engine.state.properties,
            engine.state.players,
          );
          hud.update(engine.state, handleShowPortfolio);
          addGameLog(res.message);
          showToast(res.message);
          autoSaveGame();
        }
      },
    });
  }

  /**
   * Bật modal Danh mục tài sản khi bấm vào thẻ người chơi ở Cột Trái
   */
  function handleShowPortfolio(player) {
    if (!player || !engine) return;
    portfolioModal.show(player, engine.state, (tile) => {
      inspectTileDeed(tile, player);
    });
  }

  /**
   * Khởi tạo giao diện bàn cờ, xúc xắc và các sự kiện điều khiển
   */
  function initGameInfrastructure() {
    // 1. Render bàn cờ & sự kiện click vào ô
    boardRenderer = new BoardRenderer(boardElement);
    boardRenderer.render(SAIGON_BOARD_DATA, (tile) => {
      // Nếu modal giao dịch đang mở -> click ô trên bàn cờ để nhặt/bỏ ô đất vào gói giao dịch
      if (tradeModal && tradeModal.isOpen) {
        tradeModal.handleTileClick(tile.id);
        return;
      }

      if (["property", "railroad", "utility"].includes(tile.type)) {
        inspectTileDeed(tile);
      } else if (tile.id === 10) {
        const currentPlayer = engine.getCurrentPlayer();
        if (currentPlayer.inJail && !currentPlayer.isBot) {
          showJailOptions(currentPlayer);
        }
      }
    });

    // 2. Render quân cờ
    tokenRenderer = new TokenRenderer(boardElement);
    tokenRenderer.render(engine.state.players);

    // 3. Khởi tạo Xúc xắc
    diceRenderer = new DiceRenderer(
      null,
      async ({ val1, val2, total, isDoubles }) => {
        await handleDiceRolled(val1, val2, total, isDoubles);
      },
      () => {
        sound.playDiceRoll();
      },
    );

    // Nút Giao Dịch
    if (btnTrade) {
      btnTrade.onclick = () => {
        tradeModal.show(engine, (tradeRes) => {
          if (tradeRes) {
            if (tradeRes.success) {
              boardRenderer.updateOwners(
                engine.state.properties,
                engine.state.players,
              );
              hud.update(engine.state);
              achievementManager.recordTradeSuccess();
              achievementManager.check(engine.state);
              autoSaveGame();
            }
            if (tradeRes.message) {
              addGameLog(tradeRes.message);
              showToast(tradeRes.message);
            }
          }
        });
      };
    }

    // Nút Bật / Tắt Âm Thanh
    const btnSound = document.getElementById("btn-toggle-sound");
    if (btnSound) {
      btnSound.textContent = sound.isMuted ? "🔇" : "🔊";
      btnSound.onclick = () => {
        const isAudioOn = sound.toggleMute();
        vintageRadio.synthesizer.setMute(!isAudioOn);
        btnSound.textContent = isAudioOn ? "🔊" : "🔇";
        showToast(isAudioOn ? "🔊 Đã bật âm thanh" : "🔇 Đã tắt âm thanh");
        if (isAudioOn) sound.playSaigonHorn();
      };
    }

    // Nút Bật / Tắt Đài Radio Cát-xét Sài Gòn trên Header
    const btnOpenRadio = document.getElementById("btn-open-radio");
    if (btnOpenRadio) {
      btnOpenRadio.onclick = () => {
        vintageRadio.toggleOpen();
      };
    }

    // Nút Sổ Tay Luật Chơi
    const btnRulebook = document.getElementById("btn-open-rulebook");
    if (btnRulebook) {
      btnRulebook.onclick = () => rulebookModal.show();
    }

    // Nút Phòng Trưng Bày Cúp & Thành Tựu
    const btnAchievements = document.getElementById("btn-open-achievements");
    if (btnAchievements) {
      btnAchievements.onclick = () => achievementManager.showModal();
    }

    // Nút Tạo Ván Mới trên Header
    const btnRestart = document.getElementById("btn-restart-game");
    if (btnRestart) {
      btnRestart.onclick = () => gameSetupModal.show(startNewGame, resumeGame);
    }

    // Click khay thẻ CƠ HỘI & KHÍ VẬN ở trung tâm bàn cờ -> Mở Bảng tra cứu & Lịch sử
    const slotChance = document.getElementById("slot-chance");
    if (slotChance) {
      slotChance.onclick = () => {
        sound.playCardDraw();
        cardDeckModal.show("chance", engine.state);
      };
    }

    const slotChest = document.getElementById("slot-chest");
    if (slotChest) {
      slotChest.onclick = () => {
        sound.playCardDraw();
        cardDeckModal.show("chest", engine.state);
      };
    }

    updateDeckCounts();

    // Nạp module công cụ Dev & Test nếu file tồn tại ở Local (Được .gitignore bảo vệ, không bao giờ lên GitHub)
    import("./dev/dev-tools.js")
      .then((devModule) => {
        devModule.setupDevTools({
          getEngine: () => engine,
          hud,
          boardRenderer,
          tokenRenderer,
          sound,
          showToast,
          addGameLog,
          autoSaveGame,
          resolveLanding,
          showJailOptions,
          showGameOverModal,
          auctionModal,
          triggerPlayerEmote,
        });
      })
      .catch(() => {
        // Môi trường Production / GitHub: Không có thư mục dev/, bỏ qua an toàn tuyệt đối
      });
  }

  /**
   * Bắt đầu một ván chơi mới
   */
  function startNewGame(playersConfig, options = {}) {
    engine = new GameEngine(playersConfig, options);
    window.engine = engine;
    window.hud = hud;
    hud.update(engine.state, handleShowPortfolio);
    turnCount = 1;
    const turnCountEl = document.getElementById("game-turn-count");
    if (turnCountEl) turnCountEl.textContent = turnCount;

    startTimer(0);
    savedLogs = [];
    if (logContainer) logContainer.innerHTML = "";

    achievementManager.resetProgress();
    netWorthHistory = [];
    recordNetWorthSnapshot();

    if (options.fastMode) {
      addGameLog(
        "⚡ Chế độ Chơi Nhanh kích hoạt: Đã phát ngẫu nhiên 3 BĐS cho mỗi người chơi!",
      );
      showToast("⚡ Chế độ Chơi Nhanh: Đã phát sẵn đất để chiến nhau ngay!");
    } else {
      addGameLog("Ván cờ bắt đầu! Chúc các cơ thủ may mắn!");
    }

    initGameInfrastructure();

    boardRenderer.updateOwners(engine.state.properties, engine.state.players);
    boardRenderer.updateBuildings(
      engine.state.properties,
      engine.state.players,
    );
    tokenRenderer.render(engine.state.players);
    boardRenderer.updateJackpot(engine.state.jackpotPot);

    updateStandingBanner(SAIGON_BOARD_DATA[0], "Vị trí xuất phát");

    autoSaveGame();
    checkBotTurn();
  }

  /**
   * Tiếp tục ván chơi từ LocalStorage
   */
  function resumeGame(savedData) {
    engine = new GameEngine();
    engine.state = savedData.state;
    // Đảm bảo turnState không bị kẹt ở trạng thái chuyển động
    if (
      engine.state.turnState === "ROLLING" ||
      engine.state.turnState === "MOVING"
    ) {
      engine.state.turnState = "WAIT_ROLL";
    }
    window.engine = engine;
    window.hud = hud;
    hud.update(engine.state, handleShowPortfolio);

    turnCount = savedData.turnCount || 1;
    const turnCountEl = document.getElementById("game-turn-count");
    if (turnCountEl) turnCountEl.textContent = turnCount;

    startTimer(savedData.secondsElapsed || 0);

    netWorthHistory = savedData.netWorthHistory || [];
    if (!netWorthHistory.length) {
      recordNetWorthSnapshot();
    }

    initGameInfrastructure();

    // Khôi phục quyền sở hữu và công trình nhà/khách sạn trên bàn cờ
    boardRenderer.updateOwners(engine.state.properties, engine.state.players);
    boardRenderer.updateBuildings(
      engine.state.properties,
      engine.state.players,
    );
    tokenRenderer.render(engine.state.players);
    boardRenderer.updateJackpot(engine.state.jackpotPot);

    const curP = engine.getCurrentPlayer();
    const curPos = curP ? curP.position : 0;
    const curTile = SAIGON_BOARD_DATA[curPos] || SAIGON_BOARD_DATA[0];
    updateStandingBanner(
      curTile,
      curP && curP.inJail ? "Đang ở buồng giam" : "Vị trí hiện tại",
    );

    // Khôi phục toàn bộ lịch sử đấu từ ván trước
    if (logContainer && savedData.savedLogs && savedData.savedLogs.length) {
      savedLogs = [...savedData.savedLogs];
      logContainer.innerHTML = "";
      savedLogs.forEach((item) => {
        const avatarInfo = getPlayerAvatar(
          item.playerId || "p1",
          item.pIdx || 0,
        );
        const div = document.createElement("div");
        div.className = "log-entry-row";
        div.innerHTML = `
          <div class="log-avatar-thumb">${avatarInfo.svg}</div>
          <div class="log-entry-content">
            <div class="log-entry-text">${item.message}</div>
            <div class="log-entry-time">${item.timeStr || ""}</div>
          </div>
        `;
        logContainer.prepend(div);
      });
    }

    addGameLog(`📂 Tiếp tục ván chơi trước (Lượt ${turnCount})!`);
    showToast(`📂 Đã tiếp tục ván đấu thành công!`);

    autoSaveGame();
    checkBotTurn();
  }

  /**
   * Xử lý sau khi xúc xắc hoàn thành lắc
   */
  async function handleDiceRolled(val1, val2, total, isDoubles) {
    const currentPlayer = engine.getCurrentPlayer();
    const rollResult = engine.applyAction({ type: "ROLL_DICE", val1, val2 });

    if (!rollResult.success) {
      showToast(`⚠️ ${rollResult.error}`);
      return;
    }

    addGameLog(
      `🎲 ${currentPlayer.name} đổ ${val1} + ${val2} = ${total} bước.`,
    );

    if (rollResult.event === "JAIL_THREE_DOUBLES" || rollResult.steps === 0) {
      tokenRenderer.render(engine.state.players);
      hud.update(engine.state);
      addGameLog(rollResult.message);
      showToast(rollResult.message);
      triggerPlayerEmote(currentPlayer.id, "😭", 3000);
      if (rollResult.event === "JAIL_THREE_DOUBLES") sound.playJail();
      finishTurn(isDoubles);
      return;
    }

    if (rollResult.event === "JAIL_FREE_DOUBLES") {
      triggerPlayerEmote(currentPlayer.id, "😎", 2600);
      achievementManager.check(engine.state, {
        event: "JAIL_DOUBLES_ESCAPE",
        playerId: currentPlayer.id,
      });
    }

    // Nhảy từng ô một
    await tokenRenderer.moveStepByStep(
      currentPlayer,
      total,
      engine.state.players,
      {
        onStep: () => {
          sound.playTokenStep();
        },
        onPassedGo: (p) => {
          p.money += 2_000_000;
          hud.update(engine.state);
          sound.playCoin();
          showFloatingCash(p.id, 2_000_000);
          triggerPlayerEmote(p.id, "🥳", 2400);
          sound.speakSaigon("Lãnh lương hai triệu nha!");
          addGameLog(
            `🎉 ${p.name} qua Khởi Hành: ${formatVND(2_000_000, true)}!`,
          );
          showToast(
            `🎉 ${p.name} qua Khởi Hành: ${formatVND(2_000_000, true)}!`,
          );
        },
        onComplete: async (p, landingPos) => {
          await resolveLanding(p, landingPos, isDoubles);
        },
      },
    );
  }

  /**
   * Xử lý giải quyết hiệu ứng ô khi người chơi hạ cánh (dùng chung cho mọi kiểu di chuyển)
   */
  async function resolveLanding(p, landingPos, isDoubles = false) {
    p.position = landingPos;
    tokenRenderer.render(engine.state.players);
    const landResult = engine.applyAction({
      type: "COMPLETE_MOVEMENT",
      position: landingPos,
    });
    hud.update(engine.state);

    const currentTile = SAIGON_BOARD_DATA[landingPos];

    // A. Ô Cơ Hội / Khí Vận
    if (landResult.event === "CARD_DRAWN") {
      sound.playCardDraw();
      updateDeckCounts();
      updateStandingBanner(
        currentTile,
        `Rút thẻ ${landResult.cardType === "chance" ? "Cơ Hội" : "Khí Vận"}`,
      );

      const onCardClosed = async () => {
        engine.applyAction({ type: "CLOSE_CARD" });
        tokenRenderer.render(engine.state.players);
        hud.update(engine.state);
        if (landResult.result?.message) {
          addGameLog(landResult.result.message);
          showToast(landResult.result.message);
        }

        // Nếu thẻ di chuyển người chơi sang ô mới (tiến/lùi/ô gần nhất/vào tù)
        if (landResult.result && landResult.result.moveTarget !== undefined) {
          const newPos = landResult.result.moveTarget;
          tokenRenderer.render(engine.state.players);
          await resolveLanding(p, newPos, isDoubles);
        } else if (p.inJail) {
          finishTurn(false);
        } else {
          finishTurn(isDoubles);
        }
      };

      if (p.isBot) {
        cardModal.show(landResult.cardType, landResult.card, landResult.result);
        setTimeout(async () => {
          cardModal.hide();
          await onCardClosed();
        }, 1800);
      } else {
        cardModal.show(
          landResult.cardType,
          landResult.card,
          landResult.result,
          async () => {
            await onCardClosed();
          },
        );
      }
    }
    // B. Ô Đất Trống -> Mua đất hoặc Đấu giá
    else if (landResult.event === "BUY_PROMPT") {
      updateStandingBanner(currentTile, "Đất trống - Có thể mua!");

      if (p.isBot) {
        // Bot tự đánh giá
        const decision = BotAI.shouldBuyProperty(
          p,
          landResult.tile,
          engine.state,
        );
        if (decision.shouldBuy) {
          const buyRes = engine.applyAction({ type: "BUY_PROPERTY" });
          boardRenderer.updateOwners(
            engine.state.properties,
            engine.state.players,
          );
          hud.update(engine.state);
          sound.playSuccess();
          showFloatingCash(p.id, -landResult.tile.price);
          triggerPlayerEmote(p.id, "😎", 2600);
          addGameLog(`🤖 ${p.name} đã mua ${landResult.tile.name}!`);
          showToast(`🤖 ${p.name} đã mua ${landResult.tile.name}!`);
          achievementManager.check(engine.state);
          setTimeout(() => finishTurn(isDoubles), 1000);
        } else {
          addGameLog(`🤖 ${p.name} bỏ qua mua đất. Bắt đầu đấu giá!`);
          startAuctionFlow(landResult.tile, isDoubles);
        }
      } else {
        // Kích hoạt nút Mua Đất & Bỏ Qua ngay trên thanh Dock!
        if (btnBuy) {
          btnBuy.disabled = false;
          btnBuy.querySelector(".act-title").textContent =
            `Mua (${formatMoney(currentTile.price)})`;
          btnBuy.onclick = () => {
            const buyRes = engine.applyAction({ type: "BUY_PROPERTY" });
            resetDockActions();
            if (buyRes.success) {
              boardRenderer.updateOwners(
                engine.state.properties,
                engine.state.players,
              );
              hud.update(engine.state);
              sound.playSuccess();
              showFloatingCash(p.id, -currentTile.price);
              triggerPlayerEmote(p.id, "😎", 2600);
              addGameLog(buyRes.message);
              showToast(buyRes.message);
              achievementManager.check(engine.state);
            }
            finishTurn(isDoubles);
          };
        }
        if (btnPass) {
          btnPass.disabled = false;
          btnPass.querySelector(".act-title").textContent = "Đấu Giá";
          btnPass.onclick = () => {
            resetDockActions();
            addGameLog(`🔨 ${p.name} bỏ qua mua đất. Bắt đầu đấu giá!`);
            startAuctionFlow(landResult.tile, isDoubles);
          };
        }

        // Đồng thời bật TitleDeedModal nếu muốn xem chi tiết
        titleDeedModal.show(landResult.tile, {
          isBuyPrompt: true,
          player: p,
          onBuy: () => {
            resetDockActions();
            const buyRes = engine.applyAction({ type: "BUY_PROPERTY" });
            if (buyRes.success) {
              boardRenderer.updateOwners(
                engine.state.properties,
                engine.state.players,
              );
              hud.update(engine.state);
              sound.playSuccess();
              showFloatingCash(p.id, -landResult.tile.price);
              triggerPlayerEmote(p.id, "😎", 2600);
              addGameLog(buyRes.message);
              showToast(buyRes.message);
              achievementManager.check(engine.state);
            }
            finishTurn(isDoubles);
          },
          onDecline: () => {
            resetDockActions();
            addGameLog(`🔨 ${p.name} bỏ qua mua đất. Bắt đầu đấu giá!`);
            startAuctionFlow(landResult.tile, isDoubles);
          },
        });
      }
    }
    // C. Tiền thuê đất
    else if (landResult.event === "RENT_PAID") {
      updateStandingBanner(
        currentTile,
        `Đã trả ${formatMoney(landResult.rent)} tiền thuê`,
      );
      if (landResult.liquidated) {
        boardRenderer.updateBuildings(
          engine.state.properties,
          engine.state.players,
        );
        boardRenderer.updateOwners(
          engine.state.properties,
          engine.state.players,
        );
      }
      sound.playCoin();
      showFloatingCash(p.id, -landResult.rent);
      if (landResult.owner) {
        showFloatingCash(landResult.owner.id, landResult.rent);
        triggerPlayerEmote(landResult.owner.id, "🤑", 2600);
      }
      const rentEmote = landResult.rent >= 3_000_000 ? "😡" : "😭";
      triggerPlayerEmote(p.id, rentEmote, 2800);
      if (landResult.rent >= 3_000_000) {
        sound.speakSaigon("Trả tiền mệt xỉu luôn nghen!");
      }
      addGameLog(landResult.message);
      showToast(landResult.message);
      setTimeout(() => finishTurn(isDoubles), 1400);
    }
    // D. Nổ Hũ Quỹ Trúng Thưởng (Jackpot)
    else if (landResult.event === "JACKPOT_WON") {
      updateStandingBanner(
        currentTile,
        `🎰 NỔ HŨ: +${formatMoney(landResult.amount)}!`,
      );
      boardRenderer.updateJackpot(engine.state.jackpotPot);
      sound.playSuccess();
      sound.playCoin();
      showFloatingCash(p.id, landResult.amount);
      triggerPlayerEmote(p.id, "🤑", 3200);
      engine.state.players.forEach((other) => {
        if (other.id !== p.id && !other.isBankrupt) {
          triggerPlayerEmote(other.id, "😭", 2500);
        }
      });
      sound.speakSaigon("Lụm trọn hũ vàng rồi nghen!");
      addGameLog(landResult.message);
      showToast(landResult.message);
      achievementManager.check(engine.state, {
        event: "JACKPOT_COLLECTED",
        playerId: p.id,
        previousMoney: p.money - landResult.amount,
        jackpotAmount: landResult.amount,
      });
      setTimeout(() => finishTurn(isDoubles), 1600);
    }
    // E. Ô Thuế
    else if (landResult.event === "TAX_PAID") {
      updateStandingBanner(currentTile, "Nộp thuế vào Quỹ Trúng Thưởng");
      if (landResult.liquidated) {
        boardRenderer.updateBuildings(
          engine.state.properties,
          engine.state.players,
        );
        boardRenderer.updateOwners(
          engine.state.properties,
          engine.state.players,
        );
      }
      boardRenderer.updateJackpot(engine.state.jackpotPot);
      sound.playCoin();
      const taxAmt = landResult.taxAmount || currentTile.amount || 1_000_000;
      showFloatingCash(p.id, -taxAmt);
      triggerPlayerEmote(p.id, "😭", 2400);
      addGameLog(landResult.message);
      showToast(landResult.message);
      setTimeout(() => finishTurn(isDoubles), 1400);
    }
    // F. Vào tù
    else if (landResult.event === "GO_TO_JAIL") {
      updateStandingBanner(currentTile, "🚨 Bị bắt vào buồng giam");
      sound.playJail();
      sound.speakSaigon("Vô bốt ngồi nghen!");
      triggerPlayerEmote(p.id, "😭", 3000);
      tokenRenderer.render(engine.state.players);
      addGameLog(landResult.message);
      showToast(landResult.message);
      setTimeout(() => finishTurn(false), 1400);
    }
    // F2. Thiếu tiền mặt nợ tiền (DEBT_REQUIRED)
    else if (landResult.event === "DEBT_REQUIRED") {
      updateStandingBanner(
        currentTile,
        `⚠️ Cảnh báo nợ: Thiếu ${formatMoney(landResult.deficit)}!`,
      );
      sound.playJail();
      sound.speakSaigon("Thiếu tiền mặt rồi, mau xoay xở đi nghen!");
      triggerPlayerEmote(p.id, "😭", 3500);
      addGameLog(landResult.message);
      showToast(landResult.message);

      const refreshDebtModal = () => {
        try {
          debtResolutionModal.show({
            player: engine.getCurrentPlayer(),
            amount: landResult.amount,
            debtType: landResult.debtType,
            creditor: landResult.creditor,
            tile: landResult.tile,
            state: engine.state,
            onAutoLiquidate: () => {
              const res = engine.applyAction({ type: "AUTO_RESOLVE_DEBT" });
              if (res.success) {
                boardRenderer.updateBuildings(
                  engine.state.properties,
                  engine.state.players,
                );
                boardRenderer.updateOwners(
                  engine.state.properties,
                  engine.state.players,
                );
                hud.update(engine.state, handleShowPortfolio);
                if (res.event === "DEBT_RESOLVED") {
                  debtResolutionModal.hide();
                  sound.playSuccess();
                  showFloatingCash(p.id, -landResult.amount);
                  if (landResult.creditor) {
                    showFloatingCash(landResult.creditor.id, landResult.amount);
                  }
                  addGameLog(res.message);
                  showToast(res.message);
                  setTimeout(() => finishTurn(isDoubles), 1400);
                } else {
                  refreshDebtModal();
                }
              } else {
                showToast(res.error || "Không thể tự động giải cứu");
              }
            },
            onMortgage: (tId) => {
              const res = engine.applyAction({
                type: "MORTGAGE_PROPERTY",
                tileId: tId,
              });
              if (res.success) {
                boardRenderer.updateOwners(
                  engine.state.properties,
                  engine.state.players,
                );
                hud.update(engine.state, handleShowPortfolio);
                sound.playCoin();
                addGameLog(res.message);
                showToast(res.message);
                refreshDebtModal();
              } else {
                showToast(res.error || "Không thể thế chấp ô đất");
              }
            },
            onSellHouse: (tId) => {
              const res = engine.applyAction({
                type: "SELL_HOUSE",
                tileId: tId,
              });
              if (res.success) {
                boardRenderer.updateBuildings(
                  engine.state.properties,
                  engine.state.players,
                );
                hud.update(engine.state, handleShowPortfolio);
                sound.playCoin();
                addGameLog(res.message);
                showToast(res.message);
                refreshDebtModal();
              } else {
                showToast(res.error || "Không thể bán nhà");
              }
            },
            onPayDebt: () => {
              const res = engine.applyAction({ type: "PAY_DEBT" });
              if (res.success) {
                debtResolutionModal.hide();
                sound.playSuccess();
                showFloatingCash(p.id, -landResult.amount);
                if (landResult.creditor) {
                  showFloatingCash(landResult.creditor.id, landResult.amount);
                }
                hud.update(engine.state, handleShowPortfolio);
                addGameLog(res.message);
                showToast(res.message);
                setTimeout(() => finishTurn(isDoubles), 1400);
              } else {
                showToast(res.error || "Chưa đủ tiền thanh toán!");
              }
            },
            onConcede: () => {
              debtResolutionModal.hide();
              const res = engine.applyAction({ type: "CONCEDE_BANKRUPTCY" });
              if (res.success) {
                updateStandingBanner(currentTile, `💀 ${p.name} đã Phá Sản!`);
                boardRenderer.updateOwners(
                  engine.state.properties,
                  engine.state.players,
                );
                tokenRenderer.render(engine.state.players);
                hud.update(engine.state);
                sound.playJail();
                triggerPlayerEmote(p.id, "😭", 3500);
                addGameLog(res.message);
                showToast(res.message);
                if (res.winner) {
                  triggerPlayerEmote(res.winner.id, "😎", 4000);
                  showGameOverModal(res.winner);
                } else {
                  setTimeout(() => finishTurn(false), 1600);
                }
              }
            },
          });
        } catch (err) {
          console.error("Lỗi khi mở modal nợ:", err);
        }
      };

      refreshDebtModal();
    }
    // G. Phá sản
    else if (landResult.event === "BANKRUPTCY") {
      updateStandingBanner(
        currentTile,
        `💀 ${landResult.bankruptPlayer.name} đã Phá Sản!`,
      );
      boardRenderer.updateOwners(engine.state.properties, engine.state.players);
      tokenRenderer.render(engine.state.players);
      hud.update(engine.state);
      sound.playJail();
      sound.speakSaigon("Cháy túi rồi bà con ơi!");
      triggerPlayerEmote(landResult.bankruptPlayer.id, "😭", 3500);
      addGameLog(landResult.message);
      showToast(landResult.message);
      if (landResult.winner) {
        triggerPlayerEmote(landResult.winner.id, "😎", 4000);
        achievementManager.check(engine.state, {
          event: "GAME_WON",
          winnerId: landResult.winner.id,
        });
        showGameOverModal(landResult.winner);
      } else {
        setTimeout(() => finishTurn(false), 1400);
      }
    }
    // H. Ô an toàn
    else {
      updateStandingBanner(currentTile, "Nghỉ chân an toàn");
      setTimeout(() => finishTurn(isDoubles), 1000);
    }
  }

  /**
   * Quản lý phiên đấu giá
   */
  function startAuctionFlow(tile, isDoubles) {
    const auctionStart = engine.applyAction({
      type: "START_AUCTION",
      tileId: tile.id,
    });
    if (!auctionStart.success) {
      engine.applyAction({ type: "DECLINE_BUY" });
      finishTurn(isDoubles);
      return;
    }

    const processAuctionStep = () => {
      auctionModal.render(engine, (auctionEndRes) => {
        boardRenderer.updateOwners(
          engine.state.properties,
          engine.state.players,
        );
        hud.update(engine.state);
        if (auctionEndRes.winner) {
          triggerPlayerEmote(auctionEndRes.winner.id, "😎", 2800);
        }
        addGameLog(auctionEndRes.message);
        showToast(auctionEndRes.message);
        finishTurn(isDoubles);
      });

      const auction = engine.state.auction;
      if (!auction) return;

      const currentBidder = engine.state.players.find(
        (p) => p.id === auction.currentTurnPlayerId,
      );
      if (currentBidder && currentBidder.isBot) {
        setTimeout(() => {
          if (!engine.state.auction) return;
          const decision = BotAI.getAuctionDecision(
            currentBidder,
            engine.state.auction,
            engine.state,
          );
          if (decision.action === "BID") {
            const bidRes = engine.applyAction({
              type: "BID_AUCTION",
              playerId: currentBidder.id,
              amount: decision.amount,
            });
            if (bidRes.event === "AUCTION_COMPLETED") {
              auctionModal.showResult(bidRes, () => {
                boardRenderer.updateOwners(
                  engine.state.properties,
                  engine.state.players,
                );
                hud.update(engine.state);
                if (bidRes.winner) {
                  triggerPlayerEmote(bidRes.winner.id, "😎", 2800);
                }
                addGameLog(bidRes.message);
                showToast(bidRes.message);
                finishTurn(isDoubles);
              });
              return;
            }
          } else {
            const passRes = engine.applyAction({
              type: "PASS_AUCTION",
              playerId: currentBidder.id,
            });
            if (
              passRes.event === "AUCTION_COMPLETED" ||
              passRes.event === "AUCTION_CANCELLED"
            ) {
              auctionModal.showResult(passRes, () => {
                boardRenderer.updateOwners(
                  engine.state.properties,
                  engine.state.players,
                );
                hud.update(engine.state);
                if (passRes.winner) {
                  triggerPlayerEmote(passRes.winner.id, "😎", 2800);
                }
                addGameLog(passRes.message);
                showToast(passRes.message);
                finishTurn(isDoubles);
              });
              return;
            }
          }
          processAuctionStep();
        }, 900);
      }
    };

    processAuctionStep();
  }

  /**
   * Kết thúc lượt
   */
  function finishTurn(isDoubles) {
    resetDockActions();

    // Bot kiểm tra xây nhà sau lượt
    const justPlayed = engine.getCurrentPlayer();
    if (justPlayed.isBot && !justPlayed.isBankrupt) {
      const buildDecisions = BotAI.getBuildDecisions(justPlayed, engine.state);
      for (const tileId of buildDecisions) {
        const buildRes = engine.applyAction({ type: "BUILD_HOUSE", tileId });
        if (buildRes.success) {
          boardRenderer.updateBuildings(
            engine.state.properties,
            engine.state.players,
          );
          sound.playBuildHouse();
          triggerPlayerEmote(justPlayed.id, "😎", 2400);
          addGameLog(
            `🏗️ ${justPlayed.name} nâng cấp nhà tại ${buildRes.tile.name}!`,
          );
        }
      }
    }

    const endRes = engine.applyAction({ type: "END_TURN" });
    hud.update(engine.state);

    if (endRes.event !== "EXTRA_TURN") {
      turnCount++;
      const turnCountEl = document.getElementById("game-turn-count");
      if (turnCountEl) turnCountEl.textContent = turnCount;
      recordNetWorthSnapshot();
    }

    achievementManager.check(engine.state);
    autoSaveGame();
    checkBotTurn();
  }

  /**
   * Kiểm tra nếu là lượt của Bot hoặc người chơi đang ở trong tù
   */
  function checkBotTurn() {
    const curPlayer = engine.getCurrentPlayer();

    if (curPlayer.isBot && !curPlayer.isBankrupt) {
      if (btnRoll) {
        btnRoll.disabled = true;
        btnRoll.querySelector(".roll-label").textContent = "BOT ĐANG ĐI...";
      }
      setTimeout(() => {
        if (curPlayer.inJail) {
          if (curPlayer.hasJailCard) {
            const cardRes = engine.applyAction({ type: "USE_JAIL_CARD" });
            tokenRenderer.render(engine.state.players);
            hud.update(engine.state);
            addGameLog(cardRes.message);
            showToast(cardRes.message);
          } else if (curPlayer.money > 3_000_000 && curPlayer.jailTurns > 0) {
            const payRes = engine.applyAction({ type: "PAY_JAIL_FINE" });
            if (payRes.success) {
              sound.playCoin();
              tokenRenderer.render(engine.state.players);
              hud.update(engine.state);
              addGameLog(payRes.message);
              showToast(payRes.message);
            }
          }
        }
        if (diceRenderer && !diceRenderer.isRolling) {
          diceRenderer.roll();
        }
      }, 1000);
    } else {
      if (curPlayer.inJail) {
        if (btnRoll) {
          btnRoll.disabled = false;
          btnRoll.querySelector(".roll-label").textContent = "🎲 LẮC ĐÔI RA TÙ";
        }
        showJailOptions(curPlayer);
      } else {
        if (btnRoll) {
          btnRoll.disabled = false;
          btnRoll.querySelector(".roll-label").textContent = "TUNG XÚC XẮC";
        }
      }
    }
  }

  /**
   * Hiển thị bảng chọn cách ra tù cho người chơi
   */
  function showJailOptions(player) {
    jailModal.show(player, {
      onRollDoubles: () => {
        if (diceRenderer && !diceRenderer.isRolling) {
          diceRenderer.roll();
        }
      },
      onPayFine: () => {
        const payRes = engine.applyAction({ type: "PAY_JAIL_FINE" });
        if (payRes.success) {
          sound.playCoin();
          showFloatingCash(player.id, -500_000);
          tokenRenderer.render(engine.state.players);
          hud.update(engine.state);
          boardRenderer.updateJackpot(engine.state.jackpotPot);
          addGameLog(payRes.message);
          showToast(payRes.message);
          autoSaveGame();
          if (btnRoll) {
            btnRoll.disabled = false;
            btnRoll.querySelector(".roll-label").textContent = "TUNG XÚC XẮC";
          }
        }
      },
      onUseCard: () => {
        const cardRes = engine.applyAction({ type: "USE_JAIL_CARD" });
        if (cardRes.success) {
          tokenRenderer.render(engine.state.players);
          hud.update(engine.state);
          addGameLog(cardRes.message);
          showToast(cardRes.message);
          if (btnRoll) {
            btnRoll.disabled = false;
            btnRoll.querySelector(".roll-label").textContent = "TUNG XÚC XẮC";
          }
        }
      },
    });
  }

  function showToast(message) {
    let toast = document.getElementById("game-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "game-toast";
      toast.className = "game-toast";
      const board = document.getElementById("monopoly-board");
      if (board) {
        board.appendChild(toast);
      } else {
        document.body.appendChild(toast);
      }
    }
    toast.textContent = message;
    toast.classList.add("show");
    if (toast._timer) clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove("show"), 2800);
  }

  function showGameOverModal(winner) {
    try {
      localStorage.removeItem("monopoly_saigon_save");
    } catch (e) {}

    matchRecapModal.show({
      winner,
      players: engine.state.players,
      properties: engine.state.properties,
      boardData: SAIGON_BOARD_DATA,
      stats: {
        turnCount,
        secondsElapsed,
        netWorthHistory,
      },
      onRestartGame: () => {
        gameSetupModal.show(startNewGame, resumeGame);
      },
    });
  }

  // Khởi động GameSetupModal ngay khi vào trang (hỗ trợ Tiếp Tục hoặc Ván Mới)
  gameSetupModal.show(startNewGame, resumeGame);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initGameApp);
} else {
  initGameApp();
}

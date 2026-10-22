/**
 * main.js - Tích hợp đầy đủ GameEngine, Cockpit Dashboard 3 Cột, AI Bot & Dock Điều Khiển
 */

import { SAIGON_BOARD_DATA } from "../../shared/data/board-data.js";
import { GameEngine } from "../../shared/engine.js";
import { GameRules } from "../../shared/rules.js";
import { GAME_CONSTANTS, formatVND } from "../../shared/constants.js";
import { BotAI } from "../../shared/BotAI.js";
import { BoardRenderer } from "./render/BoardRenderer.js";
import { GAME_TOKENS, resolveToken } from "./render/TokensData.js";
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
import { OnlineLobbyModal } from "./ui/OnlineLobbyModal.js";
import { sound } from "./audio/SoundEffects.js";
import { getPlayerAvatar } from "./render/AvatarsData.js";
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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
  const onlineLobbyModal = new OnlineLobbyModal();

  let isOnlineMode = false;
  let networkClient = null;
  let myOnlinePlayerId = null;

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

  // Quản lý Điều Hướng View Trên Mobile (< 900px)
  const mobileNav = document.getElementById("mobile-view-nav");
  const arenaGrid = document.getElementById("game-arena-grid");
  const logBadge = document.getElementById("log-unread-badge");
  let unreadLogsCount = 0;

  function switchMobileTab(tabName) {
    if (!arenaGrid) return;
    arenaGrid.dataset.activeTab = tabName;
    const tabBtns = document.querySelectorAll(".mobile-nav-btn");
    tabBtns.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tabName);
    });
    if (tabName === "log") {
      unreadLogsCount = 0;
      if (logBadge) {
        logBadge.style.display = "none";
        logBadge.textContent = "0";
      }
    }
  }

  if (mobileNav) {
    mobileNav.addEventListener("click", (e) => {
      const btn = e.target.closest(".mobile-nav-btn");
      if (!btn) return;
      const tab = btn.dataset.tab;
      if (tab) switchMobileTab(tab);
    });
  }

  // Timer
  let secondsElapsed = 0;
  let timerInterval = null;
  let turnCount = 1;

  // Quản lý Tốc độ mô phỏng (Speed Controller) & Tạm dừng
  let simSpeed = 1; // 1: 1x, 3: 3x, 10: Turbo
  let isSimPaused = false;
  let currentGameMode = "1v3"; // '1v1', '1v2', '1v3', 'hotseat', '4bots'
  let isFastModeEnabled = false;

  // Quản lý Vòng Lặp Ván Đấu & Hủy bỏ triệt để ván cũ
  let currentSessionId = 0;
  let activeGameTimers = new Set();
  let endTurnTimer = null;

  function clearEndTurnTimer() {
    if (endTurnTimer) {
      clearTimeout(endTurnTimer);
      endTurnTimer = null;
    }
  }

  function scheduleFinishTurn(p, isDoubles = false, delayMs = 1200) {
    clearEndTurnTimer();
    // Trong chế độ Online, tuyệt đối chỉ có tab của chính người chơi đang có lượt mới được hẹn giờ kết thúc lượt
    if (isOnlineMode && p && p.id !== myOnlinePlayerId) {
      return;
    }
    const turnAtSchedule = engine?.state?.turnId || turnCount;
    endTurnTimer = setTimeout(() => {
      endTurnTimer = null;
      const currentTurn = engine?.state?.turnId || turnCount;
      if (currentTurn !== turnAtSchedule) return; // Nếu lượt đã đổi thì hủy bỏ
      finishTurn(isDoubles);
    }, delayMs);
  }

  function safeTimeout(fn, ms) {
    const mySession = currentSessionId;
    const timerId = setTimeout(() => {
      activeGameTimers.delete(timerId);
      if (mySession === currentSessionId && !isSimPaused) {
        fn();
      }
    }, ms);
    activeGameTimers.add(timerId);
    return timerId;
  }

  function stopCurrentGameLoop() {
    clearEndTurnTimer();
    isSimPaused = true;
    currentSessionId++; // Vô hiệu hóa toàn bộ promise / callback của ván cũ
    activeGameTimers.forEach((id) => clearTimeout(id));
    activeGameTimers.clear();
    if (diceRenderer) diceRenderer.cancelRoll();
    if (tokenRenderer) tokenRenderer.stopMovement();

    // Đóng các modal tương tác đang mở dở dang
    try {
      if (cardModal?.hide) cardModal.hide();
      if (titleDeedModal?.hide) titleDeedModal.hide();
      if (auctionModal?.hide) auctionModal.hide();
      if (debtResolutionModal?.hide) debtResolutionModal.hide();
      if (jailModal?.hide) jailModal.hide();
    } catch (e) {
      console.warn("Lỗi đóng modal:", e);
    }
  }

  function getDelay(baseMs) {
    if (simSpeed >= 10) return 25;
    return Math.max(30, Math.round(baseMs / simSpeed));
  }

  function getDiceDuration() {
    if (simSpeed >= 10) return 20;
    if (simSpeed === 3) return 220;
    return 750;
  }

  function getTokenStepDelay() {
    if (simSpeed >= 10) return 0;
    if (simSpeed === 3) return 60;
    return 220;
  }

  function initSpeedControls() {
    const pauseBtn = document.getElementById("btn-pause-toggle");
    const speedPills = document.querySelectorAll(".btn-speed-pill");

    if (pauseBtn) {
      pauseBtn.onclick = () => {
        if (engine?.state?.isGameOver) return;
        isSimPaused = !isSimPaused;
        pauseBtn.textContent = isSimPaused ? "▶️" : "⏸️";
        pauseBtn.title = isSimPaused ? "Tiếp tục ván đấu" : "Tạm dừng";
        showToast(
          isSimPaused ? "⏸️ Đã tạm dừng ván đấu" : "▶️ Đang tiếp tục ván đấu",
        );
        if (!isSimPaused) {
          checkBotTurn();
        }
      };
    }

    speedPills.forEach((pill) => {
      pill.onclick = () => {
        const speedVal = parseInt(pill.dataset.speed, 10) || 1;
        simSpeed = speedVal;
        speedPills.forEach((p) => p.classList.toggle("active", p === pill));
        const label = simSpeed >= 10 ? "⚡ Turbo (Siêu Tốc)" : `${simSpeed}x`;
        showToast(`🚀 Tốc độ: ${label}`);
      };
    });
  }

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
        <div class="log-entry-text">${escapeHtml(cleanMsg)}</div>
        <div class="log-entry-time">${escapeHtml(timeStr)}</div>
      </div>
    `;

    logContainer.prepend(item);
    while (logContainer.children.length > 35) {
      logContainer.removeChild(logContainer.lastChild);
    }

    // Cập nhật số thông báo chưa đọc trên tab Nhật Ký của mobile
    if (arenaGrid && arenaGrid.dataset.activeTab !== "log" && logBadge) {
      unreadLogsCount++;
      logBadge.textContent = unreadLogsCount > 99 ? "99+" : String(unreadLogsCount);
      logBadge.style.display = "inline-block";
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
   * Cập nhật thông tin vòng đấu & chu kỳ kinh tế Sudden Death trên header
   */
  function updateRoundPhaseHeader(state) {
    if (!state) return;
    const isEndless = !!state.isEndless || !state.maxRounds;
    const maxRounds = state.maxRounds;
    const round = isEndless
      ? (state.round || 1)
      : Math.min(state.round || 1, maxRounds || GAME_CONSTANTS.MAX_ROUNDS);
    const phase = GameRules.getPhase(round, maxRounds);

    const pillEl = document.getElementById("round-phase-pill");
    const valEl = document.getElementById("round-phase-val");
    const iconEl = document.getElementById("round-phase-icon");

    if (valEl) {
      if (state.isGameOver) {
        valEl.textContent = isEndless
          ? `Vòng ${round} · Kết Thúc (Sinh Tử)`
          : `Vòng ${round}/${maxRounds} · Kết Thúc`;
      } else if (isEndless) {
        valEl.textContent = `Vòng ${round} · Vô Hạn`;
      } else {
        valEl.textContent = `Vòng ${round}/${maxRounds} · Lương ${formatVND(phase.salary)}`;
      }
    }

    if (pillEl) {
      pillEl.classList.remove("warning-pill", "danger-pill", "gold-pill");
      if (state.isGameOver) {
        pillEl.classList.add("danger-pill");
        if (iconEl) iconEl.textContent = "🏁";
        pillEl.title = isEndless
          ? `Trận đấu sinh tử đã kết thúc ở vòng ${round}!`
          : `Ván đấu đã hoàn thành trọn vẹn ${round}/${maxRounds} vòng!`;
      } else if (isEndless) {
        pillEl.classList.add("gold-pill");
        if (iconEl) iconEl.textContent = "♾️";
        pillEl.title = `Chế độ Vô Hạn: Đấu sinh tử cho đến khi chỉ còn 1 người trụ lại! Lương: ${formatVND(phase.salary)}`;
      } else if (maxRounds && round >= maxRounds - 3) {
        pillEl.classList.add("danger-pill");
        if (iconEl) iconEl.textContent = "⚡";
        pillEl.title = `Sắp chạm giới hạn! Vòng ${round}/${maxRounds} sẽ kết thúc ván đấu!`;
      } else if (phase.isNearPhase) {
        pillEl.classList.add("warning-pill");
        if (iconEl) iconEl.textContent = "⚠️";
        pillEl.title = `Cảnh báo: Còn ${phase.roundsToNext} vòng nữa bước vào ${phase.phaseName}!`;
      } else {
        pillEl.classList.add("gold-pill");
        if (iconEl) iconEl.textContent = "🔄";
        pillEl.title = `Giai đoạn: ${phase.phaseName}. Tiền thuê: x${phase.rentMult}`;
      }
    }

    if (boardRenderer && typeof boardRenderer.updateGoSalary === "function") {
      const activeSalary = isEndless
        ? (GAME_CONSTANTS.GO_REWARD || 2_000_000)
        : phase.salary;
      boardRenderer.updateGoSalary(activeSalary);
    }
  }

  /**
   * Tự động lưu trạng thái ván cờ vào LocalStorage
   */
  function autoSaveGame() {
    if (isOnlineMode) return;
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
      mode: currentGameMode,
      fastMode: isFastModeEnabled,
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

  /**
   * Kích hoạt hiệu ứng tiền bay, âm thanh & biểu cảm khi nhận/mất tiền từ Thẻ Cơ Hội / Khí Vận
   * @param {Object} player
   * @param {Object} cardResult
   */
  function triggerCardMoneyEffects(player, cardResult) {
    if (!cardResult || !player) return;
    const { amount, actionType } = cardResult;

    if (actionType === "ADD_MONEY" && amount > 0) {
      showFloatingCash(player.id, amount);
      sound.playSuccess();
      triggerPlayerEmote(player.id, "💰", 2500);
    } else if (actionType === "SUB_MONEY" && amount !== undefined) {
      const absAmount = Math.abs(amount);
      if (absAmount > 0) {
        showFloatingCash(player.id, -absAmount);
        sound.playCoin();
        triggerPlayerEmote(player.id, "💸", 2500);
      }
    } else if (actionType === "PAY_ALL_PLAYERS" && amount > 0) {
      const activeOthers = (engine.state.players || []).filter(
        (p) => p.id !== player.id && !p.isBankrupt,
      );
      showFloatingCash(player.id, -amount * activeOthers.length);
      sound.playCoin();
      triggerPlayerEmote(player.id, "💸", 2500);
      activeOthers.forEach((other) => {
        showFloatingCash(other.id, amount);
        triggerPlayerEmote(other.id, "🧧", 2200);
      });
    } else if (actionType === "RECEIVE_FROM_ALL" && amount > 0) {
      const activeOthers = (engine.state.players || []).filter(
        (p) => p.id !== player.id && !p.isBankrupt,
      );
      showFloatingCash(player.id, amount * activeOthers.length);
      sound.playSuccess();
      triggerPlayerEmote(player.id, "🤑", 2500);
      activeOthers.forEach((other) => {
        showFloatingCash(other.id, -amount);
        triggerPlayerEmote(other.id, "😭", 2200);
      });
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
      } else if (tile.id === 0) {
        const isEndless =
          !!engine?.state?.isEndless || !engine?.state?.maxRounds;
        const phase = GameRules.getPhase(
          engine?.state?.round || 1,
          engine?.state?.maxRounds,
        );
        const salary = isEndless
          ? (GAME_CONSTANTS.GO_REWARD || 2_000_000)
          : phase.salary;
        standingPriceEl.textContent =
          salary > 0 ? `+${formatMoney(salary)}` : "0đ (Cắt lương)";
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
    const myOnlineP =
      isOnlineMode && myOnlinePlayerId
        ? engine.state.players.find((p) => p.id === myOnlinePlayerId)
        : null;
    const currentPlayer = targetPlayer || myOnlineP || engine.getCurrentPlayer();
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

    const phase = engine
      ? GameRules.getPhase(engine.state.round, engine.state.maxRounds)
      : { rentMult: 1 };

    titleDeedModal.show(tile, {
      isBuyPrompt: false,
      player: currentPlayer,
      owner,
      propState,
      rentMult: phase.rentMult,
      buildCheck,
      sellCheck,
      mortgageCheck,
      unmortgageCheck,
      onBuild: () => {
        if (isOnlineMode) {
          titleDeedModal.hide();
          networkClient.sendAction({
            type: "BUILD_HOUSE",
            tileId: tile.id,
          });
          return;
        }
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
        if (isOnlineMode) {
          titleDeedModal.hide();
          networkClient.sendAction({
            type: "SELL_HOUSE",
            tileId: tile.id,
          });
          return;
        }
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
        if (isOnlineMode) {
          titleDeedModal.hide();
          networkClient.sendAction({
            type: "MORTGAGE_PROPERTY",
            tileId: tile.id,
          });
          return;
        }
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
        if (isOnlineMode) {
          titleDeedModal.hide();
          networkClient.sendAction({
            type: "UNMORTGAGE_PROPERTY",
            tileId: tile.id,
          });
          return;
        }
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

    // Nút Đấu Online trên Header
    const btnOnlineLobby = document.getElementById("btn-online-lobby");
    if (btnOnlineLobby) {
      btnOnlineLobby.onclick = () => {
        onlineLobbyModal.show(startOnlineGame);
      };
    }

    // Nút Tạo Ván Mới trên Header
    const btnRestart = document.getElementById("btn-restart-game");
    if (btnRestart) {
      btnRestart.onclick = () => {
        // Dừng và ngắt triệt để toàn bộ chuyển động, xúc xắc và lượt bot ngầm của ván cũ
        stopCurrentGameLoop();
        const pauseBtn = document.getElementById("btn-pause-toggle");
        if (pauseBtn) pauseBtn.textContent = "▶️";

        if (isOnlineMode && networkClient) {
          try {
            networkClient.disconnect();
          } catch (e) {}
          isOnlineMode = false;
        }
        try {
          sessionStorage.removeItem("monopoly_reconnect_token");
          sessionStorage.removeItem("monopoly_room_id");
          sessionStorage.removeItem("monopoly_player_id");
        } catch (e) {}
        const btnOnlineLobby = document.getElementById("btn-online-lobby");
        if (btnOnlineLobby) btnOnlineLobby.style.display = "";

        gameSetupModal.show(
          startNewGame,
          resumeGame,
          () => {
            // Khi người dùng bấm đóng modal (hủy tạo ván mới) -> tiếp tục lại ván cũ
            isSimPaused = false;
            if (pauseBtn) pauseBtn.textContent = "⏸️";
            checkBotTurn();
          },
          (preset) => {
            onlineLobbyModal.show(startOnlineGame, null, preset);
          },
        );
      };
    }

    // Khởi tạo cụm điều tốc (1x, 3x, Turbo, Tạm dừng)
    initSpeedControls();

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
    // Hủy bỏ và dọn dẹp sạch sẽ toàn bộ vòng lặp của ván cũ
    stopCurrentGameLoop();
    isSimPaused = false;
    isOnlineMode = false;
    networkClient = null;
    myOnlinePlayerId = null;
    if (diceRenderer) diceRenderer.onRollRequested = null;
    const pauseBtn = document.getElementById("btn-pause-toggle");
    if (pauseBtn) pauseBtn.textContent = "⏸️";
    const btnOnlineLobby = document.getElementById("btn-online-lobby");
    if (btnOnlineLobby) btnOnlineLobby.style.display = "";

    currentGameMode =
      options.mode || (playersConfig.every((p) => p.isBot) ? "4bots" : "1v3");
    isFastModeEnabled = !!options.fastMode;

    playersConfig.forEach((p, idx) => {
      p.token = resolveToken(p.token, idx);
    });

    engine = new GameEngine(playersConfig, options);
    engine.state.players.forEach((p, idx) => {
      p.token = resolveToken(p.token, idx);
    });
    window.engine = engine;
    window.hud = hud;
    try {
      hud.update(engine.state, handleShowPortfolio);
    } catch (err) {
      console.error("Lỗi cập nhật HUD:", err);
    }
    turnCount = 1;
    const turnCountEl = document.getElementById("game-turn-count");
    if (turnCountEl) turnCountEl.textContent = turnCount;

    startTimer(0);
    savedLogs = [];
    if (logContainer) logContainer.innerHTML = "";

    achievementManager.resetProgress();
    netWorthHistory = [];
    recordNetWorthSnapshot();

    if (options.isEndless) {
      addGameLog(
        "♾️ Chế độ Sinh Tử Vô Hạn kích hoạt: Không giới hạn vòng, chiến đấu đến khi đối thủ phá sản hết!",
      );
      showToast("♾️ Chế độ Sinh Tử Vô Hạn: Chiến đấu đến người sống sót cuối cùng!");
    } else if (options.fastMode) {
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
    updateRoundPhaseHeader(engine.state);

    autoSaveGame();
    checkBotTurn();
  }

  /**
   * Tiếp tục ván chơi từ LocalStorage
   */
  function resumeGame(savedData) {
    stopCurrentGameLoop();
    isSimPaused = false;
    isOnlineMode = false;
    networkClient = null;
    myOnlinePlayerId = null;
    if (diceRenderer) diceRenderer.onRollRequested = null;
    const pauseBtn = document.getElementById("btn-pause-toggle");
    if (pauseBtn) pauseBtn.textContent = "⏸️";
    const btnOnlineLobby = document.getElementById("btn-online-lobby");
    if (btnOnlineLobby) btnOnlineLobby.style.display = "";

    currentGameMode =
      savedData.mode ||
      (savedData.state?.players?.every((p) => p.isBot) ? "4bots" : "1v3");
    isFastModeEnabled = !!(savedData.fastMode || savedData.state?.fastMode);

    engine = new GameEngine();
    engine.state = savedData.state;
    if (engine.state && engine.state.players) {
      engine.state.players.forEach((p, idx) => {
        p.token = resolveToken(p.token, idx);
      });
    }
    // Đảm bảo turnState không bị kẹt ở trạng thái chuyển động
    if (
      engine.state.turnState === "ROLLING" ||
      engine.state.turnState === "MOVING"
    ) {
      engine.state.turnState = "WAIT_ROLL";
    }
    window.engine = engine;
    window.hud = hud;
    try {
      hud.update(engine.state, handleShowPortfolio);
    } catch (err) {
      console.error("Lỗi cập nhật HUD:", err);
    }

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
    updateRoundPhaseHeader(engine.state);

    autoSaveGame();
    checkBotTurn();
  }

  /**
   * Xử lý sau khi xúc xắc hoàn thành lắc
   */
  async function handleDiceRolled(val1, val2, total, isDoubles) {
    const mySession = currentSessionId;
    if (mySession !== currentSessionId || isSimPaused) return;

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

    // Nhảy từng ô một (điều chỉnh tốc độ theo getTokenStepDelay)
    await tokenRenderer.moveStepByStep(
      currentPlayer,
      total,
      engine.state.players,
      {
        onStep: () => {
          if (simSpeed < 10 && mySession === currentSessionId && !isSimPaused) {
            sound.playTokenStep();
          }
        },
        onPassedGo: (p) => {
          if (mySession !== currentSessionId || isSimPaused) return;
          const phase = GameRules.getPhase(
            engine.state.round,
            engine.state.maxRounds,
          );
          const salary = phase.salary;
          // Tiền lương đã được cộng trong GameEngine (COMPLETE_MOVEMENT), client chỉ hiển thị hiệu ứng
          hud.update(engine.state);
          if (simSpeed < 10) {
            sound.playCoin();
            if (salary > 0) {
              showFloatingCash(p.id, salary);
              triggerPlayerEmote(p.id, "🥳", 2400);
            }
          }
          if (salary > 0) {
            addGameLog(
              `🎉 ${p.name} qua Khởi Hành: Lãnh lương ${formatVND(salary, true)}!`,
            );
            if (simSpeed < 10) {
              showToast(
                `🎉 ${p.name} qua Khởi Hành: Lãnh lương ${formatVND(salary, true)}!`,
              );
            }
          } else {
            addGameLog(
              `⚠️ ${p.name} qua Khởi Hành nhưng KHÔNG CÓ LƯƠNG (Bão kinh tế)!`,
            );
          }
        },
        onComplete: async (p, landingPos) => {
          if (mySession !== currentSessionId || isSimPaused) return;
          await resolveLanding(p, landingPos, isDoubles);
        },
      },
      getTokenStepDelay(),
    );
  }

  /**
   * Xử lý giải quyết hiệu ứng ô khi người chơi hạ cánh (dùng chung cho mọi kiểu di chuyển)
   */
  async function resolveLanding(p, landingPos, isDoubles = false) {
    const mySession = currentSessionId;
    if (mySession !== currentSessionId || isSimPaused) return;

    p.position = landingPos;
    tokenRenderer.render(engine.state.players);

    if (isOnlineMode) {
      if (p.id === myOnlinePlayerId) {
        networkClient.sendAction({
          type: "COMPLETE_MOVEMENT",
          position: landingPos,
        });
      }
      return;
    }

    const landResult = engine.applyAction({
      type: "COMPLETE_MOVEMENT",
      position: landingPos,
    });
    hud.update(engine.state);
    await renderLandingResult(p, landResult, isDoubles);
  }

  /**
   * Mở hoặc cập nhật Modal giải quyết nợ (bán nhà / thế chấp / phá sản)
   */
  function openDebtModal(debtInfo) {
    if (!debtInfo) return;
    const curPlayer = engine.getCurrentPlayer();
    if (isOnlineMode && curPlayer.id !== myOnlinePlayerId) {
      if (debtResolutionModal?.hide) debtResolutionModal.hide();
      return;
    }
    const tile =
      (debtInfo.tileId ? SAIGON_BOARD_DATA.find((t) => t.id === debtInfo.tileId) : null) ||
      debtInfo.tile ||
      SAIGON_BOARD_DATA[curPlayer.position] ||
      {};
    const creditor = debtInfo.creditorId
      ? engine.state.players.find((pl) => pl.id === debtInfo.creditorId)
      : debtInfo.creditor;

    try {
      debtResolutionModal.show({
        player: curPlayer,
        amount: debtInfo.amount,
        debtType: debtInfo.debtType,
        creditor,
        tile,
        state: engine.state,
        onAutoLiquidate: () => {
          if (isOnlineMode) {
            networkClient.sendAction({ type: "AUTO_RESOLVE_DEBT" });
            return;
          }
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
              showFloatingCash(curPlayer.id, -debtInfo.amount);
              if (creditor) {
                showFloatingCash(creditor.id, debtInfo.amount);
              }
              addGameLog(res.message);
              showToast(res.message);
              safeTimeout(() => finishTurn(debtInfo.isDoubles || false), getDelay(1400));
            } else {
              openDebtModal(debtInfo);
            }
          } else {
            showToast(res.error || "Không thể tự động giải cứu");
          }
        },
        onMortgage: (tId) => {
          if (isOnlineMode) {
            networkClient.sendAction({
              type: "MORTGAGE_PROPERTY",
              tileId: tId,
            });
            return;
          }
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
            openDebtModal(debtInfo);
          } else {
            showToast(res.error || "Không thể thế chấp ô đất");
          }
        },
        onSellHouse: (tId) => {
          if (isOnlineMode) {
            networkClient.sendAction({
              type: "SELL_HOUSE",
              tileId: tId,
            });
            return;
          }
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
            openDebtModal(debtInfo);
          } else {
            showToast(res.error || "Không thể bán nhà");
          }
        },
        onPayDebt: () => {
          if (isOnlineMode) {
            networkClient.sendAction({ type: "PAY_DEBT" });
            return;
          }
          const res = engine.applyAction({ type: "PAY_DEBT" });
          if (res.success) {
            debtResolutionModal.hide();
            sound.playSuccess();
            showFloatingCash(curPlayer.id, -debtInfo.amount);
            if (creditor) {
              showFloatingCash(creditor.id, debtInfo.amount);
            }
            hud.update(engine.state, handleShowPortfolio);
            addGameLog(res.message);
            showToast(res.message);
            safeTimeout(() => finishTurn(debtInfo.isDoubles || false), getDelay(1400));
          } else {
            showToast(res.error || "Chưa đủ tiền thanh toán!");
          }
        },
        onConcede: () => {
          debtResolutionModal.hide();
          if (isOnlineMode) {
            networkClient.sendAction({ type: "CONCEDE_BANKRUPTCY" });
            return;
          }
          const res = engine.applyAction({ type: "CONCEDE_BANKRUPTCY" });
          if (res.success) {
            updateStandingBanner(tile, `💀 ${curPlayer.name} đã Phá Sản!`);
            boardRenderer.updateOwners(
              engine.state.properties,
              engine.state.players,
            );
            tokenRenderer.render(engine.state.players);
            hud.update(engine.state);
            sound.playJail();
            triggerPlayerEmote(curPlayer.id, "😭", 3500);
            addGameLog(res.message);
            showToast(res.message);
            if (res.winner) {
              triggerPlayerEmote(res.winner.id, "😎", 4000);
              showGameOverModal(res.winner);
            } else {
              safeTimeout(() => finishTurn(false), getDelay(1600));
            }
          }
        },
      });
    } catch (e) {
      console.warn("Lỗi mở DebtResolutionModal:", e);
    }
  }

  /**
   * Hàm dùng chung renderLandingResult: tái sử dụng cho COMPLETE_MOVEMENT và CLOSE_CARD (Offline & Online)
   */
  async function renderLandingResult(p, landResult, isDoubles = false) {
    if (!landResult || !p) return;
    const mySession = currentSessionId;
    if (mySession !== currentSessionId || isSimPaused) return;

    const currentTile = landResult.tile || SAIGON_BOARD_DATA[p.position] || {};

    // A. Ô Cơ Hội / Khí Vận
    if (landResult.event === "CARD_DRAWN") {
      sound.playCardDraw();
      updateDeckCounts();
      updateStandingBanner(
        currentTile,
        `Rút thẻ ${landResult.cardType === "chance" ? "Cơ Hội" : "Khí Vận"}`,
      );

      const cardDeckTitle =
        landResult.cardType === "chance" ? "Cơ Hội" : "Khí Vận";
      addGameLog(
        `📜 ${p.name} rút thẻ ${cardDeckTitle}: "${landResult.card?.title || ""}" - ${landResult.card?.desc || ""}`,
      );

      const onCardClosed = async () => {
        if (isOnlineMode) {
          cardModal.hide();
          if (landResult.result && landResult.result.moveTarget !== undefined) {
            p.position = landResult.result.moveTarget;
            tokenRenderer.render(engine.state.players);
          }
          if (p.id === myOnlinePlayerId) {
            networkClient.sendAction({ type: "CLOSE_CARD" });
          }
          return;
        }
        const closeRes = engine.applyAction({ type: "CLOSE_CARD" });
        tokenRenderer.render(engine.state.players);
        hud.update(engine.state);
        if (landResult.result?.message) {
          addGameLog(landResult.result.message);
          showToast(landResult.result.message);
        }
        if (simSpeed < 10 && landResult.result) {
          triggerCardMoneyEffects(p, landResult.result);
        }

        // Nếu thẻ di chuyển người chơi sang ô mới (tiến/lùi/ô gần nhất/vào tù)
        if (landResult.result && landResult.result.moveTarget !== undefined) {
          tokenRenderer.render(engine.state.players);
          await renderLandingResult(p, closeRes, isDoubles);
        } else if (p.inJail) {
          finishTurn(false);
        } else {
          finishTurn(isDoubles);
        }
      };

      if (p.isBot) {
        if (simSpeed < 10) {
          cardModal.show(
            landResult.cardType,
            landResult.card,
            landResult.result,
          );
        }
        safeTimeout(async () => {
          if (simSpeed < 10) cardModal.hide();
          await onCardClosed();
        }, getDelay(1800));
      } else if (isOnlineMode && p.id !== myOnlinePlayerId) {
        // Đối thủ trong phòng online rút thẻ: Không bật modal có nút bấm chặn màn hình
        if (cardModal?.hide) cardModal.hide();
        showToast(`📜 ${p.name} rút thẻ ${landResult.cardType === "chance" ? "Cơ Hội" : "Khí Vận"}: ${landResult.card?.title || ""}`);
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
          if (simSpeed < 10) {
            sound.playSuccess();
            showFloatingCash(p.id, -landResult.tile.price);
            triggerPlayerEmote(p.id, "😎", 2600);
            showToast(`🤖 ${p.name} đã mua ${landResult.tile.name}!`);
          }
          addGameLog(`🤖 ${p.name} đã mua ${landResult.tile.name}!`);
          achievementManager.check(engine.state);
          scheduleFinishTurn(p, isDoubles, getDelay(1000));
        } else {
          addGameLog(`🤖 ${p.name} bỏ qua mua đất. Bắt đầu đấu giá!`);
          startAuctionFlow(landResult.tile, isDoubles);
        }
      } else if (isOnlineMode && p.id !== myOnlinePlayerId) {
        showToast(`⏳ Đang chờ ${p.name} quyết định mua ${currentTile.name}...`);
      } else {
        // Kích hoạt nút Mua Đất & Bỏ Qua ngay trên thanh Dock!
        if (btnBuy) {
          btnBuy.disabled = false;
          btnBuy.querySelector(".act-title").textContent =
            `Mua (${formatMoney(currentTile.price)})`;
          btnBuy.onclick = () => {
            if (isOnlineMode) {
              resetDockActions();
              titleDeedModal.hide();
              networkClient.sendAction({ type: "BUY_PROPERTY" });
              return;
            }
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
          btnPass.querySelector(".act-title").textContent = "Bỏ Qua";
          btnPass.onclick = () => {
            if (isOnlineMode) {
              resetDockActions();
              titleDeedModal.hide();
              networkClient.sendAction({ type: "DECLINE_BUY" });
              return;
            }
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
            titleDeedModal.hide();
            if (isOnlineMode) {
              networkClient.sendAction({ type: "BUY_PROPERTY" });
              return;
            }
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
            titleDeedModal.hide();
            if (isOnlineMode) {
              networkClient.sendAction({ type: "DECLINE_BUY" });
              return;
            }
            addGameLog(`🔨 ${p.name} bỏ qua mua đất. Bắt đầu đấu giá!`);
            startAuctionFlow(landResult.tile, isDoubles);
          },
          onPass: () => {
            resetDockActions();
            titleDeedModal.hide();
            if (isOnlineMode) {
              networkClient.sendAction({ type: "DECLINE_BUY" });
              return;
            }
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
      if (simSpeed < 10) {
        sound.playCoin();
        showFloatingCash(p.id, -landResult.rent);
        if (landResult.owner) {
          showFloatingCash(landResult.owner.id, landResult.rent);
          triggerPlayerEmote(landResult.owner.id, "🤑", 2600);
        }
        const rentEmote = landResult.rent >= 3_000_000 ? "😡" : "😭";
        triggerPlayerEmote(p.id, rentEmote, 2800);
        showToast(landResult.message);
      }
      addGameLog(landResult.message);
      scheduleFinishTurn(p, isDoubles, getDelay(1400));
    }
    // D. Nổ Hũ Quỹ Trúng Thưởng (Jackpot)
    else if (landResult.event === "JACKPOT_WON") {
      updateStandingBanner(
        currentTile,
        `🎰 NỔ HŨ: +${formatMoney(landResult.amount)}!`,
      );
      boardRenderer.updateJackpot(engine.state.jackpotPot);
      if (simSpeed < 10) {
        sound.playSuccess();
        sound.playCoin();
        showFloatingCash(p.id, landResult.amount);
        triggerPlayerEmote(p.id, "🤑", 3200);
        engine.state.players.forEach((other) => {
          if (other.id !== p.id && !other.isBankrupt) {
            triggerPlayerEmote(other.id, "😭", 2500);
          }
        });
        showToast(landResult.message);
      }
      addGameLog(landResult.message);
      achievementManager.check(engine.state, {
        event: "JACKPOT_COLLECTED",
        playerId: p.id,
        previousMoney: p.money - landResult.amount,
        jackpotAmount: landResult.amount,
      });
      scheduleFinishTurn(p, isDoubles, getDelay(1600));
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
      if (simSpeed < 10) {
        sound.playCoin();
        const taxAmt = landResult.taxAmount || currentTile.amount || 1_000_000;
        showFloatingCash(p.id, -taxAmt);
        triggerPlayerEmote(p.id, "😭", 2400);
        showToast(landResult.message);
      }
      addGameLog(landResult.message);
      scheduleFinishTurn(p, isDoubles, getDelay(1400));
    }
    // F. Vào tù
    else if (landResult.event === "GO_TO_JAIL") {
      updateStandingBanner(currentTile, "🚨 Bị bắt vào buồng giam");
      if (simSpeed < 10) {
        sound.playJail();
        triggerPlayerEmote(p.id, "😭", 3000);
        showToast(landResult.message);
      }
      tokenRenderer.render(engine.state.players);
      addGameLog(landResult.message);
      scheduleFinishTurn(p, false, getDelay(1400));
    }
    // F2. Thiếu tiền mặt nợ tiền (DEBT_REQUIRED)
    else if (landResult.event === "DEBT_REQUIRED") {
      updateStandingBanner(
        currentTile,
        `⚠️ Cảnh báo nợ: Thiếu ${formatMoney(landResult.deficit)}!`,
      );

      // Nếu người thiếu nợ là BOT: Tự động gỡ nợ bằng AUTO_RESOLVE_DEBT
      if (p.isBot) {
        const resolveRes = engine.applyAction({ type: "AUTO_RESOLVE_DEBT" });
        boardRenderer.updateBuildings(
          engine.state.properties,
          engine.state.players,
        );
        boardRenderer.updateOwners(
          engine.state.properties,
          engine.state.players,
        );
        hud.update(engine.state, handleShowPortfolio);

        if (resolveRes.success && resolveRes.event === "DEBT_RESOLVED") {
          addGameLog(`🛡️ ${p.name} đã bán nhà/thế chấp đất để thanh toán nợ.`);
          safeTimeout(() => finishTurn(isDoubles), getDelay(1000));
        } else {
          // Bất khả kháng -> Bot tuyên bố phá sản
          const concedeRes = engine.applyAction({ type: "CONCEDE_BANKRUPTCY" });
          boardRenderer.updateOwners(
            engine.state.properties,
            engine.state.players,
          );
          tokenRenderer.render(engine.state.players);
          hud.update(engine.state);
          addGameLog(`💀 ${p.name} kiệt quệ tài chính và đã Phá Sản!`);
          if (concedeRes.winner) {
            showGameOverModal(concedeRes.winner);
          } else {
            safeTimeout(() => finishTurn(false), getDelay(1000));
          }
        }
        return;
      }

      sound.playJail();
      triggerPlayerEmote(p.id, "😭", 3500);
      addGameLog(landResult.message);
      showToast(landResult.message);

      if (isOnlineMode && p.id !== myOnlinePlayerId) {
        if (debtResolutionModal?.hide) debtResolutionModal.hide();
        showToast(`⏳ ${p.name} không đủ tiền mặt và đang xử lý nợ nần...`);
        return;
      }

      openDebtModal({
        amount: landResult.amount,
        debtType: landResult.debtType,
        creditorId: landResult.creditor?.id,
        creditor: landResult.creditor,
        tileId: landResult.tile?.id,
        tile: landResult.tile,
        isDoubles,
      });
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
        scheduleFinishTurn(p, false, getDelay(1400));
      }
    }
    // H. Ô an toàn
    else {
      updateStandingBanner(currentTile, "Nghỉ chân an toàn");
      scheduleFinishTurn(p, isDoubles, getDelay(1000));
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

    const handleAuctionDone = (res) => {
      auctionModal.hide();
      boardRenderer.updateOwners(
        engine.state.properties,
        engine.state.players,
      );
      hud.update(engine.state);
      if (res && res.winner && simSpeed < 10) {
        triggerPlayerEmote(res.winner.id, "😎", 2800);
      }
      if (res && res.message) {
        addGameLog(res.message);
        if (simSpeed < 10) showToast(res.message);
      }
      finishTurn(isDoubles);
    };

    const processAuctionStep = () => {
      const auction = engine.state.auction;
      if (!auction) {
        handleAuctionDone({ message: "Phiên đấu giá kết thúc." });
        return;
      }

      auctionModal.render(
        engine,
        (auctionEndRes) => handleAuctionDone(auctionEndRes),
        () => processAuctionStep(),
      );

      const currentBidder = engine.state.players.find(
        (p) => p.id === auction.currentTurnPlayerId,
      );
      if (currentBidder && currentBidder.isBot) {
        safeTimeout(() => {
          if (!engine.state.auction || isSimPaused) return;
          const decision = BotAI.getAuctionDecision(
            currentBidder,
            engine.state.auction,
            engine.state,
          );
          const allBots = engine.state.players.every((p) => p.isBot);

          if (decision.action === "BID") {
            const bidRes = engine.applyAction({
              type: "BID_AUCTION",
              playerId: currentBidder.id,
              amount: decision.amount,
            });

            if (bidRes.event === "AUCTION_COMPLETED" || !engine.state.auction) {
              if (allBots || simSpeed >= 3) {
                auctionModal.hide();
                safeTimeout(() => handleAuctionDone(bidRes), getDelay(400));
              } else {
                auctionModal.showResult(bidRes, () =>
                  handleAuctionDone(bidRes),
                );
              }
              return;
            }
          } else if (decision.action === "WAIT") {
            // Bot đang dẫn đầu cuộc đấu giá, không cần đặt thêm
            return;
          } else {
            const passRes = engine.applyAction({
              type: "PASS_AUCTION",
              playerId: currentBidder.id,
            });
            if (
              passRes.event === "AUCTION_COMPLETED" ||
              passRes.event === "AUCTION_CANCELLED" ||
              !engine.state.auction
            ) {
              if (allBots || simSpeed >= 3) {
                auctionModal.hide();
                safeTimeout(() => handleAuctionDone(passRes), getDelay(400));
              } else {
                auctionModal.showResult(passRes, () =>
                  handleAuctionDone(passRes),
                );
              }
              return;
            }
          }
          processAuctionStep();
        }, getDelay(700));
      }
    };

    processAuctionStep();
  }

  /**
   * Kết thúc lượt
   */
  function finishTurn(isDoubles) {
    clearEndTurnTimer();
    if (isSimPaused) return;
    resetDockActions();

    if (isOnlineMode) {
      const cur = engine.getCurrentPlayer();
      if (cur.id === myOnlinePlayerId) {
        networkClient.sendAction({
          type: "END_TURN",
          turnId: engine?.state?.turnId,
        });
      }
      return;
    }

    const justPlayed = engine.getCurrentPlayer();
    // Nếu người vừa chơi đã phá sản, tuyệt đối không cho tung đôi thêm lượt
    if (justPlayed?.isBankrupt) {
      isDoubles = false;
    }

    // Bot kiểm tra chuộc đất thế chấp & xây nhà sau lượt
    if (justPlayed && justPlayed.isBot && !justPlayed.isBankrupt) {
      // 1. Bot chuộc lại sổ đỏ đất thế chấp khi có tiền
      const unmortgageDecisions = BotAI.getUnmortgageDecisions(
        justPlayed,
        engine.state,
      );
      for (const tileId of unmortgageDecisions) {
        const unmortgageRes = engine.applyAction({
          type: "UNMORTGAGE_PROPERTY",
          tileId,
        });
        if (unmortgageRes.success) {
          boardRenderer.updateOwners(
            engine.state.properties,
            engine.state.players,
          );
          hud.update(engine.state);
          if (simSpeed < 10) sound.playSuccess();
          addGameLog(
            `🔓 ${justPlayed.name} đã chuộc lại sổ đỏ ${unmortgageRes.tile.name}!`,
          );
        }
      }

      // 2. Bot đập tiền nâng cấp Nhà Xanh / Khách Sạn Đỏ liên tục
      const buildDecisions = BotAI.getBuildDecisions(justPlayed, engine.state);
      for (const tileId of buildDecisions) {
        const buildRes = engine.applyAction({ type: "BUILD_HOUSE", tileId });
        if (buildRes.success) {
          boardRenderer.updateBuildings(
            engine.state.properties,
            engine.state.players,
          );
          hud.update(engine.state);
          if (simSpeed < 10) {
            sound.playBuildHouse();
            triggerPlayerEmote(justPlayed.id, "😎", 2400);
          }
          const bType = buildRes.isHotel
            ? "Khách Sạn Đỏ 🏨"
            : `Nhà Xanh (Cấp ${buildRes.houses}) 🏠`;
          addGameLog(
            `🏗️ ${justPlayed.name} nâng cấp ${bType} tại ${buildRes.tile.name}!`,
          );
        }
      }
    }

    const endRes = engine.applyAction({ type: "END_TURN" });
    hud.update(engine.state);
    updateRoundPhaseHeader(engine.state);

    // Xử lý thông báo chu kỳ kinh tế Sudden Death khi sang vòng mới
    if (endRes.roundIncremented) {
      const curRound = engine.state.round;
      const isEndless = !!engine.state.isEndless || !engine.state.maxRounds;
      engine.state.announcedPhases = engine.state.announcedPhases || {};

      if (isEndless) {
        // Trong chế độ Vô Hạn: Không có Sudden Death giảm lương / tăng tiền thuê.
        // Chỉ thông báo cột mốc khích lệ ở các vòng chẵn lớn (vòng 10, 20, 30...)
        if (
          curRound % 10 === 0 &&
          !engine.state.announcedPhases[`endless_milestone_${curRound}`]
        ) {
          engine.state.announcedPhases[`endless_milestone_${curRound}`] = true;
          const endlessMsg = `♾️ BƯỚC SANG VÒNG ${curRound}: Trận chiến sinh tử vẫn tiếp tục! Lương cố định ${formatVND(GAME_CONSTANTS.GO_REWARD)}!`;
          addGameLog(endlessMsg);
          showToast(endlessMsg);
          if (simSpeed < 10) sound.playSuccess();
        }
      } else {
        const curPhase =
          endRes.phase ||
          GameRules.getPhase(curRound, engine.state.maxRounds);

        // 1. Cảnh báo trước 3 vòng
        if (
          curPhase.nextRound &&
          curPhase.roundsToNext === 3 &&
          !engine.state.announcedPhases[`warn_${curPhase.nextRound}`]
        ) {
          engine.state.announcedPhases[`warn_${curPhase.nextRound}`] = true;
          const nextStep = GAME_CONSTANTS.SUDDEN_DEATH.find(
            (s) => s.round === curPhase.nextRound,
          );
          const warnMsg = `⚠️ BÃO KINH TẾ ĐANG ĐẾN: Còn 3 vòng nữa (Vòng ${curPhase.nextRound}) lương Khởi Hành giảm còn ${formatVND(nextStep?.salary ?? 0)} và tiền thuê tăng x${nextStep?.rentMult ?? 1}!`;
          addGameLog(warnMsg);
          showToast(warnMsg);
          if (simSpeed < 10) sound.playJail();
        }

        // 2. Thông báo chính thức bước vào bậc thang mới
        const stepEntered = GAME_CONSTANTS.SUDDEN_DEATH.find(
          (s) => s.round === curRound,
        );
        if (stepEntered && !engine.state.announcedPhases[`enter_${curRound}`]) {
          engine.state.announcedPhases[`enter_${curRound}`] = true;
          const enterMsg = `🚨 ${stepEntered.name.toUpperCase()} (VÒNG ${curRound})! Lương Khởi Hành: ${formatVND(stepEntered.salary)}, Tiền thuê: x${stepEntered.rentMult}!`;
          addGameLog(enterMsg);
          showToast(enterMsg);
          if (simSpeed < 10) sound.playSaigonHorn();
        }
      }
    }

    // Kiểm tra ván đấu kết thúc (chỉ còn 1 người trụ lại cuối cùng hoặc hết số vòng tối đa)
    if (engine.state.isGameOver && engine.state.winner) {
      handleGameOver(
        engine.state.winner,
        endRes.event === "GAME_OVER_MAX_ROUNDS",
      );
      return;
    }

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
   * Xử lý kết thúc ván đấu khi có người chiến thắng hoặc hết giờ
   */
  function handleGameOver(winner, isMaxRounds = false) {
    stopCurrentGameLoop();
    if (timerInterval) clearInterval(timerInterval);
    isSimPaused = true;
    try {
      localStorage.removeItem("monopoly_saigon_save");
      sessionStorage.removeItem("monopoly_reconnect_token");
      sessionStorage.removeItem("monopoly_room_id");
      sessionStorage.removeItem("monopoly_player_id");
    } catch (e) {}

    sound.playSuccess();
    const subTitle = isMaxRounds
      ? `🏁 ĐÃ HẾT ${engine.state.maxRounds || 30} VÒNG ĐẤU!`
      : `👑 TRẬN ĐẤU KẾT THÚC!`;
    showToast(`🏆 ${winner.name} đã giành CHIẾN THẮNG CHUNG CUỘC!`);
    addGameLog(
      `${subTitle} ${winner.name} trở thành Vua Địa Ốc Sài Gòn với tổng tài sản ${formatVND(GameRules.calculateNetWorth(winner, engine.state.properties))}!`,
    );

    hud.update(engine.state, handleShowPortfolio);
    updateRoundPhaseHeader(engine.state);

    const openRecap = () => {
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
    };

    if (btnRoll) {
      btnRoll.disabled = false;
      btnRoll.querySelector(".roll-label").textContent = `👑 ${winner.name.toUpperCase()} THẮNG! (BẤM XEM KẾT QUẢ)`;
      btnRoll.onclick = openRecap;
    }
    const pauseBtn = document.getElementById("btn-pause-toggle");
    if (pauseBtn) {
      pauseBtn.disabled = false;
      pauseBtn.textContent = "🏆";
      pauseBtn.title = "Bấm để xem Bảng Vàng kết quả";
      pauseBtn.onclick = openRecap;
    }

    try {
      openRecap();
    } catch (err) {
      console.error("Lỗi hiển thị modal tổng kết ván đấu:", err);
    }
  }

  /**
   * Kiểm tra nếu là lượt của Bot hoặc người chơi đang ở trong tù
   */
  function checkBotTurn() {
    if (isOnlineMode) return;
    if (isSimPaused || engine?.state?.isGameOver) return;
    const curPlayer = engine.getCurrentPlayer();
    if (!curPlayer) return;

    // Nếu người chơi hiện tại đã phá sản, lập tức chuyển tiếp sang người còn sống kế tiếp
    if (curPlayer.isBankrupt) {
      finishTurn(false);
      return;
    }

    const allBots = engine.state.players.every((p) => p.isBot);

    if (curPlayer.isBot && !curPlayer.isBankrupt) {
      if (btnRoll) {
        btnRoll.disabled = true;
        btnRoll.querySelector(".roll-label").textContent = allBots
          ? `🤖 ${curPlayer.name} đang đi...`
          : "BOT ĐANG ĐI...";
      }
      safeTimeout(() => {
        if (isSimPaused) return;
        if (curPlayer.inJail) {
          if (curPlayer.hasJailCard) {
            const cardRes = engine.applyAction({ type: "USE_JAIL_CARD" });
            tokenRenderer.render(engine.state.players);
            hud.update(engine.state);
            addGameLog(cardRes.message);
            if (simSpeed < 10) showToast(cardRes.message);
          } else if (curPlayer.money > 3_000_000 && curPlayer.jailTurns > 0) {
            const payRes = engine.applyAction({ type: "PAY_JAIL_FINE" });
            if (payRes.success) {
              if (simSpeed < 10) sound.playCoin();
              tokenRenderer.render(engine.state.players);
              hud.update(engine.state);
              addGameLog(payRes.message);
              if (simSpeed < 10) showToast(payRes.message);
            }
          }
        }
        if (diceRenderer && !diceRenderer.isRolling) {
          diceRenderer.roll(getDiceDuration());
        }
      }, getDelay(1000));
    } else {
      // Khi tới lượt người chơi điều khiển: tự chuyển về tab Bàn Cờ nếu đang ở tab khác trên mobile
      if (arenaGrid && arenaGrid.dataset.activeTab !== "board" && window.innerWidth < 900) {
        switchMobileTab("board");
      }
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
        jailModal.hide();
        if (isOnlineMode) {
          if (networkClient) {
            networkClient.sendAction({ type: "ROLL_DICE" });
          }
        } else {
          if (diceRenderer && !diceRenderer.isRolling) {
            diceRenderer.roll();
          }
        }
      },
      onPayFine: () => {
        jailModal.hide();
        if (isOnlineMode) {
          if (networkClient) {
            networkClient.sendAction({ type: "PAY_JAIL_FINE" });
          }
        } else {
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
        }
      },
      onUseCard: () => {
        jailModal.hide();
        if (isOnlineMode) {
          if (networkClient) {
            networkClient.sendAction({ type: "USE_JAIL_CARD" });
          }
        } else {
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
    handleGameOver(winner, false);
  }

  function updateTurnControls() {
    if (!isOnlineMode) return;
    const curPlayer = engine.getCurrentPlayer();
    const isMyTurn = curPlayer && curPlayer.id === myOnlinePlayerId;

    if (isMyTurn && arenaGrid && arenaGrid.dataset.activeTab !== "board" && window.innerWidth < 900) {
      switchMobileTab("board");
    }

    if (btnRoll) {
      btnRoll.disabled = !isMyTurn;
      const label = btnRoll.querySelector(".roll-label");
      if (label) {
        if (!isMyTurn) {
          label.textContent = `⏳ LƯỢT: ${curPlayer ? curPlayer.name.toUpperCase() : ""}`;
        } else if (curPlayer && curPlayer.inJail) {
          label.textContent = "🎲 LẮC ĐÔI RA TÙ";
        } else {
          label.textContent = "🎲 TUNG XÚC XẮC";
        }
      }
    }

    if (isMyTurn && curPlayer && curPlayer.inJail) {
      showJailOptions(curPlayer);
    } else {
      jailModal.hide();
    }

    if (!isMyTurn) {
      resetDockActions();
      if (diceRenderer?.reset) {
        diceRenderer.reset();
      }
    } else {
      if (diceRenderer) {
        diceRenderer.isRolling = false;
      }
    }
  }

  function startOnlineGame({ client, gameData, myPlayerId }) {
    clearEndTurnTimer();
    stopCurrentGameLoop();
    isSimPaused = false;
    isOnlineMode = true;
    networkClient = client;
    myOnlinePlayerId = myPlayerId;
    const btnOnlineLobby = document.getElementById("btn-online-lobby");
    if (btnOnlineLobby) btnOnlineLobby.style.display = "none";
    if (gameSetupModal?.hide) gameSetupModal.hide();

    currentGameMode = "online";
    isFastModeEnabled = !!gameData.state.fastMode;

    if (gameData.state && gameData.state.players) {
      gameData.state.players.forEach((p, idx) => {
        p.token = resolveToken(p.token, idx);
      });
    }

    engine = new GameEngine(gameData.state.players, {
      seed: gameData.seed,
      fastMode: isFastModeEnabled,
      isEndless: gameData.state.isEndless,
    });
    engine.loadState(gameData.state);
    if (engine.state && engine.state.players) {
      engine.state.players.forEach((p, idx) => {
        p.token = resolveToken(p.token, idx);
      });
    }
    window.engine = engine;
    window.hud = hud;

    try {
      hud.update(engine.state, handleShowPortfolio);
    } catch (err) {
      console.error("Lỗi cập nhật HUD:", err);
    }
    turnCount = engine.state.round || 1;
    const turnCountEl = document.getElementById("game-turn-count");
    if (turnCountEl) turnCountEl.textContent = turnCount;

    startTimer(0);
    savedLogs = [];
    if (logContainer) logContainer.innerHTML = "";

    achievementManager.resetProgress();
    netWorthHistory = [];
    recordNetWorthSnapshot();

    addGameLog(`🌐 Ván đấu trực tuyến bắt đầu tại phòng #${client.roomId.toUpperCase()}!`);
    const myPlayer = engine.state.players.find((p) => p.id === myPlayerId);
    showToast(`🌐 Bạn là: ${myPlayer ? myPlayer.name : myPlayerId}!`);

    initGameInfrastructure();

    boardRenderer.updateOwners(engine.state.properties, engine.state.players);
    boardRenderer.updateBuildings(engine.state.properties, engine.state.players);
    boardRenderer.updateJackpot(engine.state.jackpotPot);
    if (tokenRenderer && engine.state.players) {
      tokenRenderer.render(engine.state.players);
    }

    updateDeckCounts();
    updateRoundPhaseHeader(engine.state);
    updateTurnControls();

    if (engine.state.pendingAction?.type === "DEBT_PROMPT" && engine.getCurrentPlayer().id === myOnlinePlayerId) {
      openDebtModal(engine.state.pendingAction);
    }

    setupOnlineEventHandlers();
  }

  function setupOnlineEventHandlers() {
    if (!networkClient) return;

    if (diceRenderer) {
      diceRenderer.onRollRequested = () => {
        if (!isOnlineMode) return;
        const cur = engine.getCurrentPlayer();
        if (cur.id === myOnlinePlayerId) {
          jailModal.hide();
          const sent = networkClient.sendAction({ type: "ROLL_DICE" });
          if (!sent) {
            showToast("⚠️ Mất kết nối tới máy chủ! Đang thử kết nối lại...");
            networkClient.connect().catch(() => {});
          }
        } else {
          showToast(`⏳ Chưa tới lượt của bạn! Đang chờ ${cur.name}...`);
        }
      };
    }

    networkClient.on("actionResult", async ({ action, result, state }) => {
      if (!isOnlineMode) return;

      if (state && state.players) {
        state.players.forEach((p, idx) => {
          p.token = resolveToken(p.token, idx);
        });
      }

      if (action.type === "ROLL_DICE") {
        clearEndTurnTimer();
        const curPlayer = engine.getCurrentPlayer();
        diceRenderer.roll(getDiceDuration(), { val1: result.val1, val2: result.val2 });
      } else if (action.type === "PAY_JAIL_FINE" || action.type === "USE_JAIL_CARD") {
        engine.state = state;
        hud.update(engine.state, handleShowPortfolio);
        tokenRenderer.render(engine.state.players);
        boardRenderer.updateJackpot(engine.state.jackpotPot);
        jailModal.hide();
        sound.playCoin();
        if (result?.fineAmount) {
          showFloatingCash(engine.getCurrentPlayer().id, -result.fineAmount);
        }
        if (result?.message) {
          addGameLog(result.message);
          showToast(result.message);
        }
        updateTurnControls();
      } else if (action.type === "COMPLETE_MOVEMENT") {
        engine.state = state;
        hud.update(engine.state, handleShowPortfolio);
        tokenRenderer.render(engine.state.players);
        boardRenderer.updateOwners(engine.state.properties, engine.state.players);
        boardRenderer.updateBuildings(engine.state.properties, engine.state.players);
        boardRenderer.updateJackpot(engine.state.jackpotPot);
        if (result) {
          const curPlayer = engine.getCurrentPlayer();
          await renderLandingResult(curPlayer, result, false);
        }
      } else if (action.type === "BUY_PROPERTY") {
        engine.state = state;
        hud.update(engine.state, handleShowPortfolio);
        boardRenderer.updateOwners(engine.state.properties, engine.state.players);
        sound.playSuccess();
        if (result.message) {
          addGameLog(result.message);
          showToast(result.message);
        }
        titleDeedModal.hide();
        resetDockActions();
        if (engine.getCurrentPlayer().id === myOnlinePlayerId) {
          scheduleFinishTurn(engine.getCurrentPlayer(), false, 800);
        }
      } else if (action.type === "DECLINE_BUY") {
        engine.state = state;
        hud.update(engine.state, handleShowPortfolio);
        if (result.message) {
          addGameLog(result.message);
        }
        titleDeedModal.hide();
        resetDockActions();
        if (engine.getCurrentPlayer().id === myOnlinePlayerId) {
          scheduleFinishTurn(engine.getCurrentPlayer(), false, 600);
        }
      } else if (action.type === "BUILD_HOUSE" || action.type === "SELL_HOUSE") {
        engine.state = state;
        hud.update(engine.state, handleShowPortfolio);
        boardRenderer.updateBuildings(engine.state.properties, engine.state.players);
        if (action.type === "BUILD_HOUSE") sound.playBuildHouse();
        if (result?.message) {
          addGameLog(result.message);
          showToast(result.message);
        }
        if (engine.state.pendingAction?.type === "DEBT_PROMPT" && engine.getCurrentPlayer().id === myOnlinePlayerId) {
          openDebtModal(engine.state.pendingAction);
        } else if (engine.getCurrentPlayer().id !== myOnlinePlayerId) {
          if (debtResolutionModal?.hide) debtResolutionModal.hide();
        }
      } else if (action.type === "MORTGAGE_PROPERTY" || action.type === "UNMORTGAGE_PROPERTY") {
        engine.state = state;
        hud.update(engine.state, handleShowPortfolio);
        boardRenderer.updateOwners(engine.state.properties, engine.state.players);
        boardRenderer.updateBuildings(engine.state.properties, engine.state.players);
        if (result?.message) {
          addGameLog(result.message);
          showToast(result.message);
        }
        if (engine.state.pendingAction?.type === "DEBT_PROMPT" && engine.getCurrentPlayer().id === myOnlinePlayerId) {
          openDebtModal(engine.state.pendingAction);
        } else if (engine.getCurrentPlayer().id !== myOnlinePlayerId) {
          if (debtResolutionModal?.hide) debtResolutionModal.hide();
        }
      } else if (action.type === "AUTO_RESOLVE_DEBT") {
        engine.state = state;
        hud.update(engine.state, handleShowPortfolio);
        boardRenderer.updateOwners(engine.state.properties, engine.state.players);
        boardRenderer.updateBuildings(engine.state.properties, engine.state.players);
        boardRenderer.updateJackpot(engine.state.jackpotPot);
        tokenRenderer.render(engine.state.players);
        if (result?.message) {
          addGameLog(result.message);
          showToast(result.message);
        }
        if (result?.event === "DEBT_RESOLVED" || !engine.state.pendingAction) {
          if (debtResolutionModal?.hide) debtResolutionModal.hide();
          sound.playSuccess();
          if (engine.getCurrentPlayer().id === myOnlinePlayerId) {
            scheduleFinishTurn(engine.getCurrentPlayer(), false, 1000);
          }
        } else if (engine.state.pendingAction?.type === "DEBT_PROMPT" && engine.getCurrentPlayer().id === myOnlinePlayerId) {
          openDebtModal(engine.state.pendingAction);
        } else {
          if (debtResolutionModal?.hide) debtResolutionModal.hide();
        }
      } else if (action.type === "PAY_DEBT") {
        engine.state = state;
        hud.update(engine.state, handleShowPortfolio);
        boardRenderer.updateOwners(engine.state.properties, engine.state.players);
        boardRenderer.updateBuildings(engine.state.properties, engine.state.players);
        boardRenderer.updateJackpot(engine.state.jackpotPot);
        tokenRenderer.render(engine.state.players);
        if (debtResolutionModal?.hide) debtResolutionModal.hide();
        sound.playSuccess();
        if (result?.message) {
          addGameLog(result.message);
          showToast(result.message);
        }
        if (engine.getCurrentPlayer().id === myOnlinePlayerId) {
          scheduleFinishTurn(engine.getCurrentPlayer(), false, 1000);
        }
      } else if (action.type === "CONCEDE_BANKRUPTCY") {
        engine.state = state;
        hud.update(engine.state, handleShowPortfolio);
        boardRenderer.updateOwners(engine.state.properties, engine.state.players);
        boardRenderer.updateBuildings(engine.state.properties, engine.state.players);
        tokenRenderer.render(engine.state.players);
        if (debtResolutionModal?.hide) debtResolutionModal.hide();
        sound.playJail();
        if (result?.message) {
          addGameLog(result.message);
          showToast(result.message);
        }
        if (result?.winner) {
          handleGameOver(result.winner, false);
        } else if (engine.getCurrentPlayer().id === myOnlinePlayerId) {
          scheduleFinishTurn(engine.getCurrentPlayer(), false, 800);
        }
      } else if (action.type === "CLOSE_CARD") {
        engine.state = state;
        hud.update(engine.state, handleShowPortfolio);
        tokenRenderer.render(engine.state.players);
        cardModal.hide();

        const curPlayer = engine.getCurrentPlayer();
        const cardRes = result?.result;
        const msg = result?.message || cardRes?.message;
        if (msg) {
          addGameLog(msg);
          showToast(msg);
        }
        if (cardRes) {
          triggerCardMoneyEffects(curPlayer, cardRes);
        }

        if (result && result.event !== "CARD_PROCESSED") {
          await renderLandingResult(curPlayer, result, false);
        } else if (engine.getCurrentPlayer().id === myOnlinePlayerId) {
          scheduleFinishTurn(engine.getCurrentPlayer(), false, 800);
        }
      } else if (action.type === "END_TURN") {
        clearEndTurnTimer();
        if (debtResolutionModal?.hide) debtResolutionModal.hide();
        if (cardModal?.hide) cardModal.hide();
        if (diceRenderer?.reset) diceRenderer.reset();
        engine.state = state;
        hud.update(engine.state, handleShowPortfolio);
        tokenRenderer.render(engine.state.players);
        boardRenderer.updateOwners(engine.state.properties, engine.state.players);
        boardRenderer.updateBuildings(engine.state.properties, engine.state.players);
        updateRoundPhaseHeader(engine.state);
        turnCount = engine.state.round || (turnCount + 1);
        const turnCountEl = document.getElementById("game-turn-count");
        if (turnCountEl) turnCountEl.textContent = turnCount;
        updateTurnControls();
        const nextP = engine.getCurrentPlayer();
        addGameLog(`➡️ Đến lượt của ${nextP.name}`);
      } else {
        engine.state = state;
        hud.update(engine.state, handleShowPortfolio);
        boardRenderer.updateOwners(engine.state.properties, engine.state.players);
        boardRenderer.updateBuildings(engine.state.properties, engine.state.players);
        if (result?.message) {
          addGameLog(result.message);
          showToast(result.message);
        }
      }
    });

    networkClient.on("gameOver", ({ winner }) => {
      if (debtResolutionModal?.hide) debtResolutionModal.hide();
      try {
        sessionStorage.removeItem("monopoly_reconnect_token");
        sessionStorage.removeItem("monopoly_room_id");
        sessionStorage.removeItem("monopoly_player_id");
      } catch (e) {}
      handleGameOver(winner, false);
    });

    networkClient.on("actionFailed", ({ action, error }) => {
      const errMsg = error || "Thao tác không hợp lệ";
      showToast(`⚠️ Không thể thực hiện: ${errMsg}`);
      addGameLog(`⚠️ Lỗi thao tác: ${errMsg}`);
      if (action?.type === "ROLL_DICE") {
        if (diceRenderer) {
          diceRenderer.isRolling = false;
        }
        updateTurnControls();
      }
    });

    networkClient.on("error", (msg) => {
      showToast(`⚠️ Lỗi mạng: ${msg}`);
    });

    networkClient.on("disconnected", () => {
      if (isOnlineMode) {
        showToast("⚠️ Mất kết nối tới máy chủ! Hệ thống đang tự động kết nối lại...");
      }
    });

    networkClient.on("connected", () => {
      if (isOnlineMode) {
        showToast("🌐 Đã kết nối lại máy chủ thành công!");
      }
    });

    networkClient.on("joined", (data) => {
      if (data.isReconnect && data.gameState && isOnlineMode) {
        engine.loadState(data.gameState);
        hud.update(engine.state, handleShowPortfolio);
        tokenRenderer.render(engine.state.players);
        boardRenderer.updateOwners(engine.state.properties, engine.state.players);
        boardRenderer.updateBuildings(engine.state.properties, engine.state.players);
        boardRenderer.updateJackpot(engine.state.jackpotPot);
        updateTurnControls();
        showToast("🔄 Trạng thái ván đấu đã được đồng bộ lại!");
      }
    });
  }

  // Kiểm tra session phòng online nếu vừa F5 / tải lại trang
  const onlineRoomId = sessionStorage.getItem("monopoly_room_id");
  const onlineReconnectToken = sessionStorage.getItem("monopoly_reconnect_token");

  if (onlineRoomId && onlineReconnectToken) {
    showToast("🌐 Đang khôi phục ván đấu trực tuyến...");
    onlineLobbyModal.tryAutoReconnect(startOnlineGame).then((success) => {
      if (!success) {
        try {
          sessionStorage.removeItem("monopoly_reconnect_token");
          sessionStorage.removeItem("monopoly_room_id");
          sessionStorage.removeItem("monopoly_player_id");
        } catch (e) {}
        gameSetupModal.show(startNewGame, resumeGame, null, (preset) =>
          onlineLobbyModal.show(startOnlineGame, null, preset),
        );
      }
    });
  } else {
    // Khởi động GameSetupModal ngay khi vào trang (hỗ trợ Tiếp Tục hoặc Ván Mới)
    gameSetupModal.show(startNewGame, resumeGame, null, (preset) =>
      onlineLobbyModal.show(startOnlineGame, null, preset),
    );
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initGameApp);
} else {
  initGameApp();
}

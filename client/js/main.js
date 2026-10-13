/**
 * main.js - Tích hợp đầy đủ GameEngine, Cockpit Dashboard 3 Cột, AI Bot & Dock Điều Khiển
 */

import { SAIGON_BOARD_DATA } from '../../shared/data/board-data.js';
import { GameEngine } from '../../shared/engine.js';
import { GameRules } from '../../shared/rules.js';
import { BotAI } from '../../shared/BotAI.js';
import { BoardRenderer } from './render/BoardRenderer.js';
import { GAME_TOKENS } from './render/TokensData.js';
import { TokenRenderer } from './render/TokenRenderer.js';
import { DiceRenderer } from './render/DiceRenderer.js';
import { HUD } from './ui/HUD.js';
import { TitleDeedModal } from './ui/TitleDeedModal.js';
import { CardModal } from './ui/CardModal.js';
import { AuctionModal } from './ui/AuctionModal.js';
import { TradeModal } from './ui/TradeModal.js';
import { GameSetupModal } from './ui/GameSetupModal.js';
import { RulebookModal } from './ui/RulebookModal.js';
import { sound } from './audio/SoundEffects.js';

document.addEventListener('DOMContentLoaded', () => {
  const boardElement = document.getElementById('monopoly-board');

  if (!boardElement) {
    console.error('Không tìm thấy bàn cờ!');
    return;
  }

  // Khởi tạo các Modal
  const titleDeedModal = new TitleDeedModal();
  const cardModal = new CardModal();
  const auctionModal = new AuctionModal();
  const tradeModal = new TradeModal();
  const gameSetupModal = new GameSetupModal();
  const rulebookModal = new RulebookModal();

  // Khởi tạo HUD 2 cánh
  const hud = new HUD(
    document.getElementById('sidebar-left'),
    document.getElementById('sidebar-right')
  );

  let engine = null;
  let boardRenderer = null;
  let tokenRenderer = null;
  let diceRenderer = null;

  // Các nút điều khiển Dock
  const btnBuy = document.getElementById('btn-action-buy');
  const btnBuild = document.getElementById('btn-action-build');
  const btnTrade = document.getElementById('btn-action-trade');
  const btnPass = document.getElementById('btn-action-pass');
  const btnRoll = document.getElementById('btn-roll');

  // Banner ô đang đứng
  const standingNameEl = document.getElementById('standing-tile-name');
  const standingPriceEl = document.getElementById('standing-tile-price');
  const standingStatusEl = document.getElementById('standing-tile-status');

  // Game log
  const logContainer = document.getElementById('game-log-messages');

  // Timer
  let secondsElapsed = 0;
  let timerInterval = null;
  let turnCount = 1;

  function formatMoney(amount) {
    if (!amount) return '0đ';
    if (amount >= 1_000_000) {
      const m = amount / 1_000_000;
      return Number.isInteger(m) ? `${m}.0M` : `${m.toFixed(1)}M`;
    }
    return `${Math.round(amount / 1_000)}K`;
  }

  function addGameLog(message) {
    if (!logContainer) return;
    const item = document.createElement('div');
    item.className = 'log-item';
    item.textContent = message;
    logContainer.prepend(item);
    while (logContainer.children.length > 5) {
      logContainer.removeChild(logContainer.lastChild);
    }
  }

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    secondsElapsed = 0;
    const timerEl = document.getElementById('game-timer');
    timerInterval = setInterval(() => {
      secondsElapsed++;
      const mins = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
      const secs = String(secondsElapsed % 60).padStart(2, '0');
      if (timerEl) timerEl.textContent = `${mins}:${secs}`;
    }, 1000);
  }

  function updateStandingBanner(tile, statusText = '') {
    if (!tile) return;
    if (standingNameEl) standingNameEl.textContent = tile.name;
    if (standingPriceEl) {
      standingPriceEl.textContent = tile.price ? formatMoney(tile.price) : '';
    }
    if (standingStatusEl) standingStatusEl.textContent = statusText;
  }

  function resetDockActions() {
    if (btnBuy) {
      btnBuy.disabled = true;
      btnBuy.querySelector('.act-title').textContent = 'Mua Đất';
      btnBuy.onclick = null;
    }
    if (btnPass) {
      btnPass.disabled = true;
      btnPass.onclick = null;
    }
  }

  /**
   * Bắt đầu một ván chơi mới
   */
  function startNewGame(playersConfig) {
    engine = new GameEngine(playersConfig);
    hud.update(engine.state);
    turnCount = 1;
    const turnCountEl = document.getElementById('game-turn-count');
    if (turnCountEl) turnCountEl.textContent = turnCount;

    startTimer();
    addGameLog('Ván cờ bắt đầu! Chúc các cơ thủ may mắn!');

    // 1. Render bàn cờ
    boardRenderer = new BoardRenderer(boardElement);
    boardRenderer.render(SAIGON_BOARD_DATA, (tile) => {
      if (['property', 'railroad', 'utility'].includes(tile.type)) {
        const currentPlayer = engine.getCurrentPlayer();
        const owner = engine.getOwner(tile.id);
        const propState = engine.state.properties[tile.id] || {};
        const isOwner = owner && owner.id === currentPlayer.id;

        const buildCheck = isOwner ? GameRules.canBuildHouse(tile, currentPlayer, engine.state.properties) : null;
        const sellCheck = isOwner ? GameRules.canSellHouse(tile, currentPlayer, engine.state.properties) : null;
        const mortgageCheck = isOwner ? GameRules.canMortgage(tile, currentPlayer, engine.state.properties) : null;
        const unmortgageCheck = isOwner ? GameRules.canUnmortgage(tile, currentPlayer, engine.state.properties) : null;

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
            const res = engine.applyAction({ type: 'BUILD_HOUSE', tileId: tile.id });
            if (res.success) {
              boardRenderer.updateBuildings(engine.state.properties);
              hud.update(engine.state);
              sound.playBuildHouse();
              addGameLog(res.message);
              showToast(res.message);
            }
          },
          onSell: () => {
            const res = engine.applyAction({ type: 'SELL_HOUSE', tileId: tile.id });
            if (res.success) {
              boardRenderer.updateBuildings(engine.state.properties);
              hud.update(engine.state);
              addGameLog(res.message);
              showToast(res.message);
            }
          },
          onMortgage: () => {
            const res = engine.applyAction({ type: 'MORTGAGE_PROPERTY', tileId: tile.id });
            if (res.success) {
              boardRenderer.updateOwners(engine.state.properties, engine.state.players);
              hud.update(engine.state);
              addGameLog(res.message);
              showToast(res.message);
            }
          },
          onUnmortgage: () => {
            const res = engine.applyAction({ type: 'UNMORTGAGE_PROPERTY', tileId: tile.id });
            if (res.success) {
              boardRenderer.updateOwners(engine.state.properties, engine.state.players);
              hud.update(engine.state);
              addGameLog(res.message);
              showToast(res.message);
            }
          }
        });
      }
    });

    // 2. Render quân cờ
    tokenRenderer = new TokenRenderer(boardElement);
    tokenRenderer.render(engine.state.players);

    // 3. Khởi tạo Xúc xắc
    diceRenderer = new DiceRenderer(null, async ({ val1, val2, total, isDoubles }) => {
      await handleDiceRolled(val1, val2, total, isDoubles);
    });

    // Nút Giao Dịch
    if (btnTrade) {
      btnTrade.onclick = () => {
        tradeModal.show(engine, (tradeRes) => {
          if (tradeRes && tradeRes.success) {
            boardRenderer.updateOwners(engine.state.properties, engine.state.players);
            hud.update(engine.state);
            addGameLog(tradeRes.message);
            showToast(tradeRes.message);
          }
        });
      };
    }

    // Nút Bật / Tắt Âm Thanh
    const btnSound = document.getElementById('btn-toggle-sound');
    if (btnSound) {
      btnSound.textContent = sound.isMuted ? '🔇' : '🔊';
      btnSound.onclick = () => {
        const isAudioOn = sound.toggleMute();
        btnSound.textContent = isAudioOn ? '🔊' : '🔇';
        showToast(isAudioOn ? '🔊 Đã bật âm thanh' : '🔇 Đã tắt âm thanh');
        if (isAudioOn) sound.playSaigonHorn();
      };
    }

    // Nút Sổ Tay Luật Chơi
    const btnRulebook = document.getElementById('btn-open-rulebook');
    if (btnRulebook) {
      btnRulebook.onclick = () => rulebookModal.show();
    }

    // Nút Tạo Ván Mới trên Header
    const btnRestart = document.getElementById('btn-restart-game');
    if (btnRestart) {
      btnRestart.onclick = () => gameSetupModal.show(startNewGame);
    }

    updateStandingBanner(SAIGON_BOARD_DATA[0], 'Vị trí xuất phát');

    // Click khay thẻ Cơ Hội / Khí Vận ở sidebar phải để xem thẻ bài
    document.querySelectorAll('.special-deck-card').forEach((deckEl) => {
      deckEl.style.cursor = 'pointer';
      deckEl.title = 'Nhấn để xem thẻ bài Sài Gòn';
      deckEl.onclick = () => {
        const isChance = deckEl.classList.contains('chance');
        const type = isChance ? 'chance' : 'chest';
        const card = engine.drawCard(type);
        sound.playCardDraw();
        cardModal.show(type, card, { message: 'Bộ sưu tập thẻ Sài Gòn đặc biệt' });
      };
    });

    checkBotTurn();
  }

  /**
   * Xử lý sau khi xúc xắc hoàn thành lắc
   */
  async function handleDiceRolled(val1, val2, total, isDoubles) {
    const currentPlayer = engine.getCurrentPlayer();
    sound.playDiceRoll();
    const rollResult = engine.applyAction({ type: 'ROLL_DICE', val1, val2 });

    if (!rollResult.success) {
      showToast(`⚠️ ${rollResult.error}`);
      return;
    }

    addGameLog(`🎲 ${currentPlayer.name} đổ ${val1} + ${val2} = ${total} bước.`);

    if (rollResult.event === 'JAIL_THREE_DOUBLES' || rollResult.steps === 0) {
      tokenRenderer.render(engine.state.players);
      hud.update(engine.state);
      addGameLog(rollResult.message);
      showToast(rollResult.message);
      if (rollResult.event === 'JAIL_THREE_DOUBLES') sound.playJail();
      finishTurn(isDoubles);
      return;
    }

    // Nhảy từng ô một
    await tokenRenderer.moveStepByStep(currentPlayer, total, engine.state.players, {
      onStep: () => {
        sound.playTokenStep();
      },
      onPassedGo: (p) => {
        p.money += 2_000_000;
        hud.update(engine.state);
        sound.playCoin();
        addGameLog(`🎉 ${p.name} qua Khởi Hành: +2.0M!`);
        showToast(`🎉 ${p.name} qua Khởi Hành: +2.000.000đ!`);
      },
      onComplete: async (p, landingPos) => {
        const landResult = engine.applyAction({ type: 'COMPLETE_MOVEMENT', position: landingPos });
        hud.update(engine.state);

        const currentTile = SAIGON_BOARD_DATA[landingPos];

        // A. Ô Cơ Hội / Khí Vận
        if (landResult.event === 'CARD_DRAWN') {
          sound.playCardDraw();
          updateStandingBanner(currentTile, `Rút thẻ ${landResult.cardType === 'chance' ? 'Cơ Hội' : 'Khí Vận'}`);
          if (p.isBot) {
            cardModal.show(landResult.cardType, landResult.card, landResult.result);
            setTimeout(() => {
              cardModal.hide();
              engine.applyAction({ type: 'CLOSE_CARD' });
              tokenRenderer.render(engine.state.players);
              hud.update(engine.state);
              addGameLog(landResult.result.message);
              finishTurn(isDoubles);
            }, 1800);
          } else {
            cardModal.show(landResult.cardType, landResult.card, landResult.result, () => {
              engine.applyAction({ type: 'CLOSE_CARD' });
              tokenRenderer.render(engine.state.players);
              hud.update(engine.state);
              addGameLog(landResult.result.message);
              showToast(landResult.result.message);
              finishTurn(isDoubles);
            });
          }
        }
        // B. Ô Đất Trống -> Mua đất hoặc Đấu giá
        else if (landResult.event === 'BUY_PROMPT') {
          updateStandingBanner(currentTile, 'Đất trống - Có thể mua!');

          if (p.isBot) {
            // Bot tự đánh giá
            const decision = BotAI.shouldBuyProperty(p, landResult.tile, engine.state);
            if (decision.shouldBuy) {
              const buyRes = engine.applyAction({ type: 'BUY_PROPERTY' });
              boardRenderer.updateOwners(engine.state.properties, engine.state.players);
              hud.update(engine.state);
              sound.playSuccess();
              addGameLog(`🤖 ${p.name} đã mua ${landResult.tile.name}!`);
              showToast(`🤖 ${p.name} đã mua ${landResult.tile.name}!`);
              setTimeout(() => finishTurn(isDoubles), 1000);
            } else {
              addGameLog(`🤖 ${p.name} bỏ qua mua đất. Bắt đầu đấu giá!`);
              startAuctionFlow(landResult.tile, isDoubles);
            }
          } else {
            // Kích hoạt nút Mua Đất & Bỏ Qua ngay trên thanh Dock!
            if (btnBuy) {
              btnBuy.disabled = false;
              btnBuy.querySelector('.act-title').textContent = `Mua (${formatMoney(currentTile.price)})`;
              btnBuy.onclick = () => {
                const buyRes = engine.applyAction({ type: 'BUY_PROPERTY' });
                resetDockActions();
                if (buyRes.success) {
                  boardRenderer.updateOwners(engine.state.properties, engine.state.players);
                  hud.update(engine.state);
                  sound.playSuccess();
                  addGameLog(buyRes.message);
                  showToast(buyRes.message);
                }
                finishTurn(isDoubles);
              };
            }
            if (btnPass) {
              btnPass.disabled = false;
              btnPass.querySelector('.act-title').textContent = 'Đấu Giá';
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
                const buyRes = engine.applyAction({ type: 'BUY_PROPERTY' });
                if (buyRes.success) {
                  boardRenderer.updateOwners(engine.state.properties, engine.state.players);
                  hud.update(engine.state);
                  sound.playSuccess();
                  addGameLog(buyRes.message);
                  showToast(buyRes.message);
                }
                finishTurn(isDoubles);
              },
              onDecline: () => {
                resetDockActions();
                addGameLog(`🔨 ${p.name} bỏ qua mua đất. Bắt đầu đấu giá!`);
                startAuctionFlow(landResult.tile, isDoubles);
              }
            });
          }
        }
        // C. Tiền thuê đất
        else if (landResult.event === 'RENT_PAID') {
          updateStandingBanner(currentTile, `Đã trả ${formatMoney(landResult.rent)} tiền thuê`);
          sound.playCoin();
          addGameLog(landResult.message);
          showToast(landResult.message);
          setTimeout(() => finishTurn(isDoubles), 1400);
        }
        // D. Ô Thuế
        else if (landResult.event === 'TAX_PAID') {
          updateStandingBanner(currentTile, 'Nộp thuế cho thành phố');
          sound.playCoin();
          addGameLog(landResult.message);
          showToast(landResult.message);
          setTimeout(() => finishTurn(isDoubles), 1400);
        }
        // E. Vào tù
        else if (landResult.event === 'GO_TO_JAIL') {
          updateStandingBanner(currentTile, '🚨 Bị bắt vào buồng giam');
          sound.playJail();
          tokenRenderer.render(engine.state.players);
          addGameLog(landResult.message);
          showToast(landResult.message);
          setTimeout(() => finishTurn(false), 1400);
        }
        // F. Ô an toàn
        else {
          updateStandingBanner(currentTile, 'Nghỉ chân an toàn');
          setTimeout(() => finishTurn(isDoubles), 1000);
        }
      }
    });
  }

  /**
   * Quản lý phiên đấu giá
   */
  function startAuctionFlow(tile, isDoubles) {
    const auctionStart = engine.applyAction({ type: 'START_AUCTION', tileId: tile.id });
    if (!auctionStart.success) {
      engine.applyAction({ type: 'DECLINE_BUY' });
      finishTurn(isDoubles);
      return;
    }

    const processAuctionStep = () => {
      auctionModal.render(engine, (auctionEndRes) => {
        boardRenderer.updateOwners(engine.state.properties, engine.state.players);
        hud.update(engine.state);
        addGameLog(auctionEndRes.message);
        showToast(auctionEndRes.message);
        finishTurn(isDoubles);
      });

      const auction = engine.state.auction;
      if (!auction) return;

      const currentBidder = engine.state.players.find((p) => p.id === auction.currentTurnPlayerId);
      if (currentBidder && currentBidder.isBot) {
        setTimeout(() => {
          if (!engine.state.auction) return;
          const decision = BotAI.getAuctionDecision(currentBidder, engine.state.auction, engine.state);
          if (decision.action === 'BID') {
            const bidRes = engine.applyAction({
              type: 'BID_AUCTION',
              playerId: currentBidder.id,
              amount: decision.amount
            });
            if (bidRes.event === 'AUCTION_COMPLETED') {
              auctionModal.showResult(bidRes, () => {
                boardRenderer.updateOwners(engine.state.properties, engine.state.players);
                hud.update(engine.state);
                addGameLog(bidRes.message);
                showToast(bidRes.message);
                finishTurn(isDoubles);
              });
              return;
            }
          } else {
            const passRes = engine.applyAction({
              type: 'PASS_AUCTION',
              playerId: currentBidder.id
            });
            if (passRes.event === 'AUCTION_COMPLETED' || passRes.event === 'AUCTION_CANCELLED') {
              auctionModal.showResult(passRes, () => {
                boardRenderer.updateOwners(engine.state.properties, engine.state.players);
                hud.update(engine.state);
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
        const buildRes = engine.applyAction({ type: 'BUILD_HOUSE', tileId });
        if (buildRes.success) {
          boardRenderer.updateBuildings(engine.state.properties);
          sound.playBuildHouse();
          addGameLog(`🏗️ ${justPlayed.name} nâng cấp nhà tại ${buildRes.tile.name}!`);
        }
      }
    }

    const endRes = engine.applyAction({ type: 'END_TURN' });
    hud.update(engine.state);

    if (endRes.event !== 'EXTRA_TURN') {
      turnCount++;
      const turnCountEl = document.getElementById('game-turn-count');
      if (turnCountEl) turnCountEl.textContent = turnCount;
    }

    checkBotTurn();
  }

  /**
   * Kiểm tra nếu là lượt của Bot
   */
  function checkBotTurn() {
    const curPlayer = engine.getCurrentPlayer();

    if (curPlayer.isBot && !curPlayer.isBankrupt) {
      if (btnRoll) {
        btnRoll.disabled = true;
        btnRoll.querySelector('.roll-label').textContent = 'BOT ĐANG ĐI...';
      }
      setTimeout(() => {
        if (diceRenderer && !diceRenderer.isRolling) {
          diceRenderer.roll();
        }
      }, 1000);
    } else {
      if (btnRoll) {
        btnRoll.disabled = false;
        btnRoll.querySelector('.roll-label').textContent = 'TUNG XÚC XẮC';
      }
    }
  }

  function showToast(message) {
    let toast = document.getElementById('game-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'game-toast';
      toast.className = 'game-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2800);
  }

  // Khởi động GameSetupModal ngay khi vào trang
  gameSetupModal.show(startNewGame);
});

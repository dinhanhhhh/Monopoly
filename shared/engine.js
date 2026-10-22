import { GAME_CONSTANTS, formatVND } from "./constants.js";
import { SAIGON_BOARD_DATA } from "./data/board-data.js";
import { CHANCE_CARDS } from "./data/chance-cards.js";
import { CHEST_CARDS } from "./data/chest-cards.js";
import { GameRules } from "./rules.js";

export const TURN_STATES = {
  WAIT_ROLL: "WAIT_ROLL",
  ROLLING: "ROLLING",
  MOVING: "MOVING",
  ACTION_REQUIRED: "ACTION_REQUIRED",
  END_TURN: "END_TURN",
  GAME_OVER: "GAME_OVER",
};

/**
 * 32-bit FNV-1a like string hashing
 */
export function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
  }
  return hash >>> 0;
}

/**
 * 32-bit Mulberry32 PRNG (deterministic seeded random generator)
 */
export function createMulberry32(seed) {
  let s = (typeof seed === "number" ? Math.floor(seed) : hashString(String(seed))) >>> 0;
  return function mulberry32() {
    s |= 0;
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class GameEngine {
  constructor(playerConfigs = [], options = {}) {
    this.options = options;
    const seed =
      options.seed !== undefined && options.seed !== null
        ? options.seed
        : Math.floor(Math.random() * 0xffffffff);
    this.seed = seed;
    this.rng =
      typeof options.rng === "function" ? options.rng : createMulberry32(seed);
    this.state = this.createInitialState(playerConfigs, options);
  }

  createInitialState(playerConfigs, options = {}) {
    const players = playerConfigs.map((cfg, idx) => ({
      id: cfg.id || `p${idx + 1}`,
      name: cfg.name || `Người chơi ${idx + 1}`,
      token: cfg.token,
      money:
        cfg.money !== undefined ? cfg.money : GAME_CONSTANTS.STARTING_MONEY,
      position: 0,
      inJail: false,
      jailTurns: 0,
      hasJailCard: false,
      isBankrupt: false,
      isBot: !!cfg.isBot,
      personality: cfg.personality || (cfg.isBot ? "balanced" : null),
      // Tâm trạng ván đấu (Bot Mood): 0.9 ~ 1.1 cố định cả ván để tạo tính cách tự nhiên, serialize được
      mood: cfg.isBot
        ? Math.round((0.9 + this.rng() * 0.2) * 100) / 100
        : 1,
    }));

    const properties = {};
    SAIGON_BOARD_DATA.forEach((tile) => {
      if (["property", "railroad", "utility"].includes(tile.type)) {
        properties[tile.id] = {
          owner: null,
          houses: 0,
          isMortgaged: false,
        };
      }
    });

    // Chế độ Chơi Nhanh (Fast Mode): Phát ngẫu nhiên 2 - 3 mảnh đất cho mỗi người chơi
    if (options.fastMode) {
      const regularPropIds = SAIGON_BOARD_DATA.filter(
        (t) => t.type === "property",
      ).map((t) => t.id);
      const shuffledProps = this.shuffleArray([...regularPropIds]);
      let propIndex = 0;
      players.forEach((p) => {
        const count = 3; // Phát sẵn 3 ô đất
        for (let i = 0; i < count && propIndex < shuffledProps.length; i++) {
          const tid = shuffledProps[propIndex++];
          properties[tid].owner = p.id;
        }
      });
    }

    const chanceDeck = this.shuffleArray([...CHANCE_CARDS]);
    const chestDeck = this.shuffleArray([...CHEST_CARDS]);

    return {
      seed: this.seed,
      players,
      properties,
      chanceDeck,
      chestDeck,
      currentTurnIndex: 0,
      turnState: TURN_STATES.WAIT_ROLL,
      consecutiveDoubles: 0,
      lastRoll: null,
      pendingAction: null,
      jackpotPot: 1_000_000, // Hũ Quỹ Trúng Thưởng khởi điểm 1.000.000đ
      round: 1, // Vòng đấu hiện tại của bàn cờ
      isEndless: !!options.isEndless,
      maxRounds: options.isEndless
        ? null
        : (options.maxRounds || (options.fastMode ? 30 : GAME_CONSTANTS.MAX_ROUNDS)),
      announcedPhases: {}, // Tránh thông báo trùng lặp nhiều lần
      history: [],
      cardHistory: [],
    };
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  getCurrentPlayer() {
    return this.state.players[this.state.currentTurnIndex];
  }

  getTile(id) {
    return SAIGON_BOARD_DATA[id];
  }

  getOwner(tileId) {
    const prop = this.state.properties[tileId];
    if (!prop || !prop.owner) return null;
    return this.state.players.find((p) => p.id === prop.owner) || null;
  }

  drawCard(deckType) {
    const deckKey = deckType === "chance" ? "chanceDeck" : "chestDeck";
    const originalCards = deckType === "chance" ? CHANCE_CARDS : CHEST_CARDS;

    if (this.state[deckKey].length === 0) {
      this.state[deckKey] = this.shuffleArray([...originalCards]);
    }

    return this.state[deckKey].pop();
  }

  executeCard(player, card) {
    const act = card.action;

    switch (act.type) {
      case "ADD_MONEY":
        player.money += act.amount;
        return {
          amount: act.amount,
          actionType: "ADD_MONEY",
          message: `${player.name} nhận được +${formatVND(act.amount)}!`,
        };

      case "SUB_MONEY":
        player.money -= act.amount;
        return {
          amount: -act.amount,
          actionType: "SUB_MONEY",
          message: `${player.name} bị trừ -${formatVND(act.amount)}!`,
        };

      case "PAY_ALL_PLAYERS": {
        let totalPaid = 0;
        this.state.players.forEach((p) => {
          if (p.id !== player.id && !p.isBankrupt) {
            player.money -= act.amount;
            p.money += act.amount;
            totalPaid += act.amount;
          }
        });
        return {
          amount: act.amount,
          actionType: "PAY_ALL_PLAYERS",
          message: `${player.name} đã trả ${formatVND(act.amount)} cho mỗi người chơi!`,
        };
      }

      case "RECEIVE_FROM_ALL": {
        this.state.players.forEach((p) => {
          if (p.id !== player.id && !p.isBankrupt) {
            p.money -= act.amount;
            player.money += act.amount;
          }
        });
        return {
          amount: act.amount,
          actionType: "RECEIVE_FROM_ALL",
          message: `${player.name} đã thu ${formatVND(act.amount)} từ mỗi người chơi!`,
        };
      }

      case "REPAIR_HOUSES": {
        let totalCost = 0;
        let housesCount = 0;
        let hotelsCount = 0;
        Object.entries(this.state.properties || {}).forEach(([tId, prop]) => {
          if (prop.ownerId === player.id) {
            if (prop.houses === 5) {
              hotelsCount += 1;
              totalCost += act.hotelFee || 1_000_000;
            } else if (prop.houses > 0) {
              housesCount += prop.houses;
              totalCost += prop.houses * (act.houseFee || 250_000);
            }
          }
        });
        player.money -= totalCost;
        return {
          amount: -totalCost,
          actionType: "SUB_MONEY",
          message:
            totalCost > 0
              ? `${player.name} nộp ${formatVND(totalCost)} phí bảo trì (${housesCount} nhà, ${hotelsCount} khách sạn)!`
              : `${player.name} không có công trình cần bảo trì!`,
        };
      }

      case "GET_JAIL_CARD":
        player.hasJailCard = true;
        return { message: `🎉 ${player.name} đã sở hữu Thẻ Ra Tù Miễn Phí!` };

      case "GO_TO_JAIL":
        this.sendToJail(player);
        return {
          message: `🚨 ${player.name} bị đưa thẳng vào buồng giam!`,
          moveTarget: 10,
        };

      case "MOVE_TO": {
        const prevPos = player.position;
        player.position = act.target;
        if (act.passGoReward && (act.target === 0 || player.position < prevPos)) {
          const isEndless = !!this.state.isEndless || !this.state.maxRounds;
          const phase = GameRules.getPhase(
            this.state.round,
            this.state.maxRounds,
          );
          const salary = isEndless
            ? GAME_CONSTANTS.GO_REWARD || 2_000_000
            : phase.salary;
          player.money += salary;
        }
        return {
          message: `${player.name} di chuyển đến ${this.getTile(act.target).name}!`,
          moveTarget: act.target,
        };
      }

      case "STEP_BACK": {
        player.position = (player.position - act.steps + 40) % 40;
        return {
          message: `${player.name} lùi lại ${act.steps} ô!`,
          moveTarget: player.position,
        };
      }

      case "MOVE_NEAREST_RAILROAD": {
        const railroads = [5, 15, 25, 35];
        const prevPos = player.position;
        let target = railroads.find((r) => r > player.position);
        if (!target) target = railroads[0];
        player.position = target;
        if (player.position < prevPos) {
          const isEndless = !!this.state.isEndless || !this.state.maxRounds;
          const phase = GameRules.getPhase(
            this.state.round,
            this.state.maxRounds,
          );
          const salary = isEndless
            ? GAME_CONSTANTS.GO_REWARD || 2_000_000
            : phase.salary;
          player.money += salary;
        }
        return {
          message: `${player.name} đi đến Bến xe gần nhất: ${this.getTile(target).name}!`,
          moveTarget: target,
          doubleRent: !!act.doubleRent,
        };
      }

      case "MOVE_NEAREST_UTILITY": {
        const utilities = [12, 28];
        const prevPos = player.position;
        let target = utilities.find((u) => u > player.position);
        if (!target) target = utilities[0];
        player.position = target;
        if (player.position < prevPos) {
          const isEndless = !!this.state.isEndless || !this.state.maxRounds;
          const phase = GameRules.getPhase(
            this.state.round,
            this.state.maxRounds,
          );
          const salary = isEndless
            ? GAME_CONSTANTS.GO_REWARD || 2_000_000
            : phase.salary;
          player.money += salary;
        }
        return {
          message: `${player.name} đi đến Tiện ích gần nhất: ${this.getTile(target).name}!`,
          moveTarget: target,
          utility10x: true,
        };
      }

      default:
        return { message: card.desc };
    }
  }

  applyAction(action) {
    const player = this.getCurrentPlayer();

    switch (action.type) {
      case "ROLL_DICE": {
        if (this.state.turnState !== TURN_STATES.WAIT_ROLL) {
          return { success: false, error: "Không thể tung xúc xắc lúc này" };
        }

        const val1 = action.val1 || Math.floor(this.rng() * 6) + 1;
        const val2 = action.val2 || Math.floor(this.rng() * 6) + 1;
        const isDoubles = val1 === val2;
        const total = val1 + val2;

        this.state.lastRoll = { val1, val2, total, isDoubles };
        this.state.turnState = TURN_STATES.ROLLING;

        if (player.inJail) {
          if (isDoubles) {
            player.inJail = false;
            player.jailTurns = 0;
            this.state.consecutiveDoubles = 0;
            this.state.turnState = TURN_STATES.MOVING;
            this.state.escapedJailThisTurn = true;
            return {
              success: true,
              event: "JAIL_FREE_DOUBLES",
              message: `🎉 ${player.name} tung đôi ${val1}-${val2} được ra tù tự do!`,
              steps: total,
              state: this.state,
            };
          } else {
            player.jailTurns += 1;
            if (player.jailTurns >= GAME_CONSTANTS.MAX_JAIL_TURNS) {
              player.money -= GAME_CONSTANTS.JAIL_FINE;
              player.inJail = false;
              player.jailTurns = 0;
              this.state.turnState = TURN_STATES.MOVING;
              return {
                success: true,
                event: "JAIL_FORCED_PAY",
                message: `⚠️ Hết 3 lượt, ${player.name} nộp phạt 500K để ra tù và đi tiếp!`,
                steps: total,
                state: this.state,
              };
            } else {
              this.state.turnState = TURN_STATES.END_TURN;
              return {
                success: true,
                event: "JAIL_STAY",
                message: `${player.name} chưa tung ra đôi (${player.jailTurns}/${GAME_CONSTANTS.MAX_JAIL_TURNS}). Vẫn ở tù!`,
                steps: 0,
                state: this.state,
              };
            }
          }
        }

        if (isDoubles) {
          this.state.consecutiveDoubles += 1;
          if (this.state.consecutiveDoubles >= 3) {
            this.sendToJail(player);
            return {
              success: true,
              event: "JAIL_THREE_DOUBLES",
              message: `🚨 ${player.name} tung đôi 3 lần liên tiếp! Bị bắt vào tù ngay!`,
              steps: 0,
              state: this.state,
            };
          }
        } else {
          this.state.consecutiveDoubles = 0;
        }

        this.state.turnState = TURN_STATES.MOVING;
        return {
          success: true,
          event: "DICE_ROLLED",
          val1,
          val2,
          total,
          isDoubles,
          steps: total,
          state: this.state,
        };
      }

      case "COMPLETE_MOVEMENT": {
        const landingPos = action.position;
        const prevPos = player.position;
        player.position = landingPos;

        let salaryEarned = 0;
        let passedGo = false;
        if (!player.inJail && landingPos < prevPos) {
          const isEndless = !!this.state.isEndless || !this.state.maxRounds;
          const phase = GameRules.getPhase(
            this.state.round,
            this.state.maxRounds,
          );
          const salary = isEndless
            ? GAME_CONSTANTS.GO_REWARD || 2_000_000
            : phase.salary;
          if (salary > 0) {
            player.money += salary;
            salaryEarned = salary;
            passedGo = true;
          }
        }

        const landRes = this.evaluateLanding(player, landingPos, action);
        if (passedGo) {
          landRes.passedGo = true;
          landRes.salary = salaryEarned;
        }
        return landRes;
      }

      case "PAY_JAIL_FINE": {
        if (!player.inJail) {
          return { success: false, error: "Người chơi không ở trong tù" };
        }
        if (player.money < GAME_CONSTANTS.JAIL_FINE) {
          return {
            success: false,
            error: `Không đủ tiền nộp phạt (${formatVND(GAME_CONSTANTS.JAIL_FINE)})`,
          };
        }
        player.money -= GAME_CONSTANTS.JAIL_FINE;
        this.state.jackpotPot =
          (this.state.jackpotPot || 0) + GAME_CONSTANTS.JAIL_FINE;
        player.inJail = false;
        player.jailTurns = 0;
        this.state.turnState = TURN_STATES.WAIT_ROLL;
        return {
          success: true,
          event: "JAIL_PAID_FINE",
          fineAmount: GAME_CONSTANTS.JAIL_FINE,
          message: `💸 ${player.name} đã nộp phạt ${formatVND(GAME_CONSTANTS.JAIL_FINE)} vào Quỹ Trúng Thưởng để ra tù!`,
          state: this.state,
        };
      }

      case "USE_JAIL_CARD": {
        if (!player.inJail) {
          return { success: false, error: "Người chơi không ở trong tù" };
        }
        if (!player.hasJailCard) {
          return { success: false, error: "Bạn không có Thẻ Ra Tù" };
        }
        player.hasJailCard = false;
        player.inJail = false;
        player.jailTurns = 0;
        this.state.turnState = TURN_STATES.WAIT_ROLL;
        return {
          success: true,
          event: "JAIL_USED_CARD",
          message: `🎟️ ${player.name} đã dùng Thẻ Ra Tù Miễn Phí!`,
          state: this.state,
        };
      }

      case "BUY_PROPERTY": {
        const tile = this.getTile(player.position);
        const prop = this.state.properties[tile.id];

        if (!prop || prop.owner) {
          return { success: false, error: "Ô đất này không thể mua" };
        }
        if (player.money < tile.price) {
          return { success: false, error: "Không đủ tiền mua đất" };
        }

        player.money -= tile.price;
        prop.owner = player.id;
        this.state.pendingAction = null;
        this.state.turnState = TURN_STATES.END_TURN;

        return {
          success: true,
          event: "PROPERTY_BOUGHT",
          message: `🏠 ${player.name} đã mua thành công ${tile.name} với giá ${formatVND(tile.price)}!`,
          state: this.state,
        };
      }

      case "DECLINE_BUY": {
        this.state.pendingAction = null;
        this.state.turnState = TURN_STATES.END_TURN;
        return {
          success: true,
          event: "PROPERTY_DECLINED",
          message: `${player.name} bỏ qua không mua ô này.`,
          state: this.state,
        };
      }

      case "BUILD_HOUSE": {
        const tile = this.getTile(action.tileId);
        const check = GameRules.canBuildHouse(
          tile,
          player,
          this.state.properties,
        );

        if (!check.canBuild) {
          return { success: false, error: check.reason };
        }

        player.money -= check.cost;
        const prop = this.state.properties[tile.id];
        prop.houses = check.nextLevel;

        const buildingType = check.isHotel
          ? "Khách Sạn Đỏ 🏨"
          : `Ngôi Nhà Xanh thứ ${check.nextLevel} 🏠`;
        return {
          success: true,
          event: "HOUSE_BUILT",
          tile,
          houses: prop.houses,
          isHotel: check.isHotel,
          message: `🏗️ ${player.name} đã xây thành công ${buildingType} tại ${tile.name}!`,
          state: this.state,
        };
      }

      case "MORTGAGE_PROPERTY": {
        const tile = this.getTile(action.tileId);
        const check = GameRules.canMortgage(
          tile,
          player,
          this.state.properties,
        );
        if (!check.canMortgage) {
          return { success: false, error: check.reason };
        }
        player.money += check.mortgageValue;
        this.state.properties[tile.id].isMortgaged = true;
        return {
          success: true,
          event: "PROPERTY_MORTGAGED",
          tile,
          mortgageValue: check.mortgageValue,
          message: `🔒 ${player.name} đã thế chấp ${tile.name}, nhận ${formatVND(check.mortgageValue)}!`,
          state: this.state,
        };
      }

      case "UNMORTGAGE_PROPERTY": {
        const tile = this.getTile(action.tileId);
        const check = GameRules.canUnmortgage(
          tile,
          player,
          this.state.properties,
        );
        if (!check.canUnmortgage) {
          return { success: false, error: check.reason };
        }
        player.money -= check.unmortgageCost;
        this.state.properties[tile.id].isMortgaged = false;
        return {
          success: true,
          event: "PROPERTY_UNMORTGAGED",
          tile,
          unmortgageCost: check.unmortgageCost,
          message: `🔓 ${player.name} đã chuộc lại ${tile.name} với giá ${formatVND(check.unmortgageCost)}!`,
          state: this.state,
        };
      }

      case "SELL_HOUSE": {
        const tile = this.getTile(action.tileId);
        const check = GameRules.canSellHouse(
          tile,
          player,
          this.state.properties,
        );
        if (!check.canSell) {
          return { success: false, error: check.reason };
        }
        player.money += check.refund;
        this.state.properties[tile.id].houses = check.nextHouses;
        return {
          success: true,
          event: "HOUSE_SOLD",
          tile,
          houses: check.nextHouses,
          refund: check.refund,
          message: `💰 ${player.name} đã bán bớt nhà tại ${tile.name}, nhận lại ${formatVND(check.refund)}!`,
          state: this.state,
        };
      }

      case "AUTO_RESOLVE_DEBT": {
        const pending = this.state.pendingAction;
        if (!pending || pending.type !== "DEBT_PROMPT") {
          return {
            success: false,
            error: "Không có khoản nợ nào cần giải quyết",
          };
        }
        const liquidation = this.autoLiquidateForDebt(player, pending.amount);
        if (player.money >= pending.amount) {
          player.money -= pending.amount;
          if (pending.debtType === "RENT" && pending.creditorId) {
            const creditor = this.state.players.find(
              (p) => p.id === pending.creditorId,
            );
            if (creditor) creditor.money += pending.amount;
          } else if (pending.debtType === "TAX") {
            this.state.jackpotPot =
              (this.state.jackpotPot || 0) + pending.amount;
          }
          this.state.pendingAction = null;
          this.state.turnState = TURN_STATES.END_TURN;
          return {
            success: true,
            event: "DEBT_RESOLVED",
            debtType: pending.debtType,
            amount: pending.amount,
            liquidation,
            message: `⚡ ${player.name} đã tự động giải cứu tài chính và thanh toán ${formatVND(pending.amount)}!`,
            state: this.state,
          };
        }
        return {
          success: true,
          event: "DEBT_PARTIALLY_LIQUIDATED",
          liquidation,
          deficit: pending.amount - player.money,
          message: `Đã thanh lý tài sản nhưng vẫn còn thiếu ${formatVND(pending.amount - player.money)}.`,
          state: this.state,
        };
      }

      case "PAY_DEBT": {
        const pending = this.state.pendingAction;
        if (!pending || pending.type !== "DEBT_PROMPT") {
          return {
            success: false,
            error: "Không có khoản nợ nào cần giải quyết",
          };
        }
        if (player.money < pending.amount) {
          return {
            success: false,
            error: `Chưa đủ tiền! Còn thiếu ${formatVND(pending.amount - player.money)}.`,
          };
        }
        player.money -= pending.amount;
        if (pending.debtType === "RENT" && pending.creditorId) {
          const creditor = this.state.players.find(
            (p) => p.id === pending.creditorId,
          );
          if (creditor) creditor.money += pending.amount;
        } else if (pending.debtType === "TAX") {
          this.state.jackpotPot = (this.state.jackpotPot || 0) + pending.amount;
        }
        this.state.pendingAction = null;
        this.state.turnState = TURN_STATES.END_TURN;
        return {
          success: true,
          event: "DEBT_PAID",
          debtType: pending.debtType,
          amount: pending.amount,
          message: `💸 ${player.name} đã thanh toán thành công khoản nợ ${formatVND(pending.amount)}!`,
          state: this.state,
        };
      }

      case "CONCEDE_BANKRUPTCY": {
        const pending = this.state.pendingAction;
        const creditor = pending?.creditorId
          ? this.state.players.find((p) => p.id === pending.creditorId)
          : null;
        this.state.pendingAction = null;
        const bRes = this.declareBankruptcy(player, creditor);
        this.state.turnState = TURN_STATES.END_TURN;
        return {
          success: true,
          event: "BANKRUPTCY",
          bankruptPlayer: player,
          winner: bRes?.winner,
          message:
            bRes?.message ||
            `💀 ${player.name} đã chấp nhận phá sản và rời cuộc chơi!`,
          state: this.state,
        };
      }

      case "START_AUCTION": {
        const tile = this.getTile(action.tileId || player.position);
        const prop = this.state.properties[tile.id];
        if (!prop || prop.owner) {
          return { success: false, error: "Ô này không thể đấu giá" };
        }
        const activeBidders = this.state.players
          .filter((p) => !p.isBankrupt)
          .map((p) => p.id);
        const startBid = Math.max(100_000, Math.round(tile.price * 0.1));
        this.state.auction = {
          tile,
          currentBid: startBid,
          highestBidder: null,
          activePlayerIds: activeBidders,
          currentTurnPlayerId: activeBidders[0],
        };
        return {
          success: true,
          event: "AUCTION_STARTED",
          auction: this.state.auction,
          message: `🔨 Bắt đầu phiên đấu giá ${tile.name}! Giá khởi điểm: ${formatVND(startBid)}!`,
          state: this.state,
        };
      }

      case "BID_AUCTION": {
        if (!this.state.auction)
          return {
            success: false,
            error: "Không có phiên đấu giá nào đang diễn ra",
          };
        if (
          this.state.auction.currentTurnPlayerId &&
          this.state.auction.currentTurnPlayerId !== action.playerId
        ) {
          return { success: false, error: "Chưa tới lượt bạn đặt giá" };
        }
        const bidder = this.state.players.find((p) => p.id === action.playerId);
        const bidAmount = action.amount;
        if (!bidder || bidder.isBankrupt)
          return { success: false, error: "Người đấu giá không hợp lệ" };
        if (
          bidAmount <= this.state.auction.currentBid &&
          this.state.auction.highestBidder !== null
        ) {
          return {
            success: false,
            error: "Mức giá đấu phải cao hơn giá hiện tại",
          };
        }
        if (bidder.money < bidAmount) {
          return {
            success: false,
            error: "Bạn không đủ tiền để đặt mức giá này",
          };
        }
        this.state.auction.currentBid = bidAmount;
        this.state.auction.highestBidder = bidder.id;

        // Nếu chỉ còn 1 người trong cuộc đấu giá mà người đó đặt giá -> Thắng luôn!
        if (this.state.auction.activePlayerIds.length <= 1) {
          const winner = bidder;
          const tile = this.state.auction.tile;
          const winningBid = bidAmount;
          winner.money -= winningBid;
          this.state.properties[tile.id].owner = winner.id;
          this.state.auction = null;
          this.state.turnState = TURN_STATES.END_TURN;

          return {
            success: true,
            event: "AUCTION_COMPLETED",
            winner,
            tile,
            winningBid,
            message: `🏆 ${winner.name} đã thắng đấu giá ${tile.name} với giá ${formatVND(winningBid)}!`,
            state: this.state,
          };
        }

        // Chuyển lượt sang bidder kế tiếp trong danh sách đang tham gia
        const curIdx = this.state.auction.activePlayerIds.indexOf(bidder.id);
        const nextId =
          this.state.auction.activePlayerIds[
            (curIdx + 1) % this.state.auction.activePlayerIds.length
          ];
        this.state.auction.currentTurnPlayerId = nextId;

        return {
          success: true,
          event: "AUCTION_BID_PLACED",
          auction: this.state.auction,
          message: `🔨 ${bidder.name} đặt giá ${formatVND(bidAmount)}!`,
          state: this.state,
        };
      }

      case "PASS_AUCTION": {
        if (!this.state.auction)
          return { success: false, error: "Không có phiên đấu giá" };
        const passer = this.state.players.find((p) => p.id === action.playerId);
        const passerId = passer ? passer.id : action.playerId;
        if (
          this.state.auction.currentTurnPlayerId &&
          this.state.auction.currentTurnPlayerId !== passerId
        ) {
          return { success: false, error: "Chưa tới lượt bạn trong phiên đấu giá" };
        }
        const oldIndex = this.state.auction.activePlayerIds.indexOf(passerId);

        // Loại người chơi khỏi danh sách đấu giá
        this.state.auction.activePlayerIds =
          this.state.auction.activePlayerIds.filter((id) => id !== passerId);

        const remainingCount = this.state.auction.activePlayerIds.length;
        const winnerId = this.state.auction.highestBidder;
        const tile = this.state.auction.tile;
        const winningBid = this.state.auction.currentBid;

        // Trường hợp 1: Không có ai đặt giá và tất cả mọi người đều đã bỏ cuộc
        if (!winnerId && remainingCount === 0) {
          this.state.auction = null;
          this.state.turnState = TURN_STATES.END_TURN;
          return {
            success: true,
            event: "AUCTION_CANCELLED",
            tile,
            message: `Không có ai đặt giá cho ${tile.name}.`,
            state: this.state,
          };
        }

        // Trường hợp 2: Đã có người đặt giá và những người khác đã bỏ cuộc hết (chỉ còn lại tối đa 1 người đấu giá)
        if (winnerId && remainingCount <= 1) {
          const winner = this.state.players.find((p) => p.id === winnerId);
          winner.money -= winningBid;
          this.state.properties[tile.id].owner = winner.id;
          this.state.auction = null;
          this.state.turnState = TURN_STATES.END_TURN;

          return {
            success: true,
            event: "AUCTION_COMPLETED",
            winner,
            tile,
            winningBid,
            message: `🏆 ${winner.name} đã thắng đấu giá ${tile.name} với giá ${formatVND(winningBid)}!`,
            state: this.state,
          };
        }

        // Chuyển lượt sang bidder kế tiếp
        const nextIdx = oldIndex >= 0 ? oldIndex % remainingCount : 0;
        const nextId = this.state.auction.activePlayerIds[nextIdx];
        this.state.auction.currentTurnPlayerId = nextId;

        // Nếu người kế tiếp chính là người đang giữ giá cao nhất (highestBidder),
        // nghĩa là một vòng đấu giá đã hoàn thành mà không có ai trả giá cao hơn!
        if (winnerId && nextId === winnerId) {
          const winner = this.state.players.find((p) => p.id === winnerId);
          winner.money -= winningBid;
          this.state.properties[tile.id].owner = winner.id;
          this.state.auction = null;
          this.state.turnState = TURN_STATES.END_TURN;

          return {
            success: true,
            event: "AUCTION_COMPLETED",
            winner,
            tile,
            winningBid,
            message: `🏆 ${winner.name} đã thắng đấu giá ${tile.name} với giá ${formatVND(winningBid)}!`,
            state: this.state,
          };
        }

        return {
          success: true,
          event: "AUCTION_PASSED",
          passedPlayerId: passerId,
          auction: this.state.auction,
          message: `${passer ? passer.name : "Người chơi"} đã bỏ lượt đấu giá.`,
          state: this.state,
        };
      }

      case "EXECUTE_TRADE": {
        const {
          senderId,
          receiverId,
          offerMoney = 0,
          offerTiles = [],
          requestMoney = 0,
          requestTiles = [],
        } = action;
        const sender = this.state.players.find((p) => p.id === senderId);
        const receiver = this.state.players.find((p) => p.id === receiverId);

        if (!sender || !receiver || sender.isBankrupt || receiver.isBankrupt) {
          return { success: false, error: "Người chơi không hợp lệ" };
        }
        if (offerMoney > 0 && sender.money < offerMoney) {
          return {
            success: false,
            error: `${sender.name} không đủ tiền để trao đổi`,
          };
        }
        if (requestMoney > 0 && receiver.money < requestMoney) {
          return {
            success: false,
            error: `${receiver.name} không đủ tiền để trao đổi`,
          };
        }

        for (const tId of offerTiles) {
          const tile = this.getTile(tId);
          const prop = this.state.properties[tId];
          if (prop?.owner !== sender.id)
            return {
              success: false,
              error: `${tile.name} không thuộc về ${sender.name}`,
            };
          const tradeCheck = GameRules.canTradeProperty(
            tile,
            this.state.properties,
          );
          if (!tradeCheck.canTrade)
            return { success: false, error: tradeCheck.reason };
        }
        for (const tId of requestTiles) {
          const tile = this.getTile(tId);
          const prop = this.state.properties[tId];
          if (prop?.owner !== receiver.id)
            return {
              success: false,
              error: `${tile.name} không thuộc về ${receiver.name}`,
            };
          const tradeCheck = GameRules.canTradeProperty(
            tile,
            this.state.properties,
          );
          if (!tradeCheck.canTrade)
            return { success: false, error: tradeCheck.reason };
        }

        // Hoán đổi tiền
        sender.money = sender.money - offerMoney + requestMoney;
        receiver.money = receiver.money - requestMoney + offerMoney;

        // Hoán đổi đất
        offerTiles.forEach((tId) => {
          this.state.properties[tId].owner = receiver.id;
        });
        requestTiles.forEach((tId) => {
          this.state.properties[tId].owner = sender.id;
        });

        return {
          success: true,
          event: "TRADE_EXECUTED",
          message: `🤝 Giao dịch thành công giữa ${sender.name} và ${receiver.name}!`,
          state: this.state,
        };
      }

      case "CLOSE_CARD": {
        const pending = this.state.pendingAction;
        const moveTarget = pending?.result?.moveTarget;
        const cardBonus = {
          doubleRent: pending?.result?.doubleRent,
          utility10x: pending?.result?.utility10x,
        };
        const card = pending?.card;
        const cardResult = pending?.result;
        this.state.pendingAction = null;

        if (player.inJail) {
          this.state.turnState = TURN_STATES.END_TURN;
          return {
            success: true,
            event: "CARD_PROCESSED",
            card,
            result: cardResult,
            message: cardResult?.message,
            state: this.state,
          };
        }

        if (moveTarget !== undefined && moveTarget !== null) {
          player.position = moveTarget;
          const landing = this.evaluateLanding(player, moveTarget, {
            ...action,
            ...cardBonus,
          });
          return {
            ...landing,
            card,
            result: cardResult,
          };
        }

        this.state.turnState = TURN_STATES.END_TURN;
        return {
          success: true,
          event: "CARD_PROCESSED",
          card,
          result: cardResult,
          message: cardResult?.message,
          state: this.state,
        };
      }

      case "END_TURN": {
        if (this.state.turnState !== TURN_STATES.END_TURN) {
          return {
            success: false,
            code: "TURN_NOT_FINISHED",
            error: "Lượt chưa kết thúc",
          };
        }

        const hadEscapedJail = !!this.state.escapedJailThisTurn;
        this.state.escapedJailThisTurn = false;

        if (
          !hadEscapedJail &&
          this.state.lastRoll &&
          this.state.lastRoll.isDoubles &&
          !player.inJail &&
          !player.isBankrupt
        ) {
          this.state.turnState = TURN_STATES.WAIT_ROLL;
          return {
            success: true,
            event: "EXTRA_TURN",
            message: `🎉 Tung đôi! ${player.name} được đi thêm lượt!`,
            nextPlayer: player,
            state: this.state,
          };
        }

        let nextIndex =
          (this.state.currentTurnIndex + 1) % this.state.players.length;
        let attempts = 0;
        while (
          this.state.players[nextIndex].isBankrupt &&
          attempts < this.state.players.length
        ) {
          nextIndex = (nextIndex + 1) % this.state.players.length;
          attempts++;
        }

        // Tăng vòng đấu: khi lượt quay vòng trở lại đầu danh sách người chơi còn sống
        let roundIncremented = false;
        if (nextIndex <= this.state.currentTurnIndex) {
          this.state.round = (this.state.round || 1) + 1;
          roundIncremented = true;
        }

        this.state.currentTurnIndex = nextIndex;
        this.state.turnState = TURN_STATES.WAIT_ROLL;
        this.state.consecutiveDoubles = 0;
        this.state.lastRoll = null;
        this.state.pendingAction = null;

        // Kiểm tra kết thúc ván do chạm trần số vòng (Sudden Death mốc cuối)
        const maxRoundResult = this.checkGameEndByMaxRounds();
        if (maxRoundResult) {
          this.state.turnState = TURN_STATES.GAME_OVER;
          return {
            success: true,
            event: "GAME_OVER_MAX_ROUNDS",
            roundIncremented,
            winner: maxRoundResult.winner,
            ranked: maxRoundResult.ranked,
            message: maxRoundResult.message,
            state: this.state,
          };
        }

        return {
          success: true,
          event: "TURN_ENDED",
          roundIncremented,
          round: this.state.round,
          phase: GameRules.getPhase(this.state.round, this.state.maxRounds),
          nextPlayer: this.getCurrentPlayer(),
          state: this.state,
        };
      }

      default:
        return { success: false, error: `Action ${action.type} không hợp lệ` };
    }
  }

  evaluateLanding(player, landingPos, action = {}) {
    const tile = this.getTile(landingPos);
    const diceTotal = this.state.lastRoll ? this.state.lastRoll.total : 7;

    if (tile.type === "chance" || tile.type === "chest") {
      const card = this.drawCard(tile.type);
      const cardResult = this.executeCard(player, card);

      this.state.cardHistory = this.state.cardHistory || [];
      this.state.cardHistory.unshift({
        cardType: tile.type,
        card,
        player: { id: player.id, name: player.name },
        result: cardResult,
        timestamp: this.formatTimestamp(action?.timestamp),
      });

      this.state.turnState = TURN_STATES.ACTION_REQUIRED;
      this.state.pendingAction = {
        type: "CARD_PROMPT",
        playerId: player.id,
        cardType: tile.type,
        card,
        result: cardResult,
        defaultAction: { type: "CLOSE_CARD" },
      };

      return {
        success: true,
        event: "CARD_DRAWN",
        cardType: tile.type,
        card,
        result: cardResult,
        message: `${player.name} rút thẻ ${tile.type === "chance" ? "Cơ Hội" : "Khí Vận"}: ${card.title}!`,
        state: this.state,
      };
    }

    if (tile.action === "go_to_jail") {
      this.sendToJail(player);
      return {
        success: true,
        event: "GO_TO_JAIL",
        message: `🚔 ${player.name} bước vào ô Vào Tù! Bị giam ngay!`,
        state: this.state,
      };
    }

    if (
      tile.action === "jackpot" ||
      tile.action === "free_parking" ||
      tile.id === 20
    ) {
      const wonAmount = this.state.jackpotPot || 1_000_000;
      player.money += wonAmount;
      this.state.jackpotPot = 500_000; // Reset hũ về mức cơ bản 500k
      this.state.turnState = TURN_STATES.END_TURN;
      return {
        success: true,
        event: "JACKPOT_WON",
        amount: wonAmount,
        message: `🎰 NỔ HŨ JACKPOT! ${player.name} đã ẵm trọn Quỹ Trúng Thưởng ${formatVND(wonAmount)}!`,
        state: this.state,
      };
    }

    if (tile.type === "tax") {
      const taxAmount = tile.amount || 1_000_000;
      const phase = GameRules.getPhase(this.state.round, this.state.maxRounds);
      if (player.money >= taxAmount) {
        player.money -= taxAmount;
        if (!phase.taxToBank) {
          this.state.jackpotPot = (this.state.jackpotPot || 0) + taxAmount;
        }
        this.state.turnState = TURN_STATES.END_TURN;
        const destMsg = phase.taxToBank
          ? "Kho Ngân Hàng (Bão kinh tế)"
          : `Gom vào Quỹ Trúng Thưởng: ${formatVND(this.state.jackpotPot)}`;
        return {
          success: true,
          event: "TAX_PAID",
          taxAmount,
          jackpotPot: this.state.jackpotPot,
          message: `💸 ${player.name} nộp ${formatVND(taxAmount)} ${tile.name}! (${destMsg})`,
          state: this.state,
        };
      }

      // Không đủ tiền nộp thuế: Kiểm tra xem có thể giải cứu tài chính không
      const maxLiq = GameRules.calculateMaxLiquidation(
        player,
        this.state.properties,
      );
      if (player.money + maxLiq < taxAmount) {
        const bRes = this.declareBankruptcy(player, null);
        this.state.turnState = TURN_STATES.END_TURN;
        return {
          success: true,
          event: "BANKRUPTCY",
          bankruptPlayer: player,
          winner: bRes?.winner,
          message:
            bRes?.message ||
            `💀 ${player.name} phá sản vì không đủ khả năng nộp ${formatVND(taxAmount)} thuế!`,
          state: this.state,
        };
      }

      if (player.isBot) {
        const liq = this.autoLiquidateForDebt(player, taxAmount);
        player.money -= taxAmount;
        if (!phase.taxToBank) {
          this.state.jackpotPot = (this.state.jackpotPot || 0) + taxAmount;
        }
        this.state.turnState = TURN_STATES.END_TURN;
        return {
          success: true,
          event: "TAX_PAID",
          taxAmount,
          jackpotPot: this.state.jackpotPot,
          liquidated: liq,
          message: `💸 ${player.name} đã thế chấp tài sản để nộp ${formatVND(taxAmount)} tiền thuế!`,
          state: this.state,
        };
      }

      // Người chơi người -> Kích hoạt trạng thái giải quyết nợ
      this.state.turnState = TURN_STATES.ACTION_REQUIRED;
      this.state.pendingAction = {
        type: "DEBT_PROMPT",
        playerId: player.id,
        debtType: "TAX",
        creditorId: null,
        amount: taxAmount,
        tileId: tile.id,
        isDoubles: this.state.lastRoll?.isDoubles || false,
        defaultAction: { type: "AUTO_RESOLVE_DEBT" },
      };
      return {
        success: true,
        event: "DEBT_REQUIRED",
        debtType: "TAX",
        amount: taxAmount,
        creditor: null,
        tile,
        deficit: taxAmount - player.money,
        message: `⚠️ ${player.name} không đủ tiền mặt nộp ${formatVND(taxAmount)} ${tile.name}! Hãy thế chấp tài sản hoặc bán nhà để nộp phạt.`,
        state: this.state,
      };
    }

    if (["property", "railroad", "utility"].includes(tile.type)) {
      const prop = this.state.properties[tile.id];
      const owner = this.getOwner(tile.id);

      if (!owner) {
        this.state.turnState = TURN_STATES.ACTION_REQUIRED;
        this.state.pendingAction = {
          type: "BUY_PROMPT",
          playerId: player.id,
          tile,
          canAfford: player.money >= tile.price,
          defaultAction: { type: "DECLINE_BUY" },
        };
        return {
          success: true,
          event: "BUY_PROMPT",
          tile,
          canAfford: player.money >= tile.price,
          message: `Đất trống: ${tile.name} (Giá: ${formatVND(tile.price)}). Bạn có muốn mua?`,
          state: this.state,
        };
      }

      if (owner.id === player.id) {
        this.state.turnState = TURN_STATES.END_TURN;
        return {
          success: true,
          event: "LANDED_OWN_PROPERTY",
          message: `${player.name} dừng chân tại đất nhà mình (${tile.name}). An toàn!`,
          state: this.state,
        };
      }

      const phase = GameRules.getPhase(
        this.state.round,
        this.state.maxRounds,
      );
      const rent = GameRules.calculateRent(
        tile,
        owner,
        this.state.properties,
        diceTotal,
        phase.rentMult,
        {
          doubleRent: !!action.doubleRent,
          utility10x: !!action.utility10x,
        },
      );

      // Nếu đủ tiền mặt -> Trả ngay
      if (player.money >= rent) {
        player.money -= rent;
        owner.money += rent;
        this.state.turnState = TURN_STATES.END_TURN;
        return {
          success: true,
          event: "RENT_PAID",
          rent,
          owner,
          tile,
          message: `💸 ${player.name} trả ${formatVND(rent)} tiền thuê ${tile.name} cho ${owner.name}!`,
          state: this.state,
        };
      }

      // Không đủ tiền mặt trả thuê: Kiểm tra xem có thể giải cứu tài chính không
      const maxLiq = GameRules.calculateMaxLiquidation(
        player,
        this.state.properties,
      );
      if (player.money + maxLiq < rent) {
        const bRes = this.declareBankruptcy(player, owner);
        this.state.turnState = TURN_STATES.END_TURN;
        return {
          success: true,
          event: "BANKRUPTCY",
          rent,
          owner,
          tile,
          bankruptPlayer: player,
          winner: bRes?.winner,
          message:
            bRes?.message ||
            `💀 ${player.name} không đủ khả năng trả ${formatVND(rent)} tiền thuê cho ${owner.name} và đã PHÁ SẢN!`,
          state: this.state,
        };
      }

      if (player.isBot) {
        const liq = this.autoLiquidateForDebt(player, rent);
        player.money -= rent;
        owner.money += rent;
        this.state.turnState = TURN_STATES.END_TURN;
        return {
          success: true,
          event: "RENT_PAID",
          rent,
          owner,
          tile,
          liquidated: liq,
          message: `💸 ${player.name} đã thế chấp tài sản để trả ${formatVND(rent)} tiền thuê cho ${owner.name}!`,
          state: this.state,
        };
      }

      // Người chơi người -> Kích hoạt trạng thái giải quyết nợ
      this.state.turnState = TURN_STATES.ACTION_REQUIRED;
      this.state.pendingAction = {
        type: "DEBT_PROMPT",
        playerId: player.id,
        debtType: "RENT",
        creditorId: owner.id,
        amount: rent,
        tileId: tile.id,
        isDoubles: this.state.lastRoll?.isDoubles || false,
        defaultAction: { type: "AUTO_RESOLVE_DEBT" },
      };
      return {
        success: true,
        event: "DEBT_REQUIRED",
        debtType: "RENT",
        amount: rent,
        creditor: owner,
        tile,
        deficit: rent - player.money,
        message: `⚠️ ${player.name} không đủ tiền mặt trả ${formatVND(rent)} cho ${owner.name}! Hãy thế chấp tài sản hoặc bán nhà để trả nợ.`,
        state: this.state,
      };
    }

    this.state.turnState = TURN_STATES.END_TURN;
    return {
      success: true,
      event: "SAFE_TILE",
      message: `${player.name} dừng tại ${tile.name}.`,
      state: this.state,
    };
  }

  /**
   * Tự động thanh lý tài sản (Bán nhà -> Thế chấp đất) để gom đủ số tiền nợ
   * @param {Object} player - Người chơi cần gom tiền
   * @param {number} neededAmount - Tổng số tiền nợ cần thanh toán
   * @returns {Object} { recovered, soldHouses, mortgagedTiles }
   */
  autoLiquidateForDebt(player, neededAmount) {
    const plan = GameRules.getLiquidationPlan(
      player,
      neededAmount,
      this.state.properties,
    );
    const soldHouses = [];
    const mortgagedTiles = [];
    let recovered = 0;

    // 1. Thực hiện bán nhà theo kế hoạch
    for (const tileId of plan.sells) {
      const tile = this.getTile(tileId);
      const prop = this.state.properties[tileId];
      if (prop && prop.houses > 0) {
        prop.houses--;
        const refund = Math.round((tile.houseCost || 0) * 0.5);
        player.money += refund;
        recovered += refund;
        soldHouses.push({ tile, refund });
      }
    }

    // 2. Thực hiện thế chấp theo kế hoạch
    for (const tileId of plan.mortgages) {
      const tile = this.getTile(tileId);
      const prop = this.state.properties[tileId];
      if (prop && !prop.isMortgaged) {
        prop.isMortgaged = true;
        const mortgageValue =
          tile.mortgage || Math.round((tile.price || 0) * 0.5);
        player.money += mortgageValue;
        recovered += mortgageValue;
        mortgagedTiles.push({ tile, mortgageValue });
      }
    }

    return { recovered, soldHouses, mortgagedTiles, enough: plan.enough };
  }

  sendToJail(player) {
    player.position = 10;
    player.inJail = true;
    player.jailTurns = 0;
    this.state.consecutiveDoubles = 0;
    this.state.turnState = TURN_STATES.END_TURN;
  }

  /**
   * Tuyên bố phá sản cho một người chơi
   * @param {Object} player - Người chơi phá sản
   * @param {Object} [creditor] - Chủ nợ nhận tài sản (nếu có)
   */
  declareBankruptcy(player, creditor = null) {
    if (!player || player.isBankrupt) return null;
    player.isBankrupt = true;
    player.money = 0;
    this.state.consecutiveDoubles = 0;
    if (this.state.lastRoll) {
      this.state.lastRoll.isDoubles = false;
    }

    // Chuyển giao hoặc giải phóng tài sản
    Object.keys(this.state.properties).forEach((tileId) => {
      const prop = this.state.properties[tileId];
      if (prop && prop.owner === player.id) {
        if (creditor && !creditor.isBankrupt) {
          prop.owner = creditor.id;
        } else {
          prop.owner = null;
          prop.houses = 0;
          prop.isMortgaged = false;
        }
      }
    });

    const activePlayers = this.state.players.filter((p) => !p.isBankrupt);
    let winner = null;
    if (activePlayers.length === 1) {
      winner = activePlayers[0];
      this.state.winner = winner;
      this.state.isGameOver = true;
    }

    return {
      success: true,
      event: "BANKRUPTCY",
      player,
      creditor,
      winner,
      isGameOver: !!winner,
      message: winner
        ? `🏆 ${player.name} đã PHÁ SẢN! ${winner.name} là ĐẠI GIA CHIẾN THẮNG!`
        : `💀 ${player.name} đã chính thức PHÁ SẢN và rời khỏi cuộc chơi!`,
    };
  }

  /**
   * Kiểm tra điều kiện kết thúc ván đấu khi chạm ngưỡng MAX_ROUNDS (Lưới An Toàn)
   * Phân định người chiến thắng theo tổng tài sản ròng Net Worth (Hòa thì xét tiền mặt)
   */
  checkGameEndByMaxRounds() {
    if (this.state.isGameOver || this.state.isEndless || !this.state.maxRounds) return null;
    const maxR = this.state.maxRounds;
    if (this.state.round > maxR) {
      const activePlayers = this.state.players.filter((p) => !p.isBankrupt);
      if (activePlayers.length === 0) return null;

      const ranked = [...activePlayers].sort((a, b) =>
        GameRules.comparePlayersNetWorth(a, b, this.state.properties),
      );

      const winner = ranked[0];
      this.state.winner = winner;
      this.state.isGameOver = true;
      this.state.endReason = "MAX_ROUNDS_REACHED";
      this.state.round = maxR; // Ghim đúng số vòng tối đa (ví dụ 50/50 thay vì 51/50)
      const winnerNetWorth = GameRules.calculateNetWorth(
        winner,
        this.state.properties,
      );

      return {
        isGameOver: true,
        winner,
        ranked,
        message: `🏁 ĐÃ HẾT ${maxR} VÒNG ĐẤU! ${winner.name} giành CHIẾN THẮNG với tổng tài sản ${formatVND(winnerNetWorth)}!`,
      };
    }
    return null;
  }

  formatTimestamp(customTime) {
    const raw = customTime ?? this.options.timestamp;
    if (typeof raw === "string") return raw;
    if (typeof raw === "number") {
      const d = new Date(raw);
      return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    }
    if (typeof this.options.getTimestamp === "function") {
      return this.options.getTimestamp();
    }
    return new Date().toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  loadState(state) {
    this.state = state;
    if (state?.seed !== undefined && state.seed !== null) {
      this.seed = state.seed;
      this.rng = createMulberry32(state.seed);
    }
    return this.state;
  }
}


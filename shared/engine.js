import { GAME_CONSTANTS } from './constants.js';
import { SAIGON_BOARD_DATA } from './data/board-data.js';
import { CHANCE_CARDS } from './data/chance-cards.js';
import { CHEST_CARDS } from './data/chest-cards.js';
import { GameRules } from './rules.js';

export const TURN_STATES = {
  WAIT_ROLL: 'WAIT_ROLL',
  ROLLING: 'ROLLING',
  MOVING: 'MOVING',
  ACTION_REQUIRED: 'ACTION_REQUIRED',
  END_TURN: 'END_TURN',
  GAME_OVER: 'GAME_OVER'
};

export class GameEngine {
  constructor(playerConfigs = []) {
    this.state = this.createInitialState(playerConfigs);
  }

  createInitialState(playerConfigs) {
    const players = playerConfigs.map((cfg, idx) => ({
      id: cfg.id || `p${idx + 1}`,
      name: cfg.name || `Người chơi ${idx + 1}`,
      token: cfg.token,
      money: GAME_CONSTANTS.STARTING_MONEY,
      position: 0,
      inJail: false,
      jailTurns: 0,
      hasJailCard: false,
      isBankrupt: false,
      isBot: !!cfg.isBot
    }));

    const properties = {};
    SAIGON_BOARD_DATA.forEach((tile) => {
      if (['property', 'railroad', 'utility'].includes(tile.type)) {
        properties[tile.id] = {
          owner: null,
          houses: 0,
          isMortgaged: false
        };
      }
    });

    const chanceDeck = this.shuffleArray([...CHANCE_CARDS]);
    const chestDeck = this.shuffleArray([...CHEST_CARDS]);

    return {
      players,
      properties,
      chanceDeck,
      chestDeck,
      currentTurnIndex: 0,
      turnState: TURN_STATES.WAIT_ROLL,
      consecutiveDoubles: 0,
      lastRoll: null,
      pendingAction: null,
      history: []
    };
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
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
    const deckKey = deckType === 'chance' ? 'chanceDeck' : 'chestDeck';
    const originalCards = deckType === 'chance' ? CHANCE_CARDS : CHEST_CARDS;

    if (this.state[deckKey].length === 0) {
      this.state[deckKey] = this.shuffleArray([...originalCards]);
    }

    return this.state[deckKey].pop();
  }

  executeCard(player, card) {
    const act = card.action;

    switch (act.type) {
      case 'ADD_MONEY':
        player.money += act.amount;
        return { message: `${player.name} nhận được +${(act.amount / 1_000_000).toFixed(1)}M!` };

      case 'SUB_MONEY':
        player.money -= act.amount;
        return { message: `${player.name} bị trừ -${(act.amount / 1_000_000).toFixed(1)}M!` };

      case 'PAY_ALL_PLAYERS': {
        let totalPaid = 0;
        this.state.players.forEach((p) => {
          if (p.id !== player.id && !p.isBankrupt) {
            player.money -= act.amount;
            p.money += act.amount;
            totalPaid += act.amount;
          }
        });
        return { message: `${player.name} đã trả ${(act.amount / 1_000)}K cho mỗi người chơi!` };
      }

      case 'RECEIVE_FROM_ALL': {
        this.state.players.forEach((p) => {
          if (p.id !== player.id && !p.isBankrupt) {
            p.money -= act.amount;
            player.money += act.amount;
          }
        });
        return { message: `${player.name} đã thu ${(act.amount / 1_000)}K từ mỗi người chơi!` };
      }

      case 'GET_JAIL_CARD':
        player.hasJailCard = true;
        return { message: `🎉 ${player.name} đã sở hữu Thẻ Ra Tù Miễn Phí!` };

      case 'GO_TO_JAIL':
        this.sendToJail(player);
        return { message: `🚨 ${player.name} bị đưa thẳng vào buồng giam!` };

      case 'MOVE_TO': {
        const prevPos = player.position;
        player.position = act.target;
        if (act.passGoReward && player.position < prevPos) {
          player.money += GAME_CONSTANTS.GO_REWARD;
        }
        return { message: `${player.name} di chuyển đến ${this.getTile(act.target).name}!`, moveTarget: act.target };
      }

      case 'STEP_BACK': {
        player.position = (player.position - act.steps + 40) % 40;
        return { message: `${player.name} lùi lại ${act.steps} ô!`, moveTarget: player.position };
      }

      case 'MOVE_NEAREST_RAILROAD': {
        const railroads = [5, 15, 25, 35];
        let target = railroads.find((r) => r > player.position);
        if (!target) target = railroads[0];
        player.position = target;
        return { message: `${player.name} đi đến Bến xe gần nhất: ${this.getTile(target).name}!`, moveTarget: target };
      }

      case 'MOVE_NEAREST_UTILITY': {
        const utilities = [12, 28];
        let target = utilities.find((u) => u > player.position);
        if (!target) target = utilities[0];
        player.position = target;
        return { message: `${player.name} đi đến Tiện ích gần nhất: ${this.getTile(target).name}!`, moveTarget: target };
      }

      default:
        return { message: card.desc };
    }
  }

  applyAction(action) {
    const player = this.getCurrentPlayer();

    switch (action.type) {
      case 'ROLL_DICE': {
        if (this.state.turnState !== TURN_STATES.WAIT_ROLL) {
          return { success: false, error: 'Không thể tung xúc xắc lúc này' };
        }

        const val1 = action.val1 || Math.floor(Math.random() * 6) + 1;
        const val2 = action.val2 || Math.floor(Math.random() * 6) + 1;
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
            return {
              success: true,
              event: 'JAIL_FREE_DOUBLES',
              message: `🎉 ${player.name} tung đôi ${val1}-${val2} được ra tù tự do!`,
              steps: total,
              state: this.state
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
                event: 'JAIL_FORCED_PAY',
                message: `⚠️ Hết 3 lượt, ${player.name} nộp phạt 500K để ra tù và đi tiếp!`,
                steps: total,
                state: this.state
              };
            } else {
              this.state.turnState = TURN_STATES.END_TURN;
              return {
                success: true,
                event: 'JAIL_STAY',
                message: `${player.name} chưa tung ra đôi (${player.jailTurns}/${GAME_CONSTANTS.MAX_JAIL_TURNS}). Vẫn ở tù!`,
                steps: 0,
                state: this.state
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
              event: 'JAIL_THREE_DOUBLES',
              message: `🚨 ${player.name} tung đôi 3 lần liên tiếp! Bị bắt vào tù ngay!`,
              steps: 0,
              state: this.state
            };
          }
        } else {
          this.state.consecutiveDoubles = 0;
        }

        this.state.turnState = TURN_STATES.MOVING;
        return {
          success: true,
          event: 'DICE_ROLLED',
          val1, val2, total, isDoubles,
          steps: total,
          state: this.state
        };
      }

      case 'COMPLETE_MOVEMENT': {
        const landingPos = action.position;
        player.position = landingPos;
        return this.evaluateLanding(player, landingPos);
      }

      case 'BUY_PROPERTY': {
        const tile = this.getTile(player.position);
        const prop = this.state.properties[tile.id];

        if (!prop || prop.owner) {
          return { success: false, error: 'Ô đất này không thể mua' };
        }
        if (player.money < tile.price) {
          return { success: false, error: 'Không đủ tiền mua đất' };
        }

        player.money -= tile.price;
        prop.owner = player.id;
        this.state.pendingAction = null;
        this.state.turnState = TURN_STATES.END_TURN;

        return {
          success: true,
          event: 'PROPERTY_BOUGHT',
          message: `🏠 ${player.name} đã mua thành công ${tile.name} với giá ${(tile.price / 1_000_000).toFixed(1)}M!`,
          state: this.state
        };
      }

      case 'DECLINE_BUY': {
        this.state.pendingAction = null;
        this.state.turnState = TURN_STATES.END_TURN;
        return {
          success: true,
          event: 'PROPERTY_DECLINED',
          message: `${player.name} bỏ qua không mua ô này.`,
          state: this.state
        };
      }

      case 'BUILD_HOUSE': {
        const tile = this.getTile(action.tileId);
        const check = GameRules.canBuildHouse(tile, player, this.state.properties);

        if (!check.canBuild) {
          return { success: false, error: check.reason };
        }

        player.money -= check.cost;
        const prop = this.state.properties[tile.id];
        prop.houses = check.nextLevel;

        const buildingType = check.isHotel ? 'Khách Sạn Đỏ 🏨' : `Ngôi Nhà Xanh thứ ${check.nextLevel} 🏠`;
        return {
          success: true,
          event: 'HOUSE_BUILT',
          tile,
          houses: prop.houses,
          isHotel: check.isHotel,
          message: `🏗️ ${player.name} đã xây thành công ${buildingType} tại ${tile.name}!`,
          state: this.state
        };
      }

      case 'MORTGAGE_PROPERTY': {
        const tile = this.getTile(action.tileId);
        const check = GameRules.canMortgage(tile, player, this.state.properties);
        if (!check.canMortgage) {
          return { success: false, error: check.reason };
        }
        player.money += check.mortgageValue;
        this.state.properties[tile.id].isMortgaged = true;
        return {
          success: true,
          event: 'PROPERTY_MORTGAGED',
          tile,
          mortgageValue: check.mortgageValue,
          message: `🔒 ${player.name} đã thế chấp ${tile.name}, nhận ${(check.mortgageValue / 1_000_000).toFixed(2)}M VNĐ!`,
          state: this.state
        };
      }

      case 'UNMORTGAGE_PROPERTY': {
        const tile = this.getTile(action.tileId);
        const check = GameRules.canUnmortgage(tile, player, this.state.properties);
        if (!check.canUnmortgage) {
          return { success: false, error: check.reason };
        }
        player.money -= check.unmortgageCost;
        this.state.properties[tile.id].isMortgaged = false;
        return {
          success: true,
          event: 'PROPERTY_UNMORTGAGED',
          tile,
          unmortgageCost: check.unmortgageCost,
          message: `🔓 ${player.name} đã chuộc lại ${tile.name} với giá ${(check.unmortgageCost / 1_000_000).toFixed(2)}M VNĐ!`,
          state: this.state
        };
      }

      case 'SELL_HOUSE': {
        const tile = this.getTile(action.tileId);
        const check = GameRules.canSellHouse(tile, player, this.state.properties);
        if (!check.canSell) {
          return { success: false, error: check.reason };
        }
        player.money += check.refund;
        this.state.properties[tile.id].houses = check.nextHouses;
        return {
          success: true,
          event: 'HOUSE_SOLD',
          tile,
          houses: check.nextHouses,
          refund: check.refund,
          message: `💰 ${player.name} đã bán bớt nhà tại ${tile.name}, nhận lại ${(check.refund / 1_000_000).toFixed(2)}M VNĐ!`,
          state: this.state
        };
      }

      case 'START_AUCTION': {
        const tile = this.getTile(action.tileId || player.position);
        const prop = this.state.properties[tile.id];
        if (!prop || prop.owner) {
          return { success: false, error: 'Ô này không thể đấu giá' };
        }
        const activeBidders = this.state.players.filter(p => !p.isBankrupt).map(p => p.id);
        const startBid = Math.max(100_000, Math.round(tile.price * 0.1));
        this.state.auction = {
          tile,
          currentBid: startBid,
          highestBidder: null,
          activePlayerIds: activeBidders,
          currentTurnPlayerId: activeBidders[0]
        };
        return {
          success: true,
          event: 'AUCTION_STARTED',
          auction: this.state.auction,
          message: `🔨 Bắt đầu phiên đấu giá ${tile.name}! Giá khởi điểm: ${(startBid / 1_000).toFixed(0)}K!`,
          state: this.state
        };
      }

      case 'BID_AUCTION': {
        if (!this.state.auction) return { success: false, error: 'Không có phiên đấu giá nào đang diễn ra' };
        const bidder = this.state.players.find(p => p.id === action.playerId);
        const bidAmount = action.amount;
        if (!bidder || bidder.isBankrupt) return { success: false, error: 'Người đấu giá không hợp lệ' };
        if (bidAmount <= this.state.auction.currentBid && this.state.auction.highestBidder !== null) {
          return { success: false, error: 'Mức giá đấu phải cao hơn giá hiện tại' };
        }
        if (bidder.money < bidAmount) {
          return { success: false, error: 'Bạn không đủ tiền để đặt mức giá này' };
        }
        this.state.auction.currentBid = bidAmount;
        this.state.auction.highestBidder = bidder.id;

        // Chuyển lượt sang bidder kế tiếp trong danh sách đang tham gia
        const curIdx = this.state.auction.activePlayerIds.indexOf(bidder.id);
        const nextId = this.state.auction.activePlayerIds[(curIdx + 1) % this.state.auction.activePlayerIds.length];
        this.state.auction.currentTurnPlayerId = nextId;

        return {
          success: true,
          event: 'AUCTION_BID_PLACED',
          auction: this.state.auction,
          message: `🔨 ${bidder.name} đặt giá ${(bidAmount >= 1_000_000 ? (bidAmount / 1_000_000).toFixed(2) + 'M' : (bidAmount / 1_000) + 'K')}!`,
          state: this.state
        };
      }

      case 'PASS_AUCTION': {
        if (!this.state.auction) return { success: false, error: 'Không có phiên đấu giá' };
        const passer = this.state.players.find(p => p.id === action.playerId);
        const passerId = passer ? passer.id : action.playerId;
        this.state.auction.activePlayerIds = this.state.auction.activePlayerIds.filter(id => id !== passerId);

        // Nếu chỉ còn tối đa 1 người đấu giá
        if (this.state.auction.activePlayerIds.length <= 1) {
          const winnerId = this.state.auction.highestBidder;
          const tile = this.state.auction.tile;
          const winningBid = this.state.auction.currentBid;

          if (winnerId) {
            const winner = this.state.players.find(p => p.id === winnerId);
            winner.money -= winningBid;
            this.state.properties[tile.id].owner = winner.id;
            this.state.auction = null;
            this.state.turnState = TURN_STATES.END_TURN;

            return {
              success: true,
              event: 'AUCTION_COMPLETED',
              winner,
              tile,
              winningBid,
              message: `🏆 ${winner.name} đã thắng đấu giá ${tile.name} với giá ${(winningBid >= 1_000_000 ? (winningBid / 1_000_000).toFixed(2) + 'M' : (winningBid / 1_000) + 'K')}!`,
              state: this.state
            };
          } else {
            // Không ai bid cả
            this.state.auction = null;
            this.state.turnState = TURN_STATES.END_TURN;
            return {
              success: true,
              event: 'AUCTION_CANCELLED',
              tile,
              message: `Không có ai đặt giá cho ${tile.name}.`,
              state: this.state
            };
          }
        }

        // Chuyển lượt sang bidder kế tiếp
        const nextId = this.state.auction.activePlayerIds[0];
        this.state.auction.currentTurnPlayerId = nextId;

        return {
          success: true,
          event: 'AUCTION_PASSED',
          passedPlayerId: passerId,
          auction: this.state.auction,
          message: `${passer ? passer.name : 'Người chơi'} đã bỏ lượt đấu giá.`,
          state: this.state
        };
      }

      case 'EXECUTE_TRADE': {
        const { senderId, receiverId, offerMoney = 0, offerTiles = [], requestMoney = 0, requestTiles = [] } = action;
        const sender = this.state.players.find(p => p.id === senderId);
        const receiver = this.state.players.find(p => p.id === receiverId);

        if (!sender || !receiver || sender.isBankrupt || receiver.isBankrupt) {
          return { success: false, error: 'Người chơi không hợp lệ' };
        }
        if (sender.money < offerMoney) {
          return { success: false, error: `${sender.name} không đủ tiền để trao đổi` };
        }
        if (receiver.money < requestMoney) {
          return { success: false, error: `${receiver.name} không đủ tiền để trao đổi` };
        }

        for (const tId of offerTiles) {
          const tile = this.getTile(tId);
          const prop = this.state.properties[tId];
          if (prop?.owner !== sender.id) return { success: false, error: `${tile.name} không thuộc về ${sender.name}` };
          const tradeCheck = GameRules.canTradeProperty(tile, this.state.properties);
          if (!tradeCheck.canTrade) return { success: false, error: tradeCheck.reason };
        }
        for (const tId of requestTiles) {
          const tile = this.getTile(tId);
          const prop = this.state.properties[tId];
          if (prop?.owner !== receiver.id) return { success: false, error: `${tile.name} không thuộc về ${receiver.name}` };
          const tradeCheck = GameRules.canTradeProperty(tile, this.state.properties);
          if (!tradeCheck.canTrade) return { success: false, error: tradeCheck.reason };
        }

        // Hoán đổi tiền
        sender.money = sender.money - offerMoney + requestMoney;
        receiver.money = receiver.money - requestMoney + offerMoney;

        // Hoán đổi đất
        offerTiles.forEach(tId => {
          this.state.properties[tId].owner = receiver.id;
        });
        requestTiles.forEach(tId => {
          this.state.properties[tId].owner = sender.id;
        });

        return {
          success: true,
          event: 'TRADE_EXECUTED',
          message: `🤝 Giao dịch thành công giữa ${sender.name} và ${receiver.name}!`,
          state: this.state
        };
      }

      case 'CLOSE_CARD': {
        this.state.pendingAction = null;
        this.state.turnState = TURN_STATES.END_TURN;
        return {
          success: true,
          event: 'CARD_PROCESSED',
          state: this.state
        };
      }

      case 'END_TURN': {
        if (this.state.lastRoll && this.state.lastRoll.isDoubles && !player.inJail) {
          this.state.turnState = TURN_STATES.WAIT_ROLL;
          return {
            success: true,
            event: 'EXTRA_TURN',
            message: `🎉 Tung đôi! ${player.name} được đi thêm lượt!`,
            nextPlayer: player,
            state: this.state
          };
        }

        let nextIndex = (this.state.currentTurnIndex + 1) % this.state.players.length;
        let attempts = 0;
        while (this.state.players[nextIndex].isBankrupt && attempts < this.state.players.length) {
          nextIndex = (nextIndex + 1) % this.state.players.length;
          attempts++;
        }

        this.state.currentTurnIndex = nextIndex;
        this.state.turnState = TURN_STATES.WAIT_ROLL;
        this.state.consecutiveDoubles = 0;
        this.state.lastRoll = null;
        this.state.pendingAction = null;

        return {
          success: true,
          event: 'TURN_ENDED',
          nextPlayer: this.getCurrentPlayer(),
          state: this.state
        };
      }

      default:
        return { success: false, error: `Action ${action.type} không hợp lệ` };
    }
  }

  evaluateLanding(player, landingPos) {
    const tile = this.getTile(landingPos);
    const diceTotal = this.state.lastRoll ? this.state.lastRoll.total : 7;

    if (tile.type === 'chance' || tile.type === 'chest') {
      const card = this.drawCard(tile.type);
      const cardResult = this.executeCard(player, card);

      this.state.turnState = TURN_STATES.ACTION_REQUIRED;
      this.state.pendingAction = {
        type: 'CARD_PROMPT',
        cardType: tile.type,
        card,
        result: cardResult
      };

      return {
        success: true,
        event: 'CARD_DRAWN',
        cardType: tile.type,
        card,
        result: cardResult,
        message: `${player.name} rút thẻ ${tile.type === 'chance' ? 'Cơ Hội' : 'Khí Vận'}: ${card.title}!`,
        state: this.state
      };
    }

    if (tile.action === 'go_to_jail') {
      this.sendToJail(player);
      return {
        success: true,
        event: 'GO_TO_JAIL',
        message: `🚔 ${player.name} bước vào ô Vào Tù! Bị giam ngay!`,
        state: this.state
      };
    }

    if (tile.type === 'tax') {
      const taxAmount = tile.amount || 1_000_000;
      player.money -= taxAmount;
      this.state.turnState = TURN_STATES.END_TURN;
      return {
        success: true,
        event: 'TAX_PAID',
        message: `💸 ${player.name} nộp ${(taxAmount / 1_000_000).toFixed(1)}M ${tile.name}!`,
        state: this.state
      };
    }

    if (['property', 'railroad', 'utility'].includes(tile.type)) {
      const prop = this.state.properties[tile.id];
      const owner = this.getOwner(tile.id);

      if (!owner) {
        this.state.turnState = TURN_STATES.ACTION_REQUIRED;
        this.state.pendingAction = {
          type: 'BUY_PROMPT',
          tile,
          canAfford: player.money >= tile.price
        };
        return {
          success: true,
          event: 'BUY_PROMPT',
          tile,
          canAfford: player.money >= tile.price,
          message: `Đất trống: ${tile.name} (Giá: ${(tile.price / 1_000_000).toFixed(1)}M). Bạn có muốn mua?`,
          state: this.state
        };
      }

      if (owner.id === player.id) {
        this.state.turnState = TURN_STATES.END_TURN;
        return {
          success: true,
          event: 'LANDED_OWN_PROPERTY',
          message: `${player.name} dừng chân tại đất nhà mình (${tile.name}). An toàn!`,
          state: this.state
        };
      }

      const rent = GameRules.calculateRent(tile, owner, this.state.properties, diceTotal);
      player.money -= rent;
      owner.money += rent;
      this.state.turnState = TURN_STATES.END_TURN;

      return {
        success: true,
        event: 'RENT_PAID',
        rent,
        owner,
        tile,
        message: `💸 ${player.name} trả ${(rent >= 1_000_000 ? (rent / 1_000_000).toFixed(2) + 'M' : rent / 1_000 + 'K')} tiền thuê ${tile.name} cho ${owner.name}!`,
        state: this.state
      };
    }

    this.state.turnState = TURN_STATES.END_TURN;
    return {
      success: true,
      event: 'SAFE_TILE',
      message: `${player.name} dừng tại ${tile.name}.`,
      state: this.state
    };
  }

  sendToJail(player) {
    player.position = 10;
    player.inJail = true;
    player.jailTurns = 0;
    this.state.consecutiveDoubles = 0;
    this.state.turnState = TURN_STATES.END_TURN;
  }
}

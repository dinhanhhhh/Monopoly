/**
 * BotAI.js - Trí Tuệ Nhân Tạo Bot (Chơi cờ tỷ phú tự động)
 * Dùng chung giữa Client (Offline vs Máy) và Server (Bot thay thế khi mất kết nối)
 */

import { SAIGON_BOARD_DATA } from './data/board-data.js';
import { GameRules } from './rules.js';

export class BotAI {
  /**
   * Đánh giá xem Bot có nên mua mảnh đất này không
   * @param {Object} bot - Đối tượng Bot
   * @param {Object} tile - Dữ liệu ô đất
   * @param {Object} state - Toàn bộ Game state
   * @returns {Object} { shouldBuy: boolean, reason: string }
   */
  static shouldBuyProperty(bot, tile, state) {
    if (!tile || bot.money < tile.price) {
      return { shouldBuy: false, reason: 'Không đủ tiền mua đất' };
    }

    // 1. Quỹ an toàn tối thiểu sau khi mua đất
    const safetyReserve = 800_000;
    const moneyAfterBuy = bot.money - tile.price;

    // 2. Kiểm tra nếu mảnh đất giúp hoàn thành trọn bộ màu
    if (tile.type === 'property' && tile.group) {
      const groupTiles = SAIGON_BOARD_DATA.filter((t) => t.group === tile.group);
      const ownedInGroup = groupTiles.filter(
        (t) => state.properties[t.id]?.owner === bot.id
      ).length;

      // Còn thiếu đúng 1 mảnh này để đủ bộ màu -> MUA BẰNG MỌI GIÁ (kể cả sát tiền)
      if (ownedInGroup === groupTiles.length - 1) {
        return {
          shouldBuy: true,
          reason: 'Mảnh đất chiến lược hoàn thiện trọn bộ màu!'
        };
      }

      // Kiểm tra xem đối thủ có đang sắp đủ bộ màu này không (để chặn đối thủ)
      for (const opponent of state.players) {
        if (opponent.id !== bot.id && !opponent.isBankrupt) {
          const oppOwned = groupTiles.filter(
            (t) => state.properties[t.id]?.owner === opponent.id
          ).length;
          if (oppOwned === groupTiles.length - 1 && moneyAfterBuy >= 300_000) {
            return {
              shouldBuy: true,
              reason: `Chặn ${opponent.name} gom trọn bộ màu!`
            };
          }
        }
      }
    }

    // 3. Nếu là Bến xe hoặc Công ty tiện ích
    if (tile.type === 'railroad' || tile.type === 'utility') {
      if (moneyAfterBuy >= safetyReserve) {
        return { shouldBuy: true, reason: 'Đầu tư cơ sở hạ tầng sinh lời tốt' };
      }
    }

    // 4. Mua đất thông thường nếu bảo toàn được quỹ an toàn
    if (moneyAfterBuy >= safetyReserve) {
      return { shouldBuy: true, reason: 'Đầu tư gia tăng tài sản' };
    }

    return {
      shouldBuy: false,
      reason: 'Tiền mặt thấp, cần bảo toàn vốn dự phòng'
    };
  }

  /**
   * Tính toán bước đi trong phiên Đấu Giá đất
   * @param {Object} bot - Đối tượng Bot
   * @param {Object} auction - Trạng thái phiên đấu giá
   * @param {Object} state - Toàn bộ Game state
   * @returns {Object} { action: 'BID' | 'PASS', amount?: number }
   */
  static getAuctionDecision(bot, auction, state) {
    const { tile, currentBid, highestBidder } = auction;

    // Nếu Bot đang là người dẫn đầu, không cần đặt thêm
    if (highestBidder === bot.id) {
      return { action: 'WAIT' };
    }

    // 1. Tính giá trần Bot sẵn sàng trả
    let maxWillingToPay = Math.round(tile.price * 0.9);

    if (tile.type === 'property' && tile.group) {
      const groupTiles = SAIGON_BOARD_DATA.filter((t) => t.group === tile.group);
      const ownedInGroup = groupTiles.filter(
        (t) => state.properties[t.id]?.owner === bot.id
      ).length;

      // Nếu ô này hoàn tất bộ màu -> Sẵn sàng trả tới 125% giá gốc
      if (ownedInGroup === groupTiles.length - 1) {
        maxWillingToPay = Math.round(tile.price * 1.25);
      }
    }

    // Giá trần không được vượt quá tiền mặt trừ đi 300K dự phòng
    const absoluteCap = Math.max(0, bot.money - 300_000);
    maxWillingToPay = Math.min(maxWillingToPay, absoluteCap);

    // 2. Mức giá đặt tiếp theo
    let nextBid = currentBid + 100_000;
    if (currentBid + 500_000 <= maxWillingToPay && Math.random() > 0.5) {
      nextBid = currentBid + 500_000; // Tăng giá dứt khoát
    }

    if (nextBid <= maxWillingToPay && bot.money >= nextBid) {
      return {
        action: 'BID',
        amount: nextBid
      };
    }

    return { action: 'PASS' };
  }

  /**
   * Tìm các ô đất có thể nâng cấp Nhà Xanh / Khách Sạn
   * @param {Object} bot - Đối tượng Bot
   * @param {Object} state - Toàn bộ Game state
   * @returns {Array<number>} Danh sách tileId nên xây
   */
  static getBuildDecisions(bot, state) {
    const buildList = [];
    const minReserveMoney = 1_500_000; // Quỹ bảo đảm dự phòng rủi ro

    let availableMoney = bot.money - minReserveMoney;
    if (availableMoney <= 0) return buildList;

    // Lọc tất cả ô đất Bot đang sở hữu
    const ownedTiles = SAIGON_BOARD_DATA.filter((t) => {
      const prop = state.properties[t.id];
      return prop && prop.owner === bot.id && t.type === 'property';
    });

    for (const tile of ownedTiles) {
      const check = GameRules.canBuildHouse(tile, bot, state.properties);
      if (check.canBuild && availableMoney >= check.cost) {
        buildList.push(tile.id);
        availableMoney -= check.cost;
      }
    }

    return buildList;
  }

  /**
   * Tự động cứu vãn dòng tiền khi nợ / sắp thiếu tiền
   * @param {Object} bot - Đối tượng Bot
   * @param {number} neededAmount - Số tiền còn thiếu
   * @param {Object} state - Game state
   * @returns {Array<number>} Danh sách tileId cần thế chấp
   */
  static getEmergencyMortgageList(bot, neededAmount, state) {
    const mortgageList = [];
    let recovered = 0;

    const ownedTiles = SAIGON_BOARD_DATA.filter((t) => {
      const prop = state.properties[t.id];
      return prop && prop.owner === bot.id && !prop.isMortgaged;
    });

    // Ưu tiên thế chấp ô đất lẻ loi trước, tránh ô trong trọn bộ màu
    ownedTiles.sort((a, b) => {
      const aFull = GameRules.hasFullColorSet(a.group, bot.id, state.properties);
      const bFull = GameRules.hasFullColorSet(b.group, bot.id, state.properties);
      if (aFull && !bFull) return 1;
      if (!aFull && bFull) return -1;
      return (a.price || 0) - (b.price || 0);
    });

    for (const tile of ownedTiles) {
      const check = GameRules.canMortgage(tile, bot, state.properties);
      if (check.canMortgage) {
        mortgageList.push(tile.id);
        recovered += check.mortgageValue;
        if (bot.money + recovered >= neededAmount) break;
      }
    }

    return mortgageList;
  }
}

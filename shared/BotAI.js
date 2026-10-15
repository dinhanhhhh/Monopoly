/**
 * BotAI.js - Trí Tuệ Nhân Tạo Bot (Chơi cờ tỷ phú tự động)
 * Dùng chung giữa Client (Offline vs Máy) và Server (Bot thay thế khi mất kết nối)
 */

import { SAIGON_BOARD_DATA } from "./data/board-data.js";
import { GameRules } from "./rules.js";

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
      return { shouldBuy: false, reason: "Không đủ tiền mua đất" };
    }

    // 1. Quỹ an toàn tối thiểu theo tính cách Bot
    // - Cẩn trọng (Bác Xích Lô): giữ nhiều tiền mặt (3.000.000đ)
    // - Đại gia (Cô Ba Bọt): liều lĩnh mua bạt mạng (chỉ cần dư 200.000đ)
    // - Cân bằng: 800.000đ
    let safetyReserve = 800_000;
    if (bot.personality === "cautious") safetyReserve = 3_000_000;
    else if (bot.personality === "tycoon") safetyReserve = 200_000;

    const moneyAfterBuy = bot.money - tile.price;

    // 2. Kiểm tra nếu mảnh đất giúp hoàn thành trọn bộ màu
    if (tile.type === "property" && tile.group) {
      const groupTiles = SAIGON_BOARD_DATA.filter(
        (t) => t.group === tile.group,
      );
      const ownedInGroup = groupTiles.filter(
        (t) => state.properties[t.id]?.owner === bot.id,
      ).length;

      // Còn thiếu đúng 1 mảnh này để đủ bộ màu -> MUA BẰNG MỌI GIÁ (kể cả sát tiền)
      if (ownedInGroup === groupTiles.length - 1) {
        return {
          shouldBuy: true,
          reason: "Mảnh đất chiến lược hoàn thiện trọn bộ màu!",
        };
      }

      // Kiểm tra xem đối thủ có đang sắp đủ bộ màu này không (để chặn đối thủ)
      for (const opponent of state.players) {
        if (opponent.id !== bot.id && !opponent.isBankrupt) {
          const oppOwned = groupTiles.filter(
            (t) => state.properties[t.id]?.owner === opponent.id,
          ).length;
          const minBlockReserve =
            bot.personality === "tycoon" ? 100_000 : 300_000;
          if (
            oppOwned === groupTiles.length - 1 &&
            moneyAfterBuy >= minBlockReserve
          ) {
            return {
              shouldBuy: true,
              reason: `Chặn ${opponent.name} gom trọn bộ màu!`,
            };
          }
        }
      }
    }

    // 3. Nếu là Bến xe hoặc Công ty tiện ích
    if (tile.type === "railroad" || tile.type === "utility") {
      if (moneyAfterBuy >= safetyReserve) {
        return { shouldBuy: true, reason: "Đầu tư cơ sở hạ tầng sinh lời tốt" };
      }
    }

    // 4. Mua đất thông thường nếu bảo toàn được quỹ an toàn
    if (moneyAfterBuy >= safetyReserve) {
      return { shouldBuy: true, reason: "Đầu tư gia tăng tài sản" };
    }

    return {
      shouldBuy: false,
      reason: "Tiền mặt thấp, cần bảo toàn vốn dự phòng",
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
      return { action: "WAIT" };
    }

    // 1. Tính giá trần Bot sẵn sàng trả theo tính cách
    let priceMultiplier = 0.9;
    if (bot.personality === "cautious")
      priceMultiplier = 0.85; // Bác Xích Lô trả dè chừng
    else if (bot.personality === "tycoon") priceMultiplier = 1.6; // Cô Ba Bọt ép giá hăng hái

    let maxWillingToPay = Math.round(tile.price * priceMultiplier);

    if (tile.type === "property" && tile.group) {
      const groupTiles = SAIGON_BOARD_DATA.filter(
        (t) => t.group === tile.group,
      );
      const ownedInGroup = groupTiles.filter(
        (t) => state.properties[t.id]?.owner === bot.id,
      ).length;

      // Nếu ô này hoàn tất bộ màu -> Đại gia sẵn sàng trả tới 250% giá gốc, Cẩn trọng 110%
      if (ownedInGroup === groupTiles.length - 1) {
        if (bot.personality === "tycoon") {
          maxWillingToPay = Math.round(tile.price * 2.5);
        } else if (bot.personality === "cautious") {
          maxWillingToPay = Math.round(tile.price * 1.1);
        } else {
          maxWillingToPay = Math.round(tile.price * 1.35);
        }
      }
    }

    // Quỹ tối thiểu giữ lại khi đấu giá
    const reserve =
      bot.personality === "tycoon"
        ? 100_000
        : bot.personality === "cautious"
          ? 2_000_000
          : 300_000;
    const absoluteCap = Math.max(0, bot.money - reserve);
    maxWillingToPay = Math.min(maxWillingToPay, absoluteCap);

    // 2. Mức giá đặt tiếp theo
    let step = 100_000;
    if (bot.personality === "tycoon") step = 300_000; // Tăng giá dồn dập
    let nextBid = currentBid + step;

    if (nextBid <= maxWillingToPay && bot.money >= nextBid) {
      return {
        action: "BID",
        amount: nextBid,
      };
    }

    return { action: "PASS" };
  }

  /**
   * Tìm các ô đất có thể nâng cấp Nhà Xanh / Khách Sạn
   * @param {Object} bot - Đối tượng Bot
   * @param {Object} state - Toàn bộ Game state
   * @returns {Array<number>} Danh sách tileId nên xây
   */
  static getBuildDecisions(bot, state) {
    const buildList = [];
    // Quỹ dự phòng xây nhà theo tính cách
    let minReserveMoney = 1_500_000;
    if (bot.personality === "cautious")
      minReserveMoney = 3_500_000; // Bác Xích Lô chỉ xây khi rất giàu
    else if (bot.personality === "tycoon") minReserveMoney = 300_000; // Cô Ba Bọt tất tay lên Khách Sạn

    let availableMoney = bot.money - minReserveMoney;
    if (availableMoney <= 0) return buildList;

    // Lọc tất cả ô đất Bot đang sở hữu
    const ownedTiles = SAIGON_BOARD_DATA.filter((t) => {
      const prop = state.properties[t.id];
      return prop && prop.owner === bot.id && t.type === "property";
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
      const aFull = GameRules.hasFullColorSet(
        a.group,
        bot.id,
        state.properties,
      );
      const bFull = GameRules.hasFullColorSet(
        b.group,
        bot.id,
        state.properties,
      );
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

  /**
   * Đánh giá đề nghị giao dịch từ đối thủ dựa trên định giá tài sản & chiến lược
   * @param {Object} bot - Đối tượng Bot
   * @param {Object} tradeOffer - { sender, offerMoney, offerTiles, requestMoney, requestTiles }
   * @param {Object} state - Game state
   * @returns {Object} { accept: boolean, reason: string }
   */
  static evaluateTradeOffer(bot, tradeOffer, state) {
    const {
      sender,
      offerMoney = 0,
      offerTiles = [],
      requestMoney = 0,
      requestTiles = [],
    } = tradeOffer;

    // 1. Kiểm tra tiền mặt
    if (bot.money < requestMoney) {
      return {
        accept: false,
        reason: "Tôi không có đủ tiền mặt để đáp ứng yêu cầu này!",
      };
    }

    // 2. Định giá phần Bot NHẬN ĐƯỢC (Tài sản đối phương đưa ra)
    let valReceived = offerMoney;
    for (const tId of offerTiles) {
      const tile = SAIGON_BOARD_DATA[tId];
      if (!tile) continue;
      let tileVal = tile.price || 0;

      // Nếu mảnh này giúp Bot hoàn thành trọn bộ màu -> Định giá gấp 2.2 lần!
      if (tile.type === "property" && tile.group) {
        const groupTiles = SAIGON_BOARD_DATA.filter(
          (t) => t.group === tile.group,
        );
        const owned = groupTiles.filter(
          (t) => state.properties[t.id]?.owner === bot.id,
        ).length;
        if (owned === groupTiles.length - 1) {
          tileVal = Math.round(tileVal * 2.2);
        }
      }
      valReceived += tileVal;
    }

    // 3. Định giá phần Bot PHẢI TRAO ĐI (Tài sản đối phương đòi hỏi)
    let valGiven = requestMoney;
    for (const tId of requestTiles) {
      const tile = SAIGON_BOARD_DATA[tId];
      if (!tile) continue;
      let tileVal = tile.price || 0;

      // Không bao giờ đổi mảnh đất nằm trong trọn bộ màu mà Bot đã sở hữu
      if (tile.type === "property" && tile.group) {
        const fullSet = GameRules.hasFullColorSet(
          tile.group,
          bot.id,
          state.properties,
        );
        if (fullSet) {
          return {
            accept: false,
            reason: `Tôi không thể đổi ${tile.name} vì đang giữ trọn bộ màu để xây nhà!`,
          };
        }

        // Nếu mảnh đất này giúp đối thủ gom đủ bộ màu -> Phạt giá 1.8x
        const groupTiles = SAIGON_BOARD_DATA.filter(
          (t) => t.group === tile.group,
        );
        const senderOwned = groupTiles.filter(
          (t) => state.properties[t.id]?.owner === sender.id,
        ).length;
        if (senderOwned === groupTiles.length - 1) {
          tileVal = Math.round(tileVal * 1.8);
        }
      }
      valGiven += tileVal;
    }

    // 4. So sánh giá trị theo tính cách Bot
    // - Cô Ba Bọt (tycoon): khôn ngoan, đòi hỏi valReceived >= valGiven * 1.05
    // - Bác Xích Lô (cautious): dè dặt, valReceived >= valGiven * 1.0
    // - Khác: valReceived >= valGiven * 0.95
    let threshold = 0.95;
    if (bot.personality === "tycoon") threshold = 1.05;
    else if (bot.personality === "cautious") threshold = 1.0;

    if (valReceived >= valGiven * threshold) {
      return {
        accept: true,
        reason: "Thỏa thuận này đôi bên cùng có lợi, tôi đồng ý!",
      };
    }

    return {
      accept: false,
      reason:
        "Giá trị đề nghị chưa tương xứng với tài sản của tôi, hẹn dịp khác nhé!",
    };
  }
}

/**
 * BotAI.js - Trí Tuệ Nhân Tạo Bot (Chơi cờ tỷ phú tự động)
 * Dùng chung giữa Client (Offline vs Máy) và Server (Bot thay thế khi mất kết nối)
 */

import { SAIGON_BOARD_DATA } from "./data/board-data.js";
import { GameRules } from "./rules.js";

export const BOT_PROFILES = {
  cautious: {
    buyReserve: 3_000_000,
    auctionMult: 0.85,
    auctionReserve: 2_000_000,
    buildReserve: 3_000_000,
    tradeThreshold: 1.05,
  },
  balanced: {
    buyReserve: 800_000,
    auctionMult: 0.9,
    auctionReserve: 300_000,
    buildReserve: 1_500_000,
    tradeThreshold: 0.98,
  },
  standard: {
    buyReserve: 800_000,
    auctionMult: 0.9,
    auctionReserve: 300_000,
    buildReserve: 1_500_000,
    tradeThreshold: 0.98,
  },
  tycoon: {
    buyReserve: 200_000,
    auctionMult: 1.6,
    auctionReserve: 100_000,
    buildReserve: 300_000,
    tradeThreshold: 1.1,
  },
};

const getProfile = (bot) =>
  BOT_PROFILES[bot?.personality] || BOT_PROFILES.balanced;

export class BotAI {
  /**
   * Helper tra cứu trạng thái sở hữu của nhóm màu
   */
  static groupStatus(group, ownerId, state) {
    const tiles = SAIGON_BOARD_DATA.filter((t) => t.group === group);
    const owned = tiles.filter(
      (t) => state.properties[t.id]?.owner === ownerId,
    ).length;
    return { total: tiles.length, owned, missing: tiles.length - owned };
  }

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

    const prof = getProfile(bot);
    const safetyReserve = prof.buyReserve;
    const moneyAfterBuy = bot.money - tile.price;

    // 2. Kiểm tra nếu mảnh đất giúp hoàn thành trọn bộ màu
    if (tile.type === "property" && tile.group) {
      const { owned, total } = BotAI.groupStatus(tile.group, bot.id, state);

      // Còn thiếu đúng 1 mảnh này để đủ bộ màu -> Ưu tiên tối thượng, giữ lại tối thiểu 25% reserve
      if (owned === total - 1) {
        const emergencyReserve = Math.round(safetyReserve * 0.25);
        if (moneyAfterBuy >= emergencyReserve) {
          return {
            shouldBuy: true,
            reason: "Mảnh đất chiến lược hoàn thiện trọn bộ màu!",
          };
        }
      }

      // Kiểm tra xem đối thủ có đang sắp đủ bộ màu này không (để chặn đối thủ)
      for (const opponent of state.players) {
        if (opponent.id !== bot.id && !opponent.isBankrupt) {
          const oppStatus = BotAI.groupStatus(tile.group, opponent.id, state);
          const minBlockReserve =
            bot.personality === "tycoon" ? 100_000 : 300_000;
          if (
            oppStatus.owned === oppStatus.total - 1 &&
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
   * @returns {Object} { action: 'BID' | 'PASS' | 'WAIT', amount?: number }
   */
  static getAuctionDecision(bot, auction, state) {
    const { tile, currentBid, highestBidder } = auction;

    // Nếu Bot đang là người dẫn đầu, không cần đặt thêm
    if (highestBidder === bot.id) {
      return { action: "WAIT" };
    }

    const prof = getProfile(bot);
    const mood = bot.mood ?? 1;

    // 1. Tính giá trần Bot sẵn sàng trả theo tính cách và tâm trạng ván đấu
    let priceMultiplier = prof.auctionMult * mood;
    let maxWillingToPay = Math.round(tile.price * priceMultiplier);

    if (tile.type === "property" && tile.group) {
      const { owned, total } = BotAI.groupStatus(tile.group, bot.id, state);

      // Nếu ô này hoàn tất bộ màu -> Đại gia sẵn sàng trả tới 250% giá gốc, Cẩn trọng 110%
      if (owned === total - 1) {
        if (bot.personality === "tycoon") {
          maxWillingToPay = Math.round(tile.price * 2.5 * mood);
        } else if (bot.personality === "cautious") {
          maxWillingToPay = Math.round(tile.price * 1.1);
        } else {
          maxWillingToPay = Math.round(tile.price * 1.35 * mood);
        }
      }
    }

    // Quỹ tối thiểu an toàn giữ lại khi đấu giá (Bất biến luật cứng, KHÔNG nhân mood)
    const absoluteCap = Math.max(0, bot.money - prof.auctionReserve);
    maxWillingToPay = Math.min(maxWillingToPay, absoluteCap);

    // 2. Mức giá đặt tiếp theo: Tính tỷ lệ theo giá trị ô đất (10% - 15% giá ô đất)
    const stepPct = bot.personality === "tycoon" ? 0.15 : 0.1;
    const step = Math.max(
      50_000,
      Math.round((tile.price * stepPct) / 50_000) * 50_000,
    );
    const nextBid = currentBid + step;

    if (nextBid <= maxWillingToPay && bot.money >= nextBid) {
      return {
        action: "BID",
        amount: nextBid,
      };
    }

    return { action: "PASS" };
  }

  /**
   * Tự động chuộc lại đất thế chấp khi dòng tiền dư dả
   * @param {Object} bot - Đối tượng Bot
   * @param {Object} state - Game state
   * @returns {Array<number>} Danh sách tileId cần chuộc
   */
  static getUnmortgageDecisions(bot, state) {
    const unmortgageList = [];
    const prof = getProfile(bot);
    const minReserveMoney = prof.buildReserve;

    let availableMoney = bot.money - minReserveMoney;
    if (availableMoney <= 0) return unmortgageList;

    // Tìm tất cả các ô đất của Bot đang bị thế chấp
    const mortgagedTiles = SAIGON_BOARD_DATA.filter((t) => {
      const prop = state.properties[t.id];
      return prop && prop.owner === bot.id && prop.isMortgaged;
    });

    if (mortgagedTiles.length === 0) return unmortgageList;

    // Ưu tiên chuộc:
    // 1. Ô thuộc bộ màu mà Bot sở hữu trọn bộ (để kích hoạt xây nhà x2 / khách sạn)
    // 2. Ô có giá trị cao hoặc các ô đường sắt/tiện ích
    mortgagedTiles.sort((a, b) => {
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
      if (aFull && !bFull) return -1;
      if (!aFull && bFull) return 1;
      return (b.price || 0) - (a.price || 0);
    });

    for (const tile of mortgagedTiles) {
      const check = GameRules.canUnmortgage(tile, bot, state.properties);
      if (check.canUnmortgage && availableMoney >= check.unmortgageCost) {
        unmortgageList.push(tile.id);
        availableMoney -= check.unmortgageCost;
      }
    }

    return unmortgageList;
  }

  /**
   * Tìm các ô đất có thể nâng cấp Nhà Xanh / Khách Sạn
   * Cho phép đập tiền nâng cấp nhiều cấp độ liên tục lên Khách Sạn Đỏ khi tiền rảnh rỗi
   * @param {Object} bot - Đối tượng Bot
   * @param {Object} state - Toàn bộ Game state
   * @returns {Array<number>} Danh sách tileId nên xây
   */
  static getBuildDecisions(bot, state) {
    const buildList = [];
    const prof = getProfile(bot);
    const minReserveMoney = prof.buildReserve;

    let availableMoney = bot.money - minReserveMoney;
    if (availableMoney <= 0) return buildList;

    // Lọc tất cả ô đất Bot đang sở hữu
    const ownedTiles = SAIGON_BOARD_DATA.filter((t) => {
      const prop = state.properties[t.id];
      return (
        prop &&
        prop.owner === bot.id &&
        t.type === "property" &&
        GameRules.hasFullColorSet(t.group, bot.id, state.properties)
      );
    });

    if (ownedTiles.length === 0) return buildList;

    // Bản sao tạm trạng thái nhà để mô phỏng luật xây đều tay liên tục nhiều nhà
    const tempProperties = {};
    Object.keys(state.properties).forEach((k) => {
      tempProperties[k] = { ...state.properties[k] };
    });

    // Lặp liên tục cho đến khi không còn ô nào xây được hoặc hết tiền rảnh rỗi
    let builtInLoop = true;
    let iterations = 0;
    while (builtInLoop && iterations < 30) {
      builtInLoop = false;
      iterations++;

      // Sắp xếp ưu tiên: Nhóm màu đắt tiền hơn, hoặc ô có số nhà thấp nhất trước để đảm bảo luật xây đều tay
      ownedTiles.sort((a, b) => {
        const housesA = tempProperties[a.id]?.houses || 0;
        const housesB = tempProperties[b.id]?.houses || 0;
        if (housesA !== housesB) return housesA - housesB;
        return (b.price || 0) - (a.price || 0);
      });

      for (const tile of ownedTiles) {
        const check = GameRules.canBuildHouse(tile, bot, tempProperties);
        if (check.canBuild && availableMoney >= check.cost) {
          buildList.push(tile.id);
          availableMoney -= check.cost;
          tempProperties[tile.id].houses = check.nextLevel;
          builtInLoop = true;
        }
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
  /**
   * Helper tra cứu ô đất an toàn theo ID
   */
  static getTile(tileId) {
    return SAIGON_BOARD_DATA.find((t) => t.id === Number(tileId)) || null;
  }

  /**
   * Tự động cứu vãn dòng tiền khi nợ / sắp thiếu tiền bằng kế hoạch thanh lý chuẩn của GameRules
   * @param {Object} bot - Đối tượng Bot
   * @param {number} amountOwed - Tổng số tiền nợ cần thanh toán
   * @param {Object} state - Game state
   * @returns {Object} { sells: Array<number>, mortgages: Array<number>, enough: boolean }
   */
  static getEmergencyLiquidationPlan(bot, amountOwed, state) {
    return GameRules.getLiquidationPlan(bot, amountOwed, state.properties);
  }

  // Giữ alias tương thích ngược nếu có module gọi getEmergencyMortgageList
  static getEmergencyMortgageList(bot, amountOwed, state) {
    const plan = GameRules.getLiquidationPlan(
      bot,
      amountOwed,
      state.properties,
    );
    return { list: plan.mortgages, sells: plan.sells, enough: plan.enough };
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

    const prof = getProfile(bot);
    const mood = bot.mood ?? 1;

    // 1. Kiểm tra tiền mặt và giữ lại quỹ dự phòng an toàn (Bất biến luật cứng, KHÔNG nhân mood)
    const reserve = prof.buyReserve;

    if (requestMoney > 0 && bot.money - requestMoney < reserve) {
      return {
        accept: false,
        reason: "Tôi cần giữ lại tiền mặt dự phòng an toàn, không thể chi số tiền này!",
      };
    }

    // 2. Định giá phần Bot NHẬN ĐƯỢC (Tài sản đối phương đưa ra)
    let valReceived = offerMoney;
    let botCompletesFullSet = false;

    for (const tId of offerTiles) {
      const tile = BotAI.getTile(tId);
      if (!tile) continue;

      // Luật: Không được giao dịch ô đất khi nhóm màu còn nhà
      const tradeCheck = GameRules.canTradeProperty(
        tile,
        state.properties,
        sender?.id,
      );
      if (!tradeCheck.canTrade) {
        return { accept: false, reason: tradeCheck.reason };
      }

      let tileVal = tile.price || 0;
      const propState = state.properties[tile.id];

      // Chiết khấu ô đang bị thế chấp (vì Bot phải chịu thêm 10% tiền lãi để chuộc)
      if (propState?.isMortgaged) {
        tileVal = Math.round(tileVal * 0.55);
      }

      // Nếu mảnh này giúp Bot hoàn thành trọn bộ màu -> Định giá gấp 2.5 lần!
      if (tile.type === "property" && tile.group) {
        const { owned, total } = BotAI.groupStatus(tile.group, bot.id, state);
        if (owned === total - 1) {
          tileVal = Math.round(tileVal * 2.5);
          botCompletesFullSet = true;
        }
      }
      valReceived += tileVal;
    }

    // 3. Định giá phần Bot PHẢI TRAO ĐI (Tài sản đối phương đòi hỏi)
    let valGiven = requestMoney;
    for (const tId of requestTiles) {
      const tile = BotAI.getTile(tId);
      if (!tile) continue;

      // Luật: Không được giao dịch ô đất khi nhóm màu của Bot còn nhà
      const tradeCheck = GameRules.canTradeProperty(
        tile,
        state.properties,
        bot.id,
      );
      if (!tradeCheck.canTrade) {
        return { accept: false, reason: tradeCheck.reason };
      }

      let tileVal = tile.price || 0;

      // Chiết khấu nếu ô của Bot đang bị thế chấp
      if (state.properties[tile.id]?.isMortgaged) {
        tileVal = Math.round(tileVal * 0.55);
      }

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

        // Kiểm tra xem ô này có giúp đối thủ gom đủ bộ màu độc quyền không
        const senderStatus = BotAI.groupStatus(tile.group, sender?.id, state);

        if (senderStatus.owned === senderStatus.total - 1) {
          // Tuyệt đối không bao giờ trao độc quyền cho đối thủ trừ khi Bot cũng gom đủ bộ
          if (!botCompletesFullSet) {
            return {
              accept: false,
              reason: `Tôi không thể đổi ${tile.name} vì sẽ giúp bạn gom trọn bộ màu độc quyền!`,
            };
          }
          // Nếu cả hai cùng hoàn thành bộ: Đòi giá phạt cực đắt (3.8x giá trị ô đất)
          tileVal = Math.round(tileVal * 3.8);
        }
      }
      valGiven += tileVal;
    }

    // 4. So sánh giá trị theo tính cách Bot & tâm trạng (mood cao -> dễ tính hơn, mood thấp -> khắt khe hơn)
    const baseThreshold = prof.tradeThreshold;
    const effectiveThreshold = baseThreshold * (2 - mood);

    if (valReceived >= valGiven * effectiveThreshold) {
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

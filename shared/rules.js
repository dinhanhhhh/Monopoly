import { GAME_CONSTANTS, formatVND } from "./constants.js";
import { SAIGON_BOARD_DATA } from "./data/board-data.js";

/**
 * rules.js - Bộ quy tắc tính toán tiền thuê, bộ màu, xây nhà và tài chính
 */

export const GameRules = {
  /**
   * Kiểm tra người chơi có sở hữu trọn bộ màu đất không
   */
  hasFullColorSet(group, ownerId, propertiesState) {
    if (
      !group ||
      !ownerId ||
      !GAME_CONSTANTS.COLOR_GROUPS[group.toUpperCase()]
    ) {
      return false;
    }
    const groupDef = GAME_CONSTANTS.COLOR_GROUPS[group.toUpperCase()];
    const groupTiles = SAIGON_BOARD_DATA.filter((t) => t.group === groupDef.id);

    return groupTiles.every((t) => {
      const prop = propertiesState[t.id];
      return prop && prop.owner === ownerId;
    });
  },

  /**
   * Kiểm tra xem người chơi có được phép xây nhà/khách sạn trên ô này không
   * @param {Object} tile - Dữ liệu ô đất
   * @param {Object} player - Người chơi
   * @param {Object} propertiesState - Trạng thái tất cả các ô đất
   */
  canBuildHouse(tile, player, propertiesState) {
    if (!tile || tile.type !== "property") {
      return {
        canBuild: false,
        reason: "Chỉ có đất mặt tiền đường phố mới được phép xây nhà.",
      };
    }

    const prop = propertiesState[tile.id];
    if (!prop || prop.owner !== player.id) {
      return {
        canBuild: false,
        reason: "Bạn không phải chủ sở hữu ô đất này.",
      };
    }

    if (prop.isMortgaged) {
      return {
        canBuild: false,
        reason: "Ô đất đang bị thế chấp, không thể xây nhà.",
      };
    }

    // 1. Phải gom đủ trọn bộ màu
    if (!this.hasFullColorSet(tile.group, player.id, propertiesState)) {
      return {
        canBuild: false,
        reason: "Phải sở hữu trọn bộ các ô cùng nhóm màu mới được xây nhà.",
      };
    }

    // 2. Kiểm tra ô đất trong cùng nhóm có ô nào đang thế chấp không
    const groupTiles = SAIGON_BOARD_DATA.filter((t) => t.group === tile.group);
    const anyMortgaged = groupTiles.some(
      (t) => propertiesState[t.id]?.isMortgaged,
    );
    if (anyMortgaged) {
      return {
        canBuild: false,
        reason:
          "Có ô đất cùng nhóm màu đang bị thế chấp. Phải chuộc lại trước.",
      };
    }

    // 3. Tối đa 5 cấp (4 nhà xanh + 1 khách sạn đỏ)
    const currentHouses = prop.houses || 0;
    if (currentHouses >= 5) {
      return {
        canBuild: false,
        reason: "Đã xây tối đa Khách Sạn Đỏ trên ô đất này.",
      };
    }

    // 4. LUẬT XÂY ĐỀU TAY: Không được chênh quá 1 nhà so với các ô khác trong nhóm
    const otherHouses = groupTiles
      .filter((t) => t.id !== tile.id)
      .map((t) => propertiesState[t.id]?.houses || 0);
    const minOtherHouses = Math.min(...otherHouses);

    if (currentHouses > minOtherHouses) {
      return {
        canBuild: false,
        reason:
          "Luật xây đều tay: Bạn phải nâng cấp các ô đất cùng màu khác trước.",
      };
    }

    // 5. Kiểm tra tiền
    if (player.money < tile.houseCost) {
      return {
        canBuild: false,
        reason: `Không đủ tiền xây (${formatVND(tile.houseCost)}).`,
      };
    }

    const isHotel = currentHouses === 4;
    return {
      canBuild: true,
      isHotel,
      cost: tile.houseCost,
      nextLevel: currentHouses + 1,
    };
  },

  /**
   * Tính toán tiền thuê đất chuẩn quốc tế
   */
  calculateRent(tile, owner, propertiesState, diceTotal = 7) {
    if (!tile || !owner) return 0;

    const propState = propertiesState[tile.id];
    if (!propState || propState.isMortgaged) return 0;

    if (tile.type === "property") {
      const houses = propState.houses || 0;

      if (houses === 0) {
        const ownsFullSet = this.hasFullColorSet(
          tile.group,
          owner.id,
          propertiesState,
        );
        return ownsFullSet ? tile.rent[0] * 2 : tile.rent[0];
      }

      return tile.rent[houses] || tile.rent[0];
    }

    if (tile.type === "railroad") {
      const railroadTiles = SAIGON_BOARD_DATA.filter(
        (t) => t.type === "railroad",
      );
      const ownedCount = railroadTiles.filter((t) => {
        const p = propertiesState[t.id];
        return p && p.owner === owner.id && !p.isMortgaged;
      }).length;

      if (ownedCount === 0) return 0;
      const rentIndex = Math.min(ownedCount, 4) - 1;
      return GAME_CONSTANTS.RAILROAD_RENTS[rentIndex] || 250_000;
    }

    if (tile.type === "utility") {
      const utilityTiles = SAIGON_BOARD_DATA.filter(
        (t) => t.type === "utility",
      );
      const ownedCount = utilityTiles.filter((t) => {
        const p = propertiesState[t.id];
        return p && p.owner === owner.id && !p.isMortgaged;
      }).length;

      if (ownedCount === 0) return 0;
      const multiplier =
        ownedCount >= 2
          ? GAME_CONSTANTS.UTILITY_MULTIPLIERS[1]
          : GAME_CONSTANTS.UTILITY_MULTIPLIERS[0];
      return multiplier * diceTotal * 100_000;
    }

    return 0;
  },

  calculateNetWorth(player, propertiesState) {
    let total = player.money || 0;
    SAIGON_BOARD_DATA.forEach((tile) => {
      const p = propertiesState[tile.id];
      if (p && p.owner === player.id) {
        total += tile.price || 0;
        if (p.houses > 0 && tile.houseCost) {
          total += p.houses * tile.houseCost;
        }
      }
    });
    return total;
  },

  /**
   * Tính toán tối đa số tiền mặt người chơi có thể huy động ngay lập tức
   * bằng cách bán toàn bộ nhà (50% giá xây) và thế chấp toàn bộ đất (50% giá đất)
   */
  calculateMaxLiquidation(player, propertiesState) {
    if (!player) return 0;
    let total = 0;
    SAIGON_BOARD_DATA.forEach((tile) => {
      const p = propertiesState[tile.id];
      if (p && p.owner === player.id) {
        // 1. Tiền thu được từ bán nhà (50% chi phí xây)
        if (p.houses > 0 && tile.houseCost) {
          total += p.houses * Math.round(tile.houseCost * 0.5);
        }
        // 2. Tiền thu được từ thế chấp ô đất (nếu ô đó chưa bị thế chấp)
        if (!p.isMortgaged) {
          total += tile.mortgage || Math.round((tile.price || 0) * 0.5);
        }
      }
    });
    return total;
  },

  /**
   * Kiểm tra xem ô đất có thể thế chấp (cầm cố) được không
   */
  canMortgage(tile, player, propertiesState) {
    if (!tile || !["property", "railroad", "utility"].includes(tile.type)) {
      return {
        canMortgage: false,
        reason: "Chỉ có bất động sản mới được thế chấp.",
      };
    }
    const prop = propertiesState[tile.id];
    if (!prop || prop.owner !== player.id) {
      return {
        canMortgage: false,
        reason: "Bạn không phải chủ sở hữu ô đất này.",
      };
    }
    if (prop.isMortgaged) {
      return {
        canMortgage: false,
        reason: "Ô đất này đã đang bị thế chấp rồi.",
      };
    }
    // Luật: Không được thế chấp đất khi trong cùng nhóm màu còn nhà/khách sạn
    if (tile.type === "property" && tile.group) {
      const groupTiles = SAIGON_BOARD_DATA.filter(
        (t) => t.group === tile.group,
      );
      const anyHouses = groupTiles.some(
        (t) => (propertiesState[t.id]?.houses || 0) > 0,
      );
      if (anyHouses) {
        return {
          canMortgage: false,
          reason:
            "Phải bán toàn bộ nhà trong cùng nhóm màu trước khi thế chấp.",
        };
      }
    }
    const mortgageValue = tile.mortgage || Math.round((tile.price || 0) * 0.5);
    return {
      canMortgage: true,
      mortgageValue,
    };
  },

  /**
   * Kiểm tra xem ô đất có thể chuộc lại (unmortgage) không
   */
  canUnmortgage(tile, player, propertiesState) {
    if (!tile || !["property", "railroad", "utility"].includes(tile.type)) {
      return { canUnmortgage: false, reason: "Bất động sản không hợp lệ." };
    }
    const prop = propertiesState[tile.id];
    if (!prop || prop.owner !== player.id) {
      return {
        canUnmortgage: false,
        reason: "Bạn không phải chủ sở hữu ô đất này.",
      };
    }
    if (!prop.isMortgaged) {
      return {
        canUnmortgage: false,
        reason: "Ô đất này không trong trạng thái thế chấp.",
      };
    }
    const mortgageVal = tile.mortgage || Math.round((tile.price || 0) * 0.5);
    const unmortgageCost = Math.round(mortgageVal * 1.1); // Phí gốc + 10% lãi
    if (player.money < unmortgageCost) {
      return {
        canUnmortgage: false,
        reason: `Không đủ tiền chuộc sổ đỏ (Cần ${formatVND(unmortgageCost)}, bao gồm 10% lãi).`,
        unmortgageCost,
      };
    }
    return {
      canUnmortgage: true,
      unmortgageCost,
    };
  },

  /**
   * Kiểm tra xem có thể bán bớt nhà trên ô đất không
   */
  canSellHouse(tile, player, propertiesState) {
    if (!tile || tile.type !== "property") {
      return {
        canSell: false,
        reason: "Chỉ có nhà trên đường phố mới có thể bán.",
      };
    }
    const prop = propertiesState[tile.id];
    if (!prop || prop.owner !== player.id) {
      return { canSell: false, reason: "Bạn không phải chủ sở hữu ô đất này." };
    }
    const currentHouses = prop.houses || 0;
    if (currentHouses <= 0) {
      return { canSell: false, reason: "Ô đất này chưa có nhà nào để bán." };
    }
    // Luật bán đều tay: Không được bán ô có ít nhà hơn các ô khác trong nhóm
    const groupTiles = SAIGON_BOARD_DATA.filter((t) => t.group === tile.group);
    const otherHouses = groupTiles
      .filter((t) => t.id !== tile.id)
      .map((t) => propertiesState[t.id]?.houses || 0);
    const maxOtherHouses = Math.max(...otherHouses);

    if (currentHouses < maxOtherHouses) {
      return {
        canSell: false,
        reason: "Luật bán đều tay: Phải bán ở ô có nhiều nhà hơn trước.",
      };
    }
    const refund = Math.round((tile.houseCost || 0) * 0.5);
    return {
      canSell: true,
      refund,
      nextHouses: currentHouses - 1,
    };
  },

  /**
   * Kiểm tra ô đất có thể đem ra giao dịch (Trade) không
   * (Nghiêm cấm giao dịch đất khi trong nhóm màu còn nhà)
   */
  canTradeProperty(tile, propertiesState) {
    if (!tile) return { canTrade: false, reason: "Ô đất không hợp lệ." };
    const prop = propertiesState[tile.id];
    if (!prop || !prop.owner)
      return { canTrade: false, reason: "Chưa có chủ sở hữu." };

    if (tile.type === "property" && tile.group) {
      const groupTiles = SAIGON_BOARD_DATA.filter(
        (t) => t.group === tile.group,
      );
      const anyHouses = groupTiles.some(
        (t) => (propertiesState[t.id]?.houses || 0) > 0,
      );
      if (anyHouses) {
        return {
          canTrade: false,
          reason: "Phải bán hết nhà trên toàn bộ nhóm màu trước khi giao dịch.",
        };
      }
    }
    return { canTrade: true };
  },
};

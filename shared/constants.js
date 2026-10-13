/**
 * Hằng số cấu hình chuẩn cho game Cờ Tỷ Phú Sài Gòn
 */

export const GAME_CONSTANTS = {
  // Tiền tệ VNĐ
  CURRENCY_UNIT: 'đ',
  STARTING_MONEY: 15_000_000,    // 15 triệu
  GO_REWARD: 2_000_000,          // 2 triệu khi qua hoặc dừng ở GO
  JAIL_FINE: 500_000,            // 500k tiền phạt bảo lãnh ra tù
  INCOME_TAX: 2_000_000,         // 2 triệu thuế thu nhập
  LUXURY_TAX: 1_000_000,         // 1 triệu thuế xa xỉ / tiêu thụ đặc biệt
  MORTGAGE_INTEREST_RATE: 0.1,   // 10% phí chuộc lại đất thế chấp

  // Giới hạn vật phẩm
  TOTAL_HOUSES: 32,              // Tối đa 32 nhà xanh trên toàn ván
  TOTAL_HOTELS: 12,              // Tối đa 12 khách sạn đỏ
  MAX_HOUSES_PER_PROPERTY: 4,    // 4 nhà trước khi lên khách sạn
  MAX_JAIL_TURNS: 3,             // Tối đa 3 lượt thử tung đôi ở tù

  // Bến xe (Railroads) tiền thuê theo số lượng sở hữu: 1, 2, 3, 4
  RAILROAD_RENTS: [250_000, 500_000, 1_000_000, 2_000_000],

  // Tiện ích (Utilities) hệ số nhân xúc xắc: 1 tiện ích (x4), 2 tiện ích (x10)
  UTILITY_MULTIPLIERS: [4, 10],

  // 8 Nhóm màu đất
  COLOR_GROUPS: {
    BROWN: { id: 'brown', name: 'Nâu', hex: '#8B4513', count: 2 },
    LIGHT_BLUE: { id: 'light_blue', name: 'Xanh da trời', hex: '#87CEEB', count: 3 },
    PINK: { id: 'pink', name: 'Hồng', hex: '#FF69B4', count: 3 },
    ORANGE: { id: 'orange', name: 'Cam', hex: '#FFA500', count: 3 },
    RED: { id: 'red', name: 'Đỏ', hex: '#E63946', count: 3 },
    YELLOW: { id: 'yellow', name: 'Vàng', hex: '#FFD166', count: 3 },
    GREEN: { id: 'green', name: 'Xanh lá', hex: '#06D6A0', count: 3 },
    DARK_BLUE: { id: 'dark_blue', name: 'Xanh dương đậm', hex: '#118AB2', count: 2 },
  }
};

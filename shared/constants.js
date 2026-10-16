/**
 * Hằng số cấu hình chuẩn cho game Cờ Tỷ Phú Sài Gòn
 */

export const GAME_CONSTANTS = {
  // Tiền tệ VNĐ
  CURRENCY_UNIT: "đ",
  STARTING_MONEY: 15_000_000, // 15 triệu
  GO_REWARD: 2_000_000, // 2 triệu khi qua hoặc dừng ở GO
  JAIL_FINE: 500_000, // 500k tiền phạt bảo lãnh ra tù
  INCOME_TAX: 2_000_000, // 2 triệu thuế thu nhập
  LUXURY_TAX: 1_000_000, // 1 triệu thuế xa xỉ / tiêu thụ đặc biệt
  MORTGAGE_INTEREST_RATE: 0.1, // 10% phí chuộc lại đất thế chấp

  // Giới hạn vật phẩm & kho ngân hàng (null = vô hạn; chế độ giải đấu: { houses: 32, hotels: 12 })
  BANK_LIMITS: { houses: null, hotels: null },
  TOTAL_HOUSES: 32, // Tối đa 32 nhà xanh (cho mode giải đấu)
  TOTAL_HOTELS: 12, // Tối đa 12 khách sạn đỏ (cho mode giải đấu)
  MAX_HOUSES_PER_PROPERTY: 4, // 4 nhà trước khi lên khách sạn
  MAX_JAIL_TURNS: 3, // Tối đa 3 lượt thử tung đôi ở tù

  // Bến xe (Railroads) tiền thuê theo số lượng sở hữu: 1, 2, 3, 4
  RAILROAD_RENTS: [250_000, 500_000, 1_000_000, 2_000_000],

  // Tiện ích (Utilities) hệ số nhân xúc xắc: 1 tiện ích (x4), 2 tiện ích (x10)
  UTILITY_MULTIPLIERS: [4, 10],

  // 8 Nhóm màu đất
  COLOR_GROUPS: {
    BROWN: { id: "brown", name: "Nâu", hex: "#8B4513", count: 2 },
    LIGHT_BLUE: {
      id: "light_blue",
      name: "Xanh da trời",
      hex: "#87CEEB",
      count: 3,
    },
    PINK: { id: "pink", name: "Hồng", hex: "#FF69B4", count: 3 },
    ORANGE: { id: "orange", name: "Cam", hex: "#FFA500", count: 3 },
    RED: { id: "red", name: "Đỏ", hex: "#E63946", count: 3 },
    YELLOW: { id: "yellow", name: "Vàng", hex: "#FFD166", count: 3 },
    GREEN: { id: "green", name: "Xanh lá", hex: "#06D6A0", count: 3 },
    DARK_BLUE: {
      id: "dark_blue",
      name: "Xanh dương đậm",
      hex: "#118AB2",
      count: 2,
    },
  },
};

/**
 * Định dạng tiền tệ thống nhất toàn bộ ứng dụng:
 * - Chế độ rút gọn (mặc định): "15tr", "1tr", "600k", "0đ", "+2tr"
 * - Chế độ đầy đủ (full): "14.000.000đ", "15.000.000đ"
 * @param {number} amount - Số tiền
 * @param {boolean|object} withSignOrOptions - Có dấu '+' khi dương hoặc object cấu hình { withSign, full }
 * @param {boolean} fullParam - Có hiển thị dạng đầy đủ "14.000.000đ" không
 */
export function formatVND(
  amount,
  withSignOrOptions = false,
  fullParam = false,
) {
  if (amount === undefined || amount === null) return "";
  const num = Number(amount);
  if (isNaN(num)) return "";

  let withSign = false;
  let isFull = false;

  if (typeof withSignOrOptions === "object" && withSignOrOptions !== null) {
    withSign = !!withSignOrOptions.withSign;
    isFull = !!withSignOrOptions.full;
  } else {
    withSign = !!withSignOrOptions;
    isFull = !!fullParam;
  }

  const sign = num > 0 && withSign ? "+" : num < 0 ? "-" : "";
  const abs = Math.abs(num);

  if (isFull) {
    return `${sign}${abs.toLocaleString("vi-VN")}đ`;
  }

  let valStr = "";
  if (abs >= 1_000_000) {
    const tr = abs / 1_000_000;
    // Bỏ số 0 thừa sau dấu phẩy (ví dụ 1.0 -> 1, 1.50 -> 1,5)
    const formattedTr = Number.isInteger(tr)
      ? `${tr}`
      : `${parseFloat(tr.toFixed(2)).toString().replace(".", ",")}`;
    valStr = `${formattedTr}tr`;
  } else if (abs >= 1_000) {
    valStr = `${Math.round(abs / 1_000)}k`;
  } else {
    valStr = `${abs}đ`;
  }

  return `${sign}${valStr}`;
}

export function formatVNDFull(amount, withSign = false) {
  return formatVND(amount, withSign, true);
}

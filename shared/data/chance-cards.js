/**
 * chance-cards.js - Bộ 16 Thẻ Cơ Hội chuẩn văn hóa Sài Gòn (Màu cam)
 */

export const CHANCE_CARDS = [
  {
    id: 'ch_go',
    title: 'Tiến Đến Khởi Hành',
    desc: 'Đi thẳng đến ô Khởi Hành (GO). Nhận ngay 2.000.000đ!',
    icon: '🚩',
    action: { type: 'MOVE_TO', target: 0, passGoReward: true }
  },
  {
    id: 'ch_nguyenhue',
    title: 'Dạo Phố Đi Bộ',
    desc: 'Tiến thẳng đến Phố Đi Bộ Nguyễn Huệ. Nếu qua Khởi Hành nhận 2.000.000đ.',
    icon: '🏙️',
    action: { type: 'MOVE_TO', target: 39, passGoReward: true }
  },
  {
    id: 'ch_benthanh',
    title: 'Ghé Chợ Bến Thành',
    desc: 'Đi đến Chợ Bến Thành. Nếu đi qua Khởi Hành nhận 2.000.000đ.',
    icon: '🛍️',
    action: { type: 'MOVE_TO', target: 31, passGoReward: true }
  },
  {
    id: 'ch_gasaigon',
    title: 'Đón Tàu Tại Ga Sài Gòn',
    desc: 'Đi đến Ga Sài Gòn. Nếu qua Khởi Hành nhận 2.000.000đ.',
    icon: '🚆',
    action: { type: 'MOVE_TO', target: 15, passGoReward: true }
  },
  {
    id: 'ch_nearest_bus',
    title: 'Bến Xe Gần Nhất',
    desc: 'Đi đến Bến Xe / Ga gần nhất. Nếu đã có chủ, trả tiền thuê GẤP ĐÔI thông thường.',
    icon: '🚌',
    action: { type: 'MOVE_NEAREST_RAILROAD', doubleRent: true }
  },
  {
    id: 'ch_nearest_utility',
    title: 'Công Ty Tiện Ích Gần Nhất',
    desc: 'Đi đến Cty Tiện Ích gần nhất. Nếu đã có chủ, tung xúc xắc và trả 10x điểm xí ngầu.',
    icon: '⚡',
    action: { type: 'MOVE_NEAREST_UTILITY', multiplier: 10 }
  },
  {
    id: 'ch_vietlott',
    title: 'Trúng Số Vietlott',
    desc: 'Vé số trúng thưởng may mắn! Nhận ngay 1.000.000đ từ Ngân hàng.',
    icon: '🎰',
    action: { type: 'ADD_MONEY', amount: 1_000_000 }
  },
  {
    id: 'ch_speeding',
    title: 'Vi Phạm Giao Thông',
    desc: 'Chạy quá tốc độ trên đại lộ Võ Văn Kiệt. Nộp phạt 150.000đ.',
    icon: '🚔',
    action: { type: 'SUB_MONEY', amount: 150_000 }
  },
  {
    id: 'ch_jail_free',
    title: 'Thẻ Ra Tù Miễn Phí',
    desc: 'Thẻ bài hộ mệnh! Giữ lại khi cần hoặc có thể bán lại cho người chơi khác.',
    icon: '🗝️',
    action: { type: 'GET_JAIL_CARD' }
  },
  {
    id: 'ch_go_jail',
    title: 'Vào Tù Ngay Lập Tức',
    desc: 'Bị áp giải thẳng vào buồng giam! Không qua Khởi Hành, không nhận tiền.',
    icon: '👮‍♂️',
    action: { type: 'GO_TO_JAIL' }
  },
  {
    id: 'ch_repair',
    title: 'Tu Sửa Nhà Cửa',
    desc: 'Sửa chữa bảo trì: Nộp 250.000đ cho mỗi ngôi nhà và 1.000.000đ cho mỗi khách sạn.',
    icon: '🔨',
    action: { type: 'REPAIR_HOUSES', houseFee: 250_000, hotelFee: 1_000_000 }
  },
  {
    id: 'ch_mientay',
    title: 'Về Miền Tây Ăn Cưới',
    desc: 'Đi đến Bến Xe Miền Tây. Nếu qua Khởi Hành nhận 2.000.000đ.',
    icon: '🌾',
    action: { type: 'MOVE_TO', target: 25, passGoReward: true }
  },
  {
    id: 'ch_treat_friends',
    title: 'Khao Cà Phê Bệt',
    desc: 'Khao bạn bè cà phê bệt Nhà thờ Đức Bà: Trả cho mỗi người chơi 100.000đ.',
    icon: '☕',
    action: { type: 'PAY_ALL_PLAYERS', amount: 100_000 }
  },
  {
    id: 'ch_tax_refund',
    title: 'Hoàn Thuế Thu Nhập',
    desc: 'Nhận tiền hoàn thuế từ Cục Thuế TP.HCM: +1.500.000đ.',
    icon: '💰',
    action: { type: 'ADD_MONEY', amount: 1_500_000 }
  },
  {
    id: 'ch_bank_dividend',
    title: 'Cổ Tức Ngân Hàng',
    desc: 'Ngân hàng chia cổ tức định kỳ: Nhận ngay 500.000đ.',
    icon: '📈',
    action: { type: 'ADD_MONEY', amount: 500_000 }
  },
  {
    id: 'ch_step_back',
    title: 'Kẹt Xe Giờ Cao Điểm',
    desc: 'Kẹt xe đường Cách Mạng Tháng 8! Lùi lại 3 ô.',
    icon: '🛑',
    action: { type: 'STEP_BACK', steps: 3 }
  }
];

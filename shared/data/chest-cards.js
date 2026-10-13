/**
 * chest-cards.js - Bộ 16 Thẻ Khí Vận / Sự Kiện Cộng Đồng Sài Gòn (Màu xanh navy)
 */

export const CHEST_CARDS = [
  {
    id: 'ct_go',
    title: 'Tiến Về Khởi Hành',
    desc: 'Đi thẳng đến ô Khởi Hành (GO). Nhận ngay 2.000.000đ!',
    icon: '🚩',
    action: { type: 'MOVE_TO', target: 0, passGoReward: true }
  },
  {
    id: 'ct_bank_error',
    title: 'Ngân Hàng Nhầm Lẫn',
    desc: 'Hệ thống hạch toán nhầm có lợi cho bạn: Nhận 2.000.000đ.',
    icon: '🏦',
    action: { type: 'ADD_MONEY', amount: 2_000_000 }
  },
  {
    id: 'ct_hospital',
    title: 'Viện Phí Bệnh Viện Chợ Rẫy',
    desc: 'Thanh toán chi phí điều trị: Nộp 500.000đ cho Ngân hàng.',
    icon: '🏥',
    action: { type: 'SUB_MONEY', amount: 500_000 }
  },
  {
    id: 'ct_inheritance',
    title: 'Thừa Kế Bất Động Sản',
    desc: 'Nhận phần tiền thừa kế từ gia đình: +1.000.000đ.',
    icon: '📜',
    action: { type: 'ADD_MONEY', amount: 1_000_000 }
  },
  {
    id: 'ct_tet_lucky',
    title: 'Lì Xì Tết Nguyên Đán',
    desc: 'Mừng tuổi đầu năm mới! Mỗi người chơi khác tặng bạn 200.000đ.',
    icon: '🧧',
    action: { type: 'RECEIVE_FROM_ALL', amount: 200_000 }
  },
  {
    id: 'ct_jail_free',
    title: 'Thẻ Ra Tù Miễn Phí',
    desc: 'Bảo bối thần kỳ! Giữ lại sử dụng khi vào tù hoặc sang nhượng.',
    icon: '🗝️',
    action: { type: 'GET_JAIL_CARD' }
  },
  {
    id: 'ct_go_jail',
    title: 'Vào Tù Ngay Lập Tức',
    desc: 'Bị áp giải thẳng vào buồng giam! Không qua Khởi Hành, không nhận tiền.',
    icon: '👮‍♂️',
    action: { type: 'GO_TO_JAIL' }
  },
  {
    id: 'ct_tuition',
    title: 'Đóng Học Phí Đại Học',
    desc: 'Nộp học phí kỳ mới tại ĐHQG TP.HCM: Nộp 500.000đ.',
    icon: '🎓',
    action: { type: 'SUB_MONEY', amount: 500_000 }
  },
  {
    id: 'ct_compensation',
    title: 'Đền Bù Giải Tỏa Mặt Bằng',
    desc: 'Dự án mở rộng đường metro: Nhận tiền đền bù 1.500.000đ.',
    icon: '🏗️',
    action: { type: 'ADD_MONEY', amount: 1_500_000 }
  },
  {
    id: 'ct_consulting',
    title: 'Thu Lao Tư Vấn',
    desc: 'Hoàn thành dịch vụ tư vấn công nghệ: Nhận 250.000đ.',
    icon: '💼',
    action: { type: 'ADD_MONEY', amount: 250_000 }
  },
  {
    id: 'ct_birthday',
    title: 'Sinh Nhật Vui Vẻ',
    desc: 'Hôm nay là sinh nhật của bạn! Mỗi người chơi tặng bạn 100.000đ.',
    icon: '🎂',
    action: { type: 'RECEIVE_FROM_ALL', amount: 100_000 }
  },
  {
    id: 'ct_insurance',
    title: 'Bảo Hiểm Đáo Hạn',
    desc: 'Hợp đồng bảo hiểm nhân thọ kết thúc: Nhận 1.000.000đ.',
    icon: '🛡️',
    action: { type: 'ADD_MONEY', amount: 1_000_000 }
  },
  {
    id: 'ct_electric_bill',
    title: 'Hóa Đơn Tiền Điện EVN',
    desc: 'Mùa nóng bật máy lạnh cả ngày: Nộp tiền điện 200.000đ.',
    icon: '⚡',
    action: { type: 'SUB_MONEY', amount: 200_000 }
  },
  {
    id: 'ct_charity',
    title: 'Ủng Hộ Quỹ Vì Người Nghèo',
    desc: 'Đóng góp từ thiện giúp đỡ bà con khó khăn: Nộp 500.000đ.',
    icon: '❤️',
    action: { type: 'SUB_MONEY', amount: 500_000 }
  },
  {
    id: 'ct_beauty_contest',
    title: 'Giải Nhất Nét Đẹp Sài Gòn',
    desc: 'Trúng giải cao trong hội thi duyên dáng: Nhận 500.000đ.',
    icon: '👑',
    action: { type: 'ADD_MONEY', amount: 500_000 }
  },
  {
    id: 'ct_toll_fee',
    title: 'Phí Cầu Đường BOT',
    desc: 'Xe ô tô qua trạm thu phí xa lộ Hà Nội: Nộp 100.000đ.',
    icon: '🛣️',
    action: { type: 'SUB_MONEY', amount: 100_000 }
  }
];

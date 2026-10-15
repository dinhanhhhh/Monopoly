/**
 * TokensData.js - Bộ biểu tượng quân cờ SVG chuẩn bản sắc văn hóa Sài Gòn
 */

export const GAME_TOKENS = [
  {
    id: "token_coffee",
    name: "Cà Phê Sữa Đá",
    color: "#795548",
    bgColor: "#EFEBE9",
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Ống hút cắm nghiêng -->
      <path d="M26 4L34 2L29 20" stroke="#E53935" stroke-width="3" stroke-linecap="round"/>
      <path d="M26 4L34 2L29 20" stroke="#FFFFFF" stroke-width="1" stroke-dasharray="2 3"/>
      <!-- Ly thủy tinh cao -->
      <path d="M14 14L17 42C17.2 43.5 18.5 44 20 44H28C29.5 44 30.8 43.5 31 42L34 14H14Z" fill="rgba(255,255,255,0.7)" stroke="#4E342E" stroke-width="2"/>
      <!-- Lớp sữa đặc béo ngậy ở đáy ly -->
      <path d="M17 35L17.5 42C17.6 43 18.5 44 20 44H28C29.5 44 30.4 43 30.5 42L31 35H17Z" fill="#FFF8E1"/>
      <!-- Lớp cà phê nâu đậm sóng sánh ở giữa -->
      <path d="M15.5 22L17 35H31L32.5 22H15.5Z" fill="#5D4037"/>
      <!-- Đá viên trong veo nổi phía trên -->
      <rect x="18" y="20" width="6" height="6" rx="1.5" fill="#E0F7FA" stroke="#B2EBF2" stroke-width="1"/>
      <rect x="24" y="24" width="5.5" height="5.5" rx="1.5" fill="#E0F7FA" stroke="#B2EBF2" stroke-width="1"/>
      <rect x="21" y="28" width="5" height="5" rx="1" fill="#E0F7FA" stroke="#B2EBF2" stroke-width="1"/>
      <!-- Bọt sữa / Cà phê trên miệng ly -->
      <ellipse cx="24" cy="14" rx="10" ry="3.5" fill="#8D6E63" stroke="#4E342E" stroke-width="1.5"/>
      <ellipse cx="21" cy="13.5" rx="2" ry="1" fill="#D7CCC8"/>
    </svg>`,
  },
  {
    id: "token_banhmi",
    name: "Bánh Mì Sài Gòn",
    color: "#D97706",
    bgColor: "#FEF3C7",
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Ổ bánh mì vàng giòn rụm -->
      <path d="M6 24C6 15 15 13 24 13C33 13 42 15 42 24C42 33 33 35 24 35C15 35 6 33 6 24Z" fill="#F59E0B" stroke="#B45309" stroke-width="2.2"/>
      <!-- Lớp vỏ nướng giòn đậm màu -->
      <path d="M9 23C11 17 17 15 24 15C31 15 37 17 39 23C37 30 31 33 24 33C17 33 11 30 9 23Z" fill="#D97706"/>
      <!-- Vết rạch giòn hé lộ ruột bánh mì xốp mềm -->
      <path d="M13 20C15 18 19 23 17 26" stroke="#FEF3C7" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M22 19C24 17 28 24 26 27" stroke="#FEF3C7" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M31 19C33 17 37 23 35 26" stroke="#FEF3C7" stroke-width="2.5" stroke-linecap="round"/>
      <!-- Cọng ngò xanh & lát ớt hé lộ -->
      <circle cx="21" cy="22" r="1.8" fill="#10B981"/>
      <circle cx="29" cy="23" r="1.8" fill="#EF4444"/>
    </svg>`,
  },
  {
    id: "token_hutieu",
    name: "Xe Hủ Tiếu Gõ",
    color: "#E11D48",
    bgColor: "#FFE4E6",
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Mái che xe đẩy -->
      <path d="M8 12L24 8L40 12L38 15H10L8 12Z" fill="#E11D48" stroke="#9F1239" stroke-width="1.8"/>
      <!-- Trụ chống mái -->
      <line x1="12" y1="15" x2="12" y2="23" stroke="#475569" stroke-width="2"/>
      <line x1="36" y1="15" x2="36" y2="23" stroke="#475569" stroke-width="2"/>
      <!-- Thùng xe đẩy inox -->
      <rect x="10" y="22" width="28" height="14" rx="2" fill="#E2E8F0" stroke="#334155" stroke-width="2"/>
      <!-- Tủ kính hủ tiếu -->
      <rect x="12" y="24" width="12" height="10" rx="1" fill="#BAE6FD" stroke="#0284C7" stroke-width="1"/>
      <!-- Nồi nước lèo bốc khói -->
      <ellipse cx="31" cy="25" rx="5" ry="2.5" fill="#F59E0B" stroke="#B45309" stroke-width="1.2"/>
      <path d="M29 22C28 20 30 18 29 16M33 22C32 20 34 18 33 16" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round"/>
      <!-- Bánh xe đẩy lớn -->
      <circle cx="16" cy="38" r="5" fill="#334155" stroke="#FFFFFF" stroke-width="1.5"/>
      <circle cx="16" cy="38" r="2" fill="#94A3B8"/>
      <circle cx="32" cy="38" r="5" fill="#334155" stroke="#FFFFFF" stroke-width="1.5"/>
      <circle cx="32" cy="38" r="2" fill="#94A3B8"/>
      <!-- Cặp thanh tre gõ lốc cốc -->
      <line x1="38" y1="28" x2="43" y2="34" stroke="#D97706" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="41" y1="28" x2="44" y2="36" stroke="#B45309" stroke-width="2.2" stroke-linecap="round"/>
    </svg>`,
  },
  {
    id: "token_nonla",
    name: "Nón Lá",
    color: "#059669",
    bgColor: "#D1FAE5",
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Nón lá chóp tròn duyên dáng -->
      <path d="M24 8L6 34C6 34 15 39 24 39C33 39 42 34 42 34L24 8Z" fill="#FBBF24" stroke="#B45309" stroke-width="2" stroke-linejoin="round"/>
      <!-- Các nan vành nón lá tre -->
      <path d="M24 8V39" stroke="#D97706" stroke-width="1.5" stroke-dasharray="2 2"/>
      <path d="M15 21C18 22.5 21 23 24 23C27 23 30 22.5 33 21" stroke="#B45309" stroke-width="1.4"/>
      <path d="M10 28C14.5 30.5 19 31 24 31C29 31 33.5 30.5 38 28" stroke="#B45309" stroke-width="1.4"/>
      <!-- Quai nón lụa mềm mại màu hồng ngọc -->
      <path d="M12 34C15 42 20 44 24 44C28 44 33 42 36 34" stroke="#EC4899" stroke-width="2" stroke-linecap="round"/>
      <circle cx="24" cy="7.5" r="2" fill="#B45309"/>
    </svg>`,
  },
  {
    id: "token_motorbike",
    name: "Xe Máy Vespa",
    color: "#7B4BD8",
    bgColor: "#F3E8FF",
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="34" r="7" fill="#2C3E50" stroke="#FFF" stroke-width="2"/>
      <circle cx="12" cy="34" r="3" fill="#BDC3C7"/>
      <circle cx="36" cy="34" r="7" fill="#2C3E50" stroke="#FFF" stroke-width="2"/>
      <circle cx="36" cy="34" r="3" fill="#BDC3C7"/>
      <path d="M12 34H26L32 24H20L15 28L12 34Z" fill="#7B4BD8"/>
      <path d="M26 34L30 20H37" stroke="#2C3E50" stroke-width="3" stroke-linecap="round"/>
      <path d="M35 17L39 17" stroke="#7B4BD8" stroke-width="3" stroke-linecap="round"/>
      <circle cx="36" cy="20" r="3" fill="#F1C40F"/>
      <path d="M18 24C18 20 22 20 25 20C27 20 28 22 28 24H18Z" fill="#34495E"/>
    </svg>`,
  },
  {
    id: "token_xichlo",
    name: "Xích Lô",
    color: "#2563EB",
    bgColor: "#EFF6FF",
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="34" r="6" stroke="#2C3E50" stroke-width="2"/>
      <circle cx="36" cy="34" r="6" stroke="#2C3E50" stroke-width="2"/>
      <path d="M10 18H22V28H10C8 28 8 18 10 18Z" fill="#3B82F6" stroke="#1D4ED8" stroke-width="2"/>
      <path d="M18 18L18 12L8 12" stroke="#2563EB" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M22 28L30 30L36 34" stroke="#2C3E50" stroke-width="2.5"/>
      <path d="M30 24L30 30" stroke="#2C3E50" stroke-width="2"/>
      <path d="M28 24H32" stroke="#2C3E50" stroke-width="3" stroke-linecap="round"/>
    </svg>`,
  },
  {
    id: "token_boat",
    name: "Thuyền Buồm",
    color: "#0891B2",
    bgColor: "#ECFEFF",
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 32C12 36 36 36 38 32H10Z" fill="#E67E22" stroke="#A04000" stroke-width="2"/>
      <path d="M23 10V31" stroke="#2C3E50" stroke-width="2.5"/>
      <path d="M24 12L36 27H24V12Z" fill="#0891B2"/>
      <path d="M22 15L12 28H22V15Z" fill="#67E8F9"/>
      <path d="M6 38C12 40 18 36 24 38C30 40 36 36 42 38" stroke="#0284C7" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
  },
];

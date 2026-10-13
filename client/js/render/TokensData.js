/**
 * TokensData.js - Bộ 6 biểu tượng quân cờ SVG chuẩn bản sắc Sài Gòn
 */

export const GAME_TOKENS = [
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
    id: "token_nonla",
    name: "Nón Lá",
    color: "#D97706",
    bgColor: "#FEF3C7",
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 10L6 34C6 34 16 38 24 38C32 38 42 34 42 34L24 10Z" fill="#F59E0B" stroke="#B45309" stroke-width="2" stroke-linejoin="round"/>
      <path d="M24 10V38" stroke="#D97706" stroke-width="1.5" stroke-dasharray="2 2"/>
      <path d="M15 22C18 23.5 21 24 24 24C27 24 30 23.5 33 22" stroke="#B45309" stroke-width="1.5"/>
      <path d="M10 29C15 31.5 19.5 32 24 32C28.5 32 33 31.5 38 29" stroke="#B45309" stroke-width="1.5"/>
      <circle cx="24" cy="9" r="2" fill="#D97706"/>
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
    id: "token_banhmi",
    name: "Bánh Mì",
    color: "#BE185D",
    bgColor: "#FDF2F8",
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 24C8 16 16 14 24 14C32 14 40 16 40 24C40 32 32 34 24 34C16 34 8 32 8 24Z" fill="#F472B6" stroke="#9D174D" stroke-width="2"/>
      <path d="M11 23C13 18 19 16 24 16C29 16 35 18 37 23C35 29 29 32 24 32C19 32 13 29 11 23Z" fill="#DB2777"/>
      <path d="M14 20L20 27M21 19L27 28M28 19L34 27" stroke="#FDFEFE" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
  },
  {
    id: "token_coffee",
    name: "Cà Phê Phin",
    color: "#6E2C00",
    bgColor: "#EDBB99",
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 22L16 38H32L34 22H14Z" fill="#FDFEFE" stroke="#5D6D7E" stroke-width="2"/>
      <path d="M16 28H32V38H16V28Z" fill="#6E2C00"/>
      <rect x="12" y="18" width="24" height="4" rx="2" fill="#BDC3C7" stroke="#7F8C8D" stroke-width="1.5"/>
      <rect x="16" y="10" width="16" height="8" rx="1" fill="#95A5A6" stroke="#7F8C8D" stroke-width="1.5"/>
      <circle cx="24" cy="9" r="1.5" fill="#E74C3C"/>
      <path d="M34 26C37 26 38 29 38 31C38 33 36 34 33 34" stroke="#BDC3C7" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
  },
  {
    id: "token_boat",
    name: "Thuyền Buồm",
    color: "#16A085",
    bgColor: "#E8F8F5",
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 32C12 36 36 36 38 32H10Z" fill="#E67E22" stroke="#A04000" stroke-width="2"/>
      <path d="M23 10V31" stroke="#2C3E50" stroke-width="2.5"/>
      <path d="M24 12L36 27H24V12Z" fill="#1ABC9C"/>
      <path d="M22 15L12 28H22V15Z" fill="#A3E4D7"/>
      <path d="M6 38C12 40 18 36 24 38C30 40 36 36 42 38" stroke="#3498DB" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
  },
];

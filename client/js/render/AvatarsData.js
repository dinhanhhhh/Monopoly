/**
 * AvatarsData.js - Dữ liệu avatar minh họa 4 nhân vật chuẩn phong cách Sài Gòn
 */

export const PLAYER_AVATARS = {
  p1: {
    id: 'p1',
    name: 'Bạn',
    title: 'Người chơi',
    bgColor: '#E2F0D9',
    borderColor: '#43A047',
    svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="30" fill="#E8F5E9" stroke="#2E7D32" stroke-width="2.5"/>
      <!-- Cổ & Thân -->
      <path d="M18 56C18 47 24 44 32 44C40 44 46 47 46 56" fill="#43A047" stroke="#2E7D32" stroke-width="2"/>
      <path d="M28 44V48C28 50 30 52 32 52C34 52 36 50 36 48V44" fill="#FCD8B5"/>
      <!-- Đầu & Mặt -->
      <circle cx="32" cy="31" r="14" fill="#FCD8B5"/>
      <!-- Tóc -->
      <path d="M19 28C19 19 23 15 32 15C41 15 45 19 45 28C43 25 40 24 37 25C33 22 27 22 25 25C22 25 20 26 19 28Z" fill="#3E2723"/>
      <!-- Mắt & Miệng cười -->
      <circle cx="27" cy="31" r="2" fill="#2E241B"/>
      <circle cx="37" cy="31" r="2" fill="#2E241B"/>
      <path d="M29 37C30.5 39 33.5 39 35 37" stroke="#D84315" stroke-width="2" stroke-linecap="round"/>
      <!-- Má hồng -->
      <circle cx="24" cy="34" r="2.5" fill="#FF8A80" opacity="0.6"/>
      <circle cx="40" cy="34" r="2.5" fill="#FF8A80" opacity="0.6"/>
    </svg>`
  },
  p2: {
    id: 'p2',
    name: 'Cô Ba Bọt',
    title: 'Thương gia',
    bgColor: '#FBE9E7',
    borderColor: '#D84315',
    svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="30" fill="#FFF3E0" stroke="#E65100" stroke-width="2.5"/>
      <!-- Áo bà ba cam -->
      <path d="M18 56C18 47 24 44 32 44C40 44 46 47 46 56" fill="#FB8C00" stroke="#E65100" stroke-width="2"/>
      <path d="M28 44V47C28 49 30 51 32 51C34 51 36 49 36 47V44" fill="#FCD8B5"/>
      <!-- Mặt -->
      <circle cx="32" cy="32" r="13" fill="#FCD8B5"/>
      <!-- Tóc búi & nón lá -->
      <path d="M20 30C20 23 24 20 32 20C40 20 44 23 44 30" fill="#3E2723"/>
      <path d="M14 26L32 11L50 26C45 28 39 29 32 29C25 29 19 28 14 26Z" fill="#FFE082" stroke="#FFB300" stroke-width="2"/>
      <path d="M32 11V29" stroke="#FFA000" stroke-width="1.5" stroke-dasharray="2 2"/>
      <!-- Mắt duyên & Môi đỏ -->
      <path d="M25 32C26 31 28 31 29 32" stroke="#2E241B" stroke-width="2" stroke-linecap="round"/>
      <path d="M35 32C36 31 38 31 39 32" stroke="#2E241B" stroke-width="2" stroke-linecap="round"/>
      <path d="M29 38C30.5 40 33.5 40 35 38" stroke="#C2185B" stroke-width="2" stroke-linecap="round"/>
      <!-- Bông tai đỏ & má hồng -->
      <circle cx="21" cy="34" r="1.8" fill="#E53935"/>
      <circle cx="43" cy="34" r="1.8" fill="#E53935"/>
      <circle cx="24" cy="35" r="2.5" fill="#FF80AB" opacity="0.6"/>
      <circle cx="40" cy="35" r="2.5" fill="#FF80AB" opacity="0.6"/>
    </svg>`
  },
  p3: {
    id: 'p3',
    name: 'Bác Xích Lô',
    title: 'Tài xế phố',
    bgColor: '#E1F5FE',
    borderColor: '#0288D1',
    svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="30" fill="#E1F5FE" stroke="#0277BD" stroke-width="2.5"/>
      <!-- Áo xanh & Khăn rằn -->
      <path d="M18 56C18 47 24 44 32 44C40 44 46 47 46 56" fill="#0288D1" stroke="#01579B" stroke-width="2"/>
      <path d="M26 44L28 54M38 44L36 54" stroke="#FFF" stroke-width="2"/>
      <!-- Mặt rám nắng -->
      <circle cx="32" cy="31" r="13.5" fill="#E8B890"/>
      <!-- Nón tai bèo -->
      <ellipse cx="32" cy="22" rx="20" ry="7" fill="#689F38" stroke="#33691E" stroke-width="2"/>
      <path d="M22 22C22 15 26 13 32 13C38 13 42 15 42 22" fill="#558B2F"/>
      <!-- Mắt cương nghị & Ria mép vui vẻ -->
      <circle cx="26" cy="30" r="1.8" fill="#2E241B"/>
      <circle cx="38" cy="30" r="1.8" fill="#2E241B"/>
      <path d="M26 35C29 33 35 33 38 35" stroke="#3E2723" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M29 38C30.5 39.5 33.5 39.5 35 38" stroke="#BF360C" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`
  },
  p4: {
    id: 'p4',
    name: 'Tiệm Bánh',
    title: 'Chủ tiệm',
    bgColor: '#FFF9C4',
    borderColor: '#FBC02D',
    svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="30" fill="#FFFDE7" stroke="#F57F17" stroke-width="2.5"/>
      <!-- Áo đỏ viền vàng -->
      <path d="M18 56C18 47 24 44 32 44C40 44 46 47 46 56" fill="#E53935" stroke="#B71C1C" stroke-width="2"/>
      <circle cx="32" cy="48" r="2" fill="#FFD54F"/>
      <!-- Mặt tròn xinh xắn -->
      <circle cx="32" cy="31" r="13.5" fill="#FCD8B5"/>
      <!-- Tóc ngắn mái ngố dễ thương -->
      <path d="M18 30C18 20 23 16 32 16C41 16 46 20 46 30C46 35 44 37 42 37C42 27 39 23 32 23C25 23 22 27 22 37C20 37 18 35 18 30Z" fill="#4E342E"/>
      <!-- Mắt long lanh & Cười mỉm -->
      <ellipse cx="26" cy="30" rx="1.8" ry="2.2" fill="#2E241B"/>
      <ellipse cx="38" cy="30" rx="1.8" ry="2.2" fill="#2E241B"/>
      <circle cx="27" cy="29" r="0.7" fill="#FFF"/>
      <circle cx="39" cy="29" r="0.7" fill="#FFF"/>
      <path d="M29 36C30.5 38 33.5 38 35 36" stroke="#D81B60" stroke-width="2" stroke-linecap="round"/>
      <circle cx="23" cy="33" r="2.5" fill="#FF8A80" opacity="0.6"/>
      <circle cx="41" cy="33" r="2.5" fill="#FF8A80" opacity="0.6"/>
    </svg>`
  }
};

export function getPlayerAvatar(playerId, playerIndex = 0) {
  if (PLAYER_AVATARS[playerId]) return PLAYER_AVATARS[playerId];
  const keys = Object.keys(PLAYER_AVATARS);
  const key = keys[playerIndex % keys.length];
  return PLAYER_AVATARS[key];
}

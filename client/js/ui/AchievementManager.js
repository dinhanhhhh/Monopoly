/**
 * AchievementManager.js - Hệ thống Thành Tựu & Phòng Trưng Bày Cúp (Trophy Room)
 * Lưu trữ vĩnh viễn trong LocalStorage, theo dõi kỷ lục người chơi và thông báo pop-up vinh danh.
 */

import { formatVND } from "../../../shared/constants.js";

export const ACHIEVEMENTS_LIST = [
  {
    id: "trum_ben_nghe",
    name: "Trùm Bến Nghé",
    icon: "🏙️",
    category: "Bất Động Sản",
    desc: "Sở hữu trọn bộ 2 ô đất đắt đỏ bậc nhất Sài Gòn (Đồng Khởi & Nguyễn Huệ).",
    rewardTitle: "Bá Chủ Đất Vàng",
  },
  {
    id: "vua_van_tai",
    name: "Vua Vận Tải",
    icon: "🚌",
    category: "Hạ Tầng",
    desc: "Thâu tóm toàn bộ 4 Bến Xe lớn (BX Miền Đông, BX Miền Tây, Ga Sài Gòn, BX Chợ Lớn).",
    rewardTitle: "Trùm Giao Thông",
  },
  {
    id: "than_tai_cuu_canh",
    name: "Thần Tài Cứu Cánh",
    icon: "🪙",
    category: "May Mắn",
    desc: "Trúng hũ Quỹ Khởi Hành (Bãi Đỗ Xe) khi tài khoản đang dưới 100.000đ.",
    rewardTitle: "Thần May Mắn",
  },
  {
    id: "bac_thay_dam_phan",
    name: "Bậc Thầy Đàm Phán",
    icon: "🤝",
    category: "Thương Trường",
    desc: "Hoàn thành 3 giao dịch trao đổi đất thành công với AI trong một ván chơi.",
    rewardTitle: "Đại Sứ Thương Trường",
  },
  {
    id: "vuot_nguc_than_sau",
    name: "Vượt Ngục Thần Sầu",
    icon: "🎲",
    category: "Bản Lĩnh",
    desc: "Lắc trúng xúc xắc đôi để hiên ngang thoát khỏi khám Chí Hòa.",
    rewardTitle: "Tay Lắc Siêu Đẳng",
  },
  {
    id: "dai_gia_khach_san",
    name: "Đại Gia Khách Sạn",
    icon: "🏨",
    category: "Xây Dựng",
    desc: "Nâng cấp hoàn thiện khách sạn 5 sao đỏ đầu tiên trên bàn cờ.",
    rewardTitle: "Vua Nghỉ Dưỡng",
  },
  {
    id: "ty_phu_sai_gon",
    name: "Đại Phú Hào Sài Gòn",
    icon: "👑",
    category: "Vinh Danh",
    desc: "Giành chiến thắng chung cuộc vẻ vang, ép tất cả các đối thủ khác phải phá sản.",
    rewardTitle: "Tỷ Phú Độc Tôn",
  },
];

export class AchievementManager {
  constructor(options = {}) {
    this.storageKey = "monopoly_saigon_achievements";
    this.sound = options.sound || null;
    this.container = null;
    this.tradeSuccessCount = 0;
  }

  getUnlockedMap() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn("Lỗi đọc thành tựu từ localStorage:", e);
    }
    return {};
  }

  isUnlocked(id) {
    const map = this.getUnlockedMap();
    return !!(map[id] && map[id].unlocked);
  }

  unlock(id) {
    const map = this.getUnlockedMap();
    if (map[id] && map[id].unlocked) return null; // Đã mở khóa trước đó

    const item = ACHIEVEMENTS_LIST.find((a) => a.id === id);
    if (!item) return null;

    const now = Date.now();
    map[id] = {
      unlocked: true,
      unlockedAt: now,
      dateStr: new Date(now).toLocaleDateString("vi-VN"),
    };

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(map));
    } catch (e) {
      console.warn("Lỗi lưu thành tựu:", e);
    }

    this.showUnlockToast(item);
    if (this.sound && this.sound.playSaigonHorn) {
      this.sound.playSaigonHorn();
    }

    return item;
  }

  resetProgress() {
    this.tradeSuccessCount = 0;
  }

  recordTradeSuccess() {
    this.tradeSuccessCount++;
  }

  /**
   * Kiểm tra và tự động mở khóa các thành tựu dựa trên trạng thái game
   */
  check(engineState, context = {}) {
    if (!engineState || !engineState.players) return;

    // Tìm người chơi thật (thường là Player id: 0 hoặc player không phải bot)
    const humanPlayer =
      engineState.players.find((p) => !p.isBot) || engineState.players[0];
    if (!humanPlayer) return;

    const humanId = humanPlayer.id;
    const props = engineState.properties || {};

    // 1. Trùm Bến Nghé: Sở hữu cả #37 (Nguyễn Huệ) và #39 (Đồng Khởi)
    if (!this.isUnlocked("trum_ben_nghe")) {
      const p37 = props[37];
      const p39 = props[39];
      if (p37 && p37.owner === humanId && p39 && p39.owner === humanId) {
        this.unlock("trum_ben_nghe");
      }
    }

    // 2. Vua Vận Tải: Sở hữu cả 4 bến xe: 5, 15, 25, 35
    if (!this.isUnlocked("vua_van_tai")) {
      const stationIds = [5, 15, 25, 35];
      const hasAllStations = stationIds.every(
        (sid) => props[sid] && props[sid].owner === humanId,
      );
      if (hasAllStations) {
        this.unlock("vua_van_tai");
      }
    }

    // 3. Thần Tài Cứu Cánh: Ăn Quỹ Khởi Hành khi tiền trước đó < 100k
    if (!this.isUnlocked("than_tai_cuu_canh")) {
      if (
        context.event === "JACKPOT_COLLECTED" &&
        context.playerId === humanId &&
        context.previousMoney < 100000 &&
        context.jackpotAmount > 0
      ) {
        this.unlock("than_tai_cuu_canh");
      }
    }

    // 4. Bậc Thầy Đàm Phán: >= 3 giao dịch thành công trong ván
    if (!this.isUnlocked("bac_thay_dam_phan")) {
      if (this.tradeSuccessCount >= 3) {
        this.unlock("bac_thay_dam_phan");
      }
    }

    // 5. Vượt Ngục Thần Sầu: Lắc đôi ra tù
    if (!this.isUnlocked("vuot_nguc_than_sau")) {
      if (
        context.event === "JAIL_DOUBLES_ESCAPE" &&
        context.playerId === humanId
      ) {
        this.unlock("vuot_nguc_than_sau");
      }
    }

    // 6. Đại Gia Khách Sạn: Có ít nhất 1 khách sạn (houses === 5)
    if (!this.isUnlocked("dai_gia_khach_san")) {
      const hasHotel = Object.values(props).some(
        (p) => p.owner === humanId && p.houses === 5,
      );
      if (hasHotel) {
        this.unlock("dai_gia_khach_san");
      }
    }

    // 7. Đại Phú Hào Sài Gòn: Thắng ván đấu
    if (!this.isUnlocked("ty_phu_sai_gon")) {
      if (context.event === "GAME_WON" && context.winnerId === humanId) {
        this.unlock("ty_phu_sai_gon");
      }
    }
  }

  /**
   * Hiển thị pop-up thông báo mở khóa thành tựu phong cách hoàng kim
   */
  showUnlockToast(item) {
    let toast = document.getElementById("achievement-unlock-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "achievement-unlock-toast";
      toast.className = "achievement-unlock-toast";
      document.body.appendChild(toast);
    }

    toast.innerHTML = `
      <div class="achievement-toast-card">
        <div class="toast-shimmer"></div>
        <div class="toast-trophy-icon">${item.icon}</div>
        <div class="toast-text-cluster">
          <div class="toast-badge-title">🏆 MỞ KHÓA THÀNH TỰU MỚI!</div>
          <div class="toast-achievement-name">${item.name}</div>
          <div class="toast-reward-pill">✨ Danh hiệu: <strong>${item.rewardTitle}</strong></div>
        </div>
      </div>
    `;

    toast.classList.remove("show");
    void toast.offsetWidth; // Force reflow
    toast.classList.add("show");

    if (toast._timer) clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove("show");
    }, 4500);
  }

  /**
   * Hiển thị Hộp thoại Phòng Trưng Bày Cúp (Trophy Room)
   */
  showModal() {
    let overlay = document.getElementById("trophy-room-modal");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "trophy-room-modal";
      overlay.className = "modal-backdrop fade-in";
      document.body.appendChild(overlay);
    }

    const unlockedMap = this.getUnlockedMap();
    const unlockedCount = ACHIEVEMENTS_LIST.filter(
      (a) => unlockedMap[a.id]?.unlocked,
    ).length;
    const totalCount = ACHIEVEMENTS_LIST.length;
    const percent = Math.round((unlockedCount / totalCount) * 100);

    const cardsHtml = ACHIEVEMENTS_LIST.map((ach) => {
      const data = unlockedMap[ach.id];
      const isUnlocked = !!(data && data.unlocked);

      return `
        <div class="trophy-card ${isUnlocked ? "unlocked" : "locked"}">
          <div class="trophy-card-header">
            <span class="trophy-cat-tag">${ach.category}</span>
            <span class="trophy-status-pill">${isUnlocked ? "✓ ĐÃ ĐẠT" : "🔒 CHƯA KHÓA"}</span>
          </div>
          <div class="trophy-card-body">
            <div class="trophy-icon-wrapper ${isUnlocked ? "glow" : ""}">
              <span class="trophy-main-icon">${ach.icon}</span>
            </div>
            <div class="trophy-info">
              <h4 class="trophy-name">${ach.name}</h4>
              <p class="trophy-desc">${ach.desc}</p>
              <div class="trophy-honor">
                Danh hiệu: <strong>${ach.rewardTitle}</strong>
              </div>
            </div>
          </div>
          <div class="trophy-card-footer">
            ${
              isUnlocked
                ? `<span class="trophy-date">🗓️ Đạt ngày: ${data.dateStr || "Trong ván"}</span>`
                : `<span class="trophy-hint">🎯 Thử thách chưa hoàn thành</span>`
            }
          </div>
        </div>
      `;
    }).join("");

    overlay.innerHTML = `
      <div class="trophy-room-card pop-in">
        <div class="trophy-room-header">
          <div class="trophy-header-title">
            <span class="trophy-room-icon">🏆</span>
            <div>
              <h3>PHÒNG TRƯNG BÀY CÚP & THÀNH TỰU</h3>
              <p class="trophy-room-subtitle">Vinh danh những chiến tích lẫy lừng trên thương trường Sài Gòn</p>
            </div>
          </div>
          <button class="btn-close-trophy" id="btn-close-trophy">✕</button>
        </div>

        <div class="trophy-progress-banner">
          <div class="trophy-progress-info">
            <div class="trophy-progress-label">TIẾN ĐỘ THÀNH TỰU</div>
            <div class="trophy-progress-counts">
              <span class="unlocked-count">${unlockedCount}</span> / <span class="total-count">${totalCount} ĐÃ MỞ KHÓA</span>
              <span class="trophy-percent">(${percent}%)</span>
            </div>
          </div>
          <div class="trophy-progress-track">
            <div class="trophy-progress-fill" style="width: ${percent}%;"></div>
          </div>
        </div>

        <div class="trophy-grid-scroller">
          <div class="trophy-cards-grid">
            ${cardsHtml}
          </div>
        </div>

        <div class="trophy-room-footer">
          <p class="trophy-save-note">💾 Thành tựu được tự động lưu vĩnh viễn trong trình duyệt của bạn.</p>
          <button class="btn-trophy-confirm" id="btn-confirm-trophy">ĐÃ HIỂU</button>
        </div>
      </div>
    `;

    overlay.style.display = "flex";

    const closeModal = () => {
      overlay.style.display = "none";
    };

    const btnClose = overlay.querySelector("#btn-close-trophy");
    const btnConfirm = overlay.querySelector("#btn-confirm-trophy");

    if (btnClose) btnClose.onclick = closeModal;
    if (btnConfirm) btnConfirm.onclick = closeModal;

    overlay.onclick = (e) => {
      if (e.target === overlay) closeModal();
    };
  }
}

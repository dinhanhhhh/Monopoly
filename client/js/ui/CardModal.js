/**
 * CardModal.js - Hiển thị Thẻ Bài Cơ Hội & Khí Vận 3D sống động
 */

export class CardModal {
  constructor() {
    this.overlay = null;
    this.init();
  }

  init() {
    let overlay = document.getElementById("card-draw-modal");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "card-draw-modal";
      overlay.className = "modal-backdrop";
      overlay.style.display = "none";
      document.body.appendChild(overlay);
    }
    this.overlay = overlay;
  }

  /**
   * Bật modal hiển thị thẻ bài vừa rút
   */
  show(cardType, card, result, onConfirm = null) {
    const isChance = cardType === "chance";
    const cardBg = isChance
      ? "linear-gradient(145deg, #FFB399, #F59E7A)"
      : "linear-gradient(145deg, #FFE066, #F5D34A)";
    const badgeText = isChance ? "CƠ HỘI" : "KHÍ VẬN";
    const badgeColor = isChance ? "#C85A32" : "#B8860B";
    const iconSvg = isChance
      ? `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#3B2A1A" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
      : `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#3B2A1A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><circle cx="12" cy="14" r="2"/></svg>`;

    this.overlay.innerHTML = `
      <div class="card-draw-container" style="border: 2px solid #3B2A1A; border-radius: 18px;">
        <div class="card-visual" style="background: ${cardBg}; color: #1E293B; border: 2px solid #3B2A1A;">
          <div class="card-badge" style="background: ${badgeColor}; color: #FFF;">${badgeText}</div>
          <div class="card-icon-big">${iconSvg}</div>
          <h3 class="card-title" style="color: #1E293B;">${card.title}</h3>
          <p class="card-desc" style="color: #334155;">${card.desc}</p>
          <div class="card-result-pill" style="background: rgba(59, 42, 26, 0.1); color: #1E293B; border: 1px solid #3B2A1A;">
            <span>${result.message || ""}</span>
          </div>
          <button id="btn-card-confirm" class="btn-card-confirm" style="border: 2px solid #3B2A1A;">TIẾP TỤC</button>
        </div>
      </div>
    `;

    this.overlay.style.display = "flex";
    this.overlay.classList.add("active");

    const btnConfirm = document.getElementById("btn-card-confirm");
    if (btnConfirm) {
      btnConfirm.addEventListener("click", () => {
        this.close();
        if (onConfirm) onConfirm();
      });
    }
  }

  hide() {
    this.close();
  }

  close() {
    if (this.overlay) {
      this.overlay.classList.remove("active");
      this.overlay.style.display = "none";
    }
  }
}

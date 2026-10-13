import { formatVND } from "../../../shared/constants.js";

/**
 * JailModal.js - Bảng lựa chọn Ra Tù (Lắc Đôi hoặc Nộp Phạt 500K)
 */
export class JailModal {
  constructor() {
    this.overlay = null;
    this.init();
  }

  init() {
    let overlay = document.getElementById("jail-choice-modal");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "jail-choice-modal";
      overlay.className = "modal-backdrop";
      overlay.style.display = "none";
      document.body.appendChild(overlay);
    }
    this.overlay = overlay;
  }

  /**
   * Hiển thị bảng lựa chọn khi người chơi đang ở trong tù
   * @param {Object} player - Thông tin người chơi
   * @param {Object} options - { onRollDoubles, onPayFine, onUseCard }
   */
  show(player, { onRollDoubles, onPayFine, onUseCard }) {
    const jailTurns = (player.jailTurns || 0) + 1;
    const canAffordFine = player.money >= 500_000;
    const hasCard = !!player.hasJailCard;

    this.overlay.innerHTML = `
      <div class="jail-choice-card" style="
        width: 100%;
        max-width: 380px;
        background: #FFFDF8;
        border-radius: 18px;
        border: 3px solid #78281F;
        box-shadow: 0 20px 50px rgba(120, 40, 31, 0.4);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        animation: popIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        font-family: var(--font-ui, sans-serif);
      ">
        <!-- Header buồng giam -->
        <div style="
          background: linear-gradient(135deg, #78281F, #5A1E17);
          padding: 14px 16px;
          text-align: center;
          color: #FFF;
          border-bottom: 2px solid #3B2A1A;
        ">
          <div style="font-size: 1.8rem; margin-bottom: 2px;">👮‍♂️</div>
          <h2 style="font-family: var(--font-retro, sans-serif); font-size: 1.25rem; font-weight: 900; margin: 0; letter-spacing: 0.5px;">BUỒNG GIAM TÙ</h2>
          <span style="font-size: 0.72rem; font-weight: 800; color: #FFE066; letter-spacing: 1px;">LƯỢT THỤ ÁN: ${jailTurns} / 3</span>
        </div>

        <!-- Nội dung thông báo -->
        <div style="padding: 14px 16px; display: flex; flex-direction: column; gap: 10px;">
          <p style="font-size: 0.82rem; color: #334155; line-height: 1.35; margin: 0; text-align: center;">
            <strong>${player.name}</strong> đang ở trong tù. Hãy chọn cách thức để ra tù trong lượt này:
          </p>

          <!-- Nút 1: Thử lắc đôi -->
          <button id="btn-jail-roll" style="
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 12px;
            background: #FFF;
            border: 2px solid #176B78;
            border-radius: 12px;
            cursor: pointer;
            text-align: left;
            transition: all 0.15s ease;
            box-shadow: 0 2px 6px rgba(23, 107, 120, 0.15);
          ">
            <span style="font-size: 1.6rem; flex-shrink: 0;">🎲</span>
            <div style="flex: 1;">
              <div style="font-family: var(--font-retro, sans-serif); font-size: 0.95rem; font-weight: 900; color: #176B78;">LẮC ĐÔI RA TÙ (Miễn Phí)</div>
              <small style="font-size: 0.7rem; color: #64748B; line-height: 1.2; display: block;">Tung 2 xúc xắc bằng điểm (1-1, 2-2...). Nếu trúng đôi được ra tù tự do và đi tiếp.</small>
            </div>
          </button>

          <!-- Nút 2: Nộp phạt 500K -->
          <button id="btn-jail-pay" ${!canAffordFine ? "disabled" : ""} style="
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 12px;
            background: ${canAffordFine ? "#FFFDF0" : "#EDE8DC"};
            border: 2px solid ${canAffordFine ? "#F08A24" : "#CBD5E1"};
            border-radius: 12px;
            cursor: ${canAffordFine ? "pointer" : "not-allowed"};
            text-align: left;
            transition: all 0.15s ease;
            box-shadow: 0 2px 6px rgba(240, 138, 36, 0.15);
            opacity: ${canAffordFine ? "1" : "0.6"};
          ">
            <span style="font-size: 1.6rem; flex-shrink: 0;">💸</span>
            <div style="flex: 1;">
              <div style="font-family: var(--font-retro, sans-serif); font-size: 0.95rem; font-weight: 900; color: #D97706;">NỘP PHẠT 500.000đ</div>
              <small style="font-size: 0.7rem; color: #64748B; line-height: 1.2; display: block;">
                ${canAffordFine ? "Bảo lãnh ra tù ngay lập tức và được tung xúc xắc đi tiếp." : "Không đủ tiền mặt để nộp phạt."}
              </small>
            </div>
          </button>

          <!-- Nút 3: Dùng thẻ ra tù (nếu có) -->
          ${
            hasCard
              ? `
          <button id="btn-jail-card" style="
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 12px;
            background: #F0FDF4;
            border: 2px solid #16A34A;
            border-radius: 12px;
            cursor: pointer;
            text-align: left;
            transition: all 0.15s ease;
            box-shadow: 0 2px 6px rgba(22, 163, 74, 0.15);
          ">
            <span style="font-size: 1.6rem; flex-shrink: 0;">🎟️</span>
            <div style="flex: 1;">
              <div style="font-family: var(--font-retro, sans-serif); font-size: 0.95rem; font-weight: 900; color: #16A34A;">DÙNG THẺ RA TÙ MIỄN PHÍ</div>
              <small style="font-size: 0.7rem; color: #64748B; line-height: 1.2; display: block;">Sử dụng Thẻ Ra Tù may mắn bạn đang sở hữu.</small>
            </div>
          </button>
          `
              : ""
          }
        </div>
      </div>
    `;

    this.overlay.style.display = "flex";
    this.overlay.classList.add("active");

    const btnRoll = document.getElementById("btn-jail-roll");
    if (btnRoll) {
      btnRoll.onclick = () => {
        this.close();
        if (onRollDoubles) onRollDoubles();
      };
      btnRoll.onmouseenter = () => (btnRoll.style.background = "#F0F9FF");
      btnRoll.onmouseleave = () => (btnRoll.style.background = "#FFF");
    }

    const btnPay = document.getElementById("btn-jail-pay");
    if (btnPay && canAffordFine) {
      btnPay.onclick = () => {
        this.close();
        if (onPayFine) onPayFine();
      };
      btnPay.onmouseenter = () => (btnPay.style.background = "#FEF3C7");
      btnPay.onmouseleave = () => (btnPay.style.background = "#FFFDF0");
    }

    const btnCard = document.getElementById("btn-jail-card");
    if (btnCard) {
      btnCard.onclick = () => {
        this.close();
        if (onUseCard) onUseCard();
      };
      btnCard.onmouseenter = () => (btnCard.style.background = "#DCFCE7");
      btnCard.onmouseleave = () => (btnCard.style.background = "#F0FDF4");
    }
  }

  close() {
    if (this.overlay) {
      this.overlay.style.display = "none";
      this.overlay.classList.remove("active");
    }
  }
}

/**
 * DiceRenderer.js - Quản lý tung 2 xúc xắc 3D và kết quả xúc xắc tích hợp Action Dock
 */

export class DiceRenderer {
  constructor(containerElement, onRollComplete, onRollStart = null) {
    this.container = containerElement;
    this.onRollComplete = onRollComplete;
    this.onRollStart = onRollStart;
    this.isRolling = false;
    this._rollTimer = null;
    this.init();
  }

  /**
   * Hủy bỏ ngay lập tức tiến trình lắc xúc xắc
   */
  cancelRoll() {
    if (this._rollTimer) {
      clearTimeout(this._rollTimer);
      this._rollTimer = null;
    }
    this.isRolling = false;
    if (this.die1El) this.die1El.classList.remove("rolling");
    if (this.die2El) this.die2El.classList.remove("rolling");
  }

  /**
   * Reset hiển thị điểm xúc xắc về trạng thái rỗng khi hết lượt
   */
  reset() {
    this.cancelRoll();
    if (this.sumTextEl) this.sumTextEl.textContent = "";
    if (this.subTextEl) this.subTextEl.textContent = "";
  }

  init() {
    this.die1El = document.getElementById("die-1");
    this.die2El = document.getElementById("die-2");
    this.btnRoll = document.getElementById("btn-roll");
    this.sumTextEl = document.getElementById("dice-sum-text");
    this.subTextEl = document.getElementById("dice-sub-text");

    if (this.btnRoll) {
      this.btnRoll.onclick = () => {
        if (typeof this.onRollRequested === "function") {
          this.onRollRequested();
        } else {
          this.roll();
        }
      };
    }
  }

  /**
   * Kích hoạt tung xúc xắc với hiệu ứng xoay lắc 3D
   * @param {number|null} customDuration - Thời gian lắc (ms), null để dùng mặc định
   * @param {Object|null} presetValues - Giá trị xúc xắc cố định { val1, val2 } do server gửi về
   */
  roll(customDuration = null, presetValues = null) {
    if (this.isRolling) return;
    this.isRolling = true;

    const duration = customDuration !== null ? customDuration : 750;

    if (this.onRollStart && duration > 50) {
      this.onRollStart();
    }

    if (this.btnRoll) this.btnRoll.disabled = true;
    if (this.subTextEl) this.subTextEl.textContent = "Đang lắc...";

    // Thêm class xoay vòng
    if (this.die1El) this.die1El.classList.add("rolling");
    if (this.die2El) this.die2El.classList.add("rolling");

    // Lấy giá trị được chỉ định (server) hoặc ngẫu nhiên (offline)
    const val1 = presetValues?.val1 || Math.floor(Math.random() * 6) + 1;
    const val2 = presetValues?.val2 || Math.floor(Math.random() * 6) + 1;
    const isDoubles = val1 === val2;
    const total = val1 + val2;

    const finalizeRoll = () => {
      // Dừng lắc và hiển thị mặt xúc xắc tương ứng
      if (this.die1El) this.die1El.className = `die show-${val1}`;
      if (this.die2El) this.die2El.className = `die show-${val2}`;

      if (this.sumTextEl) {
        this.sumTextEl.textContent = `${val1} + ${val2} = ${total}`;
      }
      if (this.subTextEl) {
        this.subTextEl.innerHTML = isDoubles
          ? `🎉 Đôi ${val1}! Thêm lượt`
          : `Đi ${total} bước`;
      }

      this.isRolling = false;

      if (this.onRollComplete) {
        this.onRollComplete({ val1, val2, total, isDoubles });
      }
    };

    if (duration <= 30) {
      finalizeRoll();
    } else {
      this._rollTimer = setTimeout(finalizeRoll, duration);
    }
  }
}

/**
 * DiceRenderer.js - Quản lý tung 2 xúc xắc 3D và kết quả xúc xắc tích hợp Action Dock
 */

export class DiceRenderer {
  constructor(containerElement, onRollComplete, onRollStart = null) {
    this.container = containerElement;
    this.onRollComplete = onRollComplete;
    this.onRollStart = onRollStart;
    this.isRolling = false;
    this.init();
  }

  init() {
    this.die1El = document.getElementById("die-1");
    this.die2El = document.getElementById("die-2");
    this.btnRoll = document.getElementById("btn-roll");
    this.sumTextEl = document.getElementById("dice-sum-text");
    this.subTextEl = document.getElementById("dice-sub-text");

    if (this.btnRoll) {
      this.btnRoll.onclick = () => this.roll();
    }
  }

  /**
   * Kích hoạt tung xúc xắc với hiệu ứng xoay lắc 3D
   */
  roll() {
    if (this.isRolling) return;
    this.isRolling = true;

    if (this.onRollStart) {
      this.onRollStart();
    }

    if (this.btnRoll) this.btnRoll.disabled = true;
    if (this.subTextEl) this.subTextEl.textContent = "Đang lắc...";

    // Thêm class xoay vòng
    if (this.die1El) this.die1El.classList.add("rolling");
    if (this.die2El) this.die2El.classList.add("rolling");

    // Random giá trị 1 đến 6 cho 2 viên
    const val1 = Math.floor(Math.random() * 6) + 1;
    const val2 = Math.floor(Math.random() * 6) + 1;
    const isDoubles = val1 === val2;
    const total = val1 + val2;

    setTimeout(() => {
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
    }, 750);
  }
}

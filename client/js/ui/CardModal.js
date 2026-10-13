/**
 * CardModal.js - Hiển thị Thẻ Bài Cơ Hội & Khí Vận 3D sống động
 */

export class CardModal {
  constructor() {
    this.overlay = null;
    this.init();
  }

  init() {
    let overlay = document.getElementById('card-draw-modal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'card-draw-modal';
      overlay.className = 'modal-backdrop';
      overlay.style.display = 'none';
      document.body.appendChild(overlay);
    }
    this.overlay = overlay;
  }

  /**
   * Bật modal hiển thị thẻ bài vừa rút
   */
  show(cardType, card, result, onConfirm = null) {
    const isChance = cardType === 'chance';
    const cardBg = isChance 
      ? 'linear-gradient(145deg, #FF9F1C, #D35400)' 
      : 'linear-gradient(145deg, #2980B9, #1B4F72)';
    const badgeText = isChance ? 'CƠ HỘI' : 'KHÍ VẬN';
    const badgeColor = isChance ? '#BA4A00' : '#0B2545';
    const borderColor = isChance ? '#FAD7A0' : '#A9CCE3';

    this.overlay.innerHTML = `
      <div class="card-draw-container" style="border: 3px solid ${borderColor};">
        <div class="card-visual" style="background: ${cardBg};">
          <div class="card-badge" style="background: ${badgeColor};">${badgeText}</div>
          <div class="card-icon-big">${card.icon || (isChance ? '💡' : '🧧')}</div>
          <h3 class="card-title">${card.title}</h3>
          <p class="card-desc">${card.desc}</p>
          <div class="card-result-pill">
            <span>${result.message || ''}</span>
          </div>
          <button id="btn-card-confirm" class="btn-card-confirm">TIẾP TỤC</button>
        </div>
      </div>
    `;

    this.overlay.style.display = 'flex';
    this.overlay.classList.add('active');

    const btnConfirm = document.getElementById('btn-card-confirm');
    if (btnConfirm) {
      btnConfirm.addEventListener('click', () => {
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
      this.overlay.classList.remove('active');
      this.overlay.style.display = 'none';
    }
  }
}

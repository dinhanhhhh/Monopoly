/**
 * CardDeckModal.js - Modal Tra Cứu Bộ Thẻ Bài Cơ Hội / Khí Vận & Lịch Sử Rút Thẻ
 */

import { CHANCE_CARDS } from '../../../shared/data/chance-cards.js';
import { CHEST_CARDS } from '../../../shared/data/chest-cards.js';
import { formatVND } from '../../../shared/constants.js';
import { getPlayerAvatar } from '../render/AvatarsData.js';

export class CardDeckModal {
  constructor() {
    this.overlay = null;
    this.currentDeckType = 'chance';
    this.currentTab = 'history'; // 'history' | 'all'
    this.gameState = null;
    this.init();
  }

  init() {
    let overlay = document.getElementById('card-deck-viewer-modal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'card-deck-viewer-modal';
      overlay.className = 'modal-backdrop deck-viewer-backdrop';
      overlay.style.display = 'none';
      document.body.appendChild(overlay);
    }
    this.overlay = overlay;

    // Đóng khi click ngoài backdrop
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // Phím ESC đóng
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.overlay.style.display !== 'none') {
        this.close();
      }
    });
  }

  /**
   * Mở modal tra cứu cọc bài
   * @param {'chance' | 'chest'} deckType 
   * @param {Object} state - engine.state
   */
  show(deckType = 'chance', state = null) {
    this.currentDeckType = deckType;
    this.gameState = state;
    this.currentTab = 'history';
    this.render();
    this.overlay.style.display = 'flex';
    this.overlay.classList.add('active');
  }

  close() {
    if (this.overlay) {
      this.overlay.classList.remove('active');
      this.overlay.style.display = 'none';
    }
  }

  render() {
    const isChance = this.currentDeckType === 'chance';
    const allCards = isChance ? CHANCE_CARDS : CHEST_CARDS;
    const historyList = (this.gameState?.cardHistory || []).filter(
      (item) => item.cardType === this.currentDeckType
    );
    const remainingCount = isChance
      ? (this.gameState?.chanceDeck?.length ?? allCards.length)
      : (this.gameState?.chestDeck?.length ?? allCards.length);

    const themeColor = isChance ? '#C0392B' : '#0284C7';
    const themeBg = isChance ? '#FFF4F0' : '#F0F9FF';
    const deckName = isChance ? 'Cơ Hội' : 'Khí Vận';
    const deckBadgeClass = isChance ? 'badge-chance' : 'badge-chest';

    const iconHtml = isChance
      ? `<span class="chance-mark-symbol deck-modal-glyph">?</span>`
      : `<svg width="34" height="28" viewBox="0 0 24 20" fill="#6D4C41" stroke="#3E2723" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 8h18v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z" fill="#5D4037"/>
          <path d="M2 8V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3" fill="#8D6E63"/>
          <path d="M3 8h18" stroke="#FFE082" stroke-width="1.4"/>
          <circle cx="12" cy="12" r="1.5" fill="#FFD54F"/>
        </svg>`;

    // Build Tab Lịch Sử
    let historyContentHtml = '';
    if (historyList.length === 0) {
      historyContentHtml = `
        <div class="deck-empty-state">
          <div class="empty-icon">${isChance ? '❓' : '📦'}</div>
          <h4>Chưa có thẻ ${deckName} nào được rút!</h4>
          <p>Khi các đại gia di chuyển vào ô <strong>${deckName}</strong> trên bàn cờ, nhật ký rút thẻ sẽ được ghi lại chi tiết tại đây.</p>
        </div>
      `;
    } else {
      historyContentHtml = `
        <div class="deck-history-list">
          ${historyList
            .map((item, idx) => {
              const pId = item.player?.id || 'p1';
              const pIdx = this.gameState?.players ? this.gameState.players.findIndex((p) => p.id === pId) : 0;
              const avatarInfo = getPlayerAvatar(pId, pIdx >= 0 ? pIdx : 0);
              const card = item.card || {};
              const resultMsg = item.result?.message || '';

              return `
                <div class="deck-history-item ${isChance ? 'chance-item' : 'chest-item'}">
                  <div class="history-item-header">
                    <div class="history-player-tag">
                      <div class="history-avatar">${avatarInfo.svg}</div>
                      <span class="history-player-name">${item.player?.name || 'Đại gia'}</span>
                    </div>
                    <span class="history-time-tag">⏱️ ${item.timestamp || 'Vừa xong'}</span>
                  </div>
                  <div class="history-card-body">
                    <div class="history-card-icon">${card.icon || (isChance ? '❓' : '🎁')}</div>
                    <div class="history-card-details">
                      <div class="history-card-title">${card.title || 'Thẻ bài'}</div>
                      <div class="history-card-desc">${card.desc || ''}</div>
                      ${resultMsg ? `<div class="history-card-result">⚡ ${resultMsg}</div>` : ''}
                    </div>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>
      `;
    }

    // Build Tab Tất Cả Thẻ
    // Xác định xem thẻ nào đã từng được rút
    const drawnCardIds = new Set(historyList.map((h) => h.card?.id));

    const allCardsContentHtml = `
      <div class="deck-catalog-grid">
        ${allCards
          .map((c) => {
            const hasBeenDrawn = drawnCardIds.has(c.id);
            return `
              <div class="deck-catalog-card ${hasBeenDrawn ? 'drawn' : 'available'}">
                <div class="catalog-card-header">
                  <span class="catalog-card-icon">${c.icon || (isChance ? '❓' : '🎁')}</span>
                  <span class="catalog-status-badge ${hasBeenDrawn ? 'badge-drawn' : 'badge-available'}">
                    ${hasBeenDrawn ? 'Đã từng rút' : 'Trong cọc bài'}
                  </span>
                </div>
                <div class="catalog-card-title">${c.title}</div>
                <div class="catalog-card-desc">${c.desc}</div>
              </div>
            `;
          })
          .join('')}
      </div>
    `;

    this.overlay.innerHTML = `
      <div class="deck-viewer-container" style="--deck-theme: ${themeColor}; --deck-bg: ${themeBg};">
        <!-- Header -->
        <div class="deck-viewer-header">
          <div class="deck-viewer-branding">
            <div class="deck-brand-icon">${iconHtml}</div>
            <div>
              <div class="deck-brand-badge ${deckBadgeClass}">CỌC BÀI ĐẶC BIỆT</div>
              <h2 class="deck-brand-title">BỘ THẺ ${deckName.toUpperCase()}</h2>
            </div>
          </div>
          <button class="deck-viewer-close-btn" id="btn-close-deck-viewer" title="Đóng">&times;</button>
        </div>

        <!-- Thống Kê Nhanh -->
        <div class="deck-viewer-stats-bar">
          <div class="deck-stat-box">
            <span class="stat-label">Thẻ còn trong cọc:</span>
            <span class="stat-value highlighted">${remainingCount} / ${allCards.length} thẻ</span>
          </div>
          <div class="deck-stat-box">
            <span class="stat-label">Đã rút trong trận:</span>
            <span class="stat-value">${historyList.length} lượt</span>
          </div>
          <div class="deck-stat-switchers">
            <button class="deck-type-btn ${isChance ? 'active' : ''}" id="btn-switch-chance">Cơ Hội</button>
            <button class="deck-type-btn ${!isChance ? 'active' : ''}" id="btn-switch-chest">Khí Vận</button>
          </div>
        </div>

        <!-- Tab Điều Hướng -->
        <div class="deck-viewer-tabs">
          <button class="deck-tab-btn ${this.currentTab === 'history' ? 'active' : ''}" id="tab-btn-history">
            📜 Lịch Sử Đã Rút (${historyList.length})
          </button>
          <button class="deck-tab-btn ${this.currentTab === 'all' ? 'active' : ''}" id="tab-btn-all">
            🎴 Danh Mục Toàn Bộ (${allCards.length} Thẻ)
          </button>
        </div>

        <!-- Nội Dung Tab -->
        <div class="deck-viewer-body">
          ${this.currentTab === 'history' ? historyContentHtml : allCardsContentHtml}
        </div>

        <!-- Footer -->
        <div class="deck-viewer-footer">
          <button class="btn-deck-confirm" id="btn-confirm-deck-viewer">ĐÓNG BẢNG TRA CỨU</button>
        </div>
      </div>
    `;

    // Gắn sự kiện
    document.getElementById('btn-close-deck-viewer')?.addEventListener('click', () => this.close());
    document.getElementById('btn-confirm-deck-viewer')?.addEventListener('click', () => this.close());

    document.getElementById('tab-btn-history')?.addEventListener('click', () => {
      this.currentTab = 'history';
      this.render();
    });

    document.getElementById('tab-btn-all')?.addEventListener('click', () => {
      this.currentTab = 'all';
      this.render();
    });

    document.getElementById('btn-switch-chance')?.addEventListener('click', () => {
      if (this.currentDeckType !== 'chance') {
        this.currentDeckType = 'chance';
        this.render();
      }
    });

    document.getElementById('btn-switch-chest')?.addEventListener('click', () => {
      if (this.currentDeckType !== 'chest') {
        this.currentDeckType = 'chest';
        this.render();
      }
    });
  }
}

/**
 * TradeModal.js - Hộp thoại Giao Dịch & Trao Đổi Đất / Tiền giữa người chơi
 */

import { SAIGON_BOARD_DATA } from '../../../shared/data/board-data.js';
import { GameRules } from '../../../shared/rules.js';
import { formatVND } from '../../../shared/constants.js';

export class TradeModal {
  constructor(containerId = 'trade-modal-container') {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = containerId;
      document.body.appendChild(this.container);
    }
  }

  formatMoney(amount, withSign = false) {
    return formatVND(amount, withSign);
  }

  show(engine, onComplete = null) {
    const sender = engine.getCurrentPlayer();
    const otherPlayers = engine.state.players.filter(
      (p) => p.id !== sender.id && !p.isBankrupt
    );

    if (otherPlayers.length === 0) {
      alert('Không có người chơi nào khác để giao dịch!');
      return;
    }

    let selectedPartnerId = otherPlayers[0].id;
    let offerMoney = 0;
    let requestMoney = 0;
    let selectedOfferTiles = new Set();
    let selectedRequestTiles = new Set();

    const renderTradeForm = () => {
      const partner = engine.state.players.find((p) => p.id === selectedPartnerId);

      // Lấy danh sách đất của Người đề nghị
      const senderProps = SAIGON_BOARD_DATA.filter((tile) => {
        const prop = engine.state.properties[tile.id];
        return prop && prop.owner === sender.id;
      });

      // Lấy danh sách đất của Đối tác
      const partnerProps = SAIGON_BOARD_DATA.filter((tile) => {
        const prop = engine.state.properties[tile.id];
        return prop && prop.owner === partner.id;
      });

      // Đối tác options
      const partnerOptionsHtml = otherPlayers
        .map(
          (p) => `
          <option value="${p.id}" ${p.id === selectedPartnerId ? 'selected' : ''}>
            ${p.name} (Có: ${this.formatMoney(p.money)})
          </option>
        `
        )
        .join('');

      // Render danh sách đất của sender
      const renderTileCheckboxes = (tiles, selectedSet, isSender) => {
        if (tiles.length === 0) {
          return '<div class="empty-tiles-tip">Không sở hữu mảnh đất nào</div>';
        }

        return tiles
          .map((tile) => {
            const check = GameRules.canTradeProperty(tile, engine.state.properties);
            const isChecked = selectedSet.has(tile.id);
            const disabled = !check.canTrade;
            const tip = !check.canTrade ? ` (Đang có nhà - không thể đổi)` : '';

            return `
              <label class="trade-tile-item ${disabled ? 'disabled' : ''}">
                <input type="checkbox" data-tile-id="${tile.id}" ${isChecked ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
                <span class="trade-color-pill" style="background: ${tile.color || '#666'}"></span>
                <span class="trade-tile-name">${tile.name}${tip}</span>
              </label>
            `;
          })
          .join('');
      };

      this.container.innerHTML = `
        <div class="modal-backdrop fade-in" id="trade-backdrop">
          <div class="trade-modal-card pop-in">
            <div class="trade-header">
              <h2>🤝 THỎA THUẬN GIAO DỊCH</h2>
              <div class="trade-sub">Thương lượng đổi đất & chuyển giao tiền mặt</div>
            </div>

            <div class="trade-partner-select-bar">
              <label>Đối tác giao dịch:</label>
              <select id="trade-partner-select" class="trade-select">
                ${partnerOptionsHtml}
              </select>
            </div>

            <div class="trade-columns">
              <!-- Cột 1: Người gửi đưa ra -->
              <div class="trade-column trade-offer-col">
                <div class="col-header">
                  <span class="user-badge" style="background: ${sender.token?.color || '#27ae60'}">${sender.name}</span>
                  <span class="col-title">Bạn Đưa Ra:</span>
                </div>
                
                <div class="trade-money-section">
                  <label>Tiền mặt (Tối đa: ${this.formatMoney(sender.money)}):</label>
                  <div class="money-input-row">
                    <input type="number" id="input-offer-money" class="trade-money-input" value="${offerMoney}" min="0" max="${sender.money}" step="100000">
                    <span class="currency-tag">VNĐ</span>
                  </div>
                </div>

                <div class="trade-properties-section">
                  <div class="section-label">Bất động sản của bạn:</div>
                  <div class="trade-tiles-list" id="sender-tiles-list">
                    ${renderTileCheckboxes(senderProps, selectedOfferTiles, true)}
                  </div>
                </div>
              </div>

              <!-- Cột 2: Yêu cầu từ đối tác -->
              <div class="trade-column trade-request-col">
                <div class="col-header">
                  <span class="user-badge" style="background: ${partner.token?.color || '#e67e22'}">${partner.name}</span>
                  <span class="col-title">Bạn Muốn Nhận:</span>
                </div>

                <div class="trade-money-section">
                  <label>Tiền mặt (Tối đa: ${this.formatMoney(partner.money)}):</label>
                  <div class="money-input-row">
                    <input type="number" id="input-request-money" class="trade-money-input" value="${requestMoney}" min="0" max="${partner.money}" step="100000">
                    <span class="currency-tag">VNĐ</span>
                  </div>
                </div>

                <div class="trade-properties-section">
                  <div class="section-label">Bất động sản của đối tác:</div>
                  <div class="trade-tiles-list" id="partner-tiles-list">
                    ${renderTileCheckboxes(partnerProps, selectedRequestTiles, false)}
                  </div>
                </div>
              </div>
            </div>

            <div class="trade-footer-actions">
              <button id="btn-send-trade-offer" class="btn-modal btn-buy-property">GỬI ĐỀ NGHỊ GIAO DỊCH 🤝</button>
              <button id="btn-close-trade" class="btn-modal btn-decline-property">HỦY BỎ</button>
            </div>
          </div>
        </div>
      `;

      // Event change đối tác
      const partnerSelect = document.getElementById('trade-partner-select');
      if (partnerSelect) {
        partnerSelect.onchange = (e) => {
          selectedPartnerId = e.target.value;
          selectedRequestTiles.clear();
          requestMoney = 0;
          renderTradeForm();
        };
      }

      // Event inputs tiền
      const inputOffer = document.getElementById('input-offer-money');
      if (inputOffer) {
        inputOffer.oninput = (e) => {
          offerMoney = Math.max(0, Math.min(sender.money, parseInt(e.target.value, 10) || 0));
        };
      }
      const inputRequest = document.getElementById('input-request-money');
      if (inputRequest) {
        inputRequest.oninput = (e) => {
          requestMoney = Math.max(0, Math.min(partner.money, parseInt(e.target.value, 10) || 0));
        };
      }

      // Event checkboxes
      const senderCheckboxes = document.querySelectorAll('#sender-tiles-list input[type="checkbox"]');
      senderCheckboxes.forEach((cb) => {
        cb.onchange = () => {
          const id = parseInt(cb.getAttribute('data-tile-id'), 10);
          if (cb.checked) selectedOfferTiles.add(id);
          else selectedOfferTiles.delete(id);
        };
      });

      const partnerCheckboxes = document.querySelectorAll('#partner-tiles-list input[type="checkbox"]');
      partnerCheckboxes.forEach((cb) => {
        cb.onchange = () => {
          const id = parseInt(cb.getAttribute('data-tile-id'), 10);
          if (cb.checked) selectedRequestTiles.add(id);
          else selectedRequestTiles.delete(id);
        };
      });

      // Event nút gửi đề nghị
      const btnSend = document.getElementById('btn-send-trade-offer');
      if (btnSend) {
        btnSend.onclick = () => {
          if (offerMoney === 0 && selectedOfferTiles.size === 0 && requestMoney === 0 && selectedRequestTiles.size === 0) {
            alert('Bạn chưa đưa ra hoặc yêu cầu tài sản nào!');
            return;
          }
          this.showConfirmation(engine, sender, partner, offerMoney, Array.from(selectedOfferTiles), requestMoney, Array.from(selectedRequestTiles), onComplete);
        };
      }

      const btnClose = document.getElementById('btn-close-trade');
      if (btnClose) {
        btnClose.onclick = () => this.hide();
      }
    };

    renderTradeForm();
  }

  showConfirmation(engine, sender, partner, offerMoney, offerTiles, requestMoney, requestTiles, onComplete) {
    const getTileNames = (ids) => {
      if (ids.length === 0) return '<em>Không có</em>';
      return ids.map((id) => SAIGON_BOARD_DATA[id]?.name).filter(Boolean).join(', ');
    };

    this.container.innerHTML = `
      <div class="modal-backdrop fade-in">
        <div class="trade-confirm-card pop-in">
          <div class="confirm-icon">📬</div>
          <h2>XÁC NHẬN ĐỀ NGHỊ GIAO DỊCH</h2>
          <p class="confirm-subtitle">
            <strong>${partner.name}</strong>, bạn có chấp nhận giao dịch từ <strong>${sender.name}</strong> không?
          </p>

          <div class="confirm-deal-box">
            <div class="deal-row">
              <span class="deal-tag receive">BẠN SẼ NHẬN:</span>
              <div class="deal-content">
                <strong>+${this.formatMoney(offerMoney)}</strong> tiền mặt<br>
                Đất: ${getTileNames(offerTiles)}
              </div>
            </div>
            <div class="deal-divider"></div>
            <div class="deal-row">
              <span class="deal-tag give">BẠN SẼ TRAO ĐI:</span>
              <div class="deal-content">
                <strong>-${this.formatMoney(requestMoney)}</strong> tiền mặt<br>
                Đất: ${getTileNames(requestTiles)}
              </div>
            </div>
          </div>

          <div class="trade-confirm-actions">
            <button id="btn-accept-trade" class="btn-modal btn-buy-property">ĐỒNG Ý GIAO DỊCH 🤝</button>
            <button id="btn-decline-trade" class="btn-modal btn-decline-property">TỪ CHỐI ❌</button>
          </div>
        </div>
      </div>
    `;

    const btnAccept = document.getElementById('btn-accept-trade');
    if (btnAccept) {
      btnAccept.onclick = () => {
        const res = engine.applyAction({
          type: 'EXECUTE_TRADE',
          senderId: sender.id,
          receiverId: partner.id,
          offerMoney,
          offerTiles,
          requestMoney,
          requestTiles
        });

        this.hide();
        if (onComplete) onComplete(res);
      };
    }

    const btnDecline = document.getElementById('btn-decline-trade');
    if (btnDecline) {
      btnDecline.onclick = () => {
        this.hide();
        if (onComplete) {
          onComplete({
            success: false,
            message: `${partner.name} đã từ chối đề nghị giao dịch.`
          });
        }
      };
    }
  }

  hide() {
    this.container.innerHTML = '';
  }
}

/**
 * TradeModal.js - Hộp thoại Giao Dịch & Trao Đổi Đất / Tiền giữa người chơi
 * Tích hợp hệ thống định giá tài sản trực quan, so sánh chênh lệch gói giao dịch & Bot AI tự đánh giá.
 */

import { SAIGON_BOARD_DATA } from "../../../shared/data/board-data.js";
import { GameRules } from "../../../shared/rules.js";
import { formatVND } from "../../../shared/constants.js";
import { BotAI } from "../../../shared/BotAI.js";

export class TradeModal {
  constructor(containerId = "trade-modal-container") {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      this.container = document.createElement("div");
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
      (p) => p.id !== sender.id && !p.isBankrupt,
    );

    if (otherPlayers.length === 0) {
      alert("Không có người chơi nào khác để giao dịch!");
      return;
    }

    let selectedPartnerId = otherPlayers[0].id;
    let offerMoney = 0;
    let requestMoney = 0;
    let selectedOfferTiles = new Set();
    let selectedRequestTiles = new Set();

    const renderTradeForm = () => {
      const partner = engine.state.players.find(
        (p) => p.id === selectedPartnerId,
      );

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
          <option value="${p.id}" ${p.id === selectedPartnerId ? "selected" : ""}>
            ${p.name} (Có: ${this.formatMoney(p.money)})
          </option>
        `,
        )
        .join("");

      // Render danh sách đất kèm định giá
      const renderTileCheckboxes = (tiles, selectedSet) => {
        if (tiles.length === 0) {
          return '<div class="empty-tiles-tip">Không sở hữu mảnh đất nào</div>';
        }

        return tiles
          .map((tile) => {
            const prop = engine.state.properties[tile.id] || {};
            const check = GameRules.canTradeProperty(
              tile,
              engine.state.properties,
            );
            const isChecked = selectedSet.has(tile.id);
            const disabled = !check.canTrade;
            const tip = !check.canTrade ? ` (Có nhà - không thể đổi)` : "";
            const isMortgaged = !!prop.isMortgaged;

            return `
              <label class="trade-tile-item ${disabled ? "disabled" : ""} ${isChecked ? "is-checked" : ""}">
                <div class="tile-item-left">
                  <input type="checkbox" data-tile-id="${tile.id}" ${isChecked ? "checked" : ""} ${disabled ? "disabled" : ""}>
                  <span class="trade-color-pill" style="background: ${tile.colorHex || tile.color || "#8a7358"}"></span>
                  <span class="trade-tile-name">${tile.name}${tip}</span>
                </div>
                <div class="tile-item-right">
                  ${isMortgaged ? '<span class="trade-tile-mortgaged">🔒 Cầm sổ</span>' : ""}
                  <span class="trade-tile-price">${this.formatMoney(tile.price)}</span>
                </div>
              </label>
            `;
          })
          .join("");
      };

      this.container.innerHTML = `
        <div class="modal-backdrop fade-in" id="trade-backdrop">
          <div class="trade-modal-card pop-in">
            <div class="trade-header">
              <h2>🤝 THỎA THUẬN GIAO DỊCH</h2>
              <div class="trade-sub">Thương lượng đổi đất & chuyển giao tiền mặt (Có định giá tài sản)</div>
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
                  <span class="user-badge" style="background: ${sender.token?.color || "#27ae60"}">${sender.name}</span>
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
                  <div class="section-label">Bất động sản của bạn (kèm định giá):</div>
                  <div class="trade-tiles-list" id="sender-tiles-list">
                    ${renderTileCheckboxes(senderProps, selectedOfferTiles)}
                  </div>
                </div>

                <div class="trade-col-summary">
                  <span class="summary-lbl">Tổng định giá đưa ra:</span>
                  <strong class="summary-val offer-sum" id="offer-total-val">0đ</strong>
                </div>
              </div>

              <!-- Cột 2: Yêu cầu từ đối tác -->
              <div class="trade-column trade-request-col">
                <div class="col-header">
                  <span class="user-badge" style="background: ${partner.token?.color || "#e67e22"}">${partner.name}</span>
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
                  <div class="section-label">Bất động sản của đối tác (kèm định giá):</div>
                  <div class="trade-tiles-list" id="partner-tiles-list">
                    ${renderTileCheckboxes(partnerProps, selectedRequestTiles)}
                  </div>
                </div>

                <div class="trade-col-summary">
                  <span class="summary-lbl">Tổng định giá muốn nhận:</span>
                  <strong class="summary-val request-sum" id="request-total-val">0đ</strong>
                </div>
              </div>
            </div>

            <!-- Thanh Đánh Giá Cân Bằng Kèo Giao Dịch -->
            <div class="trade-valuation-bar">
              <div class="deal-diff-info">
                <span class="diff-label">So sánh giá trị đề nghị:</span>
                <span class="diff-val" id="trade-diff-val">Chưa có đề nghị</span>
              </div>
              <div class="deal-status-badge deal-none" id="trade-deal-badge">⚪ Chưa có đề nghị</div>
            </div>

            <div class="trade-footer-actions">
              <button id="btn-send-trade-offer" class="btn-modal btn-buy-property">GỬI ĐỀ NGHỊ GIAO DỊCH 🤝</button>
              <button id="btn-close-trade" class="btn-modal btn-decline-property">HỦY BỎ</button>
            </div>
          </div>
        </div>
      `;

      // Hàm cập nhật định giá Real-time
      const updateValuationTotals = () => {
        let offerTilesSum = 0;
        selectedOfferTiles.forEach((id) => {
          offerTilesSum += SAIGON_BOARD_DATA[id]?.price || 0;
        });
        const totalOffer = offerMoney + offerTilesSum;

        let requestTilesSum = 0;
        selectedRequestTiles.forEach((id) => {
          requestTilesSum += SAIGON_BOARD_DATA[id]?.price || 0;
        });
        const totalRequest = requestMoney + requestTilesSum;

        const offerTotalEl = document.getElementById("offer-total-val");
        const requestTotalEl = document.getElementById("request-total-val");
        const diffValEl = document.getElementById("trade-diff-val");
        const dealBadgeEl = document.getElementById("trade-deal-badge");

        if (offerTotalEl)
          offerTotalEl.textContent = this.formatMoney(totalOffer);
        if (requestTotalEl)
          requestTotalEl.textContent = this.formatMoney(totalRequest);

        if (!diffValEl || !dealBadgeEl) return;

        if (totalOffer === 0 && totalRequest === 0) {
          diffValEl.textContent = "Chưa chọn tài sản trao đổi";
          dealBadgeEl.className = "deal-status-badge deal-none";
          dealBadgeEl.textContent = "⚪ Chưa có đề nghị";
        } else if (totalOffer > 0 && totalRequest === 0) {
          diffValEl.textContent = `Tặng không gói ${this.formatMoney(totalOffer)}`;
          dealBadgeEl.className = "deal-status-badge deal-gift";
          dealBadgeEl.textContent = "🎁 Tặng quà đối phương";
        } else if (totalOffer === 0 && totalRequest > 0) {
          diffValEl.textContent = `Yêu cầu không bù tiền gói ${this.formatMoney(totalRequest)}`;
          dealBadgeEl.className = "deal-status-badge deal-greedy";
          dealBadgeEl.textContent = "⚠️ Đòi hỏi 1 chiều";
        } else {
          const diff = totalOffer - totalRequest;
          const ratio = totalOffer / totalRequest;

          if (ratio >= 0.85 && ratio <= 1.18) {
            diffValEl.textContent = `Chênh lệch nhỏ ~${this.formatMoney(Math.abs(diff))}`;
            dealBadgeEl.className = "deal-status-badge deal-fair";
            dealBadgeEl.textContent = "⚖️ Kèo tương đương (Cân bằng)";
          } else if (ratio > 1.18) {
            diffValEl.textContent = `Bạn đưa nhiều hơn +${this.formatMoney(diff)}`;
            dealBadgeEl.className = "deal-status-badge deal-concede";
            dealBadgeEl.textContent = "🟡 Kèo bạn nhượng bộ (Bù thêm)";
          } else {
            diffValEl.textContent = `Bạn nhận nhiều hơn +${this.formatMoney(-diff)}`;
            dealBadgeEl.className = "deal-status-badge deal-advantage";
            dealBadgeEl.textContent = "🟢 Kèo hời cho bạn (Ép giá)";
          }
        }
      };

      // Event change đối tác
      const partnerSelect = document.getElementById("trade-partner-select");
      if (partnerSelect) {
        partnerSelect.onchange = (e) => {
          selectedPartnerId = e.target.value;
          selectedRequestTiles.clear();
          requestMoney = 0;
          renderTradeForm();
        };
      }

      // Event inputs tiền
      const inputOffer = document.getElementById("input-offer-money");
      if (inputOffer) {
        inputOffer.oninput = (e) => {
          offerMoney = Math.max(
            0,
            Math.min(sender.money, parseInt(e.target.value, 10) || 0),
          );
          updateValuationTotals();
        };
      }
      const inputRequest = document.getElementById("input-request-money");
      if (inputRequest) {
        inputRequest.oninput = (e) => {
          requestMoney = Math.max(
            0,
            Math.min(partner.money, parseInt(e.target.value, 10) || 0),
          );
          updateValuationTotals();
        };
      }

      // Event checkboxes
      const senderCheckboxes = document.querySelectorAll(
        '#sender-tiles-list input[type="checkbox"]',
      );
      senderCheckboxes.forEach((cb) => {
        cb.onchange = () => {
          const id = parseInt(cb.getAttribute("data-tile-id"), 10);
          if (cb.checked) {
            selectedOfferTiles.add(id);
            cb.closest(".trade-tile-item")?.classList.add("is-checked");
          } else {
            selectedOfferTiles.delete(id);
            cb.closest(".trade-tile-item")?.classList.remove("is-checked");
          }
          updateValuationTotals();
        };
      });

      const partnerCheckboxes = document.querySelectorAll(
        '#partner-tiles-list input[type="checkbox"]',
      );
      partnerCheckboxes.forEach((cb) => {
        cb.onchange = () => {
          const id = parseInt(cb.getAttribute("data-tile-id"), 10);
          if (cb.checked) {
            selectedRequestTiles.add(id);
            cb.closest(".trade-tile-item")?.classList.add("is-checked");
          } else {
            selectedRequestTiles.delete(id);
            cb.closest(".trade-tile-item")?.classList.remove("is-checked");
          }
          updateValuationTotals();
        };
      });

      // Event nút gửi đề nghị
      const btnSend = document.getElementById("btn-send-trade-offer");
      if (btnSend) {
        btnSend.onclick = () => {
          if (
            offerMoney === 0 &&
            selectedOfferTiles.size === 0 &&
            requestMoney === 0 &&
            selectedRequestTiles.size === 0
          ) {
            alert("Bạn chưa đưa ra hoặc yêu cầu tài sản nào!");
            return;
          }

          // Nếu đối tác là Bot AI -> Bot tự động định giá và phản hồi
          if (partner.isBot) {
            const decision = BotAI.evaluateTradeOffer(
              partner,
              {
                sender,
                offerMoney,
                offerTiles: Array.from(selectedOfferTiles),
                requestMoney,
                requestTiles: Array.from(selectedRequestTiles),
              },
              engine.state,
            );

            if (decision.accept) {
              const res = engine.applyAction({
                type: "EXECUTE_TRADE",
                senderId: sender.id,
                receiverId: partner.id,
                offerMoney,
                offerTiles: Array.from(selectedOfferTiles),
                requestMoney,
                requestTiles: Array.from(selectedRequestTiles),
              });
              this.hide();
              if (onComplete) {
                onComplete({
                  ...res,
                  message: `🤝 ${partner.name}: "${decision.reason}" - Giao dịch thành công!`,
                });
              }
            } else {
              this.hide();
              if (onComplete) {
                onComplete({
                  success: false,
                  message: `❌ ${partner.name} từ chối giao dịch: "${decision.reason}"`,
                });
              }
            }
            return;
          }

          // Đối tác là người chơi -> Hiện modal xác nhận giao dịch
          this.showConfirmation(
            engine,
            sender,
            partner,
            offerMoney,
            Array.from(selectedOfferTiles),
            requestMoney,
            Array.from(selectedRequestTiles),
            onComplete,
          );
        };
      }

      const btnClose = document.getElementById("btn-close-trade");
      if (btnClose) {
        btnClose.onclick = () => this.hide();
      }

      // Khởi tạo ban đầu
      updateValuationTotals();
    };

    renderTradeForm();
  }

  showConfirmation(
    engine,
    sender,
    partner,
    offerMoney,
    offerTiles,
    requestMoney,
    requestTiles,
    onComplete,
  ) {
    let offerTilesVal = 0;
    const getTileDetails = (ids) => {
      if (ids.length === 0) return "<em>Không có</em>";
      return ids
        .map((id) => {
          const t = SAIGON_BOARD_DATA[id];
          if (!t) return "";
          offerTilesVal += t.price || 0;
          return `${t.name} (${this.formatMoney(t.price)})`;
        })
        .filter(Boolean)
        .join(", ");
    };

    const offerTilesText = getTileDetails(offerTiles);
    const totalOfferPkg = offerMoney + offerTilesVal;

    let requestTilesVal = 0;
    const getReqDetails = (ids) => {
      if (ids.length === 0) return "<em>Không có</em>";
      return ids
        .map((id) => {
          const t = SAIGON_BOARD_DATA[id];
          if (!t) return "";
          requestTilesVal += t.price || 0;
          return `${t.name} (${this.formatMoney(t.price)})`;
        })
        .filter(Boolean)
        .join(", ");
    };

    const reqTilesText = getReqDetails(requestTiles);
    const totalReqPkg = requestMoney + requestTilesVal;

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
              <span class="deal-tag receive">BẠN SẼ NHẬN (Tổng định giá: ${this.formatMoney(totalOfferPkg)}):</span>
              <div class="deal-content">
                <strong>+${this.formatMoney(offerMoney)}</strong> tiền mặt<br>
                Đất: ${offerTilesText}
              </div>
            </div>
            <div class="deal-divider"></div>
            <div class="deal-row">
              <span class="deal-tag give">BẠN SẼ TRAO ĐI (Tổng định giá: ${this.formatMoney(totalReqPkg)}):</span>
              <div class="deal-content">
                <strong>-${this.formatMoney(requestMoney)}</strong> tiền mặt<br>
                Đất: ${reqTilesText}
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

    const btnAccept = document.getElementById("btn-accept-trade");
    if (btnAccept) {
      btnAccept.onclick = () => {
        const res = engine.applyAction({
          type: "EXECUTE_TRADE",
          senderId: sender.id,
          receiverId: partner.id,
          offerMoney,
          offerTiles,
          requestMoney,
          requestTiles,
        });

        this.hide();
        if (onComplete) onComplete(res);
      };
    }

    const btnDecline = document.getElementById("btn-decline-trade");
    if (btnDecline) {
      btnDecline.onclick = () => {
        this.hide();
        if (onComplete) {
          onComplete({
            success: false,
            message: `${partner.name} đã từ chối đề nghị giao dịch.`,
          });
        }
      };
    }
  }

  hide() {
    this.container.innerHTML = "";
  }
}

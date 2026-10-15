import { formatVND } from "../../../shared/constants.js";
import { GameRules } from "../../../shared/rules.js";
import { SAIGON_BOARD_DATA } from "../../../shared/data/board-data.js";

/**
 * DebtResolutionModal.js - Modal Giải Quyết Nợ Khẩn Cấp
 * Giúp người chơi bán nhà / thế chấp bất động sản để gom tiền mặt trả nợ thay vì bị phá sản tức tưởi.
 */
export class DebtResolutionModal {
  constructor(containerId = "debt-modal-container") {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.id = containerId;
      document.body.appendChild(this.container);
    }
  }

  /**
   * Hiển thị modal giải quyết nợ
   * @param {Object} opts
   * @param {Object} opts.player - Người chơi đang nợ
   * @param {number} opts.amount - Số tiền nợ cần thanh toán
   * @param {string} opts.debtType - "RENT" | "TAX"
   * @param {Object} [opts.creditor] - Người nhận tiền (nếu là tiền thuê)
   * @param {Object} [opts.tile] - Ô đất liên quan
   * @param {Object} opts.state - Game state hiện tại
   * @param {Function} opts.onAutoLiquidate - Callback khi bấm Tự Động Cứu Nguy
   * @param {Function} opts.onMortgage - Callback khi bấm Thế chấp 1 ô đất
   * @param {Function} opts.onSellHouse - Callback khi bấm Bán nhà 1 ô đất
   * @param {Function} opts.onPayDebt - Callback khi gom đủ tiền và bấm Thanh Toán Nợ
   * @param {Function} opts.onConcede - Callback khi chấp nhận phá sản
   */
  show(opts) {
    this.opts = opts;
    this.render();
  }

  hide() {
    this.container.innerHTML = "";
  }

  render() {
    const { player, amount, debtType, creditor, tile, state } = this.opts;
    const currentCash = player.money || 0;
    const deficit = Math.max(0, amount - currentCash);
    const canPayNow = currentCash >= amount;

    // Lọc danh sách bất động sản của người chơi
    const ownedTiles = SAIGON_BOARD_DATA.filter((t) => {
      const prop = state.properties[t.id];
      return (
        prop &&
        prop.owner === player.id &&
        ["property", "railroad", "utility"].includes(t.type)
      );
    });

    // Tạo HTML cho từng ô đất
    let propertiesHtml = "";
    if (ownedTiles.length === 0) {
      propertiesHtml = `
        <div class="debt-empty-prop">
          Bạn không sở hữu bất động sản nào khác để thế chấp.
        </div>
      `;
    } else {
      propertiesHtml = ownedTiles
        .map((t) => {
          const prop = state.properties[t.id] || {};
          const isMortgaged = !!prop.isMortgaged;
          const houses = prop.houses || 0;

          const sellCheck = GameRules.canSellHouse(t, player, state.properties);
          const mortgageCheck = GameRules.canMortgage(
            t,
            player,
            state.properties,
          );

          let actionButtons = "";
          if (houses > 0) {
            actionButtons += `
              <button class="btn-debt-act btn-debt-sell ${sellCheck.canSell ? "" : "disabled"}"
                      data-tile-id="${t.id}" data-action="sell"
                      ${sellCheck.canSell ? "" : "disabled"}
                      title="${sellCheck.reason || "Bán 1 nhà"}">
                🏚️ Bán Nhà (+${formatVND(sellCheck.refund || Math.round(t.houseCost * 0.5))})
              </button>
            `;
          } else if (isMortgaged) {
            actionButtons += `<span class="badge-debt-mortgaged">🔒 Đã thế chấp</span>`;
          } else {
            actionButtons += `
              <button class="btn-debt-act btn-debt-mortgage ${mortgageCheck.canMortgage ? "" : "disabled"}"
                      data-tile-id="${t.id}" data-action="mortgage"
                      ${mortgageCheck.canMortgage ? "" : "disabled"}
                      title="${mortgageCheck.reason || "Thế chấp sổ đỏ"}">
                🔒 Cầm Sổ (+${formatVND(mortgageCheck.mortgageValue || Math.round(t.price * 0.5))})
              </button>
            `;
          }

          const houseDisplay =
            houses > 0
              ? houses === 5
                ? "🏨 Khách Sạn"
                : `🏡 ${houses} Nhà`
              : "Đất trống";

          return `
            <div class="debt-tile-row ${isMortgaged ? "is-mortgaged" : ""}">
              <div class="debt-tile-info">
                <span class="debt-tile-color-tag" style="background-color: ${t.color || "#8a7358"};"></span>
                <div class="debt-tile-text">
                  <span class="debt-tile-name">${t.name}</span>
                  <span class="debt-tile-sub">${houseDisplay} • Giá mua ${formatVND(t.price)}</span>
                </div>
              </div>
              <div class="debt-tile-actions">
                ${actionButtons}
              </div>
            </div>
          `;
        })
        .join("");
    }

    const creditorName =
      debtType === "TAX"
        ? "🏦 Thuế Nhà Nước (Quỹ Jackpot)"
        : `👤 ${creditor ? creditor.name : "Chủ đất"}`;

    this.container.innerHTML = `
      <div class="modal-backdrop debt-modal-backdrop">
        <div class="debt-modal-card pop-in">
          <!-- Header -->
          <div class="debt-modal-header">
            <div class="debt-warning-icon">🚨</div>
            <div class="debt-header-text">
              <h3>BÁO NỢ KHẨN CẤP!</h3>
              <p>Bạn không đủ tiền mặt thanh toán. Hãy huy động vốn để tránh Phá Sản!</p>
            </div>
          </div>

          <!-- Debt Summary Box -->
          <div class="debt-summary-box">
            <div class="debt-summary-grid">
              <div class="debt-col">
                <span class="debt-label">Khoản nợ:</span>
                <span class="debt-val debt-amount">${formatVND(amount)}</span>
              </div>
              <div class="debt-col">
                <span class="debt-label">Chủ nợ:</span>
                <span class="debt-val creditor-val">${creditorName}</span>
              </div>
              <div class="debt-col">
                <span class="debt-label">Tiền mặt hiện có:</span>
                <span class="debt-val ${currentCash <= 0 ? "cash-zero" : "cash-pos"}">${formatVND(currentCash)}</span>
              </div>
              <div class="debt-col">
                <span class="debt-label">Tình trạng vốn:</span>
                <span class="debt-val ${deficit > 0 ? "deficit-alert" : "deficit-resolved"}">
                  ${deficit > 0 ? `Thiếu ${formatVND(deficit)}` : "✅ ĐÃ ĐỦ TIỀN!"}
                </span>
              </div>
            </div>
          </div>

          <!-- One-Click Auto-Resolve Button -->
          <div class="debt-auto-box">
            <button id="btn-debt-auto-resolve" class="btn-debt-auto">
              <span class="auto-bolt">⚡</span>
              <div class="auto-text">
                <strong>Tự Động Cứu Nguy (Thế chấp thông minh)</strong>
                <small>Hệ thống sẽ tự động thế chấp các ô đất lẻ để gom vừa đủ ${formatVND(deficit)}</small>
              </div>
            </button>
          </div>

          <!-- Manual Property Liquidation List -->
          <div class="debt-section-title">
            <span>Hoặc tự chọn Bán Nhà / Thế Chấp Thủ Công:</span>
          </div>
          <div class="debt-properties-list">
            ${propertiesHtml}
          </div>

          <!-- Footer Actions -->
          <div class="debt-modal-footer">
            <button id="btn-debt-concede" class="btn-debt-concede">
              🏳️ Chấp Nhận Phá Sản
            </button>
            <button id="btn-debt-pay" class="btn-debt-pay ${canPayNow ? "active" : "disabled"}" ${canPayNow ? "" : "disabled"}>
              💸 Thanh Toán Nợ (${formatVND(amount)})
            </button>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    // 1. Tự Động Cứu Nguy
    const btnAuto = this.container.querySelector("#btn-debt-auto-resolve");
    if (btnAuto) {
      btnAuto.onclick = () => {
        if (this.opts.onAutoLiquidate) {
          this.opts.onAutoLiquidate();
        }
      };
    }

    // 2. Nút Thanh Toán Nợ
    const btnPay = this.container.querySelector("#btn-debt-pay");
    if (btnPay) {
      btnPay.onclick = () => {
        if (this.opts.onPayDebt) {
          this.opts.onPayDebt();
        }
      };
    }

    // 3. Nút Đầu Hàng / Phá Sản
    const btnConcede = this.container.querySelector("#btn-debt-concede");
    if (btnConcede) {
      btnConcede.onclick = () => {
        if (
          confirm(
            "Bạn có chắc chắn muốn chấp nhận Phá Sản và rời khỏi cuộc chơi không?",
          )
        ) {
          if (this.opts.onConcede) {
            this.opts.onConcede();
          }
        }
      };
    }

    // 4. Các nút Bán Nhà & Thế Chấp riêng lẻ
    const actionBtns = this.container.querySelectorAll(".btn-debt-act");
    actionBtns.forEach((btn) => {
      btn.onclick = () => {
        const tileId = parseInt(btn.dataset.tileId, 10);
        const action = btn.dataset.action;
        if (action === "sell" && this.opts.onSellHouse) {
          this.opts.onSellHouse(tileId);
        } else if (action === "mortgage" && this.opts.onMortgage) {
          this.opts.onMortgage(tileId);
        }
      };
    });
  }
}

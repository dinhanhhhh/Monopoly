/**
 * TradeModal.js - Hộp thoại Giao Dịch & Trao Đổi Đất / Tiền giữa người chơi
 * Thiết kế tinh gọn, hiện đại, KHÔNG BỊ NHÁY khi chuyển đối tác hay chọn đất:
 * - Khung modal chỉ render 1 lần duy nhất khi mở.
 * - Chuyển đổi đối tác và chọn ô đất được cập nhật DOM cục bộ tức thì, mượt mà 100%.
 * - Chạm trực tiếp vào các ô đất trên bàn cờ hoặc chọn nhanh trong danh sách.
 * - Khi gửi đề nghị, thu nhỏ thành Card nổi đếm ngược phản hồi thời gian thực.
 */

import { SAIGON_BOARD_DATA } from "../../../shared/data/board-data.js";
import { GameRules } from "../../../shared/rules.js";
import { formatVND } from "../../../shared/constants.js";
import { BotAI } from "../../../shared/BotAI.js";
import { sound } from "../audio/SoundEffects.js";

export class TradeModal {
  constructor(containerId = "trade-modal-container") {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.id = containerId;
      document.body.appendChild(this.container);
    }

    this.isOpen = false;
    this.engine = null;
    this.onComplete = null;
    this.selectedPartnerId = null;
    this.selectedOfferTiles = new Set();
    this.selectedRequestTiles = new Set();
    this.offerMoney = 0;
    this.requestMoney = 0;
    this.pendingTimeout = null;
    this.countdownInterval = null;
  }

  formatMoney(amount) {
    if (!amount || amount === 0) return "0đ";
    return formatVND(amount);
  }

  show(engine, onComplete = null) {
    this.engine = engine;
    this.onComplete = onComplete;
    this.isOpen = true;

    // Reset dữ liệu giao dịch
    this.selectedOfferTiles.clear();
    this.selectedRequestTiles.clear();
    this.offerMoney = 0;
    this.requestMoney = 0;

    const sender = engine.getCurrentPlayer();
    const otherPlayers = engine.state.players.filter(
      (p) => p.id !== sender.id && !p.isBankrupt,
    );

    if (otherPlayers.length === 0) {
      alert("Không có người chơi nào khác để giao dịch!");
      this.isOpen = false;
      return;
    }

    if (!this.selectedPartnerId || !otherPlayers.some((p) => p.id === this.selectedPartnerId)) {
      this.selectedPartnerId = otherPlayers[0].id;
    }

    // 1. Render khung sườn modal đúng 1 lần duy nhất (có animation pop-in)
    this.renderBaseModal(sender, otherPlayers);

    // 2. Cập nhật dữ liệu đất & số tiền
    this.renderSenderTiles(sender);
    this.switchPartner(this.selectedPartnerId, false);
  }

  hide() {
    this.isOpen = false;
    this.container.innerHTML = "";
    if (this.pendingTimeout) clearTimeout(this.pendingTimeout);
    if (this.countdownInterval) clearInterval(this.countdownInterval);
  }

  /**
   * Khung sườn modal - Render 1 lần duy nhất, tránh flicker (nháy màn hình)
   */
  renderBaseModal(sender, otherPlayers) {
    const partnerPillsHtml = otherPlayers
      .map((p) => {
        const isSelected = p.id === this.selectedPartnerId;
        const initial = p.name ? p.name.trim().charAt(0).toUpperCase() : "?";
        const color = p.token?.color || (isSelected ? "#2563eb" : "#64748b");
        return `
          <button class="trade-partner-pill ${isSelected ? "is-selected" : ""}" data-player-id="${p.id}">
            <span class="partner-pill-avatar" style="background-color: ${color};">${initial}</span>
            <span class="partner-pill-name">${p.name}</span>
          </button>
        `;
      })
      .join("");

    this.container.innerHTML = `
      <div class="modal-backdrop trade-modal-backdrop fade-in" id="trade-modal-backdrop">
        <div class="trade-modal-window pop-in">
          <!-- Close button -->
          <button class="trade-close-x" id="btn-close-trade-modal" title="Đóng">✕</button>

          <!-- Header -->
          <div class="trade-modal-header">
            <h2 class="trade-main-title">Trao đổi</h2>
            <p class="trade-helper-subtitle">Chạm vào các tài sản trên bàn cờ, hoặc chọn từ danh sách</p>

            <div class="trade-partner-row">
              <span class="trade-partner-lbl">Với</span>
              <div class="trade-partner-pills" id="trade-partner-pills-wrap">
                ${partnerPillsHtml}
              </div>
            </div>
          </div>

          <!-- Body: 2 Cột Bạn Đưa / Bạn Nhận -->
          <div class="trade-modal-body">
            <!-- Cột Trái: Bạn Đưa -->
            <div class="trade-deal-col col-give">
              <div class="deal-col-header">
                <span class="deal-col-heading">Bạn đưa <strong id="trade-offer-count">0</strong></span>
                <span class="deal-player-tag tag-sender">${sender.name}</span>
              </div>

              <!-- Danh sách đất của bạn -->
              <div class="trade-cards-scroll" id="trade-cards-offer"></div>

              <!-- Ô tiền mặt -->
              <div class="trade-cash-row">
                <span class="cash-label">Tiền mặt</span>
                <div class="cash-input-wrap">
                  <span class="cash-currency">₫</span>
                  <input type="number" id="trade-input-offer-cash" class="trade-cash-input"
                         value="0" min="0" max="${sender.money}" step="100000"
                         placeholder="0">
                </div>
              </div>

              <!-- Tổng giá trị -->
              <div class="trade-col-total-row">
                <span class="total-label">Tổng giá trị</span>
                <span class="total-amount" id="trade-offer-total">0đ</span>
              </div>
            </div>

            <!-- Cột Phải: Bạn Nhận -->
            <div class="trade-deal-col col-receive">
              <div class="deal-col-header">
                <span class="deal-col-heading">Bạn nhận <strong id="trade-request-count">0</strong></span>
                <span class="deal-player-tag tag-partner" id="trade-partner-tag">Đối tác</span>
              </div>

              <!-- Danh sách đất của đối tác -->
              <div class="trade-cards-scroll" id="trade-cards-request"></div>

              <!-- Ô tiền mặt -->
              <div class="trade-cash-row">
                <span class="cash-label">Tiền mặt</span>
                <div class="cash-input-wrap">
                  <span class="cash-currency">₫</span>
                  <input type="number" id="trade-input-request-cash" class="trade-cash-input"
                         value="0" min="0" max="0" step="100000"
                         placeholder="0">
                </div>
              </div>

              <!-- Tổng giá trị -->
              <div class="trade-col-total-row">
                <span class="total-label">Tổng giá trị</span>
                <span class="total-amount" id="trade-request-total">0đ</span>
              </div>
            </div>
          </div>

          <!-- Footer hành động -->
          <div class="trade-modal-footer">
            <button id="btn-cancel-trade" class="btn-trade-cancel">Hủy</button>
            <button id="btn-submit-trade" class="btn-trade-submit is-disabled" disabled>
              Gửi đề nghị →
            </button>
          </div>
        </div>
      </div>
    `;

    this.bindStaticEvents(sender);
  }

  /**
   * Gắn các sự kiện tĩnh 1 lần
   */
  bindStaticEvents(sender) {
    const btnClose = this.container.querySelector("#btn-close-trade-modal");
    if (btnClose) btnClose.onclick = () => this.hide();

    const btnCancel = this.container.querySelector("#btn-cancel-trade");
    if (btnCancel) btnCancel.onclick = () => this.hide();

    // Event chọn tab đối tác
    const partnerPills = this.container.querySelectorAll(".trade-partner-pill");
    partnerPills.forEach((btn) => {
      btn.onclick = () => {
        const pId = btn.getAttribute("data-player-id");
        if (pId && pId !== this.selectedPartnerId) {
          this.switchPartner(pId, true);
        }
      };
    });

    // Input tiền mặt Bạn đưa
    const inputOfferCash = this.container.querySelector("#trade-input-offer-cash");
    if (inputOfferCash) {
      inputOfferCash.oninput = (e) => {
        const val = parseInt(e.target.value, 10) || 0;
        this.offerMoney = Math.max(0, Math.min(sender.money, val));
        this.updateTotals();
      };
    }

    // Input tiền mặt Bạn nhận
    const inputRequestCash = this.container.querySelector("#trade-input-request-cash");
    if (inputRequestCash) {
      inputRequestCash.oninput = (e) => {
        const partner = this.engine.state.players.find((p) => p.id === this.selectedPartnerId);
        const maxMoney = partner ? partner.money : 0;
        const val = parseInt(e.target.value, 10) || 0;
        this.requestMoney = Math.max(0, Math.min(maxMoney, val));
        this.updateTotals();
      };
    }

    // Nút Gửi đề nghị
    const btnSubmit = this.container.querySelector("#btn-submit-trade");
    if (btnSubmit) {
      btnSubmit.onclick = () => {
        const partner = this.engine.state.players.find((p) => p.id === this.selectedPartnerId);
        if (partner) {
          this.sendProposal(sender, partner);
        }
      };
    }
  }

  /**
   * Chuyển đổi đối tác mà KHÔNG re-render cả modal (hết sạch lỗi nháy)
   */
  switchPartner(partnerId, playAudio = true) {
    this.selectedPartnerId = partnerId;
    this.selectedRequestTiles.clear();
    this.requestMoney = 0;

    const partner = this.engine.state.players.find((p) => p.id === partnerId);
    if (!partner) return;

    // 1. Cập nhật active class trên các tab pill
    const partnerPills = this.container.querySelectorAll(".trade-partner-pill");
    partnerPills.forEach((btn) => {
      const isSel = btn.getAttribute("data-player-id") === partnerId;
      btn.classList.toggle("is-selected", isSel);
    });

    // 2. Cập nhật tên đối tác ở cột phải
    const partnerTag = this.container.querySelector("#trade-partner-tag");
    if (partnerTag) partnerTag.textContent = partner.name;

    // 3. Reset input tiền mặt bên phải
    const inputRequestCash = this.container.querySelector("#trade-input-request-cash");
    if (inputRequestCash) {
      inputRequestCash.value = 0;
      inputRequestCash.max = partner.money;
    }

    // 4. Render danh sách đất của đối tác mới
    const partnerProps = SAIGON_BOARD_DATA.filter((tile) => {
      const prop = this.engine.state.properties[tile.id];
      return prop && prop.owner === partner.id && ["property", "railroad", "utility"].includes(tile.type);
    });

    const requestListEl = this.container.querySelector("#trade-cards-request");
    if (requestListEl) {
      requestListEl.innerHTML = this.buildTileCardsHtml(partnerProps, this.selectedRequestTiles, "request");
      this.bindTileCardsEvents(requestListEl, "request");
    }

    // 5. Cập nhật số đếm và tổng tiền
    this.updateTotals();

    if (playAudio) {
      sound.playTokenStep();
    }
  }

  /**
   * Render danh sách đất của Bạn (cột trái)
   */
  renderSenderTiles(sender) {
    const senderProps = SAIGON_BOARD_DATA.filter((tile) => {
      const prop = this.engine.state.properties[tile.id];
      return prop && prop.owner === sender.id && ["property", "railroad", "utility"].includes(tile.type);
    });

    const offerListEl = this.container.querySelector("#trade-cards-offer");
    if (offerListEl) {
      offerListEl.innerHTML = this.buildTileCardsHtml(senderProps, this.selectedOfferTiles, "offer");
      this.bindTileCardsEvents(offerListEl, "offer");
    }
  }

  /**
   * Tạo HTML thẻ đất - Tên và ghi chú nằm ngang hàng, không đè chữ
   */
  buildTileCardsHtml(tiles, selectedSet, side) {
    if (tiles.length === 0) {
      return `<div class="trade-empty-tiles">Không sở hữu bất động sản nào</div>`;
    }

    return tiles
      .map((tile) => {
        const prop = this.engine.state.properties[tile.id] || {};
        const check = GameRules.canTradeProperty(tile, this.engine.state.properties);
        const isChecked = selectedSet.has(tile.id);
        const isDisabled = !check.canTrade;
        const isMortgaged = !!prop.isMortgaged;
        const colorHex = tile.colorHex || tile.color || "#8a7358";
        const subNote = isDisabled
          ? "(Có nhà - không thể đổi)"
          : isMortgaged
            ? "(Đang cầm sổ)"
            : "";

        return `
          <div class="trade-tile-card ${isChecked ? "is-selected" : ""} ${isDisabled ? "is-disabled" : ""}"
               data-side="${side}" data-tile-id="${tile.id}"
               title="${subNote ? `${tile.name} ${subNote}` : tile.name}">
            <div class="tile-card-left">
              <span class="tile-color-strip" style="background-color: ${colorHex};"></span>
              <span class="tile-card-title">
                ${tile.name}
                ${subNote ? `<span class="tile-card-sub">${subNote}</span>` : ""}
              </span>
            </div>
            <div class="tile-card-right">
              <span class="tile-card-price">${this.formatMoney(tile.price)}</span>
            </div>
          </div>
        `;
      })
      .join("");
  }

  /**
   * Gắn sự kiện click vào thẻ đất cục bộ, không re-render modal
   */
  bindTileCardsEvents(containerEl, side) {
    const cards = containerEl.querySelectorAll(".trade-tile-card:not(.is-disabled)");
    cards.forEach((card) => {
      card.onclick = () => {
        const tileId = parseInt(card.getAttribute("data-tile-id"), 10);
        this.toggleTile(side, tileId, card);
      };
    });
  }

  /**
   * Toggle chọn ô đất cục bộ và cập nhật tiền
   */
  toggleTile(side, tileId, cardEl = null) {
    const targetSet = side === "offer" ? this.selectedOfferTiles : this.selectedRequestTiles;
    const isAdding = !targetSet.has(tileId);

    if (isAdding) {
      targetSet.add(tileId);
    } else {
      targetSet.delete(tileId);
    }

    // Toggle class trực tiếp trên DOM của thẻ
    if (cardEl) {
      cardEl.classList.toggle("is-selected", isAdding);
    } else {
      const card = this.container.querySelector(`.trade-tile-card[data-side="${side}"][data-tile-id="${tileId}"]`);
      if (card) card.classList.toggle("is-selected", isAdding);
    }

    sound.playTokenStep();
    this.updateTotals();
  }

  /**
   * Chạm ô trên bàn cờ
   */
  handleTileClick(tileId) {
    if (!this.isOpen || !this.engine) return;
    const tile = SAIGON_BOARD_DATA[tileId];
    if (!tile || !["property", "railroad", "utility"].includes(tile.type)) return;

    const prop = this.engine.state.properties[tileId];
    if (!prop || !prop.owner) return;

    const sender = this.engine.getCurrentPlayer();

    // 1. Ô đất thuộc về Bạn -> Toggle bên cột Bạn đưa
    if (prop.owner === sender.id) {
      const check = GameRules.canTradeProperty(tile, this.engine.state.properties);
      if (!check.canTrade) return;
      this.toggleTile("offer", tileId);
      return;
    }

    // 2. Ô đất thuộc về Đối tác đang chọn -> Toggle bên cột Bạn nhận
    if (prop.owner === this.selectedPartnerId) {
      const check = GameRules.canTradeProperty(tile, this.engine.state.properties);
      if (!check.canTrade) return;
      this.toggleTile("request", tileId);
      return;
    }

    // 3. Ô đất thuộc về người chơi khác -> Chuyển tab sang người đó và chọn luôn ô đất
    const otherOwner = this.engine.state.players.find(
      (p) => p.id === prop.owner && !p.isBankrupt && p.id !== sender.id,
    );
    if (otherOwner) {
      this.switchPartner(otherOwner.id, true);
      const check = GameRules.canTradeProperty(tile, this.engine.state.properties);
      if (check.canTrade) {
        this.toggleTile("request", tileId);
      }
    }
  }

  /**
   * Cập nhật số đếm và tổng giá trị 2 bên cực nhanh (không re-render DOM)
   */
  updateTotals() {
    // 1. Cập nhật số lượng ô đang chọn
    const offerCountEl = this.container.querySelector("#trade-offer-count");
    if (offerCountEl) offerCountEl.textContent = this.selectedOfferTiles.size;

    const requestCountEl = this.container.querySelector("#trade-request-count");
    if (requestCountEl) requestCountEl.textContent = this.selectedRequestTiles.size;

    // 2. Tính tổng giá trị Bạn Đưa
    let offerTilesSum = 0;
    this.selectedOfferTiles.forEach((id) => {
      offerTilesSum += SAIGON_BOARD_DATA[id]?.price || 0;
    });
    const totalOffer = this.offerMoney + offerTilesSum;

    const offerTotalEl = this.container.querySelector("#trade-offer-total");
    if (offerTotalEl) offerTotalEl.textContent = this.formatMoney(totalOffer);

    // 3. Tính tổng giá trị Bạn Nhận
    let requestTilesSum = 0;
    this.selectedRequestTiles.forEach((id) => {
      requestTilesSum += SAIGON_BOARD_DATA[id]?.price || 0;
    });
    const totalRequest = this.requestMoney + requestTilesSum;

    const requestTotalEl = this.container.querySelector("#trade-request-total");
    if (requestTotalEl) requestTotalEl.textContent = this.formatMoney(totalRequest);

    // 4. Kích hoạt nút Gửi đề nghị
    const btnSubmit = this.container.querySelector("#btn-submit-trade");
    if (btnSubmit) {
      const hasAnyItem = totalOffer > 0 || totalRequest > 0;
      btnSubmit.disabled = !hasAnyItem;
      btnSubmit.classList.toggle("is-ready", hasAnyItem);
      btnSubmit.classList.toggle("is-disabled", !hasAnyItem);
    }
  }

  /**
   * Quy trình gửi đề nghị và hiển thị Card nổi đếm ngược phản hồi (Ảnh 3 & 4)
   */
  sendProposal(sender, partner) {
    const offerTilesArr = Array.from(this.selectedOfferTiles);
    const requestTilesArr = Array.from(this.selectedRequestTiles);

    const getSummary = (tileIds, money) => {
      const parts = [];
      if (tileIds.length > 0) {
        parts.push(tileIds.map((id) => SAIGON_BOARD_DATA[id]?.name || "Đất").join(", "));
      }
      if (money > 0) {
        parts.push(`+${this.formatMoney(money)}`);
      }
      return parts.length > 0 ? parts.join(" ") : "0đ";
    };

    const offerSummary = getSummary(offerTilesArr, this.offerMoney);
    const requestSummary = getSummary(requestTilesArr, this.requestMoney);

    // 1. Đóng modal chính
    this.container.innerHTML = "";

    // 2. Render Card chờ phản hồi dạng Floating Toast (Ảnh 3)
    let countdown = 8;
    this.container.innerHTML = `
      <div class="trade-pending-floating-wrap pop-in" id="trade-pending-wrap">
        <div class="trade-pending-card">
          <div class="pending-top-row">
            <span class="pending-status-title">⏳ Đề nghị với <strong>${partner.name}</strong></span>
            <span class="pending-timer-tag" id="pending-countdown-tag">⏱️ ${countdown}s</span>
          </div>
          <div class="pending-body-summary">
            Bạn đưa: <strong>${offerSummary}</strong> · Bạn nhận: <strong>${requestSummary}</strong>
          </div>
          <div class="pending-bottom-actions">
            <button id="btn-cancel-pending-deal" class="btn-cancel-pending">Hủy</button>
          </div>
        </div>
      </div>
    `;

    // 3. Đếm ngược hiển thị
    const timerTag = this.container.querySelector("#pending-countdown-tag");
    this.countdownInterval = setInterval(() => {
      countdown--;
      if (timerTag) timerTag.textContent = `⏱️ ${countdown}s`;
      if (countdown <= 0) {
        clearInterval(this.countdownInterval);
      }
    }, 1000);

    // Nút Hủy đề nghị
    const btnCancelPending = this.container.querySelector("#btn-cancel-pending-deal");
    if (btnCancelPending) {
      btnCancelPending.onclick = () => {
        this.hide();
        if (this.onComplete) {
          this.onComplete({ success: false, message: `Bạn đã hủy đề nghị trao đổi với ${partner.name}.` });
        }
      };
    }

    // 4. Giả lập Bot suy nghĩ 2.2 giây rồi phản hồi
    this.pendingTimeout = setTimeout(() => {
      clearInterval(this.countdownInterval);

      // Bot đánh giá
      const decision = BotAI.evaluateTradeOffer(
        partner,
        {
          sender,
          offerMoney: this.offerMoney,
          offerTiles: offerTilesArr,
          requestMoney: this.requestMoney,
          requestTiles: requestTilesArr,
        },
        this.engine.state,
      );

      const pendingCard = this.container.querySelector(".trade-pending-card");

      if (decision.accept) {
        // Áp dụng giao dịch vào engine
        const res = this.engine.applyAction({
          type: "EXECUTE_TRADE",
          senderId: sender.id,
          receiverId: partner.id,
          offerMoney: this.offerMoney,
          offerTiles: offerTilesArr,
          requestMoney: this.requestMoney,
          requestTiles: requestTilesArr,
        });

        sound.playSuccess();

        if (pendingCard) {
          pendingCard.classList.add("is-accepted");
          pendingCard.innerHTML = `
            <div class="pending-result-row">
              <span class="result-icon">✅</span>
              <div class="result-text">
                <strong>${partner.name} đã chấp nhận trao đổi!</strong>
                <small>"${decision.reason || "Kèo hợp lý, bắt tay giao dịch nghen!"}"</small>
              </div>
            </div>
          `;
        }

        setTimeout(() => {
          this.hide();
          if (this.onComplete) {
            this.onComplete({
              ...res,
              success: true,
              message: `🤝 ${sender.name} đã trao đổi thành công với ${partner.name}!`,
            });
          }
        }, 2200);
      } else {
        // Bot từ chối
        if (pendingCard) {
          pendingCard.classList.add("is-rejected");
          pendingCard.innerHTML = `
            <div class="pending-result-row">
              <span class="result-icon">❌</span>
              <div class="result-text">
                <strong>${partner.name} đã từ chối một đề nghị trao đổi.</strong>
                <small>"${decision.reason || "Kèo này chưa ổn, tui hổng đổi đâu nghen!"}"</small>
              </div>
            </div>
          `;
        }

        setTimeout(() => {
          this.hide();
          if (this.onComplete) {
            this.onComplete({
              success: false,
              message: `${partner.name} đã từ chối một đề nghị trao đổi.`,
            });
          }
        }, 2800);
      }
    }, 2200);
  }
}

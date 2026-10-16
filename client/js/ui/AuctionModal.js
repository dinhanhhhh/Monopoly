import { formatVND } from "../../../shared/constants.js";

export class AuctionModal {
  constructor(containerId = "auction-modal-container") {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.id = containerId;
      document.body.appendChild(this.container);
    }
  }

  formatMoney(amount) {
    return formatVND(amount);
  }

  /**
   * Mở hoặc cập nhật giao diện Đấu Giá
   * @param {Object} engine - GameEngine instance
   * @param {Object} auctionState - engine.state.auction
   * @param {Function} onFinish - Callback khi phiên đấu giá kết thúc
   */
  render(engine, onFinish = null, onAction = null) {
    const auction = engine.state.auction;
    if (!auction) {
      this.hide();
      return;
    }

    const {
      tile,
      currentBid,
      highestBidder,
      activePlayerIds,
      currentTurnPlayerId,
    } = auction;
    const highestBidderPlayer = engine.state.players.find(
      (p) => p.id === highestBidder,
    );
    const currentTurnPlayer = engine.state.players.find(
      (p) => p.id === currentTurnPlayerId,
    );

    const tileColor = tile.colorHex || tile.color || "#1F6F8B";
    const isLightColor = [
      "#FFE066",
      "#FFD166",
      "#87CEEB",
      "#06D6A0",
      "#F5CB63",
    ].includes(tileColor);
    const headerTextColor = isLightColor ? "#1E293B" : "#FFFFFF";
    const colorHeader = `background-color: ${tileColor} !important; color: ${headerTextColor} !important; border-bottom: 3px solid #2E241B;`;

    // Danh sách người chơi tham gia
    const playersListHtml = engine.state.players
      .filter((p) => !p.isBankrupt)
      .map((p) => {
        const isActive = activePlayerIds.includes(p.id);
        const isTurn = p.id === currentTurnPlayerId;
        const isLeader = p.id === highestBidder;

        let badge = '<span class="bid-status-pill in">Đang đấu</span>';
        if (!isActive) {
          badge = '<span class="bid-status-pill out">Đã bỏ</span>';
        } else if (isLeader) {
          badge = '<span class="bid-status-pill lead">👑 Dẫn đầu</span>';
        }

        return `
          <div class="bidder-item ${isTurn ? "current-bidder" : ""} ${!isActive ? "folded" : ""}">
            <div class="bidder-info">
              <span class="bidder-token">${p.token?.icon || "🛵"}</span>
              <span class="bidder-name">${p.name}</span>
              <span class="bidder-funds">(${this.formatMoney(p.money)})</span>
            </div>
            ${badge}
          </div>
        `;
      })
      .join("");

    // Nút đặt giá nhanh
    const quickBids = [
      { label: "+100K", val: currentBid + 100_000 },
      { label: "+500K", val: currentBid + 500_000 },
      { label: "+1 Triệu", val: currentBid + 1_000_000 },
    ];

    const canCurrentAfford = (val) =>
      currentTurnPlayer && currentTurnPlayer.money >= val;

    const bidButtonsHtml = quickBids
      .map((b) => {
        const disabled = !canCurrentAfford(b.val) ? "disabled" : "";
        return `
          <button class="btn-bid-action btn-raise" data-amount="${b.val}" ${disabled}>
            ${b.label} <small>(${this.formatMoney(b.val)})</small>
          </button>
        `;
      })
      .join("");

    this.container.innerHTML = `
      <div class="modal-backdrop fade-in" id="auction-backdrop">
        <div class="auction-modal-card pop-in">
          <div class="auction-header" style="${colorHeader}">
            <div class="auction-badge">🔨 PHIÊN ĐẤU GIÁ CÔNG KHAI</div>
            <h2 class="auction-tile-name">${tile.name}</h2>
            <div class="auction-tile-sub">Giá niêm yết: ${this.formatMoney(tile.price)}</div>
          </div>

          <div class="auction-body">
            <!-- Khu vực giá hiện tại -->
            <div class="auction-price-box">
              <div class="price-title">GIÁ THẦU CAO NHẤT HIỆN TẠI</div>
              <div class="price-value">${this.formatMoney(currentBid)}</div>
              <div class="price-leader">
                ${
                  highestBidderPlayer
                    ? `👑 Đang dẫn đầu: <strong>${highestBidderPlayer.name}</strong>`
                    : "Chưa có ai đặt giá"
                }
              </div>
            </div>

            <!-- Danh sách người tham gia -->
            <div class="auction-bidders-list">
              <div class="bidders-title">Danh Sách Người Tham Gia:</div>
              ${playersListHtml}
            </div>

            <!-- Bảng hành động của người đến lượt -->
            <div class="auction-turn-banner">
              Lượt ra giá: <strong style="color: ${currentTurnPlayer?.token?.color || "#FF7A00"}">${currentTurnPlayer?.name || ""}</strong>
            </div>

            <div class="auction-actions">
              <div class="bid-buttons-row">
                ${bidButtonsHtml}
              </div>
              <button id="btn-auction-pass" class="btn-bid-action btn-pass">
                ❌ BỎ CUỘC (Rút khỏi đấu giá)
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Gán sự kiện click nút tăng giá
    this.container.querySelectorAll(".btn-raise").forEach((btn) => {
      btn.onclick = () => {
        const amount = parseInt(btn.getAttribute("data-amount"), 10);
        const res = engine.applyAction({
          type: "BID_AUCTION",
          playerId: currentTurnPlayerId,
          amount,
        });

        if (res.success) {
          if (res.event === "AUCTION_COMPLETED" || !engine.state.auction) {
            this.showResult(res, onFinish);
          } else {
            if (onAction) onAction();
            else this.render(engine, onFinish, onAction);
          }
        }
      };
    });

    // Gán sự kiện nút Bỏ cuộc
    const btnPass = document.getElementById("btn-auction-pass");
    if (btnPass) {
      btnPass.onclick = () => {
        const res = engine.applyAction({
          type: "PASS_AUCTION",
          playerId: currentTurnPlayerId,
        });

        if (res.success) {
          if (
            res.event === "AUCTION_COMPLETED" ||
            res.event === "AUCTION_CANCELLED" ||
            !engine.state.auction
          ) {
            this.showResult(res, onFinish);
          } else {
            if (onAction) onAction();
            else this.render(engine, onFinish, onAction);
          }
        }
      };
    }
  }

  showResult(result, onFinish) {
    const isWinner = result.event === "AUCTION_COMPLETED";
    const title = isWinner ? "🎉 ĐẤU GIÁ THÀNH CÔNG!" : "⛔ ĐÃ HỦY ĐẤU GIÁ";
    const desc = result.message;

    this.container.innerHTML = `
      <div class="modal-backdrop fade-in">
        <div class="auction-result-card pop-in ${isWinner ? "success" : "cancelled"}">
          <div class="result-icon">${isWinner ? "🏆" : "💨"}</div>
          <h2>${title}</h2>
          <p class="result-desc">${desc}</p>
          <button id="btn-close-auction-result" class="btn-modal btn-buy-property">XÁC NHẬN & TIẾP TỤC</button>
        </div>
      </div>
    `;

    const btnClose = document.getElementById("btn-close-auction-result");
    if (btnClose) {
      btnClose.onclick = () => {
        this.hide();
        if (onFinish) onFinish(result);
      };
    }
  }

  hide() {
    this.container.innerHTML = "";
  }
}

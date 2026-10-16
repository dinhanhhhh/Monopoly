import { formatVND } from "../../../shared/constants.js";

export class TitleDeedModal {
  constructor(containerId = "modal-container") {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.id = containerId;
      document.body.appendChild(this.container);
    }
  }

  show(firstArg, secondArg = {}) {
    const tile = firstArg?.id !== undefined ? firstArg : firstArg.tile;
    const opts = firstArg?.id !== undefined ? secondArg || {} : firstArg;

    const {
      owner = null,
      player = null,
      isBuyPrompt = false,
      buyable = false,
      propState = {},
      buildCheck = null,
      mortgageCheck = null,
      unmortgageCheck = null,
      sellCheck = null,
      onBuy = null,
      onDecline = null,
      onBuild = null,
      onSell = null,
      onMortgage = null,
      onUnmortgage = null,
    } = opts;

    const isBuyMode = isBuyPrompt || buyable;
    const isMortgaged = !!propState.isMortgaged;
    const currentHouses = propState.houses || 0;

    const formatMoney = (amount) => formatVND(amount);

    const tileColor =
      tile.colorHex ||
      tile.color ||
      (tile.type === "railroad"
        ? "#4A3B32"
        : tile.type === "utility"
          ? "#0284C7"
          : "#1F6F8B");
    const isLightColor = [
      "#FFE066",
      "#FFD166",
      "#87CEEB",
      "#06D6A0",
      "#F5CB63",
    ].includes(tileColor);
    const headerTextColor = isLightColor ? "#1E293B" : "#FFFFFF";
    const subTextColor = isLightColor
      ? "rgba(30, 41, 59, 0.85)"
      : "rgba(255, 255, 255, 0.9)";
    const colorHeaderStyle = `background-color: ${tileColor} !important; color: ${headerTextColor} !important; border-bottom: 3px solid #2E241B;`;

    const rentMult = Number(opts.rentMult) > 1 ? Number(opts.rentMult) : 1;
    const multNotice =
      rentMult > 1
        ? `<div style="background:#fdedec; border:1px solid #f5b7b1; color:#c0392b; font-weight:700; font-size:0.75rem; padding:4px 6px; border-radius:4px; margin-bottom:6px; text-align:center;">⚡ Bão kinh tế: Tiền thuê thực tế đang tăng ×${rentMult}!</div>`
        : "";

    let rentsHtml = "";
    if (tile.type === "property" && tile.rent) {
      rentsHtml = `
        ${multNotice}
        <div class="deed-rents">
          <div class="rent-row"><span class="rent-label">Tiền thuê đất:</span> <span class="rent-val">${formatMoney(tile.rent[0])}</span></div>
          <div class="rent-row"><span class="rent-label">Với trọn bộ màu (x2):</span> <span class="rent-val">${formatMoney(tile.rent[0] * 2)}</span></div>
          <div class="rent-row ${currentHouses === 1 ? "active-level" : ""}"><span class="rent-label">Với 1 Nhà 🏠:</span> <span class="rent-val">${formatMoney(tile.rent[1])}</span></div>
          <div class="rent-row ${currentHouses === 2 ? "active-level" : ""}"><span class="rent-label">Với 2 Nhà 🏠🏠:</span> <span class="rent-val">${formatMoney(tile.rent[2])}</span></div>
          <div class="rent-row ${currentHouses === 3 ? "active-level" : ""}"><span class="rent-label">Với 3 Nhà 🏠🏠🏠:</span> <span class="rent-val">${formatMoney(tile.rent[3])}</span></div>
          <div class="rent-row ${currentHouses === 4 ? "active-level" : ""}"><span class="rent-label">Với 4 Nhà 🏠🏠🏠🏠:</span> <span class="rent-val">${formatMoney(tile.rent[4])}</span></div>
          <div class="rent-row highlight ${currentHouses === 5 ? "active-level" : ""}"><span class="rent-label">Với Khách Sạn 🏨:</span> <span class="rent-val">${formatMoney(tile.rent[5])}</span></div>
        </div>
        <div class="deed-costs">
          <div>Giá mỗi Ngôi Nhà: <strong>${formatMoney(tile.houseCost)}</strong></div>
          <div>Giá Khách Sạn (4 Nhà +): <strong>${formatMoney(tile.houseCost)}</strong></div>
          <div>Giá Thế Chấp: <strong>${formatMoney(tile.mortgage || tile.price * 0.5)}</strong></div>
        </div>
      `;
    } else if (tile.type === "railroad") {
      rentsHtml = `
        <div class="deed-rents">
          <div class="rent-row"><span class="rent-label">Sở hữu 1 Bến Xe:</span> <span class="rent-val">250k</span></div>
          <div class="rent-row"><span class="rent-label">Sở hữu 2 Bến Xe:</span> <span class="rent-val">500k</span></div>
          <div class="rent-row"><span class="rent-label">Sở hữu 3 Bến Xe:</span> <span class="rent-val">1tr</span></div>
          <div class="rent-row highlight"><span class="rent-label">Sở hữu 4 Bến Xe:</span> <span class="rent-val">2tr</span></div>
        </div>
        <div class="deed-costs">
          <div>Giá Thế Chấp: <strong>${formatMoney(tile.mortgage || tile.price * 0.5)}</strong></div>
        </div>
      `;
    } else if (tile.type === "utility") {
      rentsHtml = `
        <div class="deed-rents">
          <div class="rent-row"><span class="rent-label">Sở hữu 1 Tiện ích:</span> <span class="rent-val">Điểm Xúc xắc × 400k</span></div>
          <div class="rent-row highlight"><span class="rent-label">Sở hữu 2 Tiện ích:</span> <span class="rent-val">Điểm Xúc xắc × 1tr</span></div>
        </div>
        <div class="deed-costs">
          <div>Giá Thế Chấp: <strong>${formatMoney(tile.mortgage || tile.price * 0.5)}</strong></div>
        </div>
      `;
    }

    let ownerInfo =
      '<div class="deed-owner-info unowned">Chưa có chủ sở hữu (Thuộc Ngân Hàng)</div>';
    if (owner) {
      ownerInfo = `<div class="deed-owner-info owned" style="border-left: 4px solid ${tileColor}; background: #F8F9FA;">Chủ sở hữu: <strong>${owner.name}</strong></div>`;
    }

    let mortgageAlert = "";
    if (isMortgaged) {
      mortgageAlert = `
        <div class="deed-mortgage-alert">
          🔒 <strong>Ô ĐẤT ĐANG BỊ THẾ CHẤP!</strong><br>
          <small>Người chơi khác dừng vào không phải trả tiền thuê.</small>
        </div>
      `;
    }

    let actionsHtml = "";
    if (isBuyMode) {
      actionsHtml = `
        <div class="deed-actions">
          <button id="btn-buy-property" class="btn-modal btn-buy-property">MUA NGAY (${formatMoney(tile.price)})</button>
          <button id="btn-decline-property" class="btn-modal btn-decline-property">BỎ QUA / ĐẤU GIÁ</button>
        </div>
      `;
    } else {
      let actionButtons = [];

      // Nút Xây nhà
      if (buildCheck) {
        const isHotel = buildCheck.isHotel;
        const btnText = isHotel
          ? `🏨 NÂNG CẤP KHÁCH SẠN (${formatMoney(buildCheck.cost)})`
          : `🏠 XÂY NHÀ (${formatMoney(buildCheck.cost)})`;
        const disabledAttr = buildCheck.canBuild ? "" : "disabled";
        const reasonTip = !buildCheck.canBuild
          ? `<div class="build-warning-tip">⚠️ ${buildCheck.reason}</div>`
          : "";
        actionButtons.push(`
          ${reasonTip}
          <button id="btn-build-house" class="btn-modal btn-build-house" ${disabledAttr}>${btnText}</button>
        `);
      }

      // Nút Bán bớt nhà
      if (sellCheck && sellCheck.canSell) {
        actionButtons.push(`
          <button id="btn-sell-house" class="btn-modal btn-sell-house">💸 BÁN 1 NHÀ (+${formatMoney(sellCheck.refund)})</button>
        `);
      }

      // Nút Thế chấp
      if (mortgageCheck) {
        if (mortgageCheck.canMortgage) {
          actionButtons.push(`
            <button id="btn-mortgage-property" class="btn-modal btn-mortgage">🔒 THẾ CHẤP (+${formatMoney(mortgageCheck.mortgageValue)})</button>
          `);
        } else if (!isMortgaged && owner && player && owner.id === player.id) {
          actionButtons.push(`
            <div class="build-warning-tip">🔒 Không thể thế chấp: ${mortgageCheck.reason}</div>
          `);
        }
      }

      // Nút Chuộc lại
      if (unmortgageCheck) {
        if (unmortgageCheck.canUnmortgage) {
          actionButtons.push(`
            <button id="btn-unmortgage-property" class="btn-modal btn-unmortgage">🔓 CHUỘC LẠI (-${formatMoney(unmortgageCheck.unmortgageCost)})</button>
          `);
        } else if (isMortgaged && owner && player && owner.id === player.id) {
          actionButtons.push(`
            <div class="build-warning-tip">⚠️ ${unmortgageCheck.reason}</div>
          `);
        }
      }

      actionsHtml = `
        <div class="deed-actions vertical">
          ${actionButtons.join("")}
          <button id="btn-close-deed" class="btn-modal btn-decline-property">ĐÓNG</button>
        </div>
      `;
    }

    this.container.innerHTML = `
      <div class="modal-backdrop fade-in" id="deed-backdrop">
        <div class="title-deed-card pop-in ${isMortgaged ? "card-mortgaged" : ""}">
          <div class="deed-header" style="${colorHeaderStyle}">
            <div class="deed-sub">GIẤY CHỨNG NHẬN QUYỀN SỞ HỮU</div>
            <div class="deed-title">${tile.name}</div>
          </div>
          <div class="deed-body">
            ${mortgageAlert}
            ${ownerInfo}
            ${rentsHtml}
          </div>
          ${actionsHtml}
        </div>
      </div>
    `;

    // Gán sự kiện cho các nút bấm
    const btnBuy = document.getElementById("btn-buy-property");
    const btnDecline = document.getElementById("btn-decline-property");
    const btnClose = document.getElementById("btn-close-deed");
    const btnBuild = document.getElementById("btn-build-house");
    const btnSell = document.getElementById("btn-sell-house");
    const btnMortgage = document.getElementById("btn-mortgage-property");
    const btnUnmortgage = document.getElementById("btn-unmortgage-property");

    if (btnBuy) {
      btnBuy.onclick = () => {
        this.hide();
        if (onBuy) onBuy();
      };
    }
    if (btnDecline) {
      btnDecline.onclick = () => {
        this.hide();
        if (onDecline) onDecline();
      };
    }
    if (btnClose) {
      btnClose.onclick = () => this.hide();
    }
    if (btnBuild) {
      btnBuild.onclick = () => {
        this.hide();
        if (onBuild) onBuild();
      };
    }
    if (btnSell) {
      btnSell.onclick = () => {
        this.hide();
        if (onSell) onSell();
      };
    }
    if (btnMortgage) {
      btnMortgage.onclick = () => {
        this.hide();
        if (onMortgage) onMortgage();
      };
    }
    if (btnUnmortgage) {
      btnUnmortgage.onclick = () => {
        this.hide();
        if (onUnmortgage) onUnmortgage();
      };
    }

    const backdrop = document.getElementById("deed-backdrop");
    if (backdrop && !isBuyMode) {
      backdrop.onclick = (e) => {
        if (e.target === backdrop) this.hide();
      };
    }
  }

  hide() {
    this.container.innerHTML = "";
  }
}

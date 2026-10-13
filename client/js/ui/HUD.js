/**
 * HUD.js - Quản lý hiển thị danh sách 4 thẻ người chơi ở Cột Trái theo chuẩn thiết kế hoài cổ
 */

import { SAIGON_BOARD_DATA } from "../../../shared/data/board-data.js";
import { GameRules } from "../../../shared/rules.js";
import {
  GAME_CONSTANTS,
  formatVND,
  formatVNDFull,
} from "../../../shared/constants.js";
import { getPlayerAvatar } from "../render/AvatarsData.js";

export class HUD {
  constructor(container = null) {
    this.container = container || document.getElementById("sidebar-left");
    this.lastState = null;
  }

  renderPlayerCard(p, idx, state) {
    const { currentTurnIndex, properties } = state;
    const isActive = idx === currentTurnIndex;
    const netWorth = GameRules.calculateNetWorth(p, properties);
    const ownedTiles = SAIGON_BOARD_DATA.filter(
      (tile) => properties[tile.id]?.owner === p.id,
    );
    const avatarInfo = getPlayerAvatar(p.id, idx);

    // Hàng chip nhỏ theo màu nhóm đất người đó đang sở hữu (mỗi chip kèm số ô)
    const groupCountMap = {};
    ownedTiles.forEach((tile) => {
      let gKey = tile.group;
      let gColor = tile.colorHex;
      let gName = tile.name;

      if (tile.type === "railroad") {
        gKey = "railroad";
        gColor = "#4A3B32";
        gName = "Bến xe";
      } else if (tile.type === "utility") {
        gKey = "utility";
        gColor = "#0284C7";
        gName = "Tiện ích";
      } else if (
        tile.group &&
        GAME_CONSTANTS.COLOR_GROUPS[tile.group.toUpperCase()]
      ) {
        gColor = GAME_CONSTANTS.COLOR_GROUPS[tile.group.toUpperCase()].hex;
        gName = GAME_CONSTANTS.COLOR_GROUPS[tile.group.toUpperCase()].name;
      }

      if (!groupCountMap[gKey]) {
        groupCountMap[gKey] = { color: gColor, count: 0, name: gName };
      }
      groupCountMap[gKey].count++;
    });

    const chipsHtml = Object.values(groupCountMap)
      .map(
        (g) => `
        <span class="player-color-chip" title="${g.name}: ${g.count} ô">
          <span class="chip-color-dot" style="background-color: ${g.color};"></span>
          <span class="chip-count-num">${g.count}</span>
        </span>
      `,
      )
      .join("");

    // Nhãn trạng thái ở góc thẻ
    let statusBadge = "";
    if (p.isBankrupt) {
      statusBadge = '<span class="player-badge badge-bankrupt">Phá sản</span>';
    } else if (p.inJail) {
      statusBadge = '<span class="player-badge badge-jail">Ở tù</span>';
    } else if (isActive) {
      statusBadge = '<span class="player-badge badge-playing">Đang chơi</span>';
    }

    return `
      <div id="hud-player-${p.id}" class="player-card ${p.isBankrupt ? "is-bankrupt" : ""} ${isActive ? "active-player" : ""} ${p.isBot ? "is-bot" : ""}" data-player-id="${p.id}">
        ${statusBadge}

        <!-- Avatar tròn minh họa phong cách Sài Gòn -->
        <div class="player-avatar-box">
          ${avatarInfo.svg}
        </div>

        <!-- Thông tin trung tâm: Tên, Tiền mặt to, Tài sản rút gọn & Hàng chip nhóm đất -->
        <div class="player-card-main">
          <div class="player-name-row">
            <span class="player-display-name" title="${p.name}">${p.name}</span>
          </div>
          <div class="player-cash-amount">
            ${formatVNDFull(p.money)}
          </div>
          <div class="player-networth-row">
            <span>${formatVND(netWorth)}</span>
            <span class="dot-separator">•</span>
            <span>${ownedTiles.length} BĐS</span>
          </div>
          <div class="player-color-chips-row">
            ${chipsHtml}
          </div>
        </div>

        <!-- Icon quân cờ nhỏ của người chơi bên phải -->
        <div class="player-token-badge" title="${p.token?.name || "Quân cờ"}">
          ${p.token?.svg || ""}
        </div>
      </div>
    `;
  }

  highlightPlayerProperties(playerId, playerColor) {
    if (!this.lastState) return;
    const { properties = {} } = this.lastState;
    const allTiles = document.querySelectorAll(".board-tile");
    allTiles.forEach((tileEl) => {
      const tileId = tileEl.dataset.id;
      if (properties[tileId]?.owner === playerId) {
        tileEl.classList.add("tile-highlight-owner");
        tileEl.classList.remove("tile-dimmed");
        tileEl.style.setProperty("--glow-color", playerColor);
      } else {
        tileEl.classList.add("tile-dimmed");
        tileEl.classList.remove("tile-highlight-owner");
      }
    });
  }

  clearHighlightProperties() {
    const allTiles = document.querySelectorAll(".board-tile");
    allTiles.forEach((tileEl) => {
      tileEl.classList.remove("tile-highlight-owner", "tile-dimmed");
      tileEl.style.removeProperty("--glow-color");
    });
  }

  update(state, onPlayerClick = null) {
    if (!this.container)
      this.container = document.getElementById("sidebar-left");
    if (!this.container) return;

    this.lastState = state;

    if (onPlayerClick) {
      this.onPlayerClick = onPlayerClick;
    }

    const { players } = state;
    this.container.innerHTML = players
      .map((p, idx) => this.renderPlayerCard(p, idx, state))
      .join("");

    // Gắn sự kiện click mở danh mục tài sản và hover phát sáng các ô đất
    players.forEach((p) => {
      const cardEl = document.getElementById(`hud-player-${p.id}`);
      if (!cardEl) return;

      if (this.onPlayerClick) {
        cardEl.title = `Bấm để xem danh mục tài sản của ${p.name}`;
        cardEl.addEventListener("click", () => {
          this.onPlayerClick(p);
        });
      }

      const pColor = p.token?.color || "#7B4BD8";
      const activateHighlight = () =>
        this.highlightPlayerProperties(p.id, pColor);
      const clearHighlight = () => this.clearHighlightProperties();

      cardEl.addEventListener("mouseenter", activateHighlight);
      cardEl.addEventListener("mouseleave", clearHighlight);
      cardEl.addEventListener("touchstart", activateHighlight, {
        passive: true,
      });
      cardEl.addEventListener("touchend", clearHighlight, { passive: true });
    });
  }
}

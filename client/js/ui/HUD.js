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
    this.container =
      container ||
      document.getElementById("leaderboard-list") ||
      document.getElementById("sidebar-left");
    this.lastState = null;
  }

  renderPlayerCard(p, origIdx, rankIdx, state, nextTurnIndex = -1) {
    const { currentTurnIndex = 0, properties = {} } = state;
    const isGameOver = !!state.isGameOver;
    const isWinner = isGameOver && state.winner?.id === p.id;
    const isActive = !isGameOver && origIdx === currentTurnIndex;
    const isNext = !isGameOver && origIdx === nextTurnIndex && !p.isBankrupt && !isActive;
    const netWorth = GameRules.calculateNetWorth(p, properties);
    const ownedTiles = SAIGON_BOARD_DATA.filter(
      (tile) => properties[tile.id]?.owner === p.id,
    );
    const avatarInfo = getPlayerAvatar(p.id, origIdx);
    const isLowCash = p.money < 500000 && !p.isBankrupt;

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

    // Huy hiệu thứ hạng trên bảng xếp hạng (🥇🥈🥉 #4)
    let rankBadge = "";
    if (p.isBankrupt) {
      rankBadge = `<div class="lb-rank-badge rank-bankrupt" title="Đã phá sản"><span class="rank-txt">💀</span></div>`;
    } else if (rankIdx === 0) {
      rankBadge = `<div class="lb-rank-badge rank-1" title="Hạng 1: Giàu nhất Sài Gòn"><span class="rank-medal">🥇</span><span class="rank-txt">#1</span></div>`;
    } else if (rankIdx === 1) {
      rankBadge = `<div class="lb-rank-badge rank-2" title="Hạng 2"><span class="rank-medal">🥈</span><span class="rank-txt">#2</span></div>`;
    } else if (rankIdx === 2) {
      rankBadge = `<div class="lb-rank-badge rank-3" title="Hạng 3"><span class="rank-medal">🥉</span><span class="rank-txt">#3</span></div>`;
    } else {
      rankBadge = `<div class="lb-rank-badge rank-4" title="Hạng 4"><span class="rank-txt">#4</span></div>`;
    }

    // Nhãn trạng thái nổi bật ở góc thẻ (hỗ trợ hiển thị song song Ở tù và Lượt đi / Lượt tới)
    const badges = [];
    if (p.isBankrupt) {
      badges.push('<span class="player-badge badge-bankrupt">Phá sản</span>');
    } else {
      if (p.inJail) {
        badges.push('<span class="player-badge badge-jail">🚨 Ở tù</span>');
      }
      if (isWinner) {
        badges.push(
          '<span class="player-badge badge-winner" style="background:#f39c12;color:#fff;">👑 Quán quân</span>',
        );
      } else if (isActive) {
        badges.push(
          '<span class="player-badge badge-playing">🎯 Lượt đi</span>',
        );
      } else if (isNext) {
        badges.push(
          '<span class="player-badge badge-next-turn">⏭️ Lượt tới</span>',
        );
      } else if (isLowCash) {
        badges.push(
          '<span class="player-badge badge-low-cash">⚠️ Cạn tiền</span>',
        );
      }
    }

    const statusBadge =
      badges.length > 0
        ? `<div class="player-badges-cluster">${badges.join("")}</div>`
        : "";

    return `
      <div id="hud-player-${p.id}" class="player-card lb-card ${p.isBankrupt ? "is-bankrupt" : ""} ${isActive ? "active-player" : ""} ${isNext ? "next-turn-player" : ""} ${isLowCash ? "is-low-cash" : ""} ${p.isBot ? "is-bot" : ""}" data-player-id="${p.id}" data-rank="${rankIdx + 1}">
        ${statusBadge}

        <!-- Cụm Avatar kèm Huy hiệu thứ hạng Leaderboard đính góc trên -->
        <div class="player-avatar-wrap">
          <div class="player-avatar-box">
            ${avatarInfo.svg}
          </div>
          ${rankBadge}
        </div>

        <!-- Thông tin trung tâm: Tên, Tiền mặt to, Tài sản rút gọn & Hàng chip nhóm đất -->
        <div class="player-card-main">
          <div class="player-name-row">
            <span class="player-display-name" title="${p.name}">${p.name}</span>
          </div>
          <div class="player-cash-amount ${isLowCash ? "text-danger-cash" : ""}">
            ${formatVNDFull(p.money)}
          </div>
          <div class="player-networth-row">
            <span class="networth-tag" title="Tổng tài sản ròng">TS: ${formatVND(netWorth)}</span>
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
    if (!this.container || !document.body.contains(this.container)) {
      this.container =
        document.getElementById("leaderboard-list") ||
        document.getElementById("sidebar-left");
    }
    if (!this.container) return;

    this.lastState = state;

    if (onPlayerClick) {
      this.onPlayerClick = onPlayerClick;
    }

    const { players, properties = {}, currentTurnIndex = 0 } = state;

    // Tìm người chơi tiếp theo theo vòng tua (bỏ qua người đã phá sản)
    let nextTurnIndex = (currentTurnIndex + 1) % players.length;
    let attempts = 0;
    while (players[nextTurnIndex]?.isBankrupt && attempts < players.length) {
      nextTurnIndex = (nextTurnIndex + 1) % players.length;
      attempts++;
    }

    // Sắp xếp tự động 4 người chơi theo thứ tự Net Worth giảm dần để thành Leaderboard
    const rankedPlayers = players.map((p, origIdx) => {
      const netWorth = GameRules.calculateNetWorth(p, properties);
      return { p, origIdx, netWorth };
    });

    rankedPlayers.sort((a, b) =>
      GameRules.comparePlayersNetWorth(a.p, b.p, properties),
    );

    const cardsHtml = rankedPlayers
      .map((item, rankIdx) =>
        this.renderPlayerCard(
          item.p,
          item.origIdx,
          rankIdx,
          state,
          nextTurnIndex,
        ),
      )
      .join("");

    const existingList =
      this.container.id === "leaderboard-list"
        ? this.container
        : this.container.querySelector("#leaderboard-list");

    if (existingList) {
      existingList.innerHTML = cardsHtml;
    } else {
      this.container.innerHTML = `
        <div class="leaderboard-header">
          <div class="leaderboard-title-box">
            <span class="lb-trophy">🏆</span>
            <span class="lb-title">BẢNG XẾP HẠNG</span>
          </div>
          <div class="leaderboard-sub">Tài sản ròng (Net Worth)</div>
        </div>
        <div class="leaderboard-list" id="leaderboard-list">
          ${cardsHtml}
        </div>
      `;
    }

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

  /**
   * Hiển thị bong bóng cảm xúc (Emotes) trên thẻ người chơi ở HUD Cột Trái
   */
  showEmote(playerId, emoji, duration = 2600) {
    const cardEl = document.getElementById(`hud-player-${playerId}`);
    if (!cardEl) return;
    const avatarBox = cardEl.querySelector(".player-avatar-box") || cardEl;

    const existingOld = avatarBox.querySelector(".hud-emote-bubble");
    if (existingOld) existingOld.remove();

    const bubble = document.createElement("div");
    bubble.className = "hud-emote-bubble";
    bubble.innerHTML = `<span class="emote-glyph">${emoji}</span>`;
    avatarBox.appendChild(bubble);

    setTimeout(() => {
      bubble.classList.add("fade-out");
      setTimeout(() => bubble.remove(), 420);
    }, duration);
  }
}

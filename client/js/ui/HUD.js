/**
 * HUD.js - Quản lý hiển thị các thẻ người chơi theo chuẩn Cockpit Dashboard 2 bên sườn
 */

import { SAIGON_BOARD_DATA } from '../../../shared/data/board-data.js';
import { GameRules } from '../../../shared/rules.js';

export class HUD {
  constructor(leftContainer = null, rightContainer = null) {
    this.leftContainer = leftContainer || document.getElementById('sidebar-left');
    this.rightContainer = rightContainer || document.getElementById('sidebar-right');
  }

  formatMoney(amount) {
    if (!amount && amount !== 0) return '0đ';
    if (amount >= 1_000_000) {
      const m = amount / 1_000_000;
      return Number.isInteger(m) ? `${m}.0M` : `${m.toFixed(1)}M`;
    }
    if (amount >= 1_000) {
      return `${Math.round(amount / 1_000)}K`;
    }
    return `${amount}đ`;
  }

  getPlayerTitle(player, idx) {
    if (idx === 0) return 'Đại Gia Sài Gòn';
    if (player.isBot) return 'Nhà Đầu Tư AI';
    return 'Thương Gia Thành Phố';
  }

  renderPlayerCard(p, idx, state) {
    const { currentTurnIndex, properties } = state;
    const isActive = idx === currentTurnIndex;
    const netWorth = GameRules.calculateNetWorth(p, properties);

    // Lọc danh sách đất sở hữu
    const ownedTiles = SAIGON_BOARD_DATA.filter((tile) => properties[tile.id]?.owner === p.id);

    // Render danh sách chip đất (tối đa 3 chip)
    const chipsHtml = ownedTiles.slice(0, 3).map((tile) => {
      const prop = properties[tile.id] || {};
      const houseIcon = prop.houses === 5 ? '🏨' : (prop.houses > 0 ? `🏠${prop.houses}` : '');
      return `
        <span class="prop-chip" style="background: ${tile.color || '#475569'}" title="${tile.name}">
          ${tile.name.split(' ').slice(-1)[0]} ${houseIcon}
        </span>
      `;
    }).join('');

    const moreChipsCount = ownedTiles.length > 3 ? `<span class="prop-chip-more">+${ownedTiles.length - 3}</span>` : '';

    // Trạng thái lượt
    let turnTag = '<span class="cockpit-turn-tag turn-waiting">Đang chờ...</span>';
    if (p.isBankrupt) {
      turnTag = '<span class="cockpit-turn-tag turn-danger">💀 Phá Sản</span>';
    } else if (p.inJail) {
      turnTag = '<span class="cockpit-turn-tag turn-danger">🚨 Ở Tù</span>';
    } else if (isActive) {
      turnTag = '<span class="cockpit-turn-tag turn-active">👑 LƯỢT ĐI</span>';
    }

    const currentTile = SAIGON_BOARD_DATA[p.position] || SAIGON_BOARD_DATA[0];

    return `
      <div id="hud-player-${p.id}" class="player-cockpit-card ${isActive ? 'active-turn' : ''} ${p.isBot ? 'is-bot' : ''}">
        <div class="player-card-top-row">
          <div class="player-card-identity">
            <div class="cockpit-avatar" style="border-color: ${p.token?.color || '#333'}; background-color: ${p.token?.bgColor || '#EEE'};">
              <div class="token-svg">${p.token?.svg || '🛵'}</div>
            </div>
            <div class="cockpit-info">
              <span class="cockpit-name" title="${p.name}">${p.isBot ? '🤖 ' : ''}${p.name}</span>
              <span class="cockpit-title">${this.getPlayerTitle(p, idx)}</span>
            </div>
          </div>
          ${turnTag}
        </div>

        <div class="cockpit-financial-box">
          <div class="financial-item">
            <span class="fin-label">TIỀN MẶT</span>
            <span class="fin-value cash">${this.formatMoney(p.money)}</span>
          </div>
          <div class="financial-item">
            <span class="fin-label">TỔNG TÀI SẢN</span>
            <span class="fin-value">${this.formatMoney(netWorth)}</span>
          </div>
        </div>

        <div class="cockpit-properties-bar">
          ${chipsHtml || '<span style="font-size: 0.6rem; color: #94A3B8;">Chưa có BĐS</span>'}
          ${moreChipsCount}
        </div>

        <div class="cockpit-position-row">
          <span>Vị trí: <strong>${currentTile.name}</strong></span>
          <span>Sở hữu: <strong>${ownedTiles.length} BĐS</strong></span>
        </div>
      </div>
    `;
  }

  update(state) {
    const listWrapper = document.getElementById('players-list-wrapper') || this.leftContainer;
    if (!listWrapper) return;

    const { players } = state;

    // Render toàn bộ người chơi xếp dọc ở sidebar bên trái
    listWrapper.innerHTML = players
      .map((p, idx) => this.renderPlayerCard(p, idx, state))
      .join('');

    if (this.rightContainer) {
      this.rightContainer.style.display = 'none';
    }
  }
}

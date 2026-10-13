/**
 * PortfolioModal.js - Bảng Danh Mục Tài Sản (Portfolio / Net Worth Breakdown)
 * Hiển thị chi tiết tài sản ròng, phân nhóm đất theo bộ màu, số nhà/khách sạn và trạng thái thế chấp
 */

import { SAIGON_BOARD_DATA } from '../../../shared/data/board-data.js';
import { GAME_CONSTANTS, formatVND, formatVNDFull } from '../../../shared/constants.js';
import { GameRules } from '../../../shared/rules.js';
import { getPlayerAvatar } from '../render/AvatarsData.js';

export class PortfolioModal {
  constructor(containerId = 'modal-container') {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = containerId;
      document.body.appendChild(this.container);
    }
  }

  show(player, engineState, onTileClick = null) {
    if (!player || !engineState) return;

    const { properties = {}, players = [] } = engineState;
    const playerIdx = players.findIndex((p) => p.id === player.id);
    const avatarInfo = getPlayerAvatar(player.id, playerIdx >= 0 ? playerIdx : 0);

    // 1. Phân loại và gom nhóm BĐS thuộc sở hữu của người chơi
    const ownedTiles = SAIGON_BOARD_DATA.filter(
      (tile) => properties[tile.id]?.owner === player.id
    );

    // Tính toán chi tiết giá trị tài sản
    let totalLandValue = 0;
    let totalBuildingValue = 0;
    let totalMortgagedCount = 0;

    ownedTiles.forEach((tile) => {
      totalLandValue += tile.price || 0;
      const prop = properties[tile.id] || {};
      if (prop.houses > 0 && tile.houseCost) {
        totalBuildingValue += prop.houses * tile.houseCost;
      }
      if (prop.isMortgaged) {
        totalMortgagedCount++;
      }
    });

    const netWorth = GameRules.calculateNetWorth(player, properties);

    // 2. Gom nhóm tài sản theo nhóm màu / bến xe / tiện ích
    const groupOrder = [
      'BROWN', 'LIGHT_BLUE', 'PINK', 'ORANGE',
      'RED', 'YELLOW', 'GREEN', 'DARK_BLUE',
      'RAILROAD', 'UTILITY'
    ];

    const groupedHoldings = [];

    // Nhóm đất phố thường
    Object.entries(GAME_CONSTANTS.COLOR_GROUPS).forEach(([groupKey, groupDef]) => {
      const allGroupTiles = SAIGON_BOARD_DATA.filter((t) => t.group === groupDef.id);
      const playerGroupTiles = ownedTiles.filter((t) => t.group === groupDef.id);

      if (playerGroupTiles.length > 0) {
        const isMonopoly = playerGroupTiles.length === allGroupTiles.length;
        groupedHoldings.push({
          key: groupKey,
          name: groupDef.name,
          colorHex: groupDef.colorHex,
          isMonopoly,
          count: playerGroupTiles.length,
          total: allGroupTiles.length,
          tiles: playerGroupTiles
        });
      }
    });

    // Nhóm Bến Xe / Ga Tàu
    const allRailroads = SAIGON_BOARD_DATA.filter((t) => t.type === 'railroad');
    const playerRailroads = ownedTiles.filter((t) => t.type === 'railroad');
    if (playerRailroads.length > 0) {
      groupedHoldings.push({
        key: 'RAILROAD',
        name: 'Bến Xe & Cảng Biển',
        colorHex: '#4A3B32',
        isMonopoly: playerRailroads.length === allRailroads.length,
        count: playerRailroads.length,
        total: allRailroads.length,
        tiles: playerRailroads
      });
    }

    // Nhóm Tiện Ích (Điện / Nước)
    const allUtilities = SAIGON_BOARD_DATA.filter((t) => t.type === 'utility');
    const playerUtilities = ownedTiles.filter((t) => t.type === 'utility');
    if (playerUtilities.length > 0) {
      groupedHoldings.push({
        key: 'UTILITY',
        name: 'Công Ty Tiện Ích',
        colorHex: '#0284C7',
        isMonopoly: playerUtilities.length === allUtilities.length,
        count: playerUtilities.length,
        total: allUtilities.length,
        tiles: playerUtilities
      });
    }

    // Trạng thái người chơi
    let statusBadgeText = 'Đang thi đấu';
    let statusBadgeClass = 'badge-active';
    if (player.isBankrupt) {
      statusBadgeText = 'Đã phá sản';
      statusBadgeClass = 'badge-bankrupt';
    } else if (player.inJail) {
      statusBadgeText = 'Đang ở tù';
      statusBadgeClass = 'badge-jail';
    }

    // HTML Danh sách tài sản
    let holdingsHtml = '';
    if (ownedTiles.length === 0) {
      holdingsHtml = `
        <div class="portfolio-empty-state">
          <div class="empty-icon">🏙️</div>
          <div class="empty-title">Chưa sở hữu bất động sản nào</div>
          <div class="empty-desc">Người chơi đang gom tiền mặt để chuẩn bị đầu tư nhà đất Sài Gòn.</div>
        </div>
      `;
    } else {
      holdingsHtml = groupedHoldings
        .map((group) => {
          const tilesHtml = group.tiles
            .map((tile) => {
              const prop = properties[tile.id] || {};
              const houses = prop.houses || 0;
              const isMortgaged = !!prop.isMortgaged;

              // Tính tiền thuê hiện tại
              let rentDisplay = '';
              if (isMortgaged) {
                rentDisplay = '<span class="tile-rent-val val-mortgaged">0đ (Thế chấp)</span>';
              } else if (tile.type === 'utility') {
                const factor = group.count >= 2 ? 10 : 4;
                rentDisplay = `<span class="tile-rent-val">×${factor} Nút xúc xắc</span>`;
              } else {
                const currentRent = GameRules.calculateRent(tile, player, properties, 7);
                rentDisplay = `<span class="tile-rent-val">${formatVND(currentRent)}</span>`;
              }

              // Nhãn nhà / khách sạn
              let houseBadge = '';
              if (tile.type === 'property') {
                if (houses === 5) {
                  houseBadge = '<span class="prop-house-tag tag-hotel">🏨 Khách sạn</span>';
                } else if (houses > 0) {
                  houseBadge = `<span class="prop-house-tag tag-houses">${'🏠'.repeat(houses)} (${houses} nhà)</span>`;
                } else {
                  houseBadge = '<span class="prop-house-tag tag-empty">Đất trống</span>';
                }
              }

              return `
                <div class="portfolio-tile-item ${isMortgaged ? 'is-mortgaged' : ''}" data-tile-id="${tile.id}">
                  <div class="tile-color-indicator" style="background-color: ${tile.colorHex || group.colorHex};"></div>
                  <div class="tile-info-col">
                    <div class="tile-name-row">
                      <span class="tile-name-title">${tile.name}</span>
                      ${isMortgaged ? '<span class="badge-mortgage-tag">🔒 Cầm sổ</span>' : ''}
                    </div>
                    <div class="tile-meta-row">
                      <span class="tile-price-tag">Giá: ${formatVND(tile.price)}</span>
                      <span class="tile-bullet">•</span>
                      <span class="tile-rent-label">Tiền thuê: ${rentDisplay}</span>
                    </div>
                  </div>
                  <div class="tile-action-col">
                    ${houseBadge}
                    <button class="btn-inspect-deed" title="Xem Bằng Khoán">📄</button>
                  </div>
                </div>
              `;
            })
            .join('');

          return `
            <div class="portfolio-group-box">
              <div class="group-header">
                <div class="group-color-pill" style="background-color: ${group.colorHex};"></div>
                <div class="group-title">${group.name}</div>
                <div class="group-badge ${group.isMonopoly ? 'is-monopoly' : ''}">
                  ${group.isMonopoly ? '🏆 Đủ bộ màu' : `${group.count}/${group.total}`}
                </div>
              </div>
              <div class="group-tiles-list">
                ${tilesHtml}
              </div>
            </div>
          `;
        })
        .join('');
    }

    // Modal Markup
    this.container.innerHTML = `
      <div class="modal-backdrop portfolio-modal-backdrop" id="portfolio-modal-overlay">
        <div class="portfolio-modal-card">
          <!-- Header: Avatar + Tên + Nút Đóng -->
          <div class="portfolio-header">
            <div class="portfolio-player-info">
              <div class="portfolio-avatar-wrap">
                ${avatarInfo.svg}
              </div>
              <div class="portfolio-player-titles">
                <div class="player-name-heading">
                  <h3>${player.name}</h3>
                  <span class="player-type-pill ${player.isBot ? 'bot-pill' : 'human-pill'}">
                    ${player.isBot ? '🤖 AI Bot' : '👤 Người chơi'}
                  </span>
                  <span class="player-status-tag ${statusBadgeClass}">${statusBadgeText}</span>
                </div>
                <div class="player-token-row">
                  <span>Quân cờ đại diện:</span>
                  <span class="token-name-text"><strong>${player.token?.name || 'Quân cờ'}</strong></span>
                </div>
              </div>
            </div>
            <button class="portfolio-close-btn" id="btn-close-portfolio" title="Đóng danh mục">✕</button>
          </div>

          <!-- Financial Overview Dashboard -->
          <div class="portfolio-metrics-grid">
            <div class="metric-card metric-cash">
              <div class="metric-label">💵 Tiền Mặt</div>
              <div class="metric-value">${formatVNDFull(player.money)}</div>
              <div class="metric-sub">Thanh khoản tức thì</div>
            </div>
            <div class="metric-card metric-land">
              <div class="metric-label">🏛️ Giá Trị Đất</div>
              <div class="metric-value">${formatVND(totalLandValue)}</div>
              <div class="metric-sub">${ownedTiles.length} Bất động sản</div>
            </div>
            <div class="metric-card metric-buildings">
              <div class="metric-label">🏠 Công Trình</div>
              <div class="metric-value">${formatVND(totalBuildingValue)}</div>
              <div class="metric-sub">Nhà phố & Khách sạn</div>
            </div>
            <div class="metric-card metric-networth">
              <div class="metric-label">💎 Tài Sản Ròng</div>
              <div class="metric-value highlight">${formatVNDFull(netWorth)}</div>
              <div class="metric-sub">Tổng giá trị quy đổi</div>
            </div>
          </div>

          <!-- Holdings Section -->
          <div class="portfolio-section-title">
            <span>Danh mục Bất động sản (${ownedTiles.length} ô)</span>
            ${totalMortgagedCount > 0 ? `<span class="mortgaged-alert-count">⚠️ Có ${totalMortgagedCount} ô đang thế chấp</span>` : ''}
          </div>

          <div class="portfolio-holdings-scroll">
            ${holdingsHtml}
          </div>

          <!-- Footer -->
          <div class="portfolio-footer">
            <span class="footer-tip-text">💡 Bấm vào ô đất bất kỳ để xem chi tiết Bằng Khoán & nâng cấp nhà.</span>
            <button class="btn-portfolio-confirm" id="btn-portfolio-ok">Đóng bảng</button>
          </div>
        </div>
      </div>
    `;

    // 3. Gán sự kiện đóng và click BĐS
    const closeBtn = document.getElementById('btn-close-portfolio');
    const okBtn = document.getElementById('btn-portfolio-ok');
    const backdrop = document.getElementById('portfolio-modal-overlay');

    const handleClose = () => this.hide();
    if (closeBtn) closeBtn.onclick = handleClose;
    if (okBtn) okBtn.onclick = handleClose;
    if (backdrop) {
      backdrop.onclick = (e) => {
        if (e.target === backdrop) handleClose();
      };
    }

    // Sự kiện bàn phím Escape
    this.escHandler = (e) => {
      if (e.key === 'Escape') this.hide();
    };
    window.addEventListener('keydown', this.escHandler);

    // Gán click vào từng thẻ ô đất để mở Title Deed Modal
    const tileItems = this.container.querySelectorAll('.portfolio-tile-item');
    tileItems.forEach((item) => {
      item.addEventListener('click', () => {
        const tileId = parseInt(item.dataset.tileId, 10);
        const tile = SAIGON_BOARD_DATA.find((t) => t.id === tileId);
        if (tile && onTileClick) {
          this.hide();
          onTileClick(tile, player);
        }
      });
    });
  }

  hide() {
    if (this.escHandler) {
      window.removeEventListener('keydown', this.escHandler);
      this.escHandler = null;
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

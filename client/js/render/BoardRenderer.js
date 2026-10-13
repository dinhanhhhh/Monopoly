/**
 * BoardRenderer.js - Vẽ 40 ô cờ, cắm cờ chủ quyền & render Nhà Xanh / Khách Sạn Đỏ
 */

export class BoardRenderer {
  constructor(boardElement) {
    this.board = boardElement;
  }

  getGridCoordinates(id) {
    if (id === 0) return { row: 11, col: 11, edge: 'corner' };
    if (id >= 1 && id <= 9) return { row: 11, col: 11 - id, edge: 'bottom' };
    if (id === 10) return { row: 11, col: 1, edge: 'corner' };
    if (id >= 11 && id <= 19) return { row: 21 - id, col: 1, edge: 'left' };
    if (id === 20) return { row: 1, col: 1, edge: 'corner' };
    if (id >= 21 && id <= 29) return { row: 1, col: id - 19, edge: 'top' };
    if (id === 30) return { row: 1, col: 11, edge: 'corner' };
    if (id >= 31 && id <= 39) return { row: id - 29, col: 11, edge: 'right' };
    return { row: 1, col: 1, edge: 'center' };
  }

  formatMoney(amount) {
    if (!amount) return '';
    if (amount >= 1_000_000) {
      const millions = amount / 1_000_000;
      return Number.isInteger(millions) ? `${millions}M` : `${millions.toFixed(1)}M`;
    }
    if (amount >= 1_000) {
      return `${amount / 1_000}K`;
    }
    return `${amount}đ`;
  }

  getDefaultIcon(tile) {
    if (tile.icon) return tile.icon;
    // Bảng icon độc nhất cho từng ô cờ Sài Gòn, không ô nào bị trùng lặp
    const uniqueIcons = {
      0: '🚩',  // Khởi Hành
      1: '🛵',  // Bến Vân Đồn (xe tay ga ven kênh)
      2: '🧧',  // Khí Vận
      3: '🌳',  // Đường Hoàng Sa (hàng cây kênh Nhiêu Lộc)
      4: '💸',  // Thuế Thu Nhập
      5: '🚌',  // Bến Xe Miền Đông
      6: '🚩',  // Cách Mạng Tháng 8 (cờ cách mạng)
      7: '❓',  // Cơ Hội
      8: '🥖',  // Hai Bà Trưng (bánh mì Như Lan)
      9: '🏛️',  // Nam Kỳ Khởi Nghĩa (Dinh Độc Lập)
      10: '🚔', // Thăm Tù / Đi Tù
      11: '🧪', // Đường Pasteur (Viện Pasteur y tế)
      12: '⚡', // Điện Lực EVNHCMC
      13: '🎸', // Điện Biên Phủ (phố nhạc cụ guitar)
      14: '🌸', // Võ Thị Sáu (hoa lê ki ma)
      15: '🚆', // Ga Sài Gòn (đường sắt tàu hỏa)
      16: '🍻', // Phố Tây Bùi Viện (phố bia sôi động)
      17: '🧧', // Khí Vận
      18: '🎒', // Phạm Ngũ Lão (phố tây ba-lô)
      19: '☕', // Đường Đề Thám (cà phê cóc Sài Gòn)
      20: '🅿️', // Bãi Xe Miễn Phí
      21: '🏫', // Nguyễn Thị Minh Khai (trường học danh tiếng)
      22: '❓', // Cơ Hội
      23: '🌴', // Đường Lê Duẩn (đại lộ rợp bóng me)
      24: '🚢', // Tôn Đức Thắng (Bến Bạch Đằng / Ba Son)
      25: '🚍', // Bến Xe Miền Tây
      26: '🚇', // Đường Lê Lợi (tuyến Metro Bến Thành)
      27: '🏦', // Đường Hàm Nghi (phố ngân hàng tài chính)
      28: '🚰', // Cấp Nước Sawaco
      29: '💎', // Đường Đồng Khởi (con đường hàng hiệu xa xỉ)
      30: '👮', // Vào Tù
      31: '🕒', // Chợ Bến Thành (tháp đồng hồ Bến Thành)
      32: '👗', // Đường Nguyễn Trãi (thiên đường thời trang)
      33: '🧧', // Khí Vận
      34: '💻', // Huỳnh Thúc Kháng (phố điện tử công nghệ)
      35: '⚓', // Cảng Sài Gòn (bến cảng Nhà Rồng)
      36: '❓', // Cơ Hội
      37: '🌉', // Khu Đô Thị Thủ Thiêm (cầu Ba Son)
      38: '👑', // Thuế Tiêu Thụ
      39: '🏙️', // Phố Đi Bộ Nguyễn Huệ (Bitexco hoa lệ)
    };
    return uniqueIcons[tile.id] || '📍';
  }

  getShortTileName(name) {
    if (!name) return '';
    const clean = name.replace(/^Đường\s+/i, '');
    const map = {
      'Nguyễn Thị Minh Khai': 'Minh Khai',
      'Phố Đi Bộ Nguyễn Huệ': 'Nguyễn Huệ',
      'Chợ Bến Thành': 'Bến Thành',
      'Phố Tây Bùi Viện': 'Bùi Viện',
      'Khu Đô Thị Thủ Thiêm': 'Thủ Thiêm',
      'Điện Lực EVNHCMC': 'Điện Lực',
      'Cấp Nước Sawaco': 'Sawaco',
      'Bến Xe Miền Đông': 'BX M.Đông',
      'Bến Xe Miền Tây': 'BX M.Tây',
      'Cách Mạng Tháng 8': 'CMT8',
      'Nam Kỳ Khởi Nghĩa': 'Nam Kỳ KN',
      'Huỳnh Thúc Kháng': 'H.Thúc Kháng',
      'Điện Biên Phủ': 'Điện Biên Phủ',
      'Cảng Sài Gòn': 'Cảng SG',
      'Thuế Thu Nhập': 'Thuế TN',
      'Thuế Tiêu Thụ': 'Thuế TT',
      'Bãi Xe Miễn Phí': 'Bãi Xe P',
      'Khởi Hành': 'Khởi Hành',
    };
    return map[name] || clean;
  }

  getSpecialColor(tile) {
    switch (tile.type) {
      case 'chance': return '#FF9F1C';
      case 'chest': return '#1A5276';
      case 'railroad': return '#34495E';
      case 'utility': return '#F39C12';
      case 'tax': return '#8E44AD';
      default: return '#7F8C8D';
    }
  }

  render(boardData, onTileClick = null) {
    boardData.forEach((tile) => {
      const { row, col, edge } = this.getGridCoordinates(tile.id);
      const tileEl = document.createElement('div');
      tileEl.id = `tile-${tile.id}`;
      tileEl.dataset.id = tile.id;
      tileEl.className = `board-tile edge-${edge}`;
      tileEl.style.gridRow = `${row}`;
      tileEl.style.gridColumn = `${col}`;

      if (tile.type === 'corner') {
        tileEl.classList.add('tile-corner');
        tileEl.innerHTML = `
          <div class="corner-icon-box"><span class="corner-icon">${tile.icon || '🚩'}</span></div>
          <span class="corner-title">${tile.name}</span>
          ${tile.subName ? `<span class="corner-sub">${tile.subName}</span>` : ''}
        `;
      } else {
        const isProperty = tile.type === 'property';
        const barColor = isProperty ? (tile.colorHex || '#888') : this.getSpecialColor(tile);
        const shortName = this.getShortTileName(tile.name);
        let priceText = '';
        if (tile.price) priceText = this.formatMoney(tile.price);
        else if (tile.amount) priceText = `-${this.formatMoney(tile.amount)}`;
        else if (tile.type === 'chance' || tile.type === 'chest') priceText = 'Rút Thẻ';

        tileEl.classList.add(isProperty ? 'tile-property' : 'tile-special');
        tileEl.innerHTML = `
          <div class="tile-color-bar" style="background-color: ${barColor};">
            ${isProperty ? '<div class="tile-buildings-container"></div>' : ''}
          </div>
          <div class="tile-content">
            <span class="tile-name" title="${tile.name}">${shortName}</span>
            <div class="tile-icon-box">
              <span class="tile-icon">${this.getDefaultIcon(tile)}</span>
            </div>
            <span class="tile-price">${priceText}</span>
          </div>
        `;
      }

      tileEl.title = `${tile.name}${tile.price ? ` - Giá: ${this.formatMoney(tile.price)}` : ''}`;

      if (onTileClick) {
        tileEl.addEventListener('click', () => onTileClick(tile));
      }

      this.board.appendChild(tileEl);
    });
  }

  /**
   * Cập nhật huy hiệu chủ sở hữu trên các ô đất
   */
  updateOwners(propertiesState, players) {
    Object.entries(propertiesState).forEach(([tileId, prop]) => {
      const tileEl = document.getElementById(`tile-${tileId}`);
      if (!tileEl) return;

      const oldBadge = tileEl.querySelector('.tile-owner-badge');
      if (oldBadge) oldBadge.remove();

      const oldMortgageBadge = tileEl.querySelector('.tile-mortgage-badge');
      if (oldMortgageBadge) oldMortgageBadge.remove();
      tileEl.classList.toggle('tile-is-mortgaged', !!prop.isMortgaged);

      if (prop.isMortgaged) {
        const mBadge = document.createElement('div');
        mBadge.className = 'tile-mortgage-badge';
        mBadge.textContent = '🔒 THẾ CHẤP';
        tileEl.appendChild(mBadge);
      }

      if (prop.owner) {
        const owner = players.find((p) => p.id === prop.owner);
        if (owner) {
          const badge = document.createElement('div');
          badge.className = 'tile-owner-badge';
          badge.style.backgroundColor = owner.token.color;
          badge.textContent = owner.id.toUpperCase();
          badge.title = `Chủ sở hữu: ${owner.name}`;
          tileEl.appendChild(badge);
        }
      }
    });
  }

  /**
   * Cập nhật mô hình Nhà Xanh & Khách Sạn Đỏ trên ô cờ
   */
    updateBuildings(propertiesState) {
    Object.entries(propertiesState).forEach(([tileId, prop]) => {
      const tileEl = document.getElementById(`tile-${tileId}`);
      if (!tileEl) return;

      let buildingsBox = tileEl.querySelector('.tile-buildings-container');
      if (!buildingsBox) {
        const colorBar = tileEl.querySelector('.tile-color-bar');
        if (colorBar) {
          buildingsBox = document.createElement('div');
          buildingsBox.className = 'tile-buildings-container';
          colorBar.appendChild(buildingsBox);
        }
      }

      if (!buildingsBox) return;
      buildingsBox.innerHTML = '';

      const houses = prop.houses || 0;
      if (houses === 5) {
        // Khách sạn đỏ (1 Khách sạn)
        buildingsBox.innerHTML = '<span class="hotel-cube" title="1 Khách Sạn Đỏ"><i class="hotel-label">H</i></span>';
      } else if (houses >= 1 && houses <= 4) {
        // 1 đến 4 nhà xanh
        for (let i = 0; i < houses; i++) {
          const h = document.createElement('span');
          h.className = 'house-cube';
          h.title = `Nhà Xanh (${i + 1}/4)`;
          buildingsBox.appendChild(h);
        }
      }
    });
  }
}

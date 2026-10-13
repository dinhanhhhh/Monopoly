import { formatVND } from "../../../shared/constants.js";
import { GameRules } from "../../../shared/rules.js";
import { getPlayerAvatar } from "./AvatarsData.js";

export class BoardRenderer {
  constructor(boardElement) {
    this.board = boardElement;
    this.players = [];
    this.boardData = [];
  }

  getGridCoordinates(id) {
    if (id === 0) return { row: 11, col: 11, edge: "corner" };
    if (id >= 1 && id <= 9) return { row: 11, col: 11 - id, edge: "bottom" };
    if (id === 10) return { row: 11, col: 1, edge: "corner" };
    if (id >= 11 && id <= 19) return { row: 21 - id, col: 1, edge: "left" };
    if (id === 20) return { row: 1, col: 1, edge: "corner" };
    if (id >= 21 && id <= 29) return { row: 1, col: id - 19, edge: "top" };
    if (id === 30) return { row: 1, col: 11, edge: "corner" };
    if (id >= 31 && id <= 39) return { row: id - 29, col: 11, edge: "right" };
    return { row: 1, col: 1, edge: "center" };
  }

  formatMoney(amount) {
    return formatVND(amount);
  }

  getSpecialIconSvg(tile) {
    const color = "#3B2A1A";
    const chanceColor = "#FF7A00";
    switch (tile.type) {
      case "chance":
        // Cơ Hội: Dấu hỏi hồng đỏ gradient theo mẫu
        return `<div class="chance-mark-symbol">?</div>`;
      case "chest":
        // Khí Vận: Chiếc rương kho báu theo mẫu
        return `<div class="chest-mark-symbol"><svg width="24" height="20" viewBox="0 0 24 20" fill="#6D4C41" stroke="#3E2723" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h18v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z" fill="#5D4037"/><path d="M2 8V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3" fill="#8D6E63"/><path d="M3 8h18" stroke="#FFE082" stroke-width="1.4"/><circle cx="12" cy="12" r="1.5" fill="#FFD54F"/></svg></div>`;
      case "railroad":
        if (tile.id === 35) {
          // Cảng Sài Gòn: Mỏ neo to nét đậm
          return `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>`;
        }
        if (tile.id === 15) {
          // Ga Sài Gòn: Tàu hỏa to nét đậm
          return `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="16" x="4" y="3" rx="2"/><path d="M4 11h16"/><path d="M12 3v8"/><path d="m8 19-2 3"/><path d="m18 22-2-3"/><circle cx="8" cy="15" r="1.5"/><circle cx="16" cy="15" r="1.5"/></svg>`;
        }
        // Bến Xe: Xe bus to nét đậm
        return `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.6 19 6 17.8 6H4.2C3 6 1.9 6.6 1.6 7.8L.2 12.8c-.1.4-.2.8-.2 1.2 0 .4.1.8.2 1.2.3 1.1.8 2.8.8 2.8h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg>`;
      case "utility":
        if (tile.id === 12) {
          // Điện Lực: Sét to nét đậm
          return `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;
        }
        // Nước Sawaco: Giọt nước to nét đậm
        return `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`;
      case "tax":
        // Thuế: Phần trăm nét đậm
        return `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>`;
      default:
        return "";
    }
  }

  getCornerIconSvg(id) {
    if (id === 0) {
      // Khởi Hành (GO): Mũi tên to nét đậm
      return `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FF7A00" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
    }
    if (id === 10) {
      // Thăm Tù: Song sắt to nét đậm
      return `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#3B2A1A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>`;
    }
    if (id === 20) {
      // Quỹ Trúng Thưởng (Jackpot)
      return `<div class="corner-parking-p jackpot-slot-icon">🎰</div>`;
    }
    if (id === 30) {
      // Vào Tù: Biển cấm to nét đậm
      return `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`;
    }
    return "";
  }

  getShortTileName(tile, edge = "") {
    if (!tile) return "";
    const name = typeof tile === "object" ? tile.name : tile;
    if (!name) return "";

    // Cạnh Trái & Cạnh Phải: Ngắt 2 dòng gọn gàng, hiển thị trọn vẹn tên không bị cắt ...
    if (edge === "left" || edge === "right") {
      const horizontalMap = {
        "Đường Nguyễn Trãi": "Nguyễn<br>Trãi",
        "Nguyễn Trãi": "Nguyễn<br>Trãi",
        "Chợ Bến Thành": "Bến<br>Thành",
        "Bến Thành": "Bến<br>Thành",
        "Huỳnh Thúc Kháng": "H. Thúc<br>Kháng",
        "Khu Đô Thị Thủ Thiêm": "Thủ<br>Thiêm",
        "Thủ Thiêm": "Thủ<br>Thiêm",
        "Phố Đi Bộ Nguyễn Huệ": "Nguyễn<br>Huệ",
        "Nguyễn Huệ": "Nguyễn<br>Huệ",
        "Đường Đề Thám": "Đề<br>Thám",
        "Đề Thám": "Đề<br>Thám",
        "Đường Phạm Ngũ Lão": "Phạm Ngũ<br>Lão",
        "Phạm Ngũ Lão": "Phạm Ngũ<br>Lão",
        "Đường Bùi Thị Xuân": "Bùi Thị<br>Xuân",
        "Bùi Thị Xuân": "Bùi Thị<br>Xuân",
        "Phố Tây Bùi Viện": "Bùi<br>Viện",
        "Bùi Viện": "Bùi<br>Viện",
        "Đường Võ Thị Sáu": "Võ Thị<br>Sáu",
        "Võ Thị Sáu": "Võ Thị<br>Sáu",
        "Đường Điện Biên Phủ": "Điện Biên<br>Phủ",
        "Điện Biên Phủ": "Điện Biên<br>Phủ",
        "Đường Pasteur": "Pasteur",
        Pasteur: "Pasteur",
        "Điện Lực EVNHCMC": "Điện<br>Lực",
        "Cấp Nước Sawaco": "Cấp<br>Nước",
        Sawaco: "Cấp<br>Nước",
        "Cảng Sài Gòn": "Cảng<br>Sài Gòn",
        "Thuế Tiêu Thụ": "Thuế TT",
      };
      if (horizontalMap[name]) return horizontalMap[name];
      if (typeof tile === "object" && tile.shortName) return tile.shortName;
      return name.replace(/^Đường\s+/i, "").trim();
    }

    // Cạnh Đáy & Cạnh Đỉnh: Bề ngang hẹp (48px), chiều dọc rất sâu (120px)
    // -> Ngắt thành 2 dòng chuẩn để chữ to rõ không bị co rúm
    const verticalMap = {
      "Nguyễn Thị Minh Khai": "Minh<br>Khai",
      "Đường Lê Duẩn": "Lê<br>Duẩn",
      "Lê Duẩn": "Lê<br>Duẩn",
      "Tôn Đức Thắng": "Tôn Đ.<br>Thắng",
      "Đường Tôn Đức Thắng": "Tôn Đ.<br>Thắng",
      "Bến Xe Miền Đông": "BX<br>M.Đông",
      "Đường Lê Lợi": "Lê<br>Lợi",
      "Lê Lợi": "Lê<br>Lợi",
      "Đường Hàm Nghi": "Hàm<br>Nghi",
      "Hàm Nghi": "Hàm<br>Nghi",
      "Cấp Nước Sawaco": "Cấp<br>Nước",
      Sawaco: "Cấp<br>Nước",
      "Đường Đồng Khởi": "Đồng<br>Khởi",
      "Đồng Khởi": "Đồng<br>Khởi",
      "Nam Kỳ Khởi Nghĩa": "Nam Kỳ<br>K.Nghĩa",
      "Hai Bà Trưng": "Hai Bà<br>Trưng",
      "Đường Hai Bà Trưng": "Hai Bà<br>Trưng",
      "Cách Mạng Tháng 8": "CMT8",
      "Bến Xe Miền Tây": "BX<br>M.Tây",
      "Thuế Thu Nhập": "Thuế<br>TN",
      "Đường Hoàng Sa": "Hoàng<br>Sa",
      "Hoàng Sa": "Hoàng<br>Sa",
      "Bến Vân Đồn": "Bến Vân<br>Đồn",
    };
    if (verticalMap[name]) return verticalMap[name];
    if (typeof tile === "object" && tile.shortName) return tile.shortName;
    return name.replace(/^Đường\s+/i, "").trim();
  }

  getSpecialColor(tile) {
    switch (tile.type) {
      case "chance":
        return "#FFB399";
      case "chest":
        return "#FFE066";
      case "railroad":
        return "#4A3B32";
      case "utility":
        return "#0284C7";
      case "tax":
        return "#64748B";
      default:
        return "#7F8C8D";
    }
  }

  render(boardData, onTileClick = null) {
    this.boardData = boardData;
    // Xóa sạch các ô cờ cũ nếu đã render trước đó để tránh trùng lặp
    const existingTiles = this.board.querySelectorAll(".board-tile");
    existingTiles.forEach((el) => el.remove());

    boardData.forEach((tile) => {
      const { row, col, edge } = this.getGridCoordinates(tile.id);
      const tileEl = document.createElement("div");
      tileEl.id = `tile-${tile.id}`;
      tileEl.dataset.id = tile.id;
      tileEl.className = `board-tile edge-${edge}`;
      tileEl.style.gridRow = `${row}`;
      tileEl.style.gridColumn = `${col}`;

      if (tile.type === "corner") {
        tileEl.classList.add("tile-corner");
        if (tile.id === 20) {
          tileEl.classList.add("tile-corner-jackpot");
        }
        if (tile.id === 0) {
          tileEl.classList.add("tile-corner-go");
        }
        if (tile.id === 30) {
          tileEl.classList.add("tile-corner-gotojail");
        }
        if (tile.id === 10) {
          tileEl.classList.add("tile-corner-jail");
          tileEl.innerHTML = `
            <div class="jail-corner-layout">
              <div class="jail-inmate-box" id="jail-inmates-area">
                <div class="jail-inmate-header">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#78281F" stroke-width="2.6"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>
                  <span>Đang ngồi tù</span>
                </div>
                <div class="jail-inmate-tokens" id="jail-inmate-tokens-slot"></div>
              </div>
              <div class="jail-visiting-strip">
                <span class="corner-title">THĂM TÙ</span>
              </div>
            </div>
          `;
        } else if (tile.id === 0) {
          // Ô KHỞI HÀNH THEO MẪU: [Mũi tên đỏ đặc] -> [KHỞI HÀNH đỏ] -> [Nhận 2.000k xanh]
          tileEl.innerHTML = `
            <div class="go-corner-layout">
              <div class="go-arrow-box">
                <svg width="34" height="26" viewBox="0 0 24 24" fill="#E11D48"><path d="M3 11h11V7l7 5-7 5v-4H3z"/></svg>
              </div>
              <span class="go-title">KHỞI HÀNH</span>
              <span class="go-reward">Nhận 2.000k</span>
            </div>
          `;
        } else {
          let displayName = tile.name;
          if (tile.id === 20) displayName = "QUỸ TRÚNG<br>THƯỞNG";
          else if (tile.id === 30) displayName = "VÀO TÙ";

          tileEl.innerHTML = `
            <div class="corner-icon-box">${this.getCornerIconSvg(tile.id)}</div>
            <span class="corner-title">${displayName}</span>
            ${tile.id === 20 ? `<div class="jackpot-pool-badge" id="jackpot-pool-amount" title="Quỹ Trúng Thưởng tích lũy">1tr</div>` : ""}
          `;
        }
      } else {
        const isProperty = tile.type === "property";
        const isChance = tile.type === "chance";
        const isChest = tile.type === "chest";
        const barColor = isProperty
          ? tile.colorHex || "#888"
          : this.getSpecialColor(tile);
        const shortName = this.getShortTileName(tile, edge);

        let priceText = "";
        if (tile.price) priceText = this.formatMoney(tile.price);
        else if (tile.amount) priceText = `-${this.formatMoney(tile.amount)}`;

        tileEl.classList.add(isProperty ? "tile-property" : "tile-special");
        if (isChance) tileEl.classList.add("tile-chance");
        if (isChest) tileEl.classList.add("tile-chest");

        if (isProperty) {
          // Ô ĐẤT THƯỜNG: Dải màu + Tên đường + Giá tiền & Chấm màu chủ sở hữu
          tileEl.innerHTML = `
            <div class="tile-color-bar" style="background-color: ${barColor};">
              <div class="tile-buildings-container"></div>
            </div>
            <div class="tile-content">
              <span class="tile-name" title="${tile.name}">${shortName}</span>
              <div class="tile-price-row">
                <span class="tile-price">${priceText}</span>
                <span class="tile-owner-dot" style="display: none;"></span>
              </div>
            </div>
          `;
        } else if (isChance || isChest) {
          // Ô CƠ HỘI / KHÍ VẬN: Chuẩn 3 tầng [Tên] -> [Icon] -> [RÚT THẺ] theo mẫu
          const titleText = isChance ? "CƠ HỘI" : "KHÍ VẬN";
          tileEl.innerHTML = `
            <div class="tile-content ${isChance ? "tile-chance-content" : "tile-chest-content"}">
              <span class="tile-name" title="${tile.name}">${titleText}</span>
              <div class="tile-icon-box">
                ${this.getSpecialIconSvg(tile)}
              </div>
              <span class="tile-card-action">RÚT THẺ</span>
            </div>
          `;
        } else {
          // Ô ĐẶC BIỆT KHÁC (Điện lực, Sawaco, Ga tàu, Bến xe, Thuế): Luôn ghim giá ở đáy ô
          if (tile.id === 12 || tile.id === 28 || tile.id === 35) {
            tileEl.classList.add("tile-utility-railroad");
          }
          tileEl.innerHTML = `
            <div class="tile-content">
              <span class="tile-name" title="${tile.name}">${shortName}</span>
              <div class="tile-icon-box">
                ${this.getSpecialIconSvg(tile)}
              </div>
              <div class="tile-price-row">
                <span class="tile-price">${priceText}</span>
                <span class="tile-owner-dot" style="display: none;"></span>
              </div>
            </div>
          `;
        }
      }

      tileEl.title = `${tile.name}${tile.price ? ` - Giá: ${this.formatMoney(tile.price)}` : ""}`;

      if (onTileClick) {
        tileEl.addEventListener("click", () => onTileClick(tile));
      }

      this.board.appendChild(tileEl);
    });
  }

  /**
   * Cập nhật dải màu chủ sở hữu và chấm màu cạnh giá trên các ô đất
   */
  hexToRgba(hex, alpha = 0.12) {
    if (!hex || typeof hex !== "string") return "";
    let c = hex.replace("#", "");
    if (c.length === 3)
      c = c
        .split("")
        .map((x) => x + x)
        .join("");
    const num = parseInt(c, 16);
    if (isNaN(num)) return "";
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Cập nhật dấu sở hữu trên các ô đất:
   * - Nền ô tô nhạt 12% màu người chơi
   * - Chấm tròn màu người chơi cạnh giá
   * - Bỏ toàn bộ viền đỏ/thanh viền ngoài bao quanh ô
   */
  updateOwners(propertiesState, players) {
    if (players && players.length) {
      this.players = players;
    }
    Object.entries(propertiesState).forEach(([tileId, prop]) => {
      const tileEl = document.getElementById(`tile-${tileId}`);
      if (!tileEl) return;

      const oldBadge =
        tileEl.querySelector(".tile-owner-badge") ||
        tileEl.querySelector(".tile-owner-token-badge");
      if (oldBadge) oldBadge.remove();

      const oldBar =
        tileEl.querySelector(".tile-owner-outer-bar") ||
        tileEl.querySelector(".tile-owner-bottom-bar");
      if (oldBar) oldBar.remove();

      tileEl.style.boxShadow = "";

      const tileContent = tileEl.querySelector(".tile-content");

      const oldMortgageBadge = tileEl.querySelector(".tile-mortgage-badge");
      if (oldMortgageBadge) oldMortgageBadge.remove();
      tileEl.classList.toggle("tile-is-mortgaged", !!prop.isMortgaged);

      const ownerDot = tileEl.querySelector(".tile-owner-dot");
      if (ownerDot) ownerDot.style.display = "none";

      if (prop.isMortgaged) {
        const mBadge = document.createElement("div");
        mBadge.className = "tile-mortgage-badge";
        mBadge.textContent = "🔒 THẾ CHẤP";
        tileEl.appendChild(mBadge);
        if (tileContent) tileContent.style.backgroundColor = "";
        tileEl.style.backgroundColor = "";
      } else if (prop.owner) {
        const owner = (players || this.players).find(
          (p) => p.id === prop.owner,
        );
        if (owner) {
          const ownerColor = owner.token?.color || "#7B4BD8";

          // 1. Nền ô tô nhạt 12% màu người chơi
          const softBg = this.hexToRgba(ownerColor, 0.12);
          if (tileContent) {
            tileContent.style.backgroundColor = softBg;
          } else {
            tileEl.style.backgroundColor = softBg;
          }

          // 2. Huy hiệu quân cờ chủ sở hữu (15-16px, viền trắng 1.5px, nền màu người chơi) đặt trong dải màu
          const tokenBadge = document.createElement("div");
          tokenBadge.className = "tile-owner-token-badge";
          tokenBadge.style.backgroundColor = ownerColor;
          tokenBadge.innerHTML = owner.token?.svg || "";
          tokenBadge.title = `Chủ sở hữu: ${owner.name} (${owner.token?.name || "Quân cờ"})`;

          const houses = prop.houses || 0;
          if (houses > 0) {
            tokenBadge.style.display = "none";
          }

          const colorBar = tileEl.querySelector(".tile-color-bar");
          if (colorBar) {
            colorBar.appendChild(tokenBadge);
          } else if (tileContent) {
            tileContent.appendChild(tokenBadge);
          } else {
            tileEl.appendChild(tokenBadge);
          }
        }
      } else {
        // Chưa có chủ: xóa màu nền người chơi
        if (tileContent) tileContent.style.backgroundColor = "";
        tileEl.style.backgroundColor = "";
      }
    });

    this.updateTilePrices(propertiesState, players);
  }

  /**
   * Cập nhật mô hình Nhà & Khách Sạn trên ô cờ (theo màu đại diện của nhân vật)
   */
  updateBuildings(propertiesState, players = null) {
    const playerList = players && players.length ? players : this.players || [];

    Object.entries(propertiesState).forEach(([tileId, prop]) => {
      const tileEl = document.getElementById(`tile-${tileId}`);
      if (!tileEl) return;

      let buildingsBox = tileEl.querySelector(".tile-buildings-container");
      if (!buildingsBox) {
        const colorBar = tileEl.querySelector(".tile-color-bar");
        if (colorBar) {
          buildingsBox = document.createElement("div");
          buildingsBox.className = "tile-buildings-container";
          colorBar.appendChild(buildingsBox);
        }
      }

      if (!buildingsBox) return;
      buildingsBox.innerHTML = "";

      const houses = prop.houses || 0;
      const ownerDot = tileEl.querySelector(".tile-owner-dot");
      if (ownerDot && prop.owner) {
        ownerDot.style.display = houses > 0 ? "none" : "inline-block";
      }

      // Tự động ẩn huy hiệu quân cờ khi đã có nhà/khách sạn để dải màu không bị đè nhau
      const ownerBadge = tileEl.querySelector(".tile-owner-token-badge");
      if (ownerBadge && prop.owner) {
        ownerBadge.style.display = houses > 0 ? "none" : "flex";
      }

      if (houses <= 0) return;

      const owner = playerList.find((p) => p.id === prop.owner);
      const ownerColor = owner?.token?.color || "#E63946";

      if (houses === 5) {
        // Khách sạn cấp 5: Tòa nhà sang trọng mang màu nhân vật kết hợp viền vàng hoàng kim
        const hotel = document.createElement("span");
        hotel.className = "hotel-cube";
        hotel.title = `Khách Sạn của ${owner?.name || "Chủ sở hữu"}`;
        hotel.style.background = `linear-gradient(180deg, ${ownerColor} 0%, rgba(0,0,0,0.35) 100%), ${ownerColor}`;
        hotel.style.setProperty("--roof-color", ownerColor);
        hotel.innerHTML = '<i class="hotel-label">H</i>';
        buildingsBox.appendChild(hotel);
      } else if (houses >= 1 && houses <= 4) {
        // 1 đến 4 nhà: Xây theo màu đại diện của chính nhân vật sở hữu
        for (let i = 0; i < houses; i++) {
          const h = document.createElement("span");
          h.className = "house-cube";
          h.title = `Nhà phố cấp ${i + 1} của ${owner?.name || "Chủ sở hữu"}`;
          h.style.background = `linear-gradient(180deg, ${ownerColor} 0%, rgba(0,0,0,0.3) 100%), ${ownerColor}`;
          h.style.setProperty("--roof-color", ownerColor);
          buildingsBox.appendChild(h);
        }
      }
    });

    this.updateTilePrices(propertiesState, players);
  }

  /**
   * Cập nhật số tiền hiển thị ở đáy ô cờ:
   * - Đất chưa mua: Giữ nguyên giá mua niêm yết (vd: 2,4tr)
   * - Đất đã có chủ: Tự động đổi thành TIỀN THUÊ THỰC TẾ theo cấp độ (x2 bộ màu, 1-4 nhà, 11tr khi lên Khách sạn)
   */
  updateTilePrices(propertiesState, players = null) {
    if (!this.boardData || !this.boardData.length) return;
    const playerList = players && players.length ? players : this.players || [];

    this.boardData.forEach((tile) => {
      if (!["property", "railroad", "utility"].includes(tile.type)) return;

      const tileEl = document.getElementById(`tile-${tile.id}`);
      if (!tileEl) return;

      const priceEl = tileEl.querySelector(".tile-price");
      if (!priceEl) return;

      const prop = propertiesState[tile.id];

      // 1. Chưa ai mua -> Giữ nguyên giá mua ban đầu
      if (!prop || !prop.owner) {
        priceEl.textContent = this.formatMoney(tile.price);
        priceEl.title = `Giá mua đất: ${formatVND(tile.price)}`;
        priceEl.classList.remove("tile-rent-active", "tile-rent-hotel");
        return;
      }

      // 2. Đang thế chấp -> Tiền thuê = 0đ
      if (prop.isMortgaged) {
        priceEl.textContent = "0đ";
        priceEl.title = "Đang thế chấp (Tiền thuê: 0đ)";
        priceEl.classList.remove("tile-rent-active", "tile-rent-hotel");
        return;
      }

      // 3. Đã có chủ -> Hiển thị TIỀN THUÊ THỰC TẾ
      const owner = playerList.find((p) => p.id === prop.owner);

      // Riêng Tiện Ích (Điện/Nước): Khi đã có chủ thì KHÔNG hiện giá tiền cố định trên ô cờ.
      // Chỉ khi nào có ai dẫm vào ô thì mới tính tiền theo số nút xúc xắc của người đó.
      if (tile.type === "utility") {
        priceEl.textContent = "";
        priceEl.title = `Chủ sở hữu: ${owner?.name || "Người chơi"}. Tiền thuê tính theo số nút xúc xắc khi dẫm vào.`;
        priceEl.classList.remove("tile-rent-active", "tile-rent-hotel");
        return;
      }

      const rent = GameRules.calculateRent(tile, owner, propertiesState, 7);
      const houses = prop.houses || 0;

      priceEl.innerHTML = `<span class="rent-label">Thuê</span><span class="rent-val">${this.formatMoney(rent)}</span>`;
      priceEl.title = `Tiền thuê thực tế: ${formatVND(rent)}`;
      priceEl.classList.add("tile-rent-active");

      if (houses === 5) {
        priceEl.classList.add("tile-rent-hotel");
      } else {
        priceEl.classList.remove("tile-rent-hotel");
      }
    });

    // Cập nhật số tiền Quỹ Trúng Thưởng (Jackpot)
    if (window.engine?.state?.jackpotPot !== undefined) {
      this.updateJackpot(window.engine.state.jackpotPot);
    }
  }

  /**
   * Cập nhật số tiền hiển thị của Quỹ Trúng Thưởng trên ô 20
   */
  updateJackpot(amount = 1_000_000) {
    const el = document.getElementById("jackpot-pool-amount");
    if (el) {
      el.textContent = this.formatMoney(amount);
      el.title = `Quỹ Trúng Thưởng tích lũy: ${formatVND(amount)}`;
    }
  }
}

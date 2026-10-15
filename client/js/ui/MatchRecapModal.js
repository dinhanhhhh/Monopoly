/**
 * MatchRecapModal.js - Modal Tổng Kết Ván Đấu & Xuất Poster Infographic Canvas (PNG)
 * Tự động tổng hợp chỉ số, vẽ biểu đồ biến động tài sản và cho phép tải ảnh về máy.
 */

import { formatVND } from "../../../shared/constants.js";
import { GameRules } from "../../../shared/rules.js";

export class MatchRecapModal {
  constructor(containerId = "match-recap-modal-container") {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.id = containerId;
      document.body.appendChild(this.container);
    }
  }

  show({ winner, players, properties, boardData, stats, onRestartGame }) {
    const turnCount = stats.turnCount || 1;
    const secondsElapsed = stats.secondsElapsed || 0;
    const netWorthHistory = stats.netWorthHistory || [];

    const mins = String(Math.floor(secondsElapsed / 60)).padStart(2, "0");
    const secs = String(secondsElapsed % 60).padStart(2, "0");
    const timeFormatted = `${mins}:${secs}`;

    // Tính toán tài sản và công trình của người thắng
    const winnerNetWorth = GameRules.calculateNetWorth(winner, properties);

    let winnerPropsCount = 0;
    let winnerHousesCount = 0;
    let winnerHotelsCount = 0;

    Object.entries(properties).forEach(([tileId, prop]) => {
      if (prop.owner === winner.id) {
        winnerPropsCount++;
        if (prop.houses === 5) {
          winnerHotelsCount++;
        } else if (prop.houses > 0) {
          winnerHousesCount += prop.houses;
        }
      }
    });

    // Tính toán bảng tổng sắp thứ hạng các người chơi
    const rankBadges = [
      { icon: "🥇", label: "Quán Quân" },
      { icon: "🥈", label: "Á Quân" },
      { icon: "🥉", label: "Hạng 3" },
      { icon: "4️⃣", label: "Hạng 4" },
    ];

    const rankedPlayers = [...players]
      .map((p) => {
        const isWinner = p.id === winner.id;
        const netWorth = GameRules.calculateNetWorth(p, properties);
        return { ...p, isWinner, netWorth };
      })
      .sort((a, b) => {
        if (a.isWinner) return -1;
        if (b.isWinner) return 1;
        if (a.isBankrupt && !b.isBankrupt) return 1;
        if (!a.isBankrupt && b.isBankrupt) return -1;
        return b.netWorth - a.netWorth;
      });

    const standingsHtml = rankedPlayers
      .map((p, idx) => {
        const badge = rankBadges[idx] || { icon: `${idx + 1}` };
        const statusHtml = p.isWinner
          ? `<strong class="standing-val winner-val">${formatVND(p.netWorth)}</strong>`
          : p.isBankrupt
          ? `<span class="standing-bankrupt-tag">Đã phá sản</span>`
          : `<strong class="standing-val">${formatVND(p.netWorth)}</strong>`;

        return `
          <div class="standing-row ${p.isWinner ? "is-winner-row" : ""}">
            <div class="standing-rank-badge">${badge.icon}</div>
            <div class="standing-player-info">
              <span class="standing-player-name">${p.name}</span>
              ${p.id === 0 ? '<span class="you-tag">(Tôi)</span>' : ""}
            </div>
            <div class="standing-player-status">
              ${statusHtml}
            </div>
          </div>
        `;
      })
      .join("");

    const modalHtml = `
      <div class="modal-backdrop fade-in" id="recap-backdrop">
        <div class="recap-modal-card pop-in">
          <div class="recap-modal-header">
            <div class="recap-header-left">
              <span class="recap-header-badge">👑 VINH DANH CHIẾN THẮNG</span>
              <h3>BẢNG VÀNG THƯƠNG TRƯỜNG SÀI GÒN</h3>
              <p class="recap-header-sub">Tổng kết ván đấu & biểu đồ biến động tài sản qua các lượt</p>
            </div>
            <button class="btn-close-recap" id="btn-close-recap">✕</button>
          </div>

          <div class="recap-modal-body">
            <!-- Khu Vực Xem Trước Canvas Poster -->
            <div class="recap-canvas-container">
              <canvas id="recap-poster-canvas" width="900" height="1200" class="recap-canvas-preview"></canvas>
            </div>

            <!-- Cột Thao Tác Phải -->
            <div class="recap-actions-sidebar">
              <div class="recap-winner-summary">
                <div class="winner-crown-row">
                  <span class="winner-crown-icon">👑</span>
                  <span class="winner-label">QUÁN QUÂN VÁN ĐẤU</span>
                </div>
                <h2 class="winner-name-display">${winner.name}</h2>
                <div class="winner-fortune-pill">
                  <span>Tài sản ròng:</span>
                  <strong>${formatVND(winnerNetWorth)}</strong>
                </div>
              </div>

              <div class="recap-standings-card">
                <div class="standings-header">
                  <span class="standings-title">🏆 BẢNG TỔNG SẮP CHUNG CUỘC</span>
                  <span class="standings-sub">${players.length} người chơi</span>
                </div>
                <div class="standings-list">
                  ${standingsHtml}
                </div>
              </div>

              <div class="recap-buttons-cluster">
                <button id="btn-download-recap-png" class="btn-recap-action btn-download-png">
                  <span class="btn-icon">📥</span>
                  <span>TẢI POSTER KẾT QUẢ (PNG)</span>
                </button>
                <button id="btn-recap-start-new" class="btn-recap-action btn-new-game">
                  <span class="btn-icon">🔄</span>
                  <span>BẮT ĐẦU VÁN MỚI</span>
                </button>
              </div>

              <div class="recap-share-hint">
                💡 Poster bên trái đã tổng hợp đầy đủ số liệu & biểu đồ tài sản. Bạn có thể tải về làm kỷ niệm!
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.container.innerHTML = modalHtml;

    // Lấy thẻ canvas và vẽ poster
    const canvas = document.getElementById("recap-poster-canvas");
    if (canvas) {
      this.drawCanvasPoster(canvas, {
        winner,
        winnerNetWorth,
        winnerPropsCount,
        winnerHousesCount,
        winnerHotelsCount,
        players,
        timeFormatted,
        turnCount,
        netWorthHistory,
      });
    }

    // Gán sự kiện
    const btnClose = document.getElementById("btn-close-recap");
    const btnDownload = document.getElementById("btn-download-recap-png");
    const btnStartNew = document.getElementById("btn-recap-start-new");
    const backdrop = document.getElementById("recap-backdrop");

    const closeModal = () => {
      this.container.innerHTML = "";
    };

    if (btnClose) btnClose.onclick = closeModal;
    if (backdrop) {
      backdrop.onclick = (e) => {
        if (e.target === backdrop) closeModal();
      };
    }
    if (btnStartNew) {
      btnStartNew.onclick = () => {
        closeModal();
        if (onRestartGame) onRestartGame();
      };
    }

    if (btnDownload && canvas) {
      btnDownload.onclick = () => {
        const link = document.createElement("a");
        const dateStr = new Date().toISOString().slice(0, 10);
        link.download = `CoTyPhuSaiGon_KetQua_${dateStr}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      };
    }
  }

  /**
   * Vẽ toàn bộ tấm poster Infographic lên Canvas độ phân giải cao (900 x 1200)
   */
  drawCanvasPoster(canvas, data) {
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    // 1. Nền giấy da Vintage cổ điển
    ctx.fillStyle = "#FAF7F0";
    ctx.fillRect(0, 0, W, H);

    // Subtle Paper texture gradient
    const bgGrad = ctx.createRadialGradient(
      W / 2,
      H / 2,
      100,
      W / 2,
      H / 2,
      700,
    );
    bgGrad.addColorStop(0, "#FFFDF9");
    bgGrad.addColorStop(1, "#F3EBD9");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // 2. Viền đôi Hoàng Gia phong cách Retro Sài Gòn
    ctx.strokeStyle = "#176B78";
    ctx.lineWidth = 8;
    ctx.strokeRect(24, 24, W - 48, H - 48);

    ctx.strokeStyle = "#D4AF37";
    ctx.lineWidth = 3;
    ctx.strokeRect(36, 36, W - 72, H - 72);

    // Họa tiết 4 góc Art Deco
    const drawCorner = (x, y, flipX, flipY) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(flipX, flipY);
      ctx.strokeStyle = "#D4AF37";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(28, 0);
      ctx.lineTo(28, 6);
      ctx.lineTo(6, 6);
      ctx.lineTo(6, 28);
      ctx.lineTo(0, 28);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    };
    drawCorner(42, 42, 1, 1);
    drawCorner(W - 42, 42, -1, 1);
    drawCorner(42, H - 42, 1, -1);
    drawCorner(W - 42, H - 42, -1, -1);

    // 3. Header Tiêu Đề
    ctx.textAlign = "center";
    ctx.fillStyle = "#D35400";
    ctx.font = "bold 20px 'Baloo 2', 'Be Vietnam Pro', sans-serif";
    ctx.letterSpacing = "2px";
    ctx.fillText("🎲 CỜ TỶ PHÚ SÀI GÒN — SAIGON TYCOON 🎲", W / 2, 85);

    ctx.fillStyle = "#176B78";
    ctx.font = "900 42px 'Baloo 2', 'Be Vietnam Pro', sans-serif";
    ctx.fillText("BẢNG VÀNG THƯƠNG TRƯỜNG", W / 2, 135);

    ctx.fillStyle = "#7F8C8D";
    ctx.font = "italic 18px 'Be Vietnam Pro', sans-serif";
    ctx.fillText(
      "Chiến tích bất động sản lẫy lừng của Đại Gia Sài Gòn",
      W / 2,
      170,
    );

    // Dải phân cách viền vàng
    ctx.strokeStyle = "#D4AF37";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(120, 195);
    ctx.lineTo(W - 120, 195);
    ctx.stroke();

    // 4. Khối Quán Quân (Winner Spotlight)
    const cardY = 220;
    const cardH = 210;
    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = "#F39C12";
    ctx.lineWidth = 3;

    // Bo tròn thẻ người thắng
    this.roundRect(ctx, 60, cardY, W - 120, cardH, 20);
    ctx.fill();
    ctx.stroke();

    // Vương miện
    ctx.font = "52px sans-serif";
    ctx.fillText("👑", W / 2, cardY + 56);

    ctx.fillStyle = "#D35400";
    ctx.font = "bold 16px 'Be Vietnam Pro', sans-serif";
    ctx.fillText("QUÁN QUÂN VÁN ĐẤU — ĐẠI PHÚ HÀO SÀI GÒN", W / 2, cardY + 86);

    ctx.fillStyle = "#C0392B";
    ctx.font = "900 36px 'Baloo 2', 'Be Vietnam Pro', sans-serif";
    ctx.fillText(data.winner.name.toUpperCase(), W / 2, cardY + 130);

    // Huy hiệu tiền ròng
    ctx.fillStyle = "#E8F8F5";
    this.roundRect(ctx, W / 2 - 190, cardY + 148, 380, 42, 21);
    ctx.fill();
    ctx.strokeStyle = "#176B78";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#176B78";
    ctx.font = "bold 18px 'Be Vietnam Pro', sans-serif";
    ctx.fillText(
      `Tổng tài sản: ${formatVND(data.winnerNetWorth)}`,
      W / 2,
      cardY + 175,
    );

    // 5. Khối 4 Chỉ Số Trận Đấu (4 Stats Badges)
    const statBoxY = 450;
    const statBoxW = (W - 120 - 36) / 4;
    const statBoxH = 95;

    const statsConfig = [
      {
        icon: "⏱️",
        label: "Thời gian",
        val: data.timeFormatted,
        bg: "#FEF9E7",
        border: "#F1C40F",
      },
      {
        icon: "🎯",
        label: "Số lượt đấu",
        val: `${data.turnCount} lượt`,
        bg: "#EBF5FB",
        border: "#3498DB",
      },
      {
        icon: "🏘️",
        label: "Đất sở hữu",
        val: `${data.winnerPropsCount} ô`,
        bg: "#E8F8F5",
        border: "#1ABC9C",
      },
      {
        icon: "🏨",
        label: "Công trình",
        val: `${data.winnerHousesCount}N • ${data.winnerHotelsCount}KS`,
        bg: "#FDEDEC",
        border: "#E74C3C",
      },
    ];

    statsConfig.forEach((st, idx) => {
      const sx = 60 + idx * (statBoxW + 12);
      ctx.fillStyle = st.bg;
      ctx.strokeStyle = st.border;
      ctx.lineWidth = 2;
      this.roundRect(ctx, sx, statBoxY, statBoxW, statBoxH, 12);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.font = "24px sans-serif";
      ctx.fillText(st.icon, sx + statBoxW / 2, statBoxY + 32);

      ctx.fillStyle = "#555";
      ctx.font = "bold 13px 'Be Vietnam Pro', sans-serif";
      ctx.fillText(st.label, sx + statBoxW / 2, statBoxY + 54);

      ctx.fillStyle = "#2C3E50";
      ctx.font = "900 17px 'Baloo 2', sans-serif";
      ctx.fillText(st.val, sx + statBoxW / 2, statBoxY + 78);
    });

    // 6. Biểu Đồ Biến Động Tài Sản (Net Worth Trend Line Chart)
    const chartY = 570;
    const chartH = 430;
    const chartX = 60;
    const chartW = W - 120;

    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = "#BDC3C7";
    ctx.lineWidth = 2;
    this.roundRect(ctx, chartX, chartY, chartW, chartH, 16);
    ctx.fill();
    ctx.stroke();

    // Tiêu đề biểu đồ
    ctx.textAlign = "left";
    ctx.fillStyle = "#176B78";
    ctx.font = "900 19px 'Baloo 2', 'Be Vietnam Pro', sans-serif";
    ctx.fillText(
      "📈 BIỂU ĐỒ BIẾN ĐỘNG TÀI SẢN THEO LƯỢT",
      chartX + 24,
      chartY + 36,
    );

    ctx.textAlign = "right";
    ctx.fillStyle = "#7F8C8D";
    ctx.font = "italic 13px 'Be Vietnam Pro', sans-serif";
    ctx.fillText("Đơn vị: Triệu VNĐ", chartX + chartW - 24, chartY + 36);

    // Vẽ biểu đồ đường
    this.drawTrendChart(ctx, {
      x: chartX + 60,
      y: chartY + 65,
      w: chartW - 90,
      h: chartH - 120,
      history: data.netWorthHistory,
      players: data.players,
    });

    // 7. Dấu Mộc & Chân Trang Poster
    const footerY = 1030;

    // Dấu mộc tròn đỏ Sài Gòn
    ctx.save();
    ctx.translate(W - 140, footerY + 60);
    ctx.rotate((-12 * Math.PI) / 180);

    ctx.strokeStyle = "rgba(192, 57, 43, 0.85)";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(192, 57, 43, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 42, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "rgba(192, 57, 43, 0.9)";
    ctx.textAlign = "center";
    ctx.font = "900 12px 'Be Vietnam Pro', sans-serif";
    ctx.fillText("CHỨNG NHẬN", 0, -14);
    ctx.font = "bold 15px 'Baloo 2', sans-serif";
    ctx.fillText("ĐẠI GIA", 0, 6);
    ctx.font = "bold 11px 'Be Vietnam Pro', sans-serif";
    ctx.fillText("★ SÀI GÒN ★", 0, 24);
    ctx.restore();

    // Thông tin bản quyền chân trang
    ctx.textAlign = "left";
    ctx.fillStyle = "#7F8C8D";
    ctx.font = "14px 'Be Vietnam Pro', sans-serif";
    ctx.fillText(
      `🗓️ Thời điểm hoàn thành: ${new Date().toLocaleString("vi-VN")}`,
      70,
      footerY + 45,
    );
    ctx.fillText(
      "🏛️ Cờ Tỷ Phú Sài Gòn — Công nghệ HTML5 & Vanilla ES6 Modules",
      70,
      footerY + 70,
    );
    ctx.fillText(
      "🌐 Dự án mã nguồn mở phong cách văn hóa Sài Gòn hoài cổ",
      70,
      footerY + 95,
    );
  }

  /**
   * Vẽ biểu đồ đường biến động tài sản
   */
  drawTrendChart(ctx, { x, y, w, h, history, players }) {
    // Nếu chưa có lịch sử, tạo dữ liệu giả định mẫu từ 15 triệu
    let points = history;
    if (!points || points.length < 2) {
      points = [
        { turn: 1, values: {} },
        { turn: 10, values: {} },
      ];
      players.forEach((p) => {
        points[0].values[p.id] = 15000000;
        points[1].values[p.id] = p.isBankrupt ? 0 : 25000000;
      });
    }

    // Tìm giá trị max để scale trục Y
    let maxVal = 20000000;
    points.forEach((pt) => {
      Object.values(pt.values || {}).forEach((val) => {
        if (val > maxVal) maxVal = val;
      });
    });
    // Làm tròn lên mốc 5 triệu gần nhất
    maxVal = Math.ceil(maxVal / 5000000) * 5000000;

    // Vẽ lưới ngang trục Y (4 vạch)
    const gridLines = 4;
    ctx.textAlign = "right";
    ctx.font = "11px 'Be Vietnam Pro', sans-serif";
    ctx.fillStyle = "#95A5A6";
    ctx.strokeStyle = "#ECF0F1";
    ctx.lineWidth = 1;

    for (let i = 0; i <= gridLines; i++) {
      const lineY = y + h - (i / gridLines) * h;
      const labelVal = Math.round((i * maxVal) / gridLines / 1000000);

      ctx.fillText(`${labelVal}Tr`, x - 10, lineY + 4);

      ctx.beginPath();
      ctx.moveTo(x, lineY);
      ctx.lineTo(x + w, lineY);
      ctx.stroke();
    }

    // Bảng màu cho từng người chơi
    const playerColors = [
      { stroke: "#C0392B", fill: "rgba(192, 57, 43, 0.15)" }, // Đỏ rượu
      { stroke: "#176B78", fill: "rgba(23, 107, 120, 0.15)" }, // Xanh Teal
      { stroke: "#D35400", fill: "rgba(211, 84, 0, 0.15)" }, // Cam đất
      { stroke: "#8E44AD", fill: "rgba(142, 68, 173, 0.15)" }, // Tím
    ];

    // Vẽ đường cho từng người chơi
    players.forEach((player, pIdx) => {
      const col = playerColors[pIdx % playerColors.length];
      const coords = [];

      points.forEach((pt, idx) => {
        const val =
          pt.values[player.id] !== undefined ? pt.values[player.id] : 0;
        const px = x + (idx / (points.length - 1)) * w;
        const py = y + h - (Math.max(0, val) / maxVal) * h;
        coords.push({ px, py, val });
      });

      if (coords.length > 1) {
        // Vẽ đường cong nối các điểm
        ctx.strokeStyle = col.stroke;
        ctx.lineWidth = player.id === 0 ? 3.5 : 2.5;
        ctx.beginPath();
        ctx.moveTo(coords[0].px, coords[0].py);

        for (let i = 1; i < coords.length; i++) {
          ctx.lineTo(coords[i].px, coords[i].py);
        }
        ctx.stroke();

        // Vẽ chấm tròn tại điểm cuối
        const last = coords[coords.length - 1];
        ctx.fillStyle = col.stroke;
        ctx.beginPath();
        ctx.arc(last.px, last.py, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Vẽ Chú Thích (Legend) bên dưới biểu đồ
    const legendY = y + h + 28;
    let legendX = x;

    players.forEach((player, pIdx) => {
      const col = playerColors[pIdx % playerColors.length];
      ctx.fillStyle = col.stroke;
      ctx.fillRect(legendX, legendY - 8, 18, 6);

      ctx.beginPath();
      ctx.arc(legendX + 9, legendY - 5, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.textAlign = "left";
      ctx.fillStyle = "#2C3E50";
      ctx.font = "bold 13px 'Be Vietnam Pro', sans-serif";
      const name = player.name + (player.isBankrupt ? " (Phá sản)" : "");
      ctx.fillText(name, legendX + 24, legendY);

      legendX += ctx.measureText(name).width + 42;
    });
  }

  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

/**
 * GameSetupModal.js - Hộp thoại Khởi Tạo Ván Đấu & Chọn Số Lượng AI Bot
 */

import { GAME_TOKENS } from "../render/TokensData.js";

export class GameSetupModal {
  constructor(containerId = "setup-modal-container") {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.id = containerId;
      document.body.appendChild(this.container);
    }
  }

  show(onStartGame, onResumeGame = null, onCancel = null) {
    let selectedMode = "1v3"; // '1v1', '1v2', '1v3', 'hotseat'
    let selectedTokenIndex = 0;
    let playerName = "Tôi";
    let isFastMode = false;

    // Kiểm tra ván chơi đã lưu từ LocalStorage để tự động chọn đúng chế độ đang dở
    let savedData = null;
    try {
      const raw = localStorage.getItem("monopoly_saigon_save");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.state && Array.isArray(parsed.state.players)) {
          const activePlayers = parsed.state.players.filter(
            (p) => !p.isBankrupt,
          );
          if (activePlayers.length > 1) {
            savedData = parsed;

            // Tự động nhận diện đúng chế độ ván đang chơi dở
            if (savedData.mode) {
              selectedMode = savedData.mode;
            } else if (parsed.state.players.every((p) => p.isBot)) {
              selectedMode = "4bots";
            } else if (parsed.state.players.every((p) => !p.isBot)) {
              selectedMode = "hotseat";
            } else if (parsed.state.players.length === 2) {
              selectedMode = "1v1";
            } else if (parsed.state.players.length === 3) {
              selectedMode = "1v2";
            } else {
              selectedMode = "1v3";
            }

            // Khôi phục tên và quân cờ nếu có người chơi
            const humanP = parsed.state.players.find((p) => !p.isBot);
            if (humanP) {
              playerName = humanP.name || "Tôi";
              const tokenIdx = GAME_TOKENS.findIndex(
                (t) => t.id === humanP.token?.id || t.name === humanP.token?.name,
              );
              if (tokenIdx >= 0) selectedTokenIndex = tokenIdx;
            }

            if (savedData.fastMode || savedData.state?.fastMode) {
              isFastMode = true;
            }
          }
        }
      }
    } catch (e) {
      savedData = null;
    }

    const tokensHtml = GAME_TOKENS.map(
      (t, idx) => `
        <div class="token-choice-item ${idx === selectedTokenIndex ? "selected" : ""}" data-idx="${idx}">
          <div class="token-choice-icon" style="background: ${t.bgColor}">${t.svg}</div>
          <span class="token-choice-name">${t.name}</span>
        </div>
      `,
    ).join("");

    let resumeBannerHtml = "";
    if (savedData) {
      const totalSecs = savedData.secondsElapsed || 0;
      const mins = String(Math.floor(totalSecs / 60)).padStart(2, "0");
      const secs = String(totalSecs % 60).padStart(2, "0");
      const pNames = (savedData.state.players || [])
        .map((p) => p.name)
        .join(", ");
      resumeBannerHtml = `
        <div class="resume-game-banner">
          <div class="resume-info">
            <div class="resume-title">📂 PHÁT HIỆN VÁN ĐẤU ĐANG DỞ</div>
            <div class="resume-details">
              <span>Lượt ${savedData.turnCount || 1}</span> •
              <span>⏱️ ${mins}:${secs}</span> •
              <span>${savedData.state.players.length} người (${pNames})</span>
            </div>
          </div>
          <button id="btn-resume-game" class="btn-resume-game">▶️ TIẾP TỤC VÁN TRƯỚC</button>
        </div>
      `;
    }

    // Render khung Modal 1 lần duy nhất để tránh giật/nháy animation
    this.container.innerHTML = `
      <div class="modal-backdrop fade-in" id="setup-backdrop">
        <div class="setup-modal-card pop-in">
          <div class="setup-header">
            ${onCancel ? `<button id="btn-close-setup-modal" class="setup-close-btn" title="Đóng và tiếp tục ván hiện tại">&times;</button>` : ""}
            <div class="setup-logo">🎲</div>
            <h2>CỜ TỶ PHÚ SÀI GÒN</h2>
            <p class="setup-subtitle">Chọn chế độ chơi & cấu hình người chơi</p>
          </div>

          <div class="setup-body">
            ${resumeBannerHtml}

            <!-- Chọn chế độ chơi -->
            <div class="setup-section">
              <label class="setup-section-title">CHẾ ĐỘ CHƠI MỚI:</label>
              <div class="game-mode-grid">
                <div class="mode-card ${selectedMode === "1v3" ? "selected" : ""}" data-mode="1v3">
                  <div class="mode-icon">🤖🤖🤖</div>
                  <div class="mode-name">1 Người + 3 Máy</div>
                  <div class="mode-desc">Bàn cờ 4 người chuẩn</div>
                </div>
                <div class="mode-card ${selectedMode === "1v2" ? "selected" : ""}" data-mode="1v2">
                  <div class="mode-icon">🤖🤖</div>
                  <div class="mode-name">1 Người + 2 Máy</div>
                  <div class="mode-desc">Tốc độ vừa phải</div>
                </div>
                <div class="mode-card ${selectedMode === "1v1" ? "selected" : ""}" data-mode="1v1">
                  <div class="mode-icon">🤖</div>
                  <div class="mode-name">Đấu 1 vs 1</div>
                  <div class="mode-desc">Đối đầu kịch tính</div>
                </div>
                <div class="mode-card ${selectedMode === "hotseat" ? "selected" : ""}" data-mode="hotseat">
                  <div class="mode-icon">👥</div>
                  <div class="mode-name">4 Người Cùng Chơi</div>
                  <div class="mode-desc">Chuyền tay trên 1 máy</div>
                </div>
                <div class="mode-card mode-spectator ${selectedMode === "4bots" ? "selected" : ""}" data-mode="4bots" style="grid-column: span 2; background: linear-gradient(135deg, #FFF9F2, #F5EEF8); border-color: #D2B4DE;">
                  <div class="mode-icon">🤖⚔️🤖</div>
                  <div class="mode-name" style="color: #6C3483;">4 Máy Tự Đấu (Khán Giả / Mô Phỏng)</div>
                  <div class="mode-desc">Xem 4 Bot đại gia đấu trí tự động với tốc độ tùy chỉnh (1x - Turbo ⚡)</div>
                </div>
              </div>
            </div>

            <!-- Tên của bạn -->
            <div class="setup-section">
              <label class="setup-section-title">TÊN CỦA BẠN:</label>
              <input type="text" id="input-player-name" class="setup-input-name" value="${playerName}" placeholder="Nhập tên người chơi...">
            </div>

            <!-- Chọn quân cờ -->
            <div class="setup-section">
              <label class="setup-section-title">CHỌN QUÂN CỜ ĐẠI DIỆN:</label>
              <div class="token-choice-grid">
                ${tokensHtml}
              </div>
            </div>

            <!-- Tùy chọn Luật Chơi Nhanh -->
            <div class="setup-section">
              <label style="display: flex; align-items: center; justify-content: space-between; background: #FFF8E7; border: 1.5px solid #F39C12; border-radius: 10px; padding: 8px 12px; cursor: pointer;">
                <div style="display: flex; flex-direction: column; gap: 2px;">
                  <span style="font-size: 0.78rem; font-weight: 800; color: #B9770E;">⚡ Chế Độ Chơi Nhanh (Fast Mode)</span>
                  <span style="font-size: 0.68rem; color: #7F8C8D;">Phát sẵn 3 BĐS cho mỗi người để chiến nhau ngay!</span>
                </div>
                <input type="checkbox" id="check-fast-mode" ${isFastMode ? "checked" : ""} style="width: 18px; height: 18px; accent-color: #E67E22; cursor: pointer;">
              </label>
            </div>

            <!-- Quy tắc kết thúc ván: Giới hạn vòng vs Sinh tử vô hạn -->
            <div class="setup-section">
              <label class="setup-section-title">QUY TẮC KẾT THÚC VÁN:</label>
              <div class="endgame-rule-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <div class="endgame-card selected" id="opt-rounds-mode" style="border: 2px solid #E67E22; border-radius: 10px; padding: 8px 10px; background: #FFFDF9; cursor: pointer; transition: all 0.2s;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="font-size: 1rem;">⏱️</span>
                    <strong style="font-size: 0.78rem; color: #D35400;">Giới Hạn Vòng</strong>
                  </div>
                  <div style="font-size: 0.68rem; color: #7F8C8D; margin-top: 3px;">30 vòng (Nhanh) / 50 vòng (Chuẩn). Hết vòng so tài sản Net Worth.</div>
                </div>
                <div class="endgame-card" id="opt-endless-mode" style="border: 2px solid #BDC3C7; border-radius: 10px; padding: 8px 10px; background: #FAFAFA; cursor: pointer; transition: all 0.2s; opacity: 0.85;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="font-size: 1rem;">♾️</span>
                    <strong style="font-size: 0.78rem; color: #2C3E50;">Sinh Tử Vô Hạn</strong>
                  </div>
                  <div style="font-size: 0.68rem; color: #7F8C8D; margin-top: 3px;">Không trần số vòng, đấu đến khi đối thủ phá sản hết! Lương 2tr.</div>
                </div>
              </div>
            </div>
          </div>

          <div class="setup-footer">
            <button id="btn-start-game" class="btn-start-game">🚀 BẮT ĐẦU VÁN ĐẤU MỚI</button>
          </div>
        </div>
      </div>
    `;

    // Cập nhật DOM cục bộ khi chọn mode (không re-render toàn bộ)
    const updateModeSelection = (newMode) => {
      selectedMode = newMode;
      this.container.querySelectorAll(".mode-card").forEach((card) => {
        card.classList.toggle("selected", card.getAttribute("data-mode") === selectedMode);
      });
      const nameSection = this.container.querySelector("#input-player-name")?.closest(".setup-section");
      const tokenSection = this.container.querySelector(".token-choice-grid")?.closest(".setup-section");
      const is4Bots = selectedMode === "4bots";
      if (nameSection) {
        nameSection.style.opacity = is4Bots ? "0.4" : "1";
        nameSection.style.pointerEvents = is4Bots ? "none" : "auto";
      }
      if (tokenSection) {
        tokenSection.style.opacity = is4Bots ? "0.4" : "1";
        tokenSection.style.pointerEvents = is4Bots ? "none" : "auto";
      }
    };

    // Cập nhật DOM cục bộ khi chọn quân cờ (không re-render toàn bộ)
    const updateTokenSelection = (newIdx) => {
      selectedTokenIndex = newIdx;
      this.container.querySelectorAll(".token-choice-item").forEach((item) => {
        const idx = parseInt(item.getAttribute("data-idx"), 10);
        item.classList.toggle("selected", idx === selectedTokenIndex);
      });
    };

    // Event chọn mode
    this.container.querySelectorAll(".mode-card").forEach((card) => {
      card.onclick = () => {
        updateModeSelection(card.getAttribute("data-mode"));
      };
    });

    // Event chọn quân cờ
    this.container.querySelectorAll(".token-choice-item").forEach((item) => {
      item.onclick = () => {
        updateTokenSelection(parseInt(item.getAttribute("data-idx"), 10));
      };
    });

    // Input name
    const inputName = document.getElementById("input-player-name");
    if (inputName) {
      inputName.oninput = (e) => {
        playerName = e.target.value.trim() || "Tôi";
      };
    }

    // Checkbox Fast Mode
    const checkFast = document.getElementById("check-fast-mode");
    if (checkFast) {
      checkFast.onchange = (e) => {
        isFastMode = e.target.checked;
      };
    }

    // Toggle Giới Hạn Vòng vs Sinh Tử Vô Hạn
    let isEndless = false;
    const optRounds = document.getElementById("opt-rounds-mode");
    const optEndless = document.getElementById("opt-endless-mode");
    if (optRounds && optEndless) {
      const updateEndgameUI = (endless) => {
        isEndless = endless;
        if (!isEndless) {
          optRounds.style.borderColor = "#E67E22";
          optRounds.style.background = "#FFFDF9";
          optRounds.style.opacity = "1";
          optEndless.style.borderColor = "#BDC3C7";
          optEndless.style.background = "#FAFAFA";
          optEndless.style.opacity = "0.75";
        } else {
          optEndless.style.borderColor = "#16A085";
          optEndless.style.background = "#E8F8F5";
          optEndless.style.opacity = "1";
          optRounds.style.borderColor = "#BDC3C7";
          optRounds.style.background = "#FAFAFA";
          optRounds.style.opacity = "0.75";
        }
      };
      optRounds.onclick = () => updateEndgameUI(false);
      optEndless.onclick = () => updateEndgameUI(true);
    }

    // Nút Tiếp tục ván trước
    const btnResume = document.getElementById("btn-resume-game");
    if (btnResume && savedData) {
      btnResume.onclick = () => {
        this.hide();
        if (onResumeGame) onResumeGame(savedData);
      };
    }

    // Nút Đóng (✕) để quay lại ván đang chơi dở
    const btnClose = document.getElementById("btn-close-setup-modal");
    if (btnClose) {
      btnClose.onclick = () => {
        this.hide();
        if (onCancel) onCancel();
      };
    }

    const backdropEl = document.getElementById("setup-backdrop");
    if (backdropEl && onCancel) {
      backdropEl.onclick = (e) => {
        if (e.target === backdropEl) {
          this.hide();
          onCancel();
        }
      };
    }

    // Đồng bộ trạng thái ban đầu của mode được chọn (đặc biệt cho 4bots)
    updateModeSelection(selectedMode);

    // Nút bắt đầu ván mới
    const btnStart = document.getElementById("btn-start-game");
    if (btnStart) {
      btnStart.onclick = () => {
        try {
          localStorage.removeItem("monopoly_saigon_save");
        } catch (e) {}
        const finalName = inputName?.value.trim() || playerName || "Tôi";
        const players = this.buildPlayersConfig(
          selectedMode,
          finalName,
          selectedTokenIndex,
        );
        this.hide();
        if (onStartGame) onStartGame(players, { fastMode: isFastMode, isEndless, mode: selectedMode });
      };
    }
  }

  buildPlayersConfig(mode, humanName, humanTokenIdx) {
    const humanToken = GAME_TOKENS[humanTokenIdx];
    const otherTokens = GAME_TOKENS.filter((_, idx) => idx !== humanTokenIdx);

    // Tính cách rõ ràng:
    // Cô Ba Bọt: Đại Gia (gom đất, ép giá, tất tay khách sạn)
    // Bác Xích Lô: Cẩn Trọng (giữ nhiều tiền mặt, chắc chắn)
    // Tiệm Bánh / Sài Gòn Phố: Cân Bằng
    const botConfigs = [
      { name: "Cô Ba Bọt", personality: "tycoon", tag: "💎 Đại Gia" },
      { name: "Bác Xích Lô", personality: "cautious", tag: "🛡️ Cẩn Trọng" },
      { name: "Tiệm Bánh", personality: "balanced", tag: "⚖️ Cân Bằng" },
      { name: "Sài Gòn Phố", personality: "balanced", tag: "⚖️ Cân Bằng" },
    ];

    if (mode === "4bots") {
      return [
        {
          id: "p1",
          name: botConfigs[0].name,
          token: GAME_TOKENS[0],
          isBot: true,
          personality: botConfigs[0].personality,
        },
        {
          id: "p2",
          name: botConfigs[1].name,
          token: GAME_TOKENS[1],
          isBot: true,
          personality: botConfigs[1].personality,
        },
        {
          id: "p3",
          name: botConfigs[2].name,
          token: GAME_TOKENS[2],
          isBot: true,
          personality: botConfigs[2].personality,
        },
        {
          id: "p4",
          name: botConfigs[3].name,
          token: GAME_TOKENS[3],
          isBot: true,
          personality: botConfigs[3].personality,
        },
      ];
    }

    if (mode === "hotseat") {
      return [
        { id: "p1", name: humanName || "Bạn", token: humanToken, isBot: false },
        { id: "p2", name: "Cô Ba Bọt", token: otherTokens[0], isBot: false },
        { id: "p3", name: "Bác Xích Lô", token: otherTokens[1], isBot: false },
        { id: "p4", name: "Tiệm Bánh", token: otherTokens[2], isBot: false },
      ];
    }

    if (mode === "1v1") {
      return [
        { id: "p1", name: humanName || "Bạn", token: humanToken, isBot: false },
        {
          id: "p2",
          name: botConfigs[0].name,
          token: otherTokens[0],
          isBot: true,
          personality: botConfigs[0].personality,
        },
      ];
    }

    if (mode === "1v2") {
      return [
        { id: "p1", name: humanName || "Bạn", token: humanToken, isBot: false },
        {
          id: "p2",
          name: botConfigs[0].name,
          token: otherTokens[0],
          isBot: true,
          personality: botConfigs[0].personality,
        },
        {
          id: "p3",
          name: botConfigs[1].name,
          token: otherTokens[1],
          isBot: true,
          personality: botConfigs[1].personality,
        },
      ];
    }

    // Mặc định 1v3 (1 Người + 3 Máy)
    return [
      { id: "p1", name: humanName || "Bạn", token: humanToken, isBot: false },
      {
        id: "p2",
        name: botConfigs[0].name,
        token: otherTokens[0],
        isBot: true,
        personality: botConfigs[0].personality,
      },
      {
        id: "p3",
        name: botConfigs[1].name,
        token: otherTokens[1],
        isBot: true,
        personality: botConfigs[1].personality,
      },
      {
        id: "p4",
        name: botConfigs[2].name,
        token: otherTokens[2],
        isBot: true,
        personality: botConfigs[2].personality,
      },
    ];
  }

  hide() {
    this.container.innerHTML = "";
  }
}

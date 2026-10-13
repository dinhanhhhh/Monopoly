/**
 * GameSetupModal.js - Hộp thoại Khởi Tạo Ván Đấu & Chọn Số Lượng AI Bot
 */

import { GAME_TOKENS } from '../render/TokensData.js';

export class GameSetupModal {
  constructor(containerId = 'setup-modal-container') {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = containerId;
      document.body.appendChild(this.container);
    }
  }

  show(onStartGame) {
    let selectedMode = '1v3'; // '1v1', '1v2', '1v3', 'hotseat'
    let selectedTokenIndex = 0;
    let playerName = 'Tôi';

    const render = () => {
      const tokensHtml = GAME_TOKENS.slice(0, 4)
        .map((t, idx) => `
          <div class="token-choice-item ${idx === selectedTokenIndex ? 'selected' : ''}" data-idx="${idx}">
            <div class="token-choice-icon" style="background: ${t.bgColor}">${t.svg}</div>
            <span class="token-choice-name">${t.name}</span>
          </div>
        `)
        .join('');

      this.container.innerHTML = `
        <div class="modal-backdrop fade-in" id="setup-backdrop">
          <div class="setup-modal-card pop-in">
            <div class="setup-header">
              <div class="setup-logo">🎲</div>
              <h2>CỜ TỶ PHÚ SÀI GÒN</h2>
              <p class="setup-subtitle">Chọn chế độ chơi & cấu hình người chơi</p>
            </div>

            <div class="setup-body">
              <!-- Chọn chế độ chơi -->
              <div class="setup-section">
                <label class="setup-section-title">CHẾ ĐỘ CHƠI:</label>
                <div class="game-mode-grid">
                  <div class="mode-card ${selectedMode === '1v3' ? 'selected' : ''}" data-mode="1v3">
                    <div class="mode-icon">🤖🤖🤖</div>
                    <div class="mode-name">1 Người + 3 Máy</div>
                    <div class="mode-desc">Bàn cờ 4 người chuẩn</div>
                  </div>
                  <div class="mode-card ${selectedMode === '1v2' ? 'selected' : ''}" data-mode="1v2">
                    <div class="mode-icon">🤖🤖</div>
                    <div class="mode-name">1 Người + 2 Máy</div>
                    <div class="mode-desc">Tốc độ vừa phải</div>
                  </div>
                  <div class="mode-card ${selectedMode === '1v1' ? 'selected' : ''}" data-mode="1v1">
                    <div class="mode-icon">🤖</div>
                    <div class="mode-name">Đấu 1 vs 1</div>
                    <div class="mode-desc">Đối đầu kịch tính</div>
                  </div>
                  <div class="mode-card ${selectedMode === 'hotseat' ? 'selected' : ''}" data-mode="hotseat">
                    <div class="mode-icon">👥</div>
                    <div class="mode-name">4 Người Cùng Chơi</div>
                    <div class="mode-desc">Chuyền tay trên 1 máy</div>
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
            </div>

            <div class="setup-footer">
              <button id="btn-start-game" class="btn-start-game">🚀 BẮT ĐẦU VÁN ĐẤU</button>
            </div>
          </div>
        </div>
      `;

      // Event chọn mode
      this.container.querySelectorAll('.mode-card').forEach((card) => {
        card.onclick = () => {
          selectedMode = card.getAttribute('data-mode');
          render();
        };
      });

      // Event chọn quân cờ
      this.container.querySelectorAll('.token-choice-item').forEach((item) => {
        item.onclick = () => {
          selectedTokenIndex = parseInt(item.getAttribute('data-idx'), 10);
          render();
        };
      });

      // Input name
      const inputName = document.getElementById('input-player-name');
      if (inputName) {
        inputName.oninput = (e) => {
          playerName = e.target.value.trim() || 'Tôi';
        };
      }

      // Nút bắt đầu
      const btnStart = document.getElementById('btn-start-game');
      if (btnStart) {
        btnStart.onclick = () => {
          const players = this.buildPlayersConfig(selectedMode, playerName, selectedTokenIndex);
          this.hide();
          if (onStartGame) onStartGame(players);
        };
      }
    };

    render();
  }

  buildPlayersConfig(mode, humanName, humanTokenIdx) {
    const humanToken = GAME_TOKENS[humanTokenIdx];
    const otherTokens = GAME_TOKENS.filter((_, idx) => idx !== humanTokenIdx);

    const botNames = ['Cô Ba Bot 🤖', 'Tiệm Bánh Mì 🤖', 'Bác Xích Lô 🤖', 'Sài Gòn Phố 🤖'];

    if (mode === 'hotseat') {
      return [
        { id: 'p1', name: humanName || 'Người chơi 1', token: humanToken, isBot: false },
        { id: 'p2', name: 'Cô Ba Sài Gòn', token: otherTokens[0], isBot: false },
        { id: 'p3', name: 'Tiệm Bánh Mì', token: otherTokens[1], isBot: false },
        { id: 'p4', name: 'Bác Xích Lô', token: otherTokens[2], isBot: false }
      ];
    }

    if (mode === '1v1') {
      return [
        { id: 'p1', name: humanName || 'Bạn', token: humanToken, isBot: false },
        { id: 'p2', name: botNames[0], token: otherTokens[0], isBot: true }
      ];
    }

    if (mode === '1v2') {
      return [
        { id: 'p1', name: humanName || 'Bạn', token: humanToken, isBot: false },
        { id: 'p2', name: botNames[0], token: otherTokens[0], isBot: true },
        { id: 'p3', name: botNames[1], token: otherTokens[1], isBot: true }
      ];
    }

    // Mặc định 1v3 (1 Người + 3 Máy)
    return [
      { id: 'p1', name: humanName || 'Bạn', token: humanToken, isBot: false },
      { id: 'p2', name: botNames[0], token: otherTokens[0], isBot: true },
      { id: 'p3', name: botNames[1], token: otherTokens[1], isBot: true },
      { id: 'p4', name: botNames[2], token: otherTokens[2], isBot: true }
    ];
  }

  hide() {
    this.container.innerHTML = '';
  }
}

/**
 * OnlineLobbyModal.js - Giao diện Sảnh Phòng Chờ Chơi Trực Tuyến (Retro Style)
 */

import { GAME_TOKENS } from "../render/TokensData.js";
import { NetworkClient } from "../network/NetworkClient.js";

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export class OnlineLobbyModal {
  constructor(containerId = "online-lobby-modal-container") {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.id = containerId;
      document.body.appendChild(this.container);
    }
    this.client = new NetworkClient();
    this.currentView = "JOIN"; // 'JOIN' | 'LOBBY'
    this.roomData = null;
    this.selectedTokenIndex = 0;
    this.playerName = localStorage.getItem("monopoly_player_name") || "Cậu Ba Sài Gòn";
    this.roomId = sessionStorage.getItem("monopoly_room_id") || "saigon-1";
    this.onGameStartedCallback = null;
    this.onCancelCallback = null;
    this.isReady = false;
    this.isAutoReconnecting = false;

    this.setupNetworkListeners();
  }

  setupNetworkListeners() {
    this.client.on("joined", (data) => {
      if (data.isReconnect && data.gameState) {
        this.hide();
        if (this.onGameStartedCallback) {
          this.onGameStartedCallback({
            client: this.client,
            gameData: {
              state: data.gameState,
              seed: data.seed || (data.room && data.room.seed) || Date.now(),
              room: data.room,
            },
            myPlayerId: this.client.playerId,
          });
        }
        return;
      }

      this.currentView = "LOBBY";
      this.roomData = data.room;
      this.isReady = data.room.hostId === this.client.playerId;
      this.render();
    });

    this.client.on("roomState", (room) => {
      this.roomData = room;
      if (this.currentView === "LOBBY") {
        this.render();
      }
    });

    this.client.on("gameStarted", (data) => {
      this.hide();
      if (this.onGameStartedCallback) {
        this.onGameStartedCallback({
          client: this.client,
          gameData: data,
          myPlayerId: this.client.playerId,
        });
      }
    });

    this.client.on("error", (err) => {
      if (this.isAutoReconnecting) return;
      alert(`⚠️ ${err}`);
    });
  }

  /**
   * Thử tự động kết nối lại phòng online nếu có session hợp lệ trong sessionStorage
   * @param {Function} onGameStarted
   * @returns {Promise<boolean>} true nếu tái kết nối thành công, false nếu thất bại
   */
  async tryAutoReconnect(onGameStarted) {
    const roomId = sessionStorage.getItem("monopoly_room_id");
    const reconnectToken = sessionStorage.getItem("monopoly_reconnect_token");
    if (!roomId || !reconnectToken) return false;

    this.onGameStartedCallback = onGameStarted;
    this.isAutoReconnecting = true;

    return new Promise(async (resolve) => {
      let resolved = false;

      const finish = (result) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        this.isAutoReconnecting = false;
        cleanUp();
        resolve(result);
      };

      const timer = setTimeout(() => {
        finish(false);
      }, 3500);

      const unJoined = this.client.on("joined", () => {
        finish(true);
      });

      const unError = this.client.on("error", () => {
        finish(false);
      });

      const cleanUp = () => {
        if (typeof unJoined === "function") unJoined();
        if (typeof unError === "function") unError();
      };

      try {
        await this.client.connect();
        const playerName = localStorage.getItem("monopoly_player_name") || "Cậu Ba Sài Gòn";
        this.client.joinRoom(roomId, playerName, null);
      } catch (err) {
        finish(false);
      }
    });
  }

  show(onGameStarted, onCancel = null, initialData = {}) {
    this.onGameStartedCallback = onGameStarted;
    this.onCancelCallback = onCancel;
    this.currentView = "JOIN";

    if (initialData.name) {
      this.playerName = initialData.name;
    }
    if (initialData.tokenIndex !== undefined) {
      this.selectedTokenIndex = initialData.tokenIndex;
    }

    // Kết nối WebSocket
    this.client.connect().catch((err) => {
      console.warn("Chưa thể nối tới WebSocket:", err);
    });

    this.render();
  }

  hide() {
    this.container.innerHTML = "";
  }

  render() {
    if (this.currentView === "JOIN") {
      this.renderJoinView();
    } else {
      this.renderLobbyView();
    }
  }

  renderJoinView() {
    const tokensHtml = GAME_TOKENS.map(
      (t, idx) => `
        <div class="token-choice-item ${idx === this.selectedTokenIndex ? "selected" : ""}" data-idx="${idx}">
          <div class="token-choice-icon" style="background: ${t.bgColor}">${t.svg}</div>
          <span class="token-choice-name">${t.name}</span>
        </div>
      `,
    ).join("");

    this.container.innerHTML = `
      <div class="modal-backdrop fade-in" id="online-join-backdrop">
        <div class="setup-modal-card pop-in" style="max-width: 520px;">
          <div class="setup-modal-header">
            <div style="font-size: 1.8rem;">🌐</div>
            <div style="text-align: left;">
              <h2 style="font-size: 1.25rem; margin: 0; font-weight: 900; letter-spacing: 0.5px;">SẢNH ĐẤU TRỰC TUYẾN</h2>
              <div style="font-size: 0.75rem; opacity: 0.9;">Giao lưu tranh tài cùng đại gia Sài Thành qua mạng</div>
            </div>
            <button id="btn-close-lobby" style="margin-left: auto; background: none; border: none; font-size: 1.5rem; color: #FFF; cursor: pointer;">✕</button>
          </div>

          <div class="setup-modal-body">
            <div class="setup-section">
              <label class="setup-section-title">TÊN CỦA BẠN:</label>
              <input type="text" id="input-online-name" class="setup-input-name" value="${this.playerName}" placeholder="Nhập tên của bạn...">
            </div>

            <div class="setup-section">
              <label class="setup-section-title">CHỌN QUÂN CỜ ĐẠI DIỆN:</label>
              <div class="token-choice-grid">
                ${tokensHtml}
              </div>
            </div>

            <div class="setup-section">
              <label class="setup-section-title">MÃ PHÒNG (ROOM CODE):</label>
              <div style="display: flex; gap: 8px;">
                <input type="text" id="input-room-id" class="setup-input-name" value="${this.roomId}" placeholder="Ví dụ: saigon-vip, phong-1..." style="flex: 1; text-transform: lowercase;">
                <button id="btn-random-room" style="padding: 0 12px; background: #EAECEE; border: 1.5px solid #BDC3C7; border-radius: 8px; font-weight: 700; cursor: pointer;">🎲 Ngẫu nhiên</button>
              </div>
              <span style="font-size: 0.7rem; color: #7F8C8D; margin-top: 4px; display: block;">Nhập cùng mã phòng với bạn bè để cùng chơi chung 1 bàn!</span>
            </div>
          </div>

          <div class="setup-footer" style="display: flex; gap: 10px;">
            <button id="btn-join-room-action" class="btn-start-game" style="background: linear-gradient(135deg, #27AE60, #2ECC71); flex: 1;">
              ⚡ VÀO PHÒNG / TẠO PHÒNG
            </button>
          </div>
        </div>
      </div>
    `;

    // Events
    document.getElementById("btn-close-lobby").onclick = () => {
      this.hide();
      if (this.onCancelCallback) this.onCancelCallback();
    };

    document.querySelectorAll(".token-choice-item").forEach((el) => {
      el.onclick = () => {
        this.selectedTokenIndex = parseInt(el.getAttribute("data-idx"), 10);
        document.querySelectorAll(".token-choice-item").forEach((it) => {
          it.classList.toggle("selected", parseInt(it.getAttribute("data-idx"), 10) === this.selectedTokenIndex);
        });
      };
    });

    document.getElementById("input-online-name").oninput = (e) => {
      this.playerName = e.target.value.trim() || "Cậu Ba";
      localStorage.setItem("monopoly_player_name", this.playerName);
    };

    document.getElementById("input-room-id").oninput = (e) => {
      this.roomId = e.target.value.trim().toLowerCase();
    };

    document.getElementById("btn-random-room").onclick = () => {
      this.roomId = "sg-" + Math.floor(1000 + Math.random() * 9000);
      document.getElementById("input-room-id").value = this.roomId;
    };

    document.getElementById("btn-join-room-action").onclick = async () => {
      const selectedToken = GAME_TOKENS[this.selectedTokenIndex];
      const roomIdInput = document.getElementById("input-room-id");
      const nameInput = document.getElementById("input-online-name");
      const roomId = (roomIdInput ? roomIdInput.value.trim().toLowerCase() : this.roomId) || "saigon-1";
      const playerName = (nameInput ? nameInput.value.trim() : this.playerName) || "Cậu Ba";
      this.roomId = roomId;
      this.playerName = playerName;

      const btn = document.getElementById("btn-join-room-action");
      if (btn) {
        btn.textContent = "⏳ Đang kết nối máy chủ...";
        btn.disabled = true;
      }

      try {
        await this.client.connect();
        this.client.joinRoom(roomId, playerName, selectedToken.id);
      } catch (err) {
        console.error("Lỗi kết nối online:", err);
        alert("⚠️ Không thể kết nối tới máy chủ WebSocket. Hãy đảm bảo server đang chạy!");
        if (btn) {
          btn.textContent = "⚡ VÀO PHÒNG / TẠO PHÒNG";
          btn.disabled = false;
        }
      }
    };
  }

  renderLobbyView() {
    if (!this.roomData) return;
    const isHost = this.roomData.hostId === this.client.playerId;
    const players = this.roomData.players || [];
    const allReady = players.length >= 2 && players.every((p) => p.isReady);

    const slots = [0, 1, 2, 3].map((slotIdx) => {
      const p = players[slotIdx];
      if (p) {
        const tokenObj = GAME_TOKENS.find((t) => t.id === p.token) || GAME_TOKENS[slotIdx % GAME_TOKENS.length];
        const isMe = p.id === this.client.playerId;
        const isPlayerHost = p.id === this.roomData.hostId;

        return `
          <div style="border: 2px solid ${isMe ? '#27AE60' : '#BDC3C7'}; background: ${isMe ? '#E8F8F5' : '#FFF'}; border-radius: 12px; padding: 12px; display: flex; align-items: center; gap: 12px; position: relative;">
            <div style="width: 48px; height: 48px; border-radius: 50%; background: ${tokenObj.bgColor}; display: flex; align-items: center; justify-content: center; padding: 6px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
              ${tokenObj.svg}
            </div>
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <strong style="font-size: 0.95rem; color: #2C3E50; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${escapeHtml(p.name)} ${isMe ? '<span style="color: #27AE60; font-size: 0.75rem;">(Bạn)</span>' : ""}
                </strong>
                ${isPlayerHost ? '<span style="background: #F39C12; color: #FFF; font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 4px;">CHỦ PHÒNG</span>' : ""}
              </div>
              <div style="font-size: 0.75rem; color: #7F8C8D; margin-top: 2px;">
                ${p.isBot ? "🤖 Bot Tự Động" : (p.connected ? "🟢 Đang trực tuyến" : "🔴 Mất kết nối")}
              </div>
            </div>
            <div>
              <span style="font-size: 0.75rem; font-weight: 800; padding: 4px 8px; border-radius: 6px; ${p.isReady ? 'background: #D4EFDF; color: #1E8449;' : 'background: #FADBD8; color: #922B21;'}">
                ${p.isReady ? "✓ SẴN SÀNG" : "CHỜ..."}
              </span>
            </div>
            ${isHost && p.isBot ? `<button class="btn-remove-bot" data-botid="${p.id}" style="position: absolute; top: -6px; right: -6px; width: 22px; height: 22px; border-radius: 50%; background: #E74C3C; color: #FFF; border: none; font-size: 0.75rem; cursor: pointer; font-weight: 900;">✕</button>` : ""}
          </div>
        `;
      } else {
        return `
          <div style="border: 2px dashed #BDC3C7; background: #F9FAFC; border-radius: 12px; padding: 14px; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 8px; color: #95A5A6; font-size: 0.85rem;">
              <span>⏳</span> <em>Chờ người chơi vào...</em>
            </div>
            ${isHost ? `
              <div style="display: flex; gap: 6px;">
                <button class="btn-add-bot" data-type="balanced" style="font-size: 0.72rem; padding: 4px 8px; background: #EBF5FB; border: 1px solid #3498DB; color: #2980B9; border-radius: 6px; cursor: pointer; font-weight: 700;">+ Bot</button>
              </div>
            ` : ""}
          </div>
        `;
      }
    }).join("");

    const slotsContainer = document.getElementById("lobby-slots-container");
    if (slotsContainer) {
      // Đã có sảnh phòng chờ trên màn hình -> Chỉ cập nhật danh sách slots và footer để tránh giật/nháy màn hình
      slotsContainer.innerHTML = slots;
      const footerContainer = document.getElementById("lobby-footer-container");
      if (footerContainer) {
        footerContainer.innerHTML = `
          <button id="btn-leave-room" style="padding: 10px 16px; background: #BDC3C7; color: #2C3E50; border: none; border-radius: 8px; font-weight: 800; cursor: pointer;">
            🚪 RỜI PHÒNG
          </button>
          ${isHost ? `
            <button id="btn-start-online-game" class="btn-start-game" ${allReady ? "" : "disabled"} style="flex: 1; background: ${allReady ? 'linear-gradient(135deg, #E67E22, #D35400)' : '#BDC3C7'}; cursor: ${allReady ? 'pointer' : 'not-allowed'}; opacity: ${allReady ? '1' : '0.6'};">
              🚀 BẮT ĐẦU VÁN ĐẤU (${players.length}/4)
            </button>
          ` : `
            <button id="btn-toggle-ready" class="btn-start-game" style="flex: 1; background: ${this.isReady ? '#E74C3C' : 'linear-gradient(135deg, #27AE60, #2ECC71)'};">
              ${this.isReady ? "✕ HỦY SẴN SÀNG" : "✓ BẤM SẴN SÀNG"}
            </button>
          `}
        `;
      }
      this.bindLobbyEvents(isHost, allReady);
      return;
    }

    this.container.innerHTML = `
      <div class="modal-backdrop fade-in" id="online-lobby-backdrop">
        <div class="setup-modal-card pop-in" style="max-width: 550px;">
          <div class="setup-modal-header">
            <div style="text-align: left;">
              <div style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 1px; color: #E0F2FE;">PHÒNG THI ĐẤU TRỰC TUYẾN</div>
              <h2 style="font-size: 1.35rem; margin: 2px 0 0; font-weight: 900; color: #F1C40F;">#${this.roomData.id.toUpperCase()}</h2>
            </div>
            <button id="btn-copy-room" style="margin-left: auto; padding: 6px 12px; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); color: #FFF; border-radius: 6px; font-size: 0.75rem; cursor: pointer; font-weight: 700;">📋 Sao Chép Mã</button>
          </div>

          <div class="setup-modal-body">
            <div id="lobby-slots-container" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;">
              ${slots}
            </div>

            <div style="background: #FEF9E7; border: 1px solid #FAD7A0; border-radius: 8px; padding: 8px 12px; font-size: 0.75rem; color: #7D6608; display: flex; align-items: center; gap: 8px;">
              <span>💡</span>
              <span>Cần tối thiểu <strong>2 người chơi</strong> (hoặc thêm Bot) và tất cả đều bấm <strong>Sẵn Sàng</strong> để trận đấu bắt đầu.</span>
            </div>
          </div>

          <div class="setup-footer" id="lobby-footer-container" style="display: flex; gap: 10px;">
            <button id="btn-leave-room" style="padding: 10px 16px; background: #BDC3C7; color: #2C3E50; border: none; border-radius: 8px; font-weight: 800; cursor: pointer;">
              🚪 RỜI PHÒNG
            </button>
            ${isHost ? `
              <button id="btn-start-online-game" class="btn-start-game" ${allReady ? "" : "disabled"} style="flex: 1; background: ${allReady ? 'linear-gradient(135deg, #E67E22, #D35400)' : '#BDC3C7'}; cursor: ${allReady ? 'pointer' : 'not-allowed'}; opacity: ${allReady ? '1' : '0.6'};">
                🚀 BẮT ĐẦU VÁN ĐẤU (${players.length}/4)
              </button>
            ` : `
              <button id="btn-toggle-ready" class="btn-start-game" style="flex: 1; background: ${this.isReady ? '#E74C3C' : 'linear-gradient(135deg, #27AE60, #2ECC71)'};">
                ${this.isReady ? "✕ HỦY SẴN SÀNG" : "✓ BẤM SẴN SÀNG"}
              </button>
            `}
          </div>
        </div>
      </div>
    `;

    this.bindLobbyEvents(isHost, allReady);
  }

  bindLobbyEvents(isHost, allReady) {
    const btnCopy = document.getElementById("btn-copy-room");
    if (btnCopy) {
      btnCopy.onclick = () => {
        navigator.clipboard.writeText(this.roomData.id);
        alert(`Đã sao chép mã phòng: ${this.roomData.id}`);
      };
    }

    const btnLeave = document.getElementById("btn-leave-room");
    if (btnLeave) {
      btnLeave.onclick = () => {
        this.client.disconnect();
        this.currentView = "JOIN";
        this.render();
      };
    }

    document.querySelectorAll(".btn-add-bot").forEach((btn) => {
      btn.onclick = () => {
        this.client.addBot(btn.getAttribute("data-type") || "balanced");
      };
    });

    document.querySelectorAll(".btn-remove-bot").forEach((btn) => {
      btn.onclick = () => {
        this.client.removeBot(btn.getAttribute("data-botid"));
      };
    });

    if (isHost) {
      const btnStart = document.getElementById("btn-start-online-game");
      if (btnStart && allReady) {
        btnStart.onclick = () => {
          this.client.startGame();
        };
      }
    } else {
      const btnReady = document.getElementById("btn-toggle-ready");
      if (btnReady) {
        btnReady.onclick = () => {
          this.isReady = !this.isReady;
          this.client.setReady(this.isReady);
        };
      }
    }
  }
}

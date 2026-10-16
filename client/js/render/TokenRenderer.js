/**
 * TokenRenderer.js - Quản lý và hiển thị vị trí các quân cờ trên bàn cờ
 */

export class TokenRenderer {
  constructor(boardElement) {
    this.board = boardElement;
    this.isMoving = false;
    this._abortMovement = false;
  }

  /**
   * Dừng và hủy ngay lập tức chuyển động của quân cờ
   */
  stopMovement() {
    this.isMoving = false;
    this._abortMovement = true;
  }

  /**
   * Render toàn bộ quân cờ dựa trên danh sách người chơi
   * @param {Array} players - Mảng danh sách người chơi
   */
  render(players) {
    // Xóa sạch toàn bộ quân cờ và khung chứa cũ trước khi vẽ lại
    const existingGrids = this.board.querySelectorAll(".tile-tokens-grid");
    existingGrids.forEach((el) => el.remove());
    const existingTokens = this.board.querySelectorAll(".player-token");
    existingTokens.forEach((el) => el.remove());

    // Nhóm người chơi theo vị trí ô cờ để xếp cụm không bị đè nhau
    const tileGroups = {};
    players.forEach((player) => {
      if (player.isBankrupt) return;
      const pos = player.position ?? 0;
      if (!tileGroups[pos]) tileGroups[pos] = [];
      tileGroups[pos].push(player);
    });

    // Lấy vùng chứa tù nhân nếu có
    const jailSlot = this.board.querySelector("#jail-inmate-tokens-slot");
    if (jailSlot) jailSlot.innerHTML = "";

    // Vẽ từng quân cờ vào đúng ô theo lưới 2x2 ở góc ô
    Object.entries(tileGroups).forEach(([posStr, group]) => {
      const pos = parseInt(posStr, 10);
      const targetTile = document.getElementById(`tile-${pos}`);
      if (!targetTile) return;

      const gridEl = document.createElement("div");
      gridEl.className = "tile-tokens-grid";

      group.forEach((player) => {
        const tokenEl = document.createElement("div");
        tokenEl.id = `player-token-${player.id}`;
        tokenEl.className = "player-token";
        tokenEl.dataset.playerId = player.id;
        tokenEl.dataset.position = pos;

        tokenEl.style.backgroundColor =
          player.token?.color || player.token?.bgColor || "#176B78";

        tokenEl.innerHTML = `
          <div class="token-svg">${player.token?.svg || ""}</div>
        `;

        tokenEl.title = `${player.name} (${player.token?.name || ""}) - Ô: ${pos}${player.inJail ? " [Đang ở tù]" : ""}`;

        // Nếu người chơi đang ở tù tại ô 10 -> đưa vào buồng giam
        if (pos === 10 && player.inJail && jailSlot) {
          jailSlot.appendChild(tokenEl);
        } else {
          gridEl.appendChild(tokenEl);
        }
      });

      if (gridEl.children.length > 0) {
        targetTile.appendChild(gridEl);
      }
    });
  }

  /**
   * Di chuyển quân cờ từng bước một (Step-by-step movement animation)
   * @param {Object} player - Người chơi cần di chuyển
   * @param {Number} steps - Số bước cần đi (ví dụ 7 bước)
   * @param {Array} allPlayers - Danh sách tất cả người chơi để duy trì render
   * @param {Function} callbacks - { onStep, onPassedGo, onComplete }
   */
  async moveStepByStep(
    player,
    steps,
    allPlayers,
    callbacks = {},
    stepDelay = 220,
  ) {
    if (this.isMoving) return;
    this.isMoving = true;
    this._abortMovement = false;

    // Chế độ Siêu Tốc (Turbo): nhảy tức thì không cần delay từng bước
    if (stepDelay <= 0) {
      if (this._abortMovement) {
        this.isMoving = false;
        return;
      }
      const prevPos = player.position ?? 0;
      const targetPos = (prevPos + steps) % 40;
      const passedGo = prevPos + steps >= 40;

      player.position = targetPos;
      this.render(allPlayers);

      if (this._abortMovement) {
        this.isMoving = false;
        return;
      }

      if (passedGo && callbacks.onPassedGo) {
        callbacks.onPassedGo(player);
      }

      this.isMoving = false;
      if (!this._abortMovement && callbacks.onComplete) {
        callbacks.onComplete(player, targetPos);
      }
      return;
    }

    for (let step = 1; step <= steps; step++) {
      if (this._abortMovement) {
        this.isMoving = false;
        return;
      }

      const prevPos = player.position ?? 0;
      const nextPos = (prevPos + 1) % 40;
      player.position = nextPos;

      // Render lại vị trí mới
      this.render(allPlayers);

      // Thêm class nhảy nảy (bounce) vào quân cờ vừa di chuyển
      const tokenEl = document.getElementById(`player-token-${player.id}`);
      if (tokenEl) {
        tokenEl.classList.add("token-hopping");
      }

      // Kiểm tra nếu vừa đi qua hoặc dừng tại ô 0 (Khởi Hành GO)
      if (nextPos === 0 && callbacks.onPassedGo) {
        callbacks.onPassedGo(player);
      }

      if (callbacks.onStep) {
        callbacks.onStep(player, nextPos, step, steps);
      }

      // Chờ theo tốc độ bước nhảy
      await new Promise((resolve) => setTimeout(resolve, stepDelay));
      if (this._abortMovement) {
        this.isMoving = false;
        return;
      }
    }

    this.isMoving = false;
    if (!this._abortMovement && callbacks.onComplete) {
      callbacks.onComplete(player, player.position);
    }
  }

  /**
   * Hiển thị bong bóng cảm xúc (Emotes) động nổi lên ngay trên quân cờ
   * @param {string|number} playerId - ID người chơi
   * @param {string} emoji - Icon cảm xúc (😭, 🤑, 😡, 😎,...)
   * @param {number} duration - Thời gian hiển thị (ms)
   */
  showEmote(playerId, emoji, duration = 2600) {
    const tokenEl = document.getElementById(`player-token-${playerId}`);
    if (!tokenEl || !this.board) return;

    // Xóa bong bóng cũ của người chơi này nếu đang có
    const existingOld = this.board.querySelector(
      `.token-emote-bubble[data-player-id="${playerId}"]`,
    );
    if (existingOld) existingOld.remove();

    const boardRect = this.board.getBoundingClientRect();
    const tokenRect = tokenEl.getBoundingClientRect();

    // Tính tọa độ tâm quân cờ so với board, kẹp khoảng cách an toàn không tràn mép 2 bên
    let left = tokenRect.left - boardRect.left + tokenRect.width / 2;
    left = Math.max(28, Math.min(boardRect.width - 28, left));

    const topDistFromBoardTop = tokenRect.top - boardRect.top;
    const isNearTopEdge = topDistFromBoardTop < 55; // Nếu ở hàng trên cùng của bàn cờ

    const bubble = document.createElement("div");
    bubble.className = `token-emote-bubble ${isNearTopEdge ? "bubble-below" : "bubble-above"}`;
    bubble.dataset.playerId = playerId;
    bubble.style.left = `${left}px`;

    if (isNearTopEdge) {
      // Đặt ở phía dưới quân cờ, hướng vào khoảng không gian bao la của lòng bàn cờ
      const top = tokenRect.bottom - boardRect.top + 4;
      bubble.style.top = `${top}px`;
    } else {
      // Đặt ở phía trên quân cờ bình thường
      const top = tokenRect.top - boardRect.top - 4;
      bubble.style.top = `${top}px`;
    }

    bubble.innerHTML = `
      <span class="emote-glyph">${emoji}</span>
      <div class="emote-tail"></div>
    `;

    this.board.appendChild(bubble);

    setTimeout(() => {
      bubble.classList.add("fade-out");
      setTimeout(() => bubble.remove(), 420);
    }, duration);
  }
}

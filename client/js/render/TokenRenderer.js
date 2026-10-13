/**
 * TokenRenderer.js - Quản lý và hiển thị vị trí các quân cờ trên bàn cờ
 */

export class TokenRenderer {
  constructor(boardElement) {
    this.board = boardElement;
    this.isMoving = false;
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
  async moveStepByStep(player, steps, allPlayers, callbacks = {}) {
    if (this.isMoving) return;
    this.isMoving = true;

    for (let step = 1; step <= steps; step++) {
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

      // Chờ 250ms cho mỗi bước chân nhảy
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    this.isMoving = false;
    if (callbacks.onComplete) {
      callbacks.onComplete(player, player.position);
    }
  }
}

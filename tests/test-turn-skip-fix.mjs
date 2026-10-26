import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { GameRoom } from "../server/room.js";

describe("Khắc Phục Lỗi Nhảy Lượt & Quản Lý Mã Lượt (Turn Safety & Stale Rejection)", () => {
  let activeRooms = [];

  afterEach(() => {
    for (const r of activeRooms) {
      r.clearTimers();
    }
    activeRooms = [];
  });

  it("1. Chặn END_TURN non khi chưa tung xúc xắc và di chuyển (TURN_NOT_FINISHED)", () => {
    const room = new GameRoom("test-turn-protect-1", { turnTimeoutSec: 25 });
    activeRooms.push(room);

    room.join({ readyState: 1, send: () => {} }, { playerName: "Player A" });
    room.join({ readyState: 1, send: () => {} }, { playerName: "Player B" });
    room.setReady("p1", true);
    room.setReady("p2", true);
    room.startGame("p1");

    assert.strictEqual(room.turnId, 1, "Mã lượt ban đầu phải là 1");
    assert.strictEqual(room.engine.state.turnState, "WAIT_ROLL", "Pha ban đầu phải là WAIT_ROLL");

    // Player A không thể END_TURN khi chưa xong lượt
    const prematureRes = room.handleAction("p1", { type: "END_TURN", turnId: 1 });
    assert.strictEqual(prematureRes.success, false, "Server phải từ chối END_TURN khi chưa kết thúc lượt");
    assert.strictEqual(prematureRes.code, "TURN_NOT_FINISHED");
  });

  it("2. Tung xúc xắc, di chuyển xong thật rồi mới END_TURN; chặn Stale TurnId", () => {
    const room = new GameRoom("test-turn-protect-2", { turnTimeoutSec: 25 });
    activeRooms.push(room);

    room.join({ readyState: 1, send: () => {} }, { playerName: "Player A" });
    room.join({ readyState: 1, send: () => {} }, { playerName: "Player B" });
    room.setReady("p1", true);
    room.setReady("p2", true);
    room.startGame("p1");

    // 1. Player A tung xúc xắc thật
    const rollRes = room.handleAction("p1", { type: "ROLL_DICE" });
    assert.strictEqual(rollRes.success, true, "Player A tung xúc xắc thành công");
    const lastRoll = room.engine.state.lastRoll;
    assert.ok(lastRoll && lastRoll.total >= 2, "Có kết quả gieo xúc xắc");
    // Đảm bảo không rơi vào luật tung đôi thêm lượt (Doubles) để kiểm tra chuyển lượt sang Player B
    room.engine.state.lastRoll.isDoubles = false;

    // 2. Player A hoàn tất di chuyển
    const targetPos = (room.engine.getCurrentPlayer().position + lastRoll.total) % 40;
    const moveRes = room.handleAction("p1", { type: "COMPLETE_MOVEMENT", position: targetPos });
    assert.strictEqual(moveRes.success, true, "Hoàn tất di chuyển thành công");

    // 3. Nếu rơi vào ô đất trống hỏi mua, từ chối mua để về pha END_TURN
    if (room.engine.state.pendingAction?.type === "BUY_PROMPT") {
      room.handleAction("p1", { type: "DECLINE_BUY" });
    } else if (room.engine.state.pendingAction?.type === "CARD_PROMPT") {
      room.handleAction("p1", { type: "CLOSE_CARD" });
    }

    assert.strictEqual(
      room.engine.state.turnState,
      "END_TURN",
      "Player A đã hoàn thành trọn vẹn lượt đi và sẵn sàng kết thúc lượt",
    );

    // 4. Player A gửi END_TURN với turnId cũ (ví dụ 0) -> Bị từ chối
    const staleRes = room.handleAction("p1", { type: "END_TURN", turnId: 0 });
    assert.strictEqual(staleRes.success, false, "Server phải chặn END_TURN có turnId cũ (Stale turnId)");

    // 5. Player A gửi END_TURN đúng turnId hiện tại (1) -> Thành công
    const validRes = room.handleAction("p1", { type: "END_TURN", turnId: 1 });
    assert.strictEqual(validRes.success, true, "Server chấp nhận END_TURN đúng turnId");
    assert.strictEqual(room.turnId, 2, "Server phải tăng mã lượt lên 2");
    assert.strictEqual(room.engine.getCurrentPlayer().id, "p2", "Lượt chuyển sang Player B");

    // 6. Gửi trễ turnId = 1 khi đang là lượt của B -> Bị từ chối
    const lateRes = room.handleAction("p1", { type: "END_TURN", turnId: 1 });
    assert.strictEqual(lateRes.success, false, "Server chặn lệnh trễ từ lượt cũ");
  });

  it("3. Bot online tự động thực thi lượt trên Server khi chuyển sang lượt bot", async () => {
    const roomBot = new GameRoom("test-bot-room", { turnTimeoutSec: 25 });
    activeRooms.push(roomBot);

    roomBot.join({ readyState: 1, send: () => {} }, { playerName: "Host User" });
    roomBot.addBot("balanced"); // p2 là Bot
    roomBot.setReady("p1", true);
    roomBot.startGame("p1");

    // Host hoàn thành lượt thật
    const roll = roomBot.handleAction("p1", { type: "ROLL_DICE" });
    assert.ok(roll.success);
    const target = (roomBot.engine.getCurrentPlayer().position + roomBot.engine.state.lastRoll.total) % 40;
    roomBot.handleAction("p1", { type: "COMPLETE_MOVEMENT", position: target });
    if (roomBot.engine.state.pendingAction?.type === "BUY_PROMPT") {
      roomBot.handleAction("p1", { type: "DECLINE_BUY" });
    } else if (roomBot.engine.state.pendingAction?.type === "CARD_PROMPT") {
      roomBot.handleAction("p1", { type: "CLOSE_CARD" });
    }

    roomBot.handleAction("p1", { type: "END_TURN", turnId: 1 });
    assert.strictEqual(roomBot.engine.getCurrentPlayer().id, "p2", "Lượt đã chuyển sang bot p2");
    assert.strictEqual(roomBot.engine.getCurrentPlayer().isBot, true, "p2 là bot");

    // Kiểm tra bot timer đã được kích hoạt
    assert.ok(roomBot.botTimer !== null, "Bot timer phải được khởi tạo trên server");

    // Chờ bot timer kích hoạt tự động
    await new Promise((resolve) => setTimeout(resolve, 1100));
    assert.notStrictEqual(roomBot.engine.state.turnState, "WAIT_ROLL", "Bot đã tự động hành động trên server");
  });

  it("4. Server Timeout tự động hành động cho người chơi AFK và cập nhật an toàn", async () => {
    const roomTimeout = new GameRoom("test-timeout-room", { turnTimeoutSec: 1 });
    activeRooms.push(roomTimeout);

    roomTimeout.join({ readyState: 1, send: () => {} }, { playerName: "AFK Player" });
    roomTimeout.join({ readyState: 1, send: () => {} }, { playerName: "Active Player" });
    roomTimeout.setReady("p1", true);
    roomTimeout.setReady("p2", true);
    roomTimeout.startGame("p1");

    assert.strictEqual(roomTimeout.turnId, 1);
    assert.ok(roomTimeout.turnTimer !== null, "turnTimer phải đang đếm lùi");

    // Chờ timeout 1s hết hạn
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // Sau timeout, p1 phải tự động roll hoặc di chuyển
    assert.notStrictEqual(
      roomTimeout.engine.state.turnState,
      "WAIT_ROLL",
      "Server timeout đã tự động kích hoạt hành động cho người chơi AFK",
    );
  });
});

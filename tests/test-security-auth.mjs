import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { GameRoom } from "../server/room.js";
import {
  createTestServer,
  connectClient,
  waitForMessage,
  sendAndWait,
  httpGet,
  destroyClient,
} from "./helpers/test-server-helper.mjs";

describe("P1: Kiểm Thử Phân Quyền & An Toàn Bảo Mật (Security & Authorization)", () => {
  let testServer;
  let wsUrl;
  let httpUrl;

  before(async () => {
    testServer = await createTestServer(0);
    wsUrl = testServer.wsUrl;
    httpUrl = testServer.httpUrl;
  });

  after(async () => {
    if (testServer) {
      await testServer.close();
    }
  });

  it("1. Ma trận phân quyền: Chặn action sai lượt, sai pha và thao tác trái phép đất người khác", () => {
    const room = new GameRoom("test-auth-matrix", { turnTimeoutSec: 25 });
    room.join({ readyState: 1, send: () => {} }, { playerName: "Alice" });
    room.join({ readyState: 1, send: () => {} }, { playerName: "Bob" });
    room.setReady("p1", true);
    room.setReady("p2", true);
    room.startGame("p1");

    // Hiện tại là lượt của p1 (Alice)
    assert.strictEqual(room.engine.getCurrentPlayer().id, "p1");

    // 1a. Người gửi sai lượt: Bob (p2) cố tình gửi ROLL_DICE khi đang lượt Alice
    const wrongTurnRoll = room.handleAction("p2", { type: "ROLL_DICE" });
    assert.strictEqual(wrongTurnRoll.success, false, "Server phải chặn hành động của người chơi chưa tới lượt");
    assert.strictEqual(wrongTurnRoll.error, "Chưa tới lượt của bạn");

    // 1b. Bob cố tình gửi END_TURN
    const wrongTurnEnd = room.handleAction("p2", { type: "END_TURN", turnId: 1 });
    assert.strictEqual(wrongTurnEnd.success, false);
    assert.strictEqual(wrongTurnEnd.error, "Chưa tới lượt của bạn");

    // 1c. Đúng lượt nhưng sai pha: Alice gửi END_TURN khi đang WAIT_ROLL
    const wrongPhaseEnd = room.handleAction("p1", { type: "END_TURN", turnId: 1 });
    assert.strictEqual(wrongPhaseEnd.success, false);
    assert.strictEqual(wrongPhaseEnd.code, "TURN_NOT_FINISHED");

    // 1d. Thao tác đất của người khác: Alice gửi BUILD_HOUSE trên ô đất không sở hữu
    const unownedBuild = room.handleAction("p1", { type: "BUILD_HOUSE", tileId: 1 });
    assert.strictEqual(unownedBuild.success, false);
    assert.strictEqual(unownedBuild.error, "Bạn không sở hữu bất động sản này");

    // 1e. Đấu giá khi không có phiên đấu giá
    const invalidBid = room.handleAction("p1", { type: "BID_AUCTION", amount: 500_000 });
    assert.strictEqual(invalidBid.success, false);
    assert.strictEqual(invalidBid.error, "Không có phiên đấu giá nào đang diễn ra");

    room.clearTimers();
  });

  it("2. Chống giả mạo người khởi xướng (Forged senderId) trong EXECUTE_TRADE", () => {
    const room = new GameRoom("test-forged-trade", { turnTimeoutSec: 25 });
    room.join({ readyState: 1, send: () => {} }, { playerName: "Attacker" });
    room.join({ readyState: 1, send: () => {} }, { playerName: "Victim" });
    room.setReady("p1", true);
    room.setReady("p2", true);
    room.startGame("p1");

    // Attacker (p1) mạo danh Victim (p2) bằng cách gán senderId: "p2" trong offer
    const forgedAction = {
      type: "EXECUTE_TRADE",
      offer: {
        senderId: "p2", // Giả mạo p2 làm người chuyển tiền/đất
        receiverId: "p1",
        offerMoney: 10_000_000,
        requestMoney: 0,
        offerTiles: [],
        requestTiles: [],
      },
    };

    const res = room.handleAction("p1", forgedAction);
    assert.strictEqual(res.success, false, "Server phải chặn giao dịch giả mạo senderId");
    assert.strictEqual(res.error, "Bạn chỉ có thể thực hiện đề nghị giao dịch do chính mình gửi");

    room.clearTimers();
  });

  it("3. Quét tin nhắn server broadcast: Không làm lộ PRNG seed hoặc thứ tự các bộ bài ẩn", async () => {
    const ws1 = await connectClient(wsUrl);
    const ws2 = await connectClient(wsUrl);

    try {
      const roomId = "sec-leak-test";
      await sendAndWait(ws1, { type: "JOIN_ROOM", roomId, playerName: "PlayerA" }, (m) => m.type === "JOINED_SUCCESS");
      await sendAndWait(ws2, { type: "JOIN_ROOM", roomId, playerName: "PlayerB" }, (m) => m.type === "JOINED_SUCCESS");

      // PlayerB sẵn sàng
      ws2.send(JSON.stringify({ type: "SET_READY", isReady: true }));
      await waitForMessage(ws1, (m) => m.type === "ROOM_STATE" && m.room.players.find((p) => p.name === "PlayerB")?.isReady);

      // Host start game
      ws1.send(JSON.stringify({ type: "START_GAME" }));
      const startMsg = await waitForMessage(ws1, (m) => m.type === "GAME_STARTED");

      // Quét bảo mật trong state broadcast
      assert.strictEqual(startMsg.state.seed, undefined, "Bảo mật: State không được lộ seed");
      assert.strictEqual(startMsg.state.chanceDeck, undefined, "Bảo mật: State không được lộ chanceDeck");
      assert.strictEqual(startMsg.state.chestDeck, undefined, "Bảo mật: State không được lộ chestDeck");

      // Nhưng vẫn gửi số lượng bài còn lại trong kho
      assert.ok(typeof startMsg.state.chanceDeckRemaining === "number", "Có số bài Cơ Hội còn lại");
      assert.ok(typeof startMsg.state.chestDeckRemaining === "number", "Có số bài Khí Vận còn lại");

      // Roll xúc xắc và kiểm tra ACTION_RESULT broadcast
      ws1.send(JSON.stringify({ type: "GAME_ACTION", action: { type: "ROLL_DICE" } }));
      const actionMsg = await waitForMessage(ws2, (m) => m.type === "ACTION_RESULT");
      assert.strictEqual(actionMsg.state.seed, undefined, "ACTION_RESULT không được chứa seed");
      assert.strictEqual(actionMsg.state.chanceDeck, undefined, "ACTION_RESULT không được chứa chanceDeck");
      assert.strictEqual(actionMsg.state.chestDeck, undefined, "ACTION_RESULT không được chứa chestDeck");
    } finally {
      destroyClient(ws1);
      destroyClient(ws2);
    }
  });

  it("4. Khử mã độc HTML (XSS Sanitization) trong tên người chơi", () => {
    const room = new GameRoom("test-xss-sanitize");
    const maliciousName = "<script>alert('XSS')</script>Hacker<img src=x onerror=alert(1)>";
    const res = room.join({ readyState: 1, send: () => {} }, { playerName: maliciousName });

    assert.strictEqual(res.success, true);
    const client = room.clients.get("p1");
    assert.ok(client, "Người chơi đã vào phòng");

    // Tên sau khi lọc sạch không được chứa ký tự < hoặc >
    assert.strictEqual(client.info.name.includes("<"), false, "Tên không được chứa ký tự <");
    assert.strictEqual(client.info.name.includes(">"), false, "Tên không được chứa ký tự >");
    assert.strictEqual(client.info.name.includes("<script>"), false, "Tên không được chứa thẻ script");
  });

  it("5. Chặn Payload WebSocket quá lớn (> 64KB) chống tấn công DoS", async () => {
    const ws = await connectClient(wsUrl);

    try {
      // Chuỗi rác 100KB vượt ngưỡng maxPayload 64KB
      const largeData = "A".repeat(100 * 1024);
      const bombPayload = JSON.stringify({ type: "CHAT", message: largeData });

      const closePromise = new Promise((resolve) => {
        ws.on("close", (code) => resolve({ closed: true, code }));
        ws.on("error", (err) => resolve({ error: err }));
      });

      ws.send(bombPayload);

      const result = await Promise.race([
        closePromise,
        new Promise((resolve) => setTimeout(() => resolve({ timeout: true }), 2000)),
      ]);

      // Server thư viện ws tự động drop kết nối (code 1009 - Message too big)
      assert.ok(
        result.closed || result.error,
        "Server phải đóng kết nối hoặc báo lỗi khi client gửi payload vượt quá 64KB",
      );
    } finally {
      destroyClient(ws);
    }
  });

  it("6. Chặn Path Traversal (Directory Traversal) trên HTTP Static Server", async () => {
    // 6a. Thử thoát thư mục đọc package.json
    const res1 = await httpGet(`${httpUrl}/../../package.json`);
    assert.strictEqual(res1.status, 403, "Truy cập tệp thoát thư mục phải trả về 403 Forbidden");

    // 6b. Thử truy cập trực tiếp mã nguồn server
    const res2 = await httpGet(`${httpUrl}/server/server.mjs`);
    assert.strictEqual(res2.status, 403, "Truy cập thư mục server nội bộ phải trả về 403 Forbidden");

    // 6c. Thử truy cập thư mục git
    const res3 = await httpGet(`${httpUrl}/.git/config`);
    assert.strictEqual(res3.status, 403, "Truy cập .git phải trả về 403 Forbidden");
  });
});

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { createTestServer, connectClient, waitForMessage, sendAndWait, destroyClient, httpGet } from "./helpers/test-server-helper.mjs";

describe("Tích Hợp WebSocket Server (Multiplayer 2 Clients)", () => {
  let serverInstance;
  let ws1;
  let ws2;
  const TEST_ROOM_ID = `saigon-test-${Date.now()}`;

  before(async () => {
    // Khởi tạo server động trên cổng ngẫu nhiên listen(0)
    serverInstance = await createTestServer();
  });

  after(async () => {
    destroyClient(ws1);
    destroyClient(ws2);
    if (serverInstance) await serverInstance.close();
  });

  it("1. HTTP Server & Health Check trả về status: ok", async () => {
    const res = await httpGet(`${serverInstance.httpUrl}/health`);
    assert.strictEqual(res.status, 200, "Mã phản hồi HTTP phải là 200");
    const health = res.json();
    assert.strictEqual(health.status, "ok", "Server health check phải trả về status: ok");
  });

  it("2. Client 1 (Host) kết nối và tạo phòng thành công", async () => {
    ws1 = await connectClient(serverInstance.wsUrl);
    assert.strictEqual(ws1.readyState, 1, "Client 1 phải ở trạng thái OPEN");

    const p1Data = await sendAndWait(
      ws1,
      {
        type: "JOIN_ROOM",
        roomId: TEST_ROOM_ID,
        playerName: "Trương Định An",
        token: "car",
      },
      (msg) => msg.type === "JOINED_SUCCESS",
    );

    assert.strictEqual(p1Data.playerId, "p1", "Client 1 phải được gán ID p1 (Host)");
    assert.strictEqual(p1Data.roomId, TEST_ROOM_ID);
  });

  it("3. Client 2 (Khách) kết nối và tham gia cùng phòng", async () => {
    ws2 = await connectClient(serverInstance.wsUrl);
    assert.strictEqual(ws2.readyState, 1, "Client 2 phải ở trạng thái OPEN");

    const p2Data = await sendAndWait(
      ws2,
      {
        type: "JOIN_ROOM",
        roomId: TEST_ROOM_ID,
        playerName: "Võ Thị Bình",
        token: "hat",
      },
      (msg) => msg.type === "JOINED_SUCCESS",
    );

    assert.strictEqual(p2Data.playerId, "p2", "Client 2 phải được gán ID p2");
  });

  it("4. Bắt đầu trận đấu và đồng bộ trạng thái GAME_STARTED cho cả 2 client", async () => {
    // Client 2 sẵn sàng
    ws2.send(JSON.stringify({ type: "SET_READY", isReady: true }));

    // Đặt listener chờ GAME_STARTED trên cả 2 socket
    const waitStartP1 = waitForMessage(ws1, (msg) => msg.type === "GAME_STARTED");
    const waitStartP2 = waitForMessage(ws2, (msg) => msg.type === "GAME_STARTED");

    // Host bấm bắt đầu
    ws1.send(JSON.stringify({ type: "START_GAME" }));

    const [startedP1, startedP2] = await Promise.all([waitStartP1, waitStartP2]);
    assert.ok(startedP1, "Client 1 phải nhận GAME_STARTED");
    assert.ok(startedP2, "Client 2 phải nhận GAME_STARTED");
    assert.strictEqual(startedP1.room.status, "PLAYING");
  });

  it("5. Chặn thao tác trái lượt (Anti-Cheat / Turn Enforcement)", async () => {
    // p1 đi trước -> p2 cố tình tung xúc xắc lén sẽ bị từ chối
    const p2Wait = waitForMessage(ws2, (msg) => msg.type === "ACTION_FAILED");

    ws2.send(
      JSON.stringify({
        type: "GAME_ACTION",
        action: { type: "ROLL_DICE", val1: 6, val2: 6 },
      }),
    );

    const failMsg = await p2Wait;
    assert.strictEqual(failMsg.error, "Chưa tới lượt của bạn", "Server phải chặn thao tác khi chưa tới lượt");
  });

  it("6. Người chơi đúng lượt (p1) tung xúc xắc hợp lệ và broadcast đồng bộ", async () => {
    const p1RollWait = waitForMessage(
      ws1,
      (msg) => msg.type === "ACTION_RESULT" && msg.action.type === "ROLL_DICE",
    );
    const p2RollWait = waitForMessage(
      ws2,
      (msg) => msg.type === "ACTION_RESULT" && msg.action.type === "ROLL_DICE",
    );

    ws1.send(
      JSON.stringify({
        type: "GAME_ACTION",
        action: { type: "ROLL_DICE" },
      }),
    );

    const [resP1, resP2] = await Promise.all([p1RollWait, p2RollWait]);
    assert.strictEqual(resP1.result.val1, resP2.result.val1, "Xúc xắc 1 phải đồng bộ");
    assert.strictEqual(resP1.result.val2, resP2.result.val2, "Xúc xắc 2 phải đồng bộ");
    assert.ok(resP1.result.total >= 2 && resP1.result.total <= 12, "Tổng điểm xúc xắc nằm trong [2, 12]");
  });
});

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  createTestServer,
  connectClient,
  waitForMessage,
  sendAndWait,
  destroyClient,
} from "./helpers/test-server-helper.mjs";

describe("P4: Chaos Testing Nâng Cao (Resilience & Concurrency Under Network Failure)", () => {
  let testServer;
  let wsUrl;

  before(async () => {
    testServer = await createTestServer(0);
    wsUrl = testServer.wsUrl;
  });

  after(async () => {
    if (testServer) {
      await testServer.close();
    }
  });

  it("1. Rớt mạng khi đang pending BUY_PROMPT: Server tự động cứu game qua Bot/Timeout và cho phép Reconnect", async () => {
    const ws1 = await connectClient(wsUrl);
    const ws2 = await connectClient(wsUrl);

    try {
      const roomId = "chaos-pending-drop";
      const p1Join = await sendAndWait(
        ws1,
        { type: "JOIN_ROOM", roomId, playerName: "PlayerA", options: { turnTimeoutSec: 2 } },
        (m) => m.type === "JOINED_SUCCESS",
      );
      const reconnectTokenA = p1Join.reconnectToken;

      await sendAndWait(
        ws2,
        { type: "JOIN_ROOM", roomId, playerName: "PlayerB", options: { turnTimeoutSec: 2 } },
        (m) => m.type === "JOINED_SUCCESS",
      );

      // Sẵn sàng và bắt đầu ván
      ws2.send(JSON.stringify({ type: "SET_READY", isReady: true }));
      await waitForMessage(ws1, (m) => m.type === "ROOM_STATE" && m.room.players.find((p) => p.name === "PlayerB")?.isReady);

      ws1.send(JSON.stringify({ type: "START_GAME" }));
      await waitForMessage(ws1, (m) => m.type === "GAME_STARTED");

      // PlayerA tung xúc xắc
      ws1.send(JSON.stringify({ type: "GAME_ACTION", action: { type: "ROLL_DICE" } }));
      const rollRes = await waitForMessage(ws1, (m) => m.type === "ACTION_RESULT" && m.action.type === "ROLL_DICE");

      // PlayerA hoàn tất di chuyển
      ws1.send(JSON.stringify({ type: "GAME_ACTION", action: { type: "COMPLETE_MOVEMENT" } }));
      const moveRes = await waitForMessage(ws1, (m) => m.type === "ACTION_RESULT" && m.action.type === "COMPLETE_MOVEMENT");
      assert.ok(moveRes.result, "Có kết quả di chuyển trên bàn cờ");

      // Ngay tại đây PlayerA bị rớt mạng đột ngột! (Terminate socket giữa chừng)
      destroyClient(ws1);

      // PlayerB nhận được thông báo PLAYER_DISCONNECTED
      const disconnectMsg = await waitForMessage(ws2, (m) => m.type === "PLAYER_DISCONNECTED");
      assert.strictEqual(disconnectMsg.playerId, "p1");

      // Server tự động giao cho Bot xử lý thay thế, giải phóng pendingAction và chuyển lượt sang PlayerB
      const turnResolvedMsg = await waitForMessage(
        ws2,
        (m) =>
          m.type === "ACTION_RESULT" &&
          ["DECLINE_BUY", "BUY_PROPERTY", "CLOSE_CARD", "END_TURN"].includes(m.action.type),
        6000,
      );
      assert.ok(turnResolvedMsg, "Server đã tự động giải phóng pending action khi người chơi rớt mạng");

      // Chờ chuyển lượt sang p2
      const p2TurnMsg = await waitForMessage(
        ws2,
        (m) => m.type === "ACTION_RESULT" && m.state?.currentTurnIndex === 1,
        5000,
      );
      assert.strictEqual(p2TurnMsg.state.currentTurnIndex, 1, "Bàn cờ tiếp tục hoạt động, lượt chuyển sang PlayerB");

      // PlayerA mở lại trình duyệt và tái kết nối bằng reconnectToken
      const ws1Reconnected = await connectClient(wsUrl);
      try {
        const reconnectedRes = await sendAndWait(
          ws1Reconnected,
          { type: "JOIN_ROOM", roomId, reconnectToken: reconnectTokenA },
          (m) => m.type === "JOINED_SUCCESS",
        );

        assert.strictEqual(reconnectedRes.isReconnect, true, "Tái kết nối thành công");
        assert.strictEqual(reconnectedRes.playerId, "p1");
        assert.ok(reconnectedRes.gameState, "Nhận được gameState mới nhất sau khi reconnect");
        assert.strictEqual(reconnectedRes.gameState.currentTurnIndex, 1, "State đồng bộ chính xác lượt của PlayerB");
      } finally {
        destroyClient(ws1Reconnected);
      }
    } finally {
      destroyClient(ws2);
    }
  });

  it("2. Chống Race Condition: Gửi đồng thời 2 action ROLL_DICE trong 1 mili-giây", async () => {
    const ws1 = await connectClient(wsUrl);
    const ws2 = await connectClient(wsUrl);

    try {
      const roomId = "chaos-race-condition";
      await sendAndWait(ws1, { type: "JOIN_ROOM", roomId, playerName: "RacerA" }, (m) => m.type === "JOINED_SUCCESS");
      await sendAndWait(ws2, { type: "JOIN_ROOM", roomId, playerName: "RacerB" }, (m) => m.type === "JOINED_SUCCESS");

      ws2.send(JSON.stringify({ type: "SET_READY", isReady: true }));
      await waitForMessage(ws1, (m) => m.type === "ROOM_STATE" && m.room.players.find((p) => p.name === "RacerB")?.isReady);

      ws1.send(JSON.stringify({ type: "START_GAME" }));
      await waitForMessage(ws1, (m) => m.type === "GAME_STARTED");

      // RacerA bắn đồng thời 2 lệnh ROLL_DICE cùng lúc
      const actionMsg = JSON.stringify({ type: "GAME_ACTION", action: { type: "ROLL_DICE" } });

      let acceptedRolls = 0;
      let rejectedRolls = 0;

      const messageHandler = (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "ACTION_RESULT" && msg.action.type === "ROLL_DICE") {
          acceptedRolls++;
        }
        if (msg.type === "ACTION_FAILED") {
          rejectedRolls++;
        }
      };

      ws1.on("message", messageHandler);

      // Gửi đồng thời cả 2 lệnh
      ws1.send(actionMsg);
      ws1.send(actionMsg);

      // Chờ phản hồi
      await new Promise((resolve) => setTimeout(resolve, 300));
      ws1.off("message", messageHandler);

      // Chỉ được đúng 1 lệnh thành công, lệnh thứ 2 phải bị từ chối
      assert.strictEqual(acceptedRolls, 1, "Chỉ được chấp nhận đúng 1 lần gieo xúc xắc");
      assert.strictEqual(rejectedRolls, 1, "Lệnh gửi đua tranh thứ 2 phải bị từ chối");
    } finally {
      destroyClient(ws1);
      destroyClient(ws2);
    }
  });

  it("3. Chống Out-of-Turn Spam Attack: Người chơi chưa tới lượt spam 15 lệnh liên tục", async () => {
    const ws1 = await connectClient(wsUrl);
    const ws2 = await connectClient(wsUrl);

    try {
      const roomId = "chaos-spam-attack";
      await sendAndWait(ws1, { type: "JOIN_ROOM", roomId, playerName: "HostA" }, (m) => m.type === "JOINED_SUCCESS");
      await sendAndWait(ws2, { type: "JOIN_ROOM", roomId, playerName: "SpammerB" }, (m) => m.type === "JOINED_SUCCESS");

      ws2.send(JSON.stringify({ type: "SET_READY", isReady: true }));
      await waitForMessage(ws1, (m) => m.type === "ROOM_STATE" && m.room.players.find((p) => p.name === "SpammerB")?.isReady);

      ws1.send(JSON.stringify({ type: "START_GAME" }));
      await waitForMessage(ws1, (m) => m.type === "GAME_STARTED");

      // Hiện tại là lượt của HostA (p1). SpammerB (p2) cố tình bắn 15 lệnh trái phép liên tiếp
      let failedResponses = 0;
      const spamHandler = (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "ACTION_FAILED") {
          failedResponses++;
        }
      };

      ws2.on("message", spamHandler);

      for (let i = 0; i < 15; i++) {
        ws2.send(JSON.stringify({ type: "GAME_ACTION", action: { type: "ROLL_DICE" } }));
      }

      await new Promise((resolve) => setTimeout(resolve, 400));
      ws2.off("message", spamHandler);

      // Toàn bộ 15 lệnh spam trái lượt phải bị từ chối
      assert.strictEqual(failedResponses, 15, "Server phải chặn toàn bộ 15 lệnh spam khi chưa tới lượt");

      // HostA vẫn có thể chơi bình thường sau đợt spam của đối thủ
      ws1.send(JSON.stringify({ type: "GAME_ACTION", action: { type: "ROLL_DICE" } }));
      const hostRoll = await waitForMessage(ws1, (m) => m.type === "ACTION_RESULT" && m.action.type === "ROLL_DICE");
      assert.ok(hostRoll, "Lượt chơi của Host vẫn bảo toàn vẹn toàn, không bị ảnh hưởng bởi spam");
    } finally {
      destroyClient(ws1);
      destroyClient(ws2);
    }
  });

  it("4. Zombie Socket: Gửi action sau khi đã rời phòng thì server xử lý an toàn", async () => {
    const ws = await connectClient(wsUrl);

    try {
      const roomId = "chaos-zombie-room";
      await sendAndWait(ws, { type: "JOIN_ROOM", roomId, playerName: "Ghost" }, (m) => m.type === "JOINED_SUCCESS");

      // Người chơi gửi lệnh rời phòng
      ws.send(JSON.stringify({ type: "LEAVE_ROOM" }));
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Socket cố tình gửi action chơi game sau khi đã rời phòng
      ws.send(JSON.stringify({ type: "GAME_ACTION", action: { type: "ROLL_DICE" } }));

      const res = await waitForMessage(ws, (m) => m.type === "ACTION_FAILED" || m.type === "ERROR", 1000);
      assert.ok(res, "Server phải từ chối hoặc báo lỗi khi zombie client gửi lệnh");
    } finally {
      destroyClient(ws);
    }
  });
});

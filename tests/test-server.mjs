import WebSocket from "ws";

const WS_URL = "ws://localhost:3000";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
}

async function runTest() {
  console.log("=== BẮT ĐẦU TEST TÍCH HỢP WEBSOCKET SERVER (2 CLIENTS) ===");

  // 1. Kiểm tra HTTP Health
  const res = await fetch("http://localhost:3000/health");
  const health = await res.json();
  assert(health.status === "ok", "Server health check phải trả về ok");
  console.log("✅ 1. HTTP Server & Health Check: PASS");

  // 2. Kết nối Client 1 (Host: An)
  const ws1 = new WebSocket(WS_URL);
  await new Promise((resolve) => ws1.on("open", resolve));
  console.log("✅ 2. Client 1 (An) đã kết nối WebSocket");

  const TEST_ROOM_ID = "saigon-cup-" + Math.floor(1000 + Math.random() * 9000);
  let p1Data = null;
  ws1.on("message", (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.type === "JOINED_SUCCESS") p1Data = msg;
  });

  ws1.send(
    JSON.stringify({
      type: "JOIN_ROOM",
      roomId: TEST_ROOM_ID,
      playerName: "Trương Định An",
      token: "car",
    }),
  );

  await sleep(150);
  assert(p1Data && p1Data.playerId === "p1", "Client 1 phải được gán ID p1");
  console.log(`✅ 3. Client 1 tạo phòng '${TEST_ROOM_ID}' thành công (Host: p1)`);

  // 3. Kết nối Client 2 (Khách: Bình)
  const ws2 = new WebSocket(WS_URL);
  await new Promise((resolve) => ws2.on("open", resolve));
  console.log("✅ 4. Client 2 (Bình) đã kết nối WebSocket");

  let p2Data = null;
  ws2.on("message", (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.type === "JOINED_SUCCESS") p2Data = msg;
  });

  ws2.send(
    JSON.stringify({
      type: "JOIN_ROOM",
      roomId: TEST_ROOM_ID,
      playerName: "Võ Thị Bình",
      token: "hat",
    }),
  );

  await sleep(150);
  assert(p2Data && p2Data.playerId === "p2", "Client 2 phải được gán ID p2");
  console.log("✅ 5. Client 2 vào phòng 'saigon-cup' thành công (Guest: p2)");

  // 4. Client 2 bấm sẵn sàng
  ws2.send(JSON.stringify({ type: "SET_READY", isReady: true }));
  await sleep(100);

  // 5. Client 1 (Host) bắt đầu ván cờ
  let gameStartedP1 = null;
  let gameStartedP2 = null;

  ws1.on("message", (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.type === "GAME_STARTED") gameStartedP1 = msg;
  });
  ws2.on("message", (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.type === "GAME_STARTED") gameStartedP2 = msg;
  });

  ws1.send(JSON.stringify({ type: "START_GAME" }));
  await sleep(200);

  assert(gameStartedP1 && gameStartedP2, "Cả 2 client phải nhận được sự kiện GAME_STARTED");
  assert(
    gameStartedP1.seed === gameStartedP2.seed,
    "Seed của ván cờ phải đồng bộ tuyệt đối giữa 2 client",
  );
  console.log(`✅ 6. Ván cờ bắt đầu đồng bộ! Seed = ${gameStartedP1.seed}`);

  // 6. Kiểm tra quyền đổ xúc xắc (Anti-Cheat & Turn Control)
  // p1 là người đi đầu -> p2 cố tình đổ xúc xắc lén sẽ bị từ chối
  let p2ActionFailed = null;
  ws2.on("message", (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.type === "ACTION_FAILED") p2ActionFailed = msg;
  });

  ws2.send(
    JSON.stringify({
      type: "GAME_ACTION",
      action: { type: "ROLL_DICE", val1: 6, val2: 6 }, // Cố tình hack xúc xắc 6-6
    }),
  );
  await sleep(150);

  assert(
    p2ActionFailed && p2ActionFailed.error === "Chưa tới lượt của bạn",
    "Server phải chặn không cho p2 đi khi chưa tới lượt",
  );
  console.log("✅ 7. Chặn thao tác trái lượt (Turn Enforce): PASS");

  // 7. p1 đổ xúc xắc hợp lệ (bơm xúc xắc giả 6-6 nhưng server sẽ tự gieo bằng PRNG)
  let p1RollBroadcast = null;
  let p2RollBroadcast = null;

  ws1.on("message", (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.type === "ACTION_RESULT" && msg.action.type === "ROLL_DICE") p1RollBroadcast = msg;
  });
  ws2.on("message", (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.type === "ACTION_RESULT" && msg.action.type === "ROLL_DICE") p2RollBroadcast = msg;
  });

  ws1.send(
    JSON.stringify({
      type: "GAME_ACTION",
      action: { type: "ROLL_DICE", val1: 6, val2: 6 },
    }),
  );
  await sleep(200);

  assert(p1RollBroadcast && p2RollBroadcast, "Cả 2 bên phải nhận được broadcast kết quả gieo xúc xắc");
  assert(
    p1RollBroadcast.result.val1 === p2RollBroadcast.result.val1 &&
    p1RollBroadcast.result.val2 === p2RollBroadcast.result.val2,
    "Giá trị xúc xắc broadcast phải giống hệt nhau ở cả 2 client",
  );
  console.log(
    `✅ 8. Tung xúc xắc qua Server thành công: Đổ được ${p1RollBroadcast.result.val1} + ${p1RollBroadcast.result.val2} = ${p1RollBroadcast.result.total}`,
  );

  // 8. Đóng kết nối
  ws1.close();
  ws2.close();
  console.log("🎉 TẤT CẢ TEST BƯỚC 2 ĐÃ PASS 100%! SERVER NODE.JS HOẠT ĐỘNG HOÀN HẢO!");
  process.exit(0);
}

runTest().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});

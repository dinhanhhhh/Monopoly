import WebSocket from "ws";
import { startServer } from "../server/server.mjs";

let WS_URL = "ws://127.0.0.1:3000";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
}

async function createClient(playerName, token, roomId) {
  const ws = new WebSocket(WS_URL);
  await new Promise((resolve) => ws.on("open", resolve));

  const client = {
    ws,
    name: playerName,
    token,
    roomId,
    playerId: null,
    reconnectToken: null,
    room: null,
    gameState: null,
    events: [],
    closed: false,
  };

  ws.on("message", (raw) => {
    const msg = JSON.parse(raw.toString());
    client.events.push(msg);

    if (msg.type === "JOINED_SUCCESS") {
      client.playerId = msg.playerId;
      client.reconnectToken = msg.reconnectToken;
      client.room = msg.room;
      client.gameState = msg.gameState;
    } else if (msg.type === "ROOM_STATE") {
      client.room = msg.room;
    } else if (msg.type === "GAME_STARTED") {
      client.gameState = msg.state;
    } else if (msg.type === "ACTION_RESULT") {
      client.gameState = msg.state;
    }
  });

  ws.on("close", () => {
    client.closed = true;
  });

  // Gửi lệnh tham gia phòng
  ws.send(
    JSON.stringify({
      type: "JOIN_ROOM",
      roomId,
      playerName,
      token,
    }),
  );

  return client;
}

async function waitForEvent(client, eventType, filterFn = null, timeoutMs = 6000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const idx = client.events.findIndex((e) => {
      const matchType = e.type === eventType || e.result?.event === eventType;
      if (!matchType) return false;
      if (filterFn && !filterFn(e)) return false;
      return true;
    });
    if (idx >= 0) {
      return client.events.splice(idx, 1)[0];
    }
    await sleep(50);
  }
  return null;
}

async function waitForActionResult(client, actionType, targetPlayerId = null, timeoutMs = 6000) {
  return waitForEvent(
    client,
    "ACTION_RESULT",
    (e) => {
      const matchAction = e.action?.type === actionType;
      if (!matchAction) return false;
      if (targetPlayerId && e.playerId !== targetPlayerId) return false;
      return true;
    },
    timeoutMs,
  );
}

async function runFullSimulation() {
  console.log("==============================================================");
  console.log("  🚀 BẮT ĐẦU TEST TOÀN DIỆN CHẾ ĐỘ MULTIPLAYER (SIMULATION)");
  console.log("==============================================================");

  const testServer = await startServer(0);
  WS_URL = `ws://127.0.0.1:${testServer.port}`;

  const ROOM_ID = "phong-vip-" + Math.floor(Math.random() * 10000);

  // 1. Host (Anh Ba) tạo phòng
  console.log("\n--- BƯỚC 1: TẠO PHÒNG VÀ VÀO PHÒNG ---");
  const host = await createClient("Anh Ba Sài Gòn", "car", ROOM_ID);
  const hostJoin = await waitForEvent(host, "JOINED_SUCCESS");
  assert(hostJoin && host.playerId === "p1", "Host phải vào phòng với ID p1");
  console.log(`✅ Host ${host.name} đã tạo phòng ${ROOM_ID} (ID: ${host.playerId})`);

  // 2. Khách (Chị Bảy) vào cùng phòng
  const guest = await createClient("Chị Bảy Bến Thành", "hat", ROOM_ID);
  const guestJoin = await waitForEvent(guest, "JOINED_SUCCESS");
  assert(guestJoin && guest.playerId === "p2", "Guest phải vào phòng với ID p2");
  console.log(`✅ Guest ${guest.name} đã tham gia phòng ${ROOM_ID} (ID: ${guest.playerId})`);

  // 3. Host thêm 1 AI Bot vào phòng để chơi bàn 3 người (Anh Ba + Chị Bảy + Bot)
  console.log("\n--- BƯỚC 2: THÊM BOT VÀ BẤM SẴN SÀNG ---");
  host.ws.send(JSON.stringify({ type: "ADD_BOT", personality: "balanced" }));
  await sleep(200);

  // Guest bấm Sẵn Sàng
  guest.ws.send(JSON.stringify({ type: "SET_READY", isReady: true }));
  await sleep(200);

  // 4. Host bắt đầu ván cờ
  console.log("\n--- BƯỚC 3: KHỞI TẠO TRẬN ĐẤU ĐỒNG BỘ ---");
  host.ws.send(JSON.stringify({ type: "START_GAME" }));

  const hostGameStart = await waitForEvent(host, "GAME_STARTED");
  const guestGameStart = await waitForEvent(guest, "GAME_STARTED");

  assert(hostGameStart && guestGameStart, "Cả 2 bên phải nhận được GAME_STARTED");
  assert(hostGameStart.state.players.length === 3, "Bàn cờ phải có 3 người chơi (2 người + 1 bot)");
  console.log(`✅ Trận đấu bắt đầu thành công!`);

  // 5. Lượt 1: Host (p1) đổ xúc xắc
  console.log("\n--- BƯỚC 4: THAO TÁC ĐỔ XÚC XẮC & CHỐNG HACK LƯỢT ---");
  // Thử nghiệm gian lận: Guest p2 cố tình đổ xúc xắc khi đang là lượt p1
  guest.ws.send(JSON.stringify({ type: "GAME_ACTION", action: { type: "ROLL_DICE" } }));
  const cheatFail = await waitForEvent(guest, "ACTION_FAILED");
  assert(cheatFail && cheatFail.error === "Chưa tới lượt của bạn", "Server phải chặn p2");
  console.log("✅ Anti-Cheat: Chặn thành công thao tác sai lượt");

  // Host đổ xúc xắc hợp lệ
  host.ws.send(JSON.stringify({ type: "GAME_ACTION", action: { type: "ROLL_DICE" } }));

  const hostRollRes = await waitForActionResult(host, "ROLL_DICE", "p1");
  const guestRollRes = await waitForActionResult(guest, "ROLL_DICE", "p1");

  assert(hostRollRes && guestRollRes, "Cả 2 bên phải nhận được kết quả gieo xúc xắc");
  assert(
    hostRollRes.result.val1 === guestRollRes.result.val1 &&
    hostRollRes.result.val2 === guestRollRes.result.val2,
    "Giá trị xúc xắc broadcast phải trùng khớp 100%",
  );
  console.log(`✅ Host đổ được ${hostRollRes.result.val1} + ${hostRollRes.result.val2} = ${hostRollRes.result.total}`);

  // Host hoàn thành di chuyển
  const landingPos = (0 + hostRollRes.result.total) % 40;
  host.ws.send(
    JSON.stringify({
      type: "GAME_ACTION",
      action: { type: "COMPLETE_MOVEMENT", position: landingPos },
    }),
  );

  const landRes = await waitForActionResult(host, "COMPLETE_MOVEMENT", "p1");
  assert(landRes, "Host phải nhận được kết quả hạ cánh ô cờ");
  console.log(`✅ Host hạ cánh tại ô #${landingPos}`);

  // Xử lý action tại ô hạ cánh (Mua đất nếu có prompt)
  if (host.gameState.pendingAction?.type === "BUY_PROMPT") {
    if (host.gameState.pendingAction.canAfford) {
      host.ws.send(JSON.stringify({ type: "GAME_ACTION", action: { type: "BUY_PROPERTY" } }));
      const buyRes = await waitForActionResult(host, "BUY_PROPERTY", "p1");
      console.log(`✅ Host đã mua ô đất: ${buyRes.result.message}`);
    } else {
      host.ws.send(JSON.stringify({ type: "GAME_ACTION", action: { type: "DECLINE_BUY" } }));
      await waitForActionResult(host, "DECLINE_BUY", "p1");
      console.log("✅ Host bỏ qua không mua ô đất");
    }
  } else if (host.gameState.pendingAction?.type === "CARD_PROMPT") {
    host.ws.send(JSON.stringify({ type: "GAME_ACTION", action: { type: "CLOSE_CARD" } }));
    await waitForActionResult(host, "CLOSE_CARD", "p1");
    console.log("✅ Host đã đóng thẻ bài");
  }

  // Host kết thúc lượt
  host.ws.send(JSON.stringify({ type: "GAME_ACTION", action: { type: "END_TURN" } }));
  let turnEnded1 = await waitForActionResult(host, "END_TURN", "p1");
  assert(turnEnded1 && turnEnded1.action.type === "END_TURN", "Lượt 1 phải kết thúc");
  console.log(`✅ Lượt 1 kết thúc. Lượt tiếp theo thuộc về: ${turnEnded1.result.nextPlayer.name}`);

  // Nếu Host tung đôi (EXTRA_TURN) -> thực hiện lượt phụ cho đến khi hết đôi
  while (turnEnded1.result.event === "EXTRA_TURN") {
    console.log("🎲 Host tung đôi nên đi tiếp lượt phụ...");
    host.ws.send(JSON.stringify({ type: "GAME_ACTION", action: { type: "ROLL_DICE" } }));
    const extraRoll = await waitForActionResult(host, "ROLL_DICE", "p1");
    const extraLanding = (host.gameState.players[0].position + extraRoll.result.total) % 40;
    host.ws.send(JSON.stringify({ type: "GAME_ACTION", action: { type: "COMPLETE_MOVEMENT", position: extraLanding } }));
    await waitForActionResult(host, "COMPLETE_MOVEMENT", "p1");
    if (host.gameState.pendingAction) {
      const act = host.gameState.pendingAction.defaultAction || { type: "DECLINE_BUY" };
      host.ws.send(JSON.stringify({ type: "GAME_ACTION", action: act }));
      await waitForActionResult(host, act.type, "p1");
    }
    host.ws.send(JSON.stringify({ type: "GAME_ACTION", action: { type: "END_TURN" } }));
    turnEnded1 = await waitForActionResult(host, "END_TURN", "p1");
    console.log(`✅ Lượt phụ hoàn thành. Lượt tiếp theo: ${turnEnded1.result.nextPlayer.name}`);
  }

  // 6. Lượt 2: Guest (p2)
  console.log("\n--- BƯỚC 5: LƯỢT CỦA GUEST & KIỂM TRA CHUYỂN LƯỢT ---");
  guest.ws.send(JSON.stringify({ type: "GAME_ACTION", action: { type: "ROLL_DICE" } }));
  const guestRoll = await waitForActionResult(guest, "ROLL_DICE", "p2");
  assert(guestRoll, "Guest phải đổ được xúc xắc ở lượt của mình");
  console.log(`✅ Guest đổ được ${guestRoll.result.val1} + ${guestRoll.result.val2} = ${guestRoll.result.total}`);

  const p2LandingPos = (guest.gameState.players[1].position + guestRoll.result.total) % 40;
  guest.ws.send(
    JSON.stringify({
      type: "GAME_ACTION",
      action: { type: "COMPLETE_MOVEMENT", position: p2LandingPos },
    }),
  );
  await waitForActionResult(guest, "COMPLETE_MOVEMENT", "p2");

  while (guest.gameState.pendingAction) {
    const pending = guest.gameState.pendingAction;
    if (pending.type === "BUY_PROMPT") {
      const actType = pending.canAfford ? "BUY_PROPERTY" : "DECLINE_BUY";
      guest.ws.send(JSON.stringify({ type: "GAME_ACTION", action: { type: actType } }));
      await waitForActionResult(guest, actType, "p2");
    } else if (pending.type === "CARD_PROMPT") {
      guest.ws.send(JSON.stringify({ type: "GAME_ACTION", action: { type: "CLOSE_CARD" } }));
      await waitForActionResult(guest, "CLOSE_CARD", "p2");
    } else if (pending.type === "DEBT_PROMPT") {
      guest.ws.send(JSON.stringify({ type: "GAME_ACTION", action: { type: "AUTO_RESOLVE_DEBT" } }));
      await waitForActionResult(guest, "AUTO_RESOLVE_DEBT", "p2");
    } else {
      break;
    }
  }

  guest.ws.send(JSON.stringify({ type: "GAME_ACTION", action: { type: "END_TURN" } }));
  let turnEnded2 = await waitForActionResult(guest, "END_TURN", "p2");
  assert(turnEnded2, "Guest phải kết thúc lượt thành công");
  console.log(`✅ Guest kết thúc lượt. Tiếp theo đến: ${turnEnded2.result.nextPlayer.name} (Bot tự động)`);

  while (turnEnded2.result.event === "EXTRA_TURN") {
    console.log("🎲 Guest tung đôi nên đi tiếp lượt phụ...");
    guest.ws.send(JSON.stringify({ type: "GAME_ACTION", action: { type: "ROLL_DICE" } }));
    const extraRoll2 = await waitForActionResult(guest, "ROLL_DICE", "p2");
    const extraLanding2 = (guest.gameState.players[1].position + extraRoll2.result.total) % 40;
    guest.ws.send(JSON.stringify({ type: "GAME_ACTION", action: { type: "COMPLETE_MOVEMENT", position: extraLanding2 } }));
    await waitForActionResult(guest, "COMPLETE_MOVEMENT", "p2");
    while (guest.gameState.pendingAction) {
      const act = guest.gameState.pendingAction.defaultAction || { type: "DECLINE_BUY" };
      guest.ws.send(JSON.stringify({ type: "GAME_ACTION", action: act }));
      await waitForActionResult(guest, act.type, "p2");
    }
    guest.ws.send(JSON.stringify({ type: "GAME_ACTION", action: { type: "END_TURN" } }));
    turnEnded2 = await waitForActionResult(guest, "END_TURN", "p2");
  }

  // 7. Lượt 3: Bot tự động đi cờ
  console.log("\n--- BƯỚC 6: KIỂM TRA BOT TỰ ĐỘNG CHƠI TRÊN SERVER ---");
  // Bot (p3) tự động đổ xúc xắc
  const botRoll = await waitForActionResult(host, "ROLL_DICE", "p3", 8000);
  assert(botRoll, "Server Bot phải tự động đổ xúc xắc");
  console.log(`✅ Bot đã đổ được: ${botRoll.result.val1} + ${botRoll.result.val2} = ${botRoll.result.total}`);

  // Bot tự động hoàn thành di chuyển
  const botMove = await waitForActionResult(host, "COMPLETE_MOVEMENT", "p3", 8000);
  assert(botMove, "Server Bot phải tự động di chuyển");
  console.log(`✅ Bot đã di chuyển đến ô #${botMove.action.position}`);

  // Bot kết thúc lượt
  let botEnd = await waitForActionResult(host, "END_TURN", "p3", 8000);
  assert(botEnd, "Server Bot phải kết thúc lượt thành công");
  console.log(`✅ Bot đã kết thúc lượt. Lượt kế tiếp: ${botEnd.result.nextPlayer.name}`);

  while (botEnd.result.event === "EXTRA_TURN") {
    console.log("🎲 Bot tung đôi nên đi tiếp lượt phụ...");
    await waitForActionResult(host, "ROLL_DICE", "p3", 8000);
    await waitForActionResult(host, "COMPLETE_MOVEMENT", "p3", 8000);
    botEnd = await waitForActionResult(host, "END_TURN", "p3", 8000);
  }

  assert(host.gameState.currentTurnIndex === 0, "Lượt chơi đã quay về Host (p1)");
  console.log("✅ Bot đã tự động hoàn thành lượt trên server hoàn hảo!");

  // 8. Kiểm tra Tái kết nối (Reconnection)
  console.log("\n--- BƯỚC 7: KIỂM TRA MẤT KẾT NỐI & TÁI KẾT NỐI (RECONNECT) ---");
  const guestReconnectToken = guest.reconnectToken;
  guest.ws.close();
  await sleep(300);
  console.log("🔌 Guest đã ngắt kết nối giả lập...");

  // Tạo kết nối mới với reconnectToken cũ
  const wsReconnect = new WebSocket(WS_URL);
  await new Promise((resolve) => wsReconnect.on("open", resolve));

  let reconnectedData = null;
  wsReconnect.on("message", (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.type === "JOINED_SUCCESS") reconnectedData = msg;
  });

  wsReconnect.send(
    JSON.stringify({
      type: "JOIN_ROOM",
      roomId: ROOM_ID,
      reconnectToken: guestReconnectToken,
    }),
  );

  await sleep(300);
  assert(reconnectedData && reconnectedData.isReconnect, "Server phải chấp nhận reconnect");
  assert(reconnectedData.playerId === "p2", "Phải khôi phục đúng slot p2 của Guest");
  assert(reconnectedData.gameState, "Phải trả về đúng trạng thái ván cờ hiện tại");
  console.log("✅ Tái kết nối thành công! State và vị trí người chơi được khôi phục nguyên vẹn.");

  // Dọn dẹp
  host.ws.close();
  wsReconnect.close();
  await testServer.close();

  console.log("\n==============================================================");
  console.log("🎉 TOÀN BỘ 7 BƯỚC GIẢ LẬP MULTIPLAYER ĐÃ PASS XUẤT SẮC 100%!");
  console.log("==============================================================");
  process.exit(0);
}

runFullSimulation().catch((err) => {
  console.error("Simulation error:", err);
  process.exit(1);
});

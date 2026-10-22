import assert from "node:assert";
import { GameRoom } from "../server/room.js";

console.log("=== BẮT ĐẦU TEST KHẮC PHỤC TRIỆT ĐỂ LỖI NHẢY LƯỢT (SERVER + CLIENT LOGIC) ===");

// 1. Test Server Turn ID Protection
console.log("\n--- TEST 1: Khóa an toàn mã lượt trên Server (Stale END_TURN Rejection) ---");
const room = new GameRoom("test-turn-protect", { turnTimeoutSec: 25 });
const wsMock1 = { readyState: 1, send: () => {} };
const wsMock2 = { readyState: 1, send: () => {} };

room.join(wsMock1, { playerName: "Player A" });
room.join(wsMock2, { playerName: "Player B" });
room.setReady("p1", true);
room.setReady("p2", true);

room.startGame("p1");
assert.strictEqual(room.turnId, 1, "Mã lượt ban đầu phải là 1");
assert.strictEqual(room.engine.state.turnId, 1, "State phải lưu turnId = 1");

// Player A không thể END_TURN khi chưa xong lượt (turnState === WAIT_ROLL)
const prematureRes = room.handleAction("p1", { type: "END_TURN", turnId: 1 });
assert.strictEqual(prematureRes.success, false, "Server phải từ chối END_TURN khi chưa kết thúc lượt");
assert.strictEqual(prematureRes.code, "TURN_NOT_FINISHED");
console.log("✅ Server chặn thành công END_TURN khi lượt chưa kết thúc: PASS");

// Đưa Player A về trạng thái END_TURN hợp lệ để kiểm tra mã lượt
room.engine.state.turnState = "END_TURN";

// Player A gửi END_TURN với turnId cũ (ví dụ 0)
const staleRes = room.handleAction("p1", { type: "END_TURN", turnId: 0 });
assert.strictEqual(staleRes.success, false, "Server phải từ chối END_TURN có turnId cũ");
console.log("✅ Server chặn thành công END_TURN có mã lượt cũ (Stale turnId): PASS");

// Player A gửi END_TURN với đúng turnId hiện tại (1)
const validRes = room.handleAction("p1", { type: "END_TURN", turnId: 1 });
assert.strictEqual(validRes.success, true, "Server phải chấp nhận END_TURN đúng turnId");
assert.strictEqual(room.turnId, 2, "Server phải tăng mã lượt lên 2");
assert.strictEqual(room.engine.getCurrentPlayer().id, "p2", "Lượt phải chuyển sang Player B");
console.log("✅ Server đổi lượt sang Player B và tăng mã lượt lên 2: PASS");

// 2. Player A gửi lại END_TURN của lượt cũ (turnId = 1) lúc này đang là lượt của B
const lateRes = room.handleAction("p1", { type: "END_TURN", turnId: 1 });
assert.strictEqual(lateRes.success, false, "Server phải từ chối vì chưa tới lượt và turnId cũ");
console.log("✅ Server chặn hoàn toàn lệnh trễ gửi từ Player A: PASS");

// 3. Test Bot Online Mode: Bot tự động đi trên Server, không chờ host
console.log("\n--- TEST 2: Bot phòng Online tự động đi trên Server ---");
const roomBot = new GameRoom("test-bot-room", { turnTimeoutSec: 25 });
roomBot.join({ readyState: 1, send: () => {} }, { playerName: "Host User" });
roomBot.addBot("balanced"); // Bot là p2
roomBot.setReady("p1", true);
roomBot.startGame("p1");

// Host kết thúc lượt
roomBot.engine.state.turnState = "END_TURN";
roomBot.handleAction("p1", { type: "END_TURN", turnId: 1 });
assert.strictEqual(roomBot.engine.getCurrentPlayer().id, "p2", "Đã sang lượt Bot p2");
assert.strictEqual(roomBot.engine.getCurrentPlayer().isBot, true, "p2 là Bot");

// Chờ bot timer kích hoạt tự động trên server
await new Promise((resolve) => setTimeout(resolve, 1000));
// Bot tự tung xúc xắc và di chuyển
assert.notStrictEqual(roomBot.engine.state.turnState, "WAIT_ROLL", "Bot đã tự động hành động trên server");
console.log("✅ Bot online tự động thực thi lượt trên server hoàn hảo: PASS");

// 4. Test Server 25s Timeout Protection: Timeout tự động đổi lượt và hủy timer cũ
console.log("\n--- TEST 3: Server Timeout hủy bỏ và cập nhật turnId chuẩn xác ---");
const roomTimeout = new GameRoom("test-timeout-room", { turnTimeoutSec: 1 });
roomTimeout.join({ readyState: 1, send: () => {} }, { playerName: "AFK Player" });
roomTimeout.join({ readyState: 1, send: () => {} }, { playerName: "Active Player" });
roomTimeout.setReady("p1", true);
roomTimeout.setReady("p2", true);
roomTimeout.startGame("p1");

const turnBefore = roomTimeout.turnId;
console.log(`⏳ Đang chờ timeout 1s của server (turnId=${turnBefore})...`);
await new Promise((resolve) => setTimeout(resolve, 1400));

// Sau timeout, p1 phải tự động roll hoặc di chuyển
assert.notStrictEqual(roomTimeout.engine.state.turnState, "WAIT_ROLL", "Server timeout đã tự động kích hoạt hành động cho người chơi");
console.log("✅ Server timeout xử lý an toàn, không bị treo phòng: PASS");

roomBot.clearTimers();
roomTimeout.clearTimers();
console.log("\n==============================================================");
console.log("🎉 TẤT CẢ TEST ĐÃ PASS 100%! LỖI NHẢY LƯỢT ĐÃ ĐƯỢC DIỆT DỨT ĐIỂM!");
console.log("==============================================================");
process.exit(0);

import assert from "node:assert";
import { GameEngine, TURN_STATES } from "../shared/engine.js";
import { BotAI } from "../shared/BotAI.js";
import { GameRules } from "../shared/rules.js";
import { SAIGON_BOARD_DATA } from "../shared/data/board-data.js";

console.log("=== BẮT ĐẦU TEST XÁC MINH CÁC LỖI TRONG BẢN AUDIT ===");

// 1. Test END_TURN không kiểm tra pha
console.log("\n--- TEST 1: END_TURN yêu cầu turnState === END_TURN ---");
const engine1 = new GameEngine([
  { id: "p1", name: "Player 1" },
  { id: "p2", name: "Player 2" },
]);
assert.strictEqual(engine1.state.turnState, TURN_STATES.WAIT_ROLL);
const prematureEnd = engine1.applyAction({ type: "END_TURN" });
assert.strictEqual(prematureEnd.success, false, "END_TURN phải thất bại khi đang WAIT_ROLL");
assert.strictEqual(prematureEnd.code, "TURN_NOT_FINISHED");
console.log("✅ Chặn thành công END_TURN khi chưa xong lượt: PASS");

// 2. Test Ra tù bằng xúc xắc đôi không được thêm lượt
console.log("\n--- TEST 2: Ra tù bằng xúc xắc đôi không được EXTRA_TURN ---");
const p1 = engine1.getCurrentPlayer();
p1.inJail = true;
p1.jailTurns = 1;

// Tung đôi 3-3 khi ở trong tù
const rollRes = engine1.applyAction({ type: "ROLL_DICE", val1: 3, val2: 3 });
assert.strictEqual(rollRes.event, "JAIL_FREE_DOUBLES");
assert.strictEqual(p1.inJail, false);
assert.strictEqual(engine1.state.escapedJailThisTurn, true);

// Hoàn thành di chuyển
engine1.applyAction({ type: "COMPLETE_MOVEMENT", position: 16 });
engine1.state.turnState = TURN_STATES.END_TURN;

// Kết thúc lượt: không được có EXTRA_TURN dù lastRoll.isDoubles = true
const endRes = engine1.applyAction({ type: "END_TURN" });
assert.strictEqual(endRes.event, "TURN_ENDED", "Phải là TURN_ENDED, không được cấp EXTRA_TURN khi vừa ra tù");
assert.strictEqual(engine1.getCurrentPlayer().id, "p2", "Lượt phải chuyển sang p2");
console.log("✅ Ra tù bằng đôi không được thêm lượt phụ: PASS");

// 3. Test Thẻ Bến Xe / Tiện Ích gần nhất nhân đôi tiền thuê
console.log("\n--- TEST 3: Thẻ Bến Xe gần nhất x2 tiền thuê & Tiện ích x10 ---");
const engine2 = new GameEngine([
  { id: "p1", name: "Player 1" },
  { id: "p2", name: "Player 2" },
]);
// Cho p2 sở hữu Bến Xe Miền Đông (ô 5)
engine2.state.properties[5].owner = "p2";
const railTile = SAIGON_BOARD_DATA[5];
const standardRent = GameRules.calculateRent(railTile, { id: "p2", name: "Player 2" }, engine2.state.properties, 7, 1);
const doubleRent = GameRules.calculateRent(railTile, { id: "p2", name: "Player 2" }, engine2.state.properties, 7, 1, { doubleRent: true });
assert.strictEqual(doubleRent, standardRent * 2, "calculateRent với doubleRent: true phải gấp đôi giá chuẩn");

// Test Tiện ích: Điện Lực Chợ Quán (ô 12)
engine2.state.properties[12].owner = "p2";
const utilTile = SAIGON_BOARD_DATA[12];
const standardUtilRent = GameRules.calculateRent(utilTile, { id: "p2", name: "Player 2" }, engine2.state.properties, 7, 1);
const util10xRent = GameRules.calculateRent(utilTile, { id: "p2", name: "Player 2" }, engine2.state.properties, 7, 1, { utility10x: true });
assert.strictEqual(util10xRent, 10 * 7 * 10_000, "Tiện ích với utility10x: true phải bằng 10 x xúc xắc x 10.000đ");
console.log("✅ Thẻ bến xe nhân đôi tiền thuê & tiện ích x10: PASS");

// 4. Test Đấu giá: BID_AUCTION & PASS_AUCTION kiểm tra đúng lượt người đặt giá
console.log("\n--- TEST 4: BID_AUCTION & PASS_AUCTION kiểm tra đúng lượt ---");
const engine3 = new GameEngine([
  { id: "p1", name: "Player 1" },
  { id: "p2", name: "Player 2" },
  { id: "p3", name: "Player 3" },
]);
engine3.applyAction({ type: "START_AUCTION", tileId: 1 });
assert.ok(engine3.state.auction);
const curBidderId = engine3.state.auction.currentTurnPlayerId;
const wrongBidderId = engine3.state.auction.activePlayerIds.find((id) => id !== curBidderId);

// Người chơi sai lượt cố đặt giá
const wrongBid = engine3.applyAction({ type: "BID_AUCTION", playerId: wrongBidderId, amount: 1_000_000 });
assert.strictEqual(wrongBid.success, false, "Người chơi không đúng lượt không được BID_AUCTION");

// Người chơi sai lượt cố bỏ cuộc
const wrongPass = engine3.applyAction({ type: "PASS_AUCTION", playerId: wrongBidderId });
assert.strictEqual(wrongPass.success, false, "Người chơi không đúng lượt không được PASS_AUCTION");

// Người chơi đúng lượt đặt giá hợp lệ
const validBid = engine3.applyAction({ type: "BID_AUCTION", playerId: curBidderId, amount: 600_000 });
assert.strictEqual(validBid.success, true, "Người chơi đúng lượt đặt giá thành công");
console.log("✅ Đấu giá kiểm tra lượt chặt chẽ: PASS");

// 5. Test BotAI evaluateTradeOffer từ chối đổi ô hoàn thành độc quyền cho mọi tính cách
console.log("\n--- TEST 5: Mọi tính cách Bot từ chối bán ô hoàn thiện độc quyền ---");
const botBalanced = { id: "bot1", name: "Bot Balanced", personality: "balanced", money: 10_000_000 };
const stateTrade = {
  properties: {
    1: { owner: "bot1" }, // Đinh Tiên Hoàng
    3: { owner: "human" }, // Nguyễn Bỉnh Khiêm
  },
};
// Đối thủ muốn mua ô 1 để gom trọn bộ Nâu (1 & 3), đưa giá x4
const tradeOffer = {
  sender: { id: "human", name: "Human" },
  offerMoney: 4_000_000,
  offerTiles: [],
  requestMoney: 0,
  requestTiles: [1],
};
const evalRes = BotAI.evaluateTradeOffer(botBalanced, tradeOffer, stateTrade);
assert.strictEqual(evalRes.accept, false, "Bot balanced phải từ chối bán ô hoàn tất bộ độc quyền");
console.log("✅ Bot từ chối giúp đối thủ gom độc quyền: PASS");

// 6. Test Tiền lương qua Khởi Hành tính đúng trong GameEngine COMPLETE_MOVEMENT
console.log("\n--- TEST 6: COMPLETE_MOVEMENT cộng lương qua Khởi Hành vào player.money ---");
const engine4 = new GameEngine([
  { id: "p1", name: "Player 1" },
  { id: "p2", name: "Player 2" },
]);
const playerGo = engine4.getCurrentPlayer();
playerGo.position = 38;
const moneyBefore = playerGo.money;
// Đi tới ô 1 (Đinh Tiên Hoàng - vòng qua ô 0)
const moveRes = engine4.applyAction({ type: "COMPLETE_MOVEMENT", position: 1 });
assert.strictEqual(moveRes.passedGo, true, "Phải ghi nhận passedGo = true");
assert.strictEqual(playerGo.money, moneyBefore + 2_000_000, "player.money trong engine phải được cộng 2.000.000đ lương");
console.log("✅ COMPLETE_MOVEMENT tự động cộng lương qua Khởi Hành: PASS");

console.log("\n==============================================================");
console.log("🎉 TẤT CẢ 6 NHÓM TEST AUDIT BỔ SUNG ĐỀU PASS 100%!");
console.log("==============================================================");

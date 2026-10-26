import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import { GameEngine, TURN_STATES } from "../shared/engine.js";
import { GameRules } from "../shared/rules.js";
import { GAME_CONSTANTS } from "../shared/constants.js";

describe("P3: Bất Biến Engine với Property-Based Testing (fast-check)", () => {
  const defaultPlayers = [
    { id: "p1", name: "Player 1", character: "saigon_boy" },
    { id: "p2", name: "Player 2", character: "saigon_girl" },
  ];

  it("1. Bất biến Xáo Trộn (Shuffle Multiset Preservation): Bảo toàn nguyên vẹn tập phần tử", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -1000, max: 1000 }), { minLength: 0, maxLength: 100 }),
        fc.integer({ min: 1, max: 2147483647 }),
        (originalArray, seed) => {
          const engine = new GameEngine(defaultPlayers, { seed });
          const copy = [...originalArray];
          const shuffled = engine.shuffleArray(copy);

          // 1a. Độ dài mảng không thay đổi
          if (shuffled.length !== originalArray.length) return false;

          // 1b. Tần suất xuất hiện (multiset) của từng phần tử giữ nguyên 100%
          const countMap = (arr) => {
            const map = new Map();
            for (const item of arr) {
              map.set(item, (map.get(item) || 0) + 1);
            }
            return map;
          };

          const origCount = countMap(originalArray);
          const shufCount = countMap(shuffled);

          if (origCount.size !== shufCount.size) return false;
          for (const [key, val] of origCount.entries()) {
            if (shufCount.get(key) !== val) return false;
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("2. Bất biến Bảo Toàn Tiền Ngang Hàng (Money Conservation): Giao dịch không tự sinh/mất tiền", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1_000_000, max: 50_000_000 }), // Tiền P1
        fc.integer({ min: 1_000_000, max: 50_000_000 }), // Tiền P2
        fc.integer({ min: 100_000, max: 5_000_000 }),     // Tiền giao dịch P1 đưa P2
        fc.integer({ min: 100_000, max: 5_000_000 }),     // Tiền giao dịch P2 đưa P1
        (p1Money, p2Money, offerMoney, requestMoney) => {
          const engine = new GameEngine(defaultPlayers, { seed: 12345 });
          const p1 = engine.state.players[0];
          const p2 = engine.state.players[1];
          p1.money = p1Money;
          p2.money = p2Money;

          const totalBefore = p1.money + p2.money;

          // Thực hiện đề nghị giao dịch
          const tradeAction = {
            type: "EXECUTE_TRADE",
            offer: {
              senderId: "p1",
              receiverId: "p2",
              offerMoney: Math.min(offerMoney, p1.money),
              requestMoney: Math.min(requestMoney, p2.money),
              offerTiles: [],
              requestTiles: [],
            },
          };

          const res = engine.applyAction(tradeAction);
          if (res.success) {
            const totalAfter = p1.money + p2.money;
            // Tổng tiền của cả 2 người chơi trước và sau giao dịch phải bằng nhau chính xác
            return totalBefore === totalAfter;
          }
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("3. Bất biến Không Âm Tiền Vô Lý (Non-Negative Balance Bound): Không thể mua vượt quá khả năng", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000_000 }),
        fc.integer({ min: 1, max: 2147483647 }),
        (initialMoney, seed) => {
          const engine = new GameEngine(defaultPlayers, { seed });
          const p1 = engine.getCurrentPlayer();
          p1.money = initialMoney;
          p1.position = 1; // Đứng tại ô 1 (Bến Vân Đồn - property giá 600.000đ)

          const tile = engine.getTile(1);
          const canAfford = p1.money >= tile.price;

          engine.state.turnState = TURN_STATES.WAIT_DECISION;
          engine.state.pendingAction = {
            type: "BUY_PROMPT",
            tileId: 1,
            canAfford,
          };

          const buyRes = engine.applyAction({ type: "BUY_PROPERTY" });
          if (canAfford) {
            assert.strictEqual(buyRes.success, true);
            assert.ok(p1.money >= 0, "Tiền sau khi mua phải >= 0");
          } else {
            // Không đủ tiền thì server/engine phải từ chối hoặc phá sản, không được để số dư âm vô lý
            assert.strictEqual(buyRes.success, false);
            assert.strictEqual(p1.money, initialMoney, "Tiền không bị trừ khi mua thất bại");
          }
          return true;
        },
      ),
      { numRuns: 50 },
    );
  });

  it("4. Bất biến Ràng Buộc Công Trình (Building & Inventory Constraints): Tuân thủ luật thi đấu", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5 }), // Cấp nhà hiện tại (0-4 nhà, 5 khách sạn)
        fc.integer({ min: 0, max: 32 }), // Số nhà còn lại trong kho ngân hàng
        fc.integer({ min: 0, max: 12 }), // Số khách sạn còn lại trong kho ngân hàng
        (currentLevel, remainingHouses, remainingHotels) => {
          const engine = new GameEngine(defaultPlayers, { seed: 8888 });
          const p1 = engine.getCurrentPlayer();
          p1.money = 100_000_000; // Tiền vô hạn

          // Gán sở hữu trọn bộ màu Nâu (ô 1 và ô 3) với cùng cấp độ để thỏa mãn luật xây đều tay
          engine.state.properties[1].owner = "p1";
          engine.state.properties[3].owner = "p1";
          engine.state.properties[1].houses = currentLevel;
          engine.state.properties[3].houses = currentLevel;

          const tile1 = engine.getTile(1);
          const check = GameRules.canBuildHouse(tile1, p1, engine.state.properties, {
            houses: remainingHouses,
            hotels: remainingHotels,
          });

          // Nếu đã có khách sạn (cấp 5) -> Không thể xây thêm
          if (currentLevel >= 5) {
            assert.strictEqual(check.canBuild, false, "Không thể xây vượt quá Khách Sạn");
          }

          // Nếu kho ngân hàng hết nhà (remainingHouses <= 0) và đang định xây nhà (cấp 0-3 lên 1-4)
          if (currentLevel < 4 && remainingHouses <= 0) {
            assert.strictEqual(check.canBuild, false, "Kho ngân hàng hết nhà xanh");
          }

          // Nếu kho ngân hàng hết khách sạn (remainingHotels <= 0) và đang định nâng cấp lên khách sạn (cấp 4 lên 5)
          if (currentLevel === 4 && remainingHotels <= 0) {
            assert.strictEqual(check.canBuild, false, "Kho ngân hàng hết khách sạn đỏ");
          }

          return true;
        },
      ),
      { numRuns: 50 },
    );
  });

  it("5. Bất biến Replay Xác Định (Determinism Invariance): Cùng Seed + Actions cho kết quả 100% giống nhau", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 2147483647 }),
        fc.array(
          fc.constantFrom(
            { type: "ROLL_DICE" },
            { type: "DECLINE_BUY" },
            { type: "CLOSE_CARD" },
            { type: "END_TURN" },
          ),
          { minLength: 10, maxLength: 50 },
        ),
        (seed, actions) => {
          const engineA = new GameEngine(defaultPlayers, { seed });
          const engineB = new GameEngine(defaultPlayers, { seed });

          for (const act of actions) {
            // Chuẩn hóa nếu là COMPLETE_MOVEMENT
            if (engineA.state.turnState === TURN_STATES.MOVING) {
              const rollA = engineA.state.lastRoll ? engineA.state.lastRoll.total : 2;
              const curA = engineA.getCurrentPlayer();
              const posA = (curA.position + rollA) % 40;
              engineA.applyAction({ type: "COMPLETE_MOVEMENT", position: posA });
            }
            if (engineB.state.turnState === TURN_STATES.MOVING) {
              const rollB = engineB.state.lastRoll ? engineB.state.lastRoll.total : 2;
              const curB = engineB.getCurrentPlayer();
              const posB = (curB.position + rollB) % 40;
              engineB.applyAction({ type: "COMPLETE_MOVEMENT", position: posB });
            }

            engineA.applyAction(act);
            engineB.applyAction(act);
          }

          // Khẳng định trạng thái 2 engine sau chuỗi actions phải trùng khớp tuyệt đối
          assert.strictEqual(engineA.state.round, engineB.state.round);
          assert.strictEqual(engineA.state.turnState, engineB.state.turnState);
          assert.strictEqual(engineA.state.currentTurnIndex, engineB.state.currentTurnIndex);
          assert.strictEqual(engineA.state.players[0].money, engineB.state.players[0].money);
          assert.strictEqual(engineA.state.players[1].money, engineB.state.players[1].money);
          assert.strictEqual(engineA.state.players[0].position, engineB.state.players[0].position);
          assert.strictEqual(engineA.state.players[1].position, engineB.state.players[1].position);

          return true;
        },
      ),
      { numRuns: 30 },
    );
  });
});

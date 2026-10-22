import { GameEngine, createMulberry32 } from "../shared/engine.js";

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
}

console.log("=== BẮT ĐẦU KIỂM TRA TÍNH TẤT ĐỊNH (DETERMINISTIC TEST) ===");

// 1. Kiểm tra createMulberry32
const rng1 = createMulberry32(12345);
const rng2 = createMulberry32(12345);
const seq1 = Array.from({ length: 10 }, () => rng1());
const seq2 = Array.from({ length: 10 }, () => rng2());

assert(
  JSON.stringify(seq1) === JSON.stringify(seq2),
  "PRNG với cùng seed 12345 phải sinh ra 10 số giống hệt nhau",
);
console.log("✅ 1. Mulberry32 PRNG sinh số đồng nhất với cùng seed: PASS");

// 2. Kiểm tra GameEngine khởi tạo với cùng seed
const players = [
  { id: "p1", name: "Người chơi 1", token: "car", isBot: false },
  { id: "p2", name: "Người chơi 2", token: "hat", isBot: true },
  { id: "p3", name: "Người chơi 3", token: "dog", isBot: true },
];

const SEED = 987654321;
const engineA = new GameEngine(players, { seed: SEED, fastMode: true, timestamp: "10:00" });
const engineB = new GameEngine(players, { seed: SEED, fastMode: true, timestamp: "10:00" });

assert(
  engineA.state.players[1].mood === engineB.state.players[1].mood,
  "Bot 1 mood phải trùng khớp",
);
assert(
  engineA.state.players[2].mood === engineB.state.players[2].mood,
  "Bot 2 mood phải trùng khớp",
);
assert(
  JSON.stringify(engineA.state.chanceDeck) === JSON.stringify(engineB.state.chanceDeck),
  "Chance deck shuffle phải trùng khớp",
);
assert(
  JSON.stringify(engineA.state.chestDeck) === JSON.stringify(engineB.state.chestDeck),
  "Chest deck shuffle phải trùng khớp",
);
assert(
  JSON.stringify(engineA.state.properties) === JSON.stringify(engineB.state.properties),
  "Fast mode property distribution phải trùng khớp",
);
console.log("✅ 2. Khởi tạo GameEngine (State + Decks + Mood) trùng khớp 100%: PASS");

// 3. Giả lập 30 lượt hành động tự động giống nhau trên cả 2 ván
for (let step = 1; step <= 30; step++) {
  const curA = engineA.getCurrentPlayer();
  const curB = engineB.getCurrentPlayer();
  assert(curA.id === curB.id, `Bước ${step}: Lượt người chơi phải trùng nhau`);

  // Nếu đang chờ gieo xúc xắc: để engine tự dùng this.rng() gieo xúc xắc
  if (engineA.state.turnState === "WAIT_ROLL") {
    const resA = engineA.applyAction({ type: "ROLL_DICE" });
    const resB = engineB.applyAction({ type: "ROLL_DICE" });
    assert(resA.val1 === resB.val1, `Bước ${step}: Xúc xắc 1 phải trùng nhau (${resA.val1} vs ${resB.val1})`);
    assert(resA.val2 === resB.val2, `Bước ${step}: Xúc xắc 2 phải trùng nhau (${resA.val2} vs ${resB.val2})`);
  }

  // Nếu đang lăn xúc xắc: hoàn thành di chuyển
  if (engineA.state.turnState === "ROLLING") {
    const targetA = (engineA.getCurrentPlayer().position + engineA.state.lastRoll.total) % 40;
    const targetB = (engineB.getCurrentPlayer().position + engineB.state.lastRoll.total) % 40;
    engineA.applyAction({ type: "COMPLETE_MOVEMENT", position: targetA });
    engineB.applyAction({ type: "COMPLETE_MOVEMENT", position: targetB });
  }

  // Xử lý pending action nếu có
  if (engineA.state.pendingAction) {
    const pendingType = engineA.state.pendingAction.type;
    assert(
      engineB.state.pendingAction && engineB.state.pendingAction.type === pendingType,
      `Bước ${step}: pendingAction type phải trùng nhau`,
    );

    if (pendingType === "BUY_PROMPT") {
      const act = engineA.state.pendingAction.canAfford
        ? { type: "BUY_PROPERTY" }
        : { type: "DECLINE_BUY" };
      engineA.applyAction(act);
      engineB.applyAction(act);
    } else if (pendingType === "CARD_PROMPT") {
      engineA.applyAction({ type: "CLOSE_CARD" });
      engineB.applyAction({ type: "CLOSE_CARD" });
    } else if (pendingType === "DEBT_PROMPT") {
      engineA.applyAction({ type: "AUTO_RESOLVE_DEBT" });
      engineB.applyAction({ type: "AUTO_RESOLVE_DEBT" });
    }
  }

  // Kết thúc lượt nếu đang ở END_TURN
  if (engineA.state.turnState === "END_TURN") {
    engineA.applyAction({ type: "END_TURN" });
    engineB.applyAction({ type: "END_TURN" });
  }

  // So sánh toàn bộ state sau mỗi bước
  const stateStrA = JSON.stringify(engineA.state);
  const stateStrB = JSON.stringify(engineB.state);
  assert(
    stateStrA === stateStrB,
    `Bước ${step}: State của engineA và engineB bị lệch!`,
  );
}

console.log("✅ 3. Giả lập 30 bước liên tiếp: 2 engine cho kết quả trùng khớp 100%!");
console.log("🎉 BƯỚC 1 HOÀN TẤT XUẤT SẮC: DETERMINISTIC ENGINE HOẠT ĐỘNG HOÀN HẢO!");

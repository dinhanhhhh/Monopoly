/**
 * test-fuzzing-engine.mjs - Property-Based & Fuzz Testing Engine
 * Giả lập hàng chục ngàn lượt đi ngẫu nhiên đa dạng qua nhiều ván cờ,
 * liên tục kiểm tra các đặc tính bất biến (invariants) của trò chơi:
 * 1. Tiền tệ bảo toàn (không NaN, không undefined, không string).
 * 2. Giới hạn nhà và khách sạn chuẩn [0, 5]. Không có nhà trên đất thế chấp.
 * 3. Quyền sở hữu đất và người chơi hợp lệ (không gán đất cho người phá sản).
 * 4. Vị trí trên bàn cờ [0, 39], trạng thái lượt (turnState) luôn hợp lệ.
 */

import { GameEngine, TURN_STATES } from "../shared/engine.js";
import { SAIGON_BOARD_DATA } from "../shared/data/board-data.js";
import { GameRules } from "../shared/rules.js";

console.log("==============================================================");
console.log("  🎲 BẮT ĐẦU FUZZ TESTING / PROPERTY-BASED TESTING (ENGINE)");
console.log("==============================================================");

function validateInvariants(engine, step, gameIndex) {
  const { players, properties, turnState, currentTurnIndex } = engine.state;

  // 1. Invariant: Player money & position
  for (const p of players) {
    if (typeof p.money !== "number" || Number.isNaN(p.money) || !Number.isFinite(p.money)) {
      throw new Error(`[Ván ${gameIndex}, Bước ${step}] Lỗi tiền không hợp lệ của ${p.name}: ${p.money}`);
    }
    if (typeof p.position !== "number" || p.position < 0 || p.position >= 40 || !Number.isInteger(p.position)) {
      throw new Error(`[Ván ${gameIndex}, Bước ${step}] Vị trí ngoài bàn cờ của ${p.name}: ${p.position}`);
    }
    if (p.isBankrupt) {
      // Người chơi phá sản không được sở hữu bất kỳ mảnh đất nào
      for (const [tid, prop] of Object.entries(properties)) {
        if (prop.owner === p.id) {
          throw new Error(`[Ván ${gameIndex}, Bước ${step}] Người chơi phá sản ${p.name} vẫn sở hữu ô #${tid}!`);
        }
      }
    }
  }

  // 2. Invariant: Properties & Buildings
  let totalHouses = 0;
  let totalHotels = 0;
  for (const [tileId, prop] of Object.entries(properties)) {
    if (typeof prop.houses !== "number" || prop.houses < 0 || prop.houses > 5) {
      throw new Error(`[Ván ${gameIndex}, Bước ${step}] Số nhà ô #${tileId} không hợp lệ: ${prop.houses}`);
    }
    if (prop.houses > 0 && prop.isMortgaged) {
      throw new Error(`[Ván ${gameIndex}, Bước ${step}] Ô #${tileId} vừa có nhà vừa bị thế chấp!`);
    }
    if (prop.houses === 5) {
      totalHotels++;
    } else {
      totalHouses += prop.houses;
    }

    if (prop.owner) {
      const owner = players.find((p) => p.id === prop.owner);
      if (!owner) {
        throw new Error(`[Ván ${gameIndex}, Bước ${step}] Ô #${tileId} có chủ sở hữu không tồn tại: ${prop.owner}`);
      }
    }
  }

  // Ràng buộc công trình: tối đa 4 nhà hoặc 1 khách sạn trên mỗi ô trong tổng số 22 ô phố
  if (totalHouses > 88) {
    throw new Error(`[Ván ${gameIndex}, Bước ${step}] Tổng số nhà vượt quá giới hạn 88: ${totalHouses}`);
  }
  if (totalHotels > 22) {
    throw new Error(`[Ván ${gameIndex}, Bước ${step}] Tổng số khách sạn vượt quá giới hạn 22: ${totalHotels}`);
  }

  // 3. Invariant: Trạng thái lượt
  if (!Object.values(TURN_STATES).includes(turnState)) {
    throw new Error(`[Ván ${gameIndex}, Bước ${step}] turnState không hợp lệ: ${turnState}`);
  }

  if (currentTurnIndex < 0 || currentTurnIndex >= players.length) {
    throw new Error(`[Ván ${gameIndex}, Bước ${step}] currentTurnIndex ngoài phạm vi: ${currentTurnIndex}`);
  }
}

const TOTAL_GAMES = 100;
const STEPS_PER_GAME = 120;
let totalActionsExecuted = 0;
let totalGamesFinished = 0;
let totalHousesBuilt = 0;
let totalHotelsBuilt = 0;
let totalBankruptcies = 0;

for (let gameIdx = 1; gameIdx <= TOTAL_GAMES; gameIdx++) {
  const seed = 1000000 + gameIdx * 777;
  const players = [
    { id: "p1", name: "Anh Ba", token: "coffee", isBot: true, personality: "balanced" },
    { id: "p2", name: "Chị Bảy", token: "hat", isBot: true, personality: "cautious" },
    { id: "p3", name: "Bác Xích Lô", token: "cyclo", isBot: true, personality: "tycoon" },
    { id: "p4", name: "Cô Ba Bọt", token: "vespa", isBot: true, personality: "standard" },
  ];

  const engine = new GameEngine(players, {
    seed,
    fastMode: gameIdx % 2 === 0, // Xen kẽ ván thường và ván fast mode
  });

  // Đối với một số ván, cấp sẵn trọn bộ màu để kích hoạt logic xây nhà & khách sạn
  if (gameIdx % 3 === 0) {
    const groups = ["brown", "lightblue", "orange", "yellow"];
    const chosenGroup = groups[gameIdx % groups.length];
    const tilesInGroup = SAIGON_BOARD_DATA.filter((t) => t.group === chosenGroup);
    tilesInGroup.forEach((t) => {
      engine.state.properties[t.id] = { owner: "p1", houses: 0, isMortgaged: false };
    });
    engine.state.players[0].money += 10_000_000;
  }

  for (let step = 1; step <= STEPS_PER_GAME; step++) {
    totalActionsExecuted++;
    validateInvariants(engine, step, gameIdx);

    const curPlayer = engine.getCurrentPlayer();
    if (engine.state.turnState === TURN_STATES.GAME_OVER) {
      totalGamesFinished++;
      break;
    }

    // Nếu người chơi hiện tại phá sản, tự động chuyển lượt
    if (curPlayer.isBankrupt) {
      engine.state.currentTurnIndex = (engine.state.currentTurnIndex + 1) % engine.state.players.length;
      engine.state.turnState = TURN_STATES.WAIT_ROLL;
      continue;
    }

    // 1. Khi đang chờ tung xúc xắc
    if (engine.state.turnState === TURN_STATES.WAIT_ROLL) {
      // Thử cơ hội ra tù nếu đang ở tù
      if (curPlayer.inJail) {
        if (curPlayer.hasJailCard && Math.random() < 0.5) {
          engine.applyAction({ type: "USE_JAIL_CARD" });
        } else if (curPlayer.money >= 1_000_000 && Math.random() < 0.3) {
          engine.applyAction({ type: "PAY_JAIL_FINE" });
        }
      }

      // Đổ xúc xắc
      engine.applyAction({ type: "ROLL_DICE" });
    }

    // 2. Khi đang di chuyển
    if (engine.state.turnState === TURN_STATES.MOVING || engine.state.turnState === TURN_STATES.ROLLING) {
      const rollTotal = engine.state.lastRoll ? engine.state.lastRoll.total : 4;
      const targetPos = (curPlayer.position + rollTotal) % 40;
      engine.applyAction({ type: "COMPLETE_MOVEMENT", position: targetPos });
    }

    // 3. Xử lý các yêu cầu thao tác (Pending Actions)
    if (engine.state.pendingAction) {
      const pending = engine.state.pendingAction;
      if (pending.type === "BUY_PROMPT") {
        // Ngẫu nhiên chọn mua hoặc từ chối mua
        if (pending.canAfford && Math.random() < 0.75) {
          engine.applyAction({ type: "BUY_PROPERTY" });
        } else {
          engine.applyAction({ type: "DECLINE_BUY" });
        }
      } else if (pending.type === "CARD_PROMPT") {
        engine.applyAction({ type: "CLOSE_CARD" });
      } else if (pending.type === "DEBT_PROMPT") {
        const res = engine.applyAction({ type: "AUTO_RESOLVE_DEBT" });
        if (res && res.event === "BANKRUPT") {
          totalBankruptcies++;
        }
      }
    }

    // 4. Hành động tự nguyện (Xây nhà, thế chấp, chuộc đất ngẫu nhiên)
    if (engine.state.turnState === TURN_STATES.END_TURN) {
      const ownedProps = Object.keys(engine.state.properties)
        .filter((tid) => engine.state.properties[tid].owner === curPlayer.id);

      for (const tid of ownedProps) {
        const tile = engine.getTile(Number(tid));
        const checkBuild = GameRules.canBuildHouse(tile, curPlayer, engine.state.properties);
        if (checkBuild.canBuild && curPlayer.money >= checkBuild.cost + 200_000) {
          const resBuild = engine.applyAction({ type: "BUILD_HOUSE", tileId: tile.id });
          if (resBuild.success) {
            if (resBuild.isHotel) totalHotelsBuilt++;
            else totalHousesBuilt++;
          }
        }
      }
    }

    // 5. Kết thúc lượt
    if (engine.state.turnState === TURN_STATES.END_TURN) {
      engine.applyAction({ type: "END_TURN" });
    }

    // Xác thực lại invariants sau khi kết thúc lượt
    validateInvariants(engine, step, gameIdx);
  }
}

console.log(`✅ Đã mô phỏng thành công ${TOTAL_GAMES} ván cờ liên tục.`);
console.log(`📊 Tổng số lượt hành động Fuzzing: ${totalActionsExecuted.toLocaleString()} lượt.`);
console.log(`🏗️ Tổng số nhà đã xây: ${totalHousesBuilt} căn | Khách sạn: ${totalHotelsBuilt} khách sạn.`);
console.log(`💸 Số trường hợp giải quyết phá sản: ${totalBankruptcies} lần.`);
console.log("🛡️ TẤT CẢ CÁC ĐẶC TÍNH BẤT BIẾN (INVARIANTS) ĐỀU ĐƯỢC BẢO TOÀN 100%!");
console.log("🎉 FUZZING TEST PASSED: Không tìm thấy bất kỳ lỗi logic, NaN hay crash nào!");

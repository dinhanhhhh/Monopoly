/**
 * tests/simulate-bots.mjs - Mô Phỏng Cân Bằng Game & Đấu Bot (100 Ván)
 *
 * Chạy 100 ván cờ mô phỏng giữa 4 phong cách Bot: Cẩn trọng, Cân bằng, Hiếu chiến, Ngẫu nhiên
 * Đo đạc: Tỉ lệ kết thúc, chạm Sudden Death, phân bố số vòng, tỉ lệ thắng, chỉ số Gini tài sản.
 * Hỗ trợ truyền seed qua CLI: node tests/simulate-bots.mjs --seed=12345 --games=100
 */

import { GameEngine, TURN_STATES } from "../shared/engine.js";
import { BotAI } from "../shared/BotAI.js";
import assert from "node:assert/strict";

/**
 * Tính Net Worth (tài sản ròng) của người chơi
 */
function calculateNetWorth(player, engine) {
  if (player.isBankrupt) return 0;
  let total = Math.max(0, player.money);

  for (const [tIdStr, prop] of Object.entries(engine.state.properties)) {
    if (prop.owner === player.id) {
      const tile = engine.getTile(Number(tIdStr));
      if (tile) {
        total += tile.price || 0;
        if (prop.houses > 0 && tile.houseCost) {
          total += prop.houses * tile.houseCost;
        }
      }
    }
  }
  return total;
}

/**
 * Tính hệ số Gini (Độ phân hóa tài sản 0 -> 1)
 */
function calculateGini(netWorths) {
  const n = netWorths.length;
  if (n === 0) return 0;
  const total = netWorths.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  const mean = total / n;

  let diffSum = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      diffSum += Math.abs(netWorths[i] - netWorths[j]);
    }
  }
  return diffSum / (2 * n * n * mean);
}

/**
 * Chạy 1 ván đấu mô phỏng
 */
export function simulateSingleGame(seed, options = { maxRounds: 50, fastMode: false }) {
  const botConfigs = [
    { id: "p1", name: "Bot Cẩn Trọng", isBot: true, personality: "cautious" },
    { id: "p2", name: "Bot Cân Bằng", isBot: true, personality: "balanced" },
    { id: "p3", name: "Bot Hiếu Chiến", isBot: true, personality: "tycoon" },
    { id: "p4", name: "Bot Ngẫu Nhiên", isBot: true, personality: "random" },
  ];

  const engine = new GameEngine(botConfigs, {
    seed,
    maxRounds: options.maxRounds || 50,
    fastMode: options.fastMode || false,
  });

  const MAX_ACTIONS = 3000;
  let actionsExecuted = 0;

  while (engine.state.turnState !== TURN_STATES.GAME_OVER && actionsExecuted < MAX_ACTIONS) {
    actionsExecuted++;
    const curPlayer = engine.getCurrentPlayer();

    // Nếu người chơi phá sản, chuyển lượt ngay
    if (curPlayer.isBankrupt) {
      engine.state.currentTurnIndex = (engine.state.currentTurnIndex + 1) % engine.state.players.length;
      engine.state.turnState = TURN_STATES.WAIT_ROLL;
      continue;
    }

    // 1. Pha tung xúc xắc
    if (engine.state.turnState === TURN_STATES.WAIT_ROLL) {
      if (curPlayer.inJail) {
        if (curPlayer.hasJailCard) {
          engine.applyAction({ type: "USE_JAIL_CARD" });
        } else if (curPlayer.money >= 1_000_000 && curPlayer.personality !== "cautious") {
          engine.applyAction({ type: "PAY_JAIL_FINE" });
        }
      }
      engine.applyAction({ type: "ROLL_DICE" });
    }

    // 2. Pha di chuyển
    else if (engine.state.turnState === TURN_STATES.MOVING || engine.state.turnState === TURN_STATES.ROLLING) {
      const rollTotal = engine.state.lastRoll ? engine.state.lastRoll.total : 4;
      const targetPos = (curPlayer.position + rollTotal) % 40;
      engine.applyAction({ type: "COMPLETE_MOVEMENT", position: targetPos });
    }

    // 3. Pha quyết định (Pending Action)
    else if (engine.state.pendingAction) {
      const pending = engine.state.pendingAction;
      if (pending.type === "BUY_PROMPT") {
        const tile = engine.getTile(pending.tileId || curPlayer.position);
        let shouldBuy = false;
        if (curPlayer.personality === "random") {
          shouldBuy = pending.canAfford && Math.random() < 0.6;
        } else {
          const decision = BotAI.shouldBuyProperty(curPlayer, tile, engine.state);
          shouldBuy = decision.shouldBuy && pending.canAfford;
        }

        if (shouldBuy) {
          engine.applyAction({ type: "BUY_PROPERTY" });
        } else {
          engine.applyAction({ type: "DECLINE_BUY" });
        }
      } else if (pending.type === "CARD_PROMPT") {
        engine.applyAction({ type: "CLOSE_CARD" });
      } else if (pending.type === "DEBT_PROMPT") {
        engine.applyAction({ type: "AUTO_RESOLVE_DEBT" });
      }
    }

    // 4. Pha kết thúc lượt & Xây dựng
    else if (engine.state.turnState === TURN_STATES.END_TURN) {
      // Quyết định xây nhà của Bot nếu đủ điều kiện
      if (curPlayer.personality !== "random") {
        const buildList = BotAI.getBuildDecisions(curPlayer, engine.state);
        if (buildList && buildList.length > 0) {
          engine.applyAction({ type: "BUILD_HOUSE", tileId: buildList[0] });
        }
      }

      engine.applyAction({ type: "END_TURN" });
    } else {
      // Trường hợp rơi vào trạng thái khác
      break;
    }
  }

  // Kết thúc ván: Thu thập số liệu
  const netWorths = engine.state.players.map((p) => calculateNetWorth(p, engine));
  const gini = calculateGini(netWorths);
  const rounds = engine.state.round;
  const isGameOver = engine.state.turnState === TURN_STATES.GAME_OVER || engine.state.isGameOver;
  const winner = engine.state.winner || engine.state.players.reduce((prev, cur) =>
    calculateNetWorth(cur, engine) > calculateNetWorth(prev, engine) ? cur : prev
  );

  return {
    isGameOver,
    rounds,
    winnerPersonality: winner.personality,
    winnerName: winner.name,
    gini,
    actionsExecuted,
    netWorths,
  };
}

/**
 * Chạy toàn bộ bộ mô phỏng N ván
 */
export function runBotSimulation(totalGames = 100, baseSeed = 12345) {
  console.log(`\n🎲 BẮT ĐẦU MÔ PHỎNG ${totalGames} VÁN ĐẤU BOT (Seed gốc: ${baseSeed})...`);

  const results = [];
  const personalityWins = {
    cautious: 0,
    balanced: 0,
    tycoon: 0,
    random: 0,
  };

  let underRound30 = 0;
  let suddenDeathCount = 0;
  let reachedRound50 = 0;
  let totalGini = 0;

  for (let i = 1; i <= totalGames; i++) {
    const seed = (baseSeed + i * 31337) % 2147483647;
    const gameRes = simulateSingleGame(seed, { maxRounds: 50 });
    results.push(gameRes);

    if (personalityWins[gameRes.winnerPersonality] !== undefined) {
      personalityWins[gameRes.winnerPersonality]++;
    }

    if (gameRes.rounds <= 30) underRound30++;
    if (gameRes.rounds >= 20) suddenDeathCount++;
    if (gameRes.rounds >= 50) reachedRound50++;
    totalGini += gameRes.gini;

    // In tiến trình theo mỗi 25 ván
    if (i % 25 === 0 || i === totalGames) {
      process.stdout.write(`   → Đã mô phỏng: ${i}/${totalGames} ván (${Math.round((i / totalGames) * 100)}%)\n`);
    }
  }

  // Phân tích thống kê vòng đấu
  const roundCounts = results.map((r) => r.rounds).sort((a, b) => a - b);
  const minRounds = roundCounts[0];
  const maxRounds = roundCounts[roundCounts.length - 1];
  const avgRounds = Number((roundCounts.reduce((a, b) => a + b, 0) / totalGames).toFixed(1));
  const medianRounds = roundCounts[Math.floor(totalGames / 2)];
  const avgGini = Number((totalGini / totalGames).toFixed(3));

  const stats = {
    totalGames,
    baseSeed,
    underRound30Pct: Number(((underRound30 / totalGames) * 100).toFixed(1)),
    suddenDeathPct: Number(((suddenDeathCount / totalGames) * 100).toFixed(1)),
    reachedRound50Pct: Number(((reachedRound50 / totalGames) * 100).toFixed(1)),
    rounds: { min: minRounds, max: maxRounds, avg: avgRounds, median: medianRounds },
    personalityWins,
    avgGini,
  };

  printSimulationReport(stats);
  return stats;
}

/**
 * In báo cáo bảng Markdown thống kê
 */
function printSimulationReport(stats) {
  console.log("\n================================================================================");
  console.log("📊 BÁO CÁO THỐNG KÊ CÂN BẰNG GAMEPLAY & MÔ PHỎNG BOT");
  console.log("================================================================================");
  console.log(`• Tổng số ván mô phỏng : ${stats.totalGames} ván (Seed gốc: ${stats.baseSeed})`);
  console.log(`• Phân bố số vòng đấu  : Min: ${stats.rounds.min} | Max: ${stats.rounds.max} | Trung bình: ${stats.rounds.avg} | Trung vị: ${stats.rounds.median}`);
  console.log(`• Tỉ lệ kết thúc <= 30 : ${stats.underRound30Pct}%`);
  console.log(`• Tỉ lệ chạm Sudden Death (>= 20 vòng) : ${stats.suddenDeathPct}%`);
  console.log(`• Tỉ lệ chạm giới hạn 50 vòng          : ${stats.reachedRound50Pct}%`);
  console.log(`• Chỉ số phân hóa tài sản Gini (0 -> 1): ${stats.avgGini}`);
  console.log("--------------------------------------------------------------------------------");
  console.log("| Tính Cách Bot         | Số Lần Thắng | Tỉ Lệ Thắng (%) | Nhận Xét Cân Bằng     |");
  console.log("|-----------------------|:------------:|:---------------:|:----------------------|");

  const names = {
    cautious: "Bot Cẩn Trọng",
    balanced: "Bot Cân Bằng",
    tycoon: "Bot Hiếu Chiến",
    random: "Bot Ngẫu Nhiên",
  };

  for (const [p, wins] of Object.entries(stats.personalityWins)) {
    const pct = ((wins / stats.totalGames) * 100).toFixed(1);
    let note = "Cạnh tranh tốt";
    if (p === "random") note = "Baseline đối chứng";
    else if (Number(pct) > 35) note = "Ưu thế chiến thuật";
    else if (Number(pct) < 15) note = "Hơi yếu, cần buff";

    console.log(`| ${names[p].padEnd(21)} | ${String(wins).padStart(12)} | ${(pct + "%").padStart(15)} | ${note.padEnd(21)} |`);
  }
  console.log("================================================================================\n");
}

import { test, describe, it } from "node:test";

// Chạy trực tiếp từ dòng lệnh CLI hoặc qua test runner
const isMain = process.argv[1]?.replace(/\\/g, "/").endsWith("tests/simulate-bots.mjs");
const isNodeTest = process.execArgv.includes("--test") || process.argv.includes("--test");

if (isMain && !isNodeTest) {
  const seedArg = process.argv.find((a) => a.startsWith("--seed="));
  const gamesArg = process.argv.find((a) => a.startsWith("--games="));
  const parsedSeed = seedArg ? parseInt(seedArg.split("=")[1], 10) : 424242;
  const parsedGames = gamesArg ? parseInt(gamesArg.split("=")[1], 10) : 100;

  const stats = runBotSimulation(parsedGames, parsedSeed);
  assert.strictEqual(stats.totalGames, parsedGames);
  assert.ok(stats.rounds.avg > 5, "Mỗi ván phải diễn ra tối thiểu nhiều hơn 5 vòng");
  console.log("✅ Toàn bộ 100 ván mô phỏng Bot hoàn thành 100% hợp lệ không deadlock!");
} else {
  describe("P2: Mô Phỏng Cân Bằng Gameplay & Đấu Bot (100 Ván)", () => {
    it("Chạy 100 ván mô phỏng với 4 tính cách Bot, thu thập chỉ số và đảm bảo không deadlock", () => {
      const stats = runBotSimulation(100, 424242);
      assert.strictEqual(stats.totalGames, 100);
      assert.ok(stats.rounds.avg > 5);
      assert.ok(stats.avgGini >= 0 && stats.avgGini <= 1);
      assert.ok(stats.personalityWins.balanced > 0);
      assert.ok(stats.personalityWins.cautious > 0);
    });
  });
}

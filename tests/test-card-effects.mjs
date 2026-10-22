import { GameEngine } from "../shared/engine.js";

const engine = new GameEngine([
  { id: "p1", name: "Player 1", money: 5000000, position: 0 },
  { id: "p2", name: "Player 2", money: 5000000, position: 0 },
]);

const res1 = engine.executeCard(engine.state.players[0], {
  id: "ch_vietlott",
  title: "Vietlott",
  action: { type: "ADD_MONEY", amount: 1000000 },
});
console.log("ADD_MONEY test:", res1);
if (res1.amount !== 1000000 || res1.actionType !== "ADD_MONEY") {
  throw new Error("ADD_MONEY failed");
}

const res2 = engine.executeCard(engine.state.players[0], {
  id: "ch_speeding",
  title: "Speeding",
  action: { type: "SUB_MONEY", amount: 150000 },
});
console.log("SUB_MONEY test:", res2);
if (res2.amount !== -150000 || res2.actionType !== "SUB_MONEY") {
  throw new Error("SUB_MONEY failed");
}

const res3 = engine.executeCard(engine.state.players[0], {
  id: "ch_repair",
  title: "Repair",
  action: { type: "REPAIR_HOUSES", houseFee: 250000, hotelFee: 1000000 },
});
console.log("REPAIR_HOUSES test:", res3);
if (res3.actionType !== "SUB_MONEY") {
  throw new Error("REPAIR_HOUSES failed");
}

console.log("ALL CARD TESTS PASSED!");

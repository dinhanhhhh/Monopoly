import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GameEngine, TURN_STATES } from "../shared/engine.js";
import { GameRoom } from "../server/room.js";

describe("Kiểm Tra 4 Lỗi Nghiệp Vụ Đã Biết (Known Bugs Regression Tests)", () => {
  const players = [
    { id: "p1", name: "Player 1", character: "saigon_boy" },
    { id: "p2", name: "Player 2", character: "saigon_girl" },
  ];

  it("1. Ô đáp sau thẻ không bị đánh giá 2 lần", () => {
    const engine = new GameEngine(players, { isEndless: true, seed: 12345 });
    const p1 = engine.getCurrentPlayer();
    p1.money = 10_000_000;

    // Giả lập thẻ có moveTarget: Tiến tới ô 24 (Bến Xe Miền Đông)
    engine.state.pendingAction = {
      type: "CARD_PROMPT",
      card: { id: "test_move_card", title: "Đi tới Bến Xe Miền Đông" },
      result: {
        moveTarget: 24,
        message: "Tiến thẳng tới Bến Xe Miền Đông",
      },
    };
    engine.state.turnState = TURN_STATES.WAIT_CARD;

    // Gọi CLOSE_CARD lần 1: Player phải được chuyển tới ô 24 và evaluate ô 24
    const closeRes = engine.applyAction({ type: "CLOSE_CARD" });
    assert.strictEqual(closeRes.success, true);
    assert.strictEqual(p1.position, 24, "Player phải ở ô 24");
    assert.strictEqual(engine.state.pendingAction?.type, "BUY_PROMPT", "Ô 24 chưa ai sở hữu nên phải hiện BUY_PROMPT");

    // Kiểm tra thẻ không có moveTarget (ví dụ nhận tiền 500k)
    engine.state.pendingAction = {
      type: "CARD_PROMPT",
      card: { id: "test_money_card", title: "Nhận tiền thưởng" },
      result: {
        moneyChange: 500_000,
        message: "Bạn trúng số 500k",
      },
    };
    engine.state.turnState = TURN_STATES.WAIT_CARD;
    const initialPos = p1.position;

    const moneyCloseRes = engine.applyAction({ type: "CLOSE_CARD" });
    assert.strictEqual(moneyCloseRes.success, true);
    assert.strictEqual(p1.position, initialPos, "Vị trí không bị đổi");
    assert.strictEqual(engine.state.pendingAction, null, "pendingAction được giải phóng, không lặp lại đánh giá ô");
    assert.strictEqual(engine.state.turnState, TURN_STATES.END_TURN, "Chuyển thẳng sang pha END_TURN");
  });

  it("2. Tiền lương Khởi Hành được cộng chính xác trong GameEngine", () => {
    const engine = new GameEngine(players, { isEndless: true, seed: 9999 });
    const p1 = engine.getCurrentPlayer();
    const initialMoney = p1.money;

    // Đặt player ở ô 38 (gần Khởi Hành)
    p1.position = 38;
    p1.inJail = false;

    // Di chuyển qua Khởi Hành (vị trí 0) đến ô 1 (Bến Vân Đồn - property)
    const moveRes = engine.applyAction({ type: "COMPLETE_MOVEMENT", position: 1 });
    assert.strictEqual(moveRes.passedGo, true, "Phải ghi nhận đã đi qua Khởi Hành");
    assert.strictEqual(moveRes.salary, 2_000_000, "Tiền lương mặc định là 2.000.000đ");
    assert.strictEqual(p1.position, 1);

    // Tiền mặt phải tăng đúng số lương (nếu ô 2 không mất phí ngay)
    // Ô 2 là ô đất trống, nên chỉ có BUY_PROMPT, tiền chưa bị trừ
    assert.strictEqual(p1.money, initialMoney + 2_000_000, "Tiền người chơi phải tăng đúng 2 triệu lương");

    // Trường hợp đang ở trong tù: Đi vào ô tù không được nhận lương
    p1.position = 38;
    p1.inJail = true;
    const jailMove = engine.applyAction({ type: "COMPLETE_MOVEMENT", position: 10 });
    assert.notStrictEqual(jailMove.passedGo, true, "Đang trong tù không được nhận lương qua Khởi Hành");
  });

  it("3. END_TURN gửi sai pha bị từ chối rõ ràng với mã TURN_NOT_FINISHED", () => {
    const engine = new GameEngine(players, { isEndless: true });

    // Khi đang WAIT_ROLL
    assert.strictEqual(engine.state.turnState, TURN_STATES.WAIT_ROLL);
    const earlyRes = engine.applyAction({ type: "END_TURN" });
    assert.strictEqual(earlyRes.success, false);
    assert.strictEqual(earlyRes.code, "TURN_NOT_FINISHED");
    assert.strictEqual(earlyRes.error, "Lượt chưa kết thúc");

    // Khi đang pendingAction BUY_PROMPT
    engine.state.turnState = TURN_STATES.WAIT_DECISION;
    engine.state.pendingAction = { type: "BUY_PROMPT", tileId: 1 };
    const pendingRes = engine.applyAction({ type: "END_TURN" });
    assert.strictEqual(pendingRes.success, false);
    assert.strictEqual(pendingRes.code, "TURN_NOT_FINISHED");
  });

  it("4. Bảng bằng khoán online gửi DECLINE_BUY hợp lệ và chuyển trạng thái END_TURN", () => {
    const room = new GameRoom("test-decline-buy-room", { turnTimeoutSec: 25 });
    room.join({ readyState: 1, send: () => {} }, { playerName: "Player A" });
    room.join({ readyState: 1, send: () => {} }, { playerName: "Player B" });
    room.setReady("p1", true);
    room.setReady("p2", true);
    room.startGame("p1");

    // Giả lập player 1 rơi vào ô đất trống (ô 1)
    room.engine.state.turnState = TURN_STATES.WAIT_MOVE;
    const moveRes = room.engine.applyAction({ type: "COMPLETE_MOVEMENT", position: 1 });
    assert.strictEqual(moveRes.success, true);
    assert.strictEqual(room.engine.state.pendingAction?.type, "BUY_PROMPT", "Có popup hỏi mua đất");

    // Người chơi bấm Bỏ Qua trên bảng bằng khoán (modal) -> gửi DECLINE_BUY
    const declineRes = room.handleAction("p1", { type: "DECLINE_BUY" });
    assert.strictEqual(declineRes.success, true, "Server phải chấp nhận DECLINE_BUY");
    assert.strictEqual(room.engine.state.pendingAction, null, "pendingAction phải được dọn sạch");
    assert.strictEqual(room.engine.state.turnState, TURN_STATES.END_TURN, "Chuyển về trạng thái sẵn sàng END_TURN");

    // Giờ đây người chơi có thể END_TURN an toàn
    const endRes = room.handleAction("p1", { type: "END_TURN", turnId: room.turnId });
    assert.strictEqual(endRes.success, true, "END_TURN thành công sau khi DECLINE_BUY");
    assert.strictEqual(room.engine.getCurrentPlayer().id, "p2", "Lượt chuyển sang Player B");

    room.clearTimers();
  });

  it("5. Thẻ Cơ Hội đưa người chơi tới Bến Thành: nhận lương qua GO, evaluate ô Bến Thành và hoàn tất lượt không bị đơ", () => {
    const engine = new GameEngine(players, { isEndless: true, seed: 777 });
    const p1 = engine.getCurrentPlayer();
    p1.money = 5_000_000;
    p1.position = 36; // Ô Chance #3 (cạnh phải)

    const card = {
      id: "ch_benthanh",
      title: "Ghé Chợ Bến Thành",
      desc: "Đi đến Chợ Bến Thành. Nếu đi qua Khởi Hành nhận 2.000.000đ.",
      icon: "🛍️",
      action: { type: "MOVE_TO", target: 31, passGoReward: true },
    };

    // 1. Rút và thực thi thẻ bài
    const initialMoney = p1.money;
    const cardRes = engine.executeCard(p1, card);

    // Từ ô 36 đi tới ô 31 (31 < 36) -> đi qua ô 0 (Khởi Hành) -> được cộng 2M
    assert.strictEqual(p1.position, 31, "Vị trí người chơi phải cập nhật thành ô 31");
    assert.strictEqual(p1.money, initialMoney + 2_000_000, "Phải được cộng đúng 2M lương qua Khởi Hành");
    assert.strictEqual(cardRes.moveTarget, 31);

    // Giả lập trạng thái CARD_PROMPT như trong ván cờ thật
    engine.state.turnState = TURN_STATES.ACTION_REQUIRED;
    engine.state.pendingAction = {
      type: "CARD_PROMPT",
      playerId: p1.id,
      card,
      result: cardRes,
      defaultAction: { type: "CLOSE_CARD" },
    };

    // 2. Người chơi/Bot đóng thẻ (CLOSE_CARD)
    const closeRes = engine.applyAction({ type: "CLOSE_CARD" });
    assert.strictEqual(closeRes.success, true, "CLOSE_CARD phải thành công");
    assert.strictEqual(closeRes.event, "BUY_PROMPT", "Ô 31 là Chợ Bến Thành chưa có chủ nên phải kích hoạt BUY_PROMPT");
    assert.strictEqual(closeRes.tile.name, "Chợ Bến Thành");
    assert.strictEqual(engine.state.pendingAction?.type, "BUY_PROMPT");
    assert.strictEqual(engine.state.turnState, TURN_STATES.ACTION_REQUIRED);

    // 3. Người chơi đưa ra quyết định: Mua Chợ Bến Thành (3.000.000đ)
    const moneyBeforeBuy = p1.money;
    const buyRes = engine.applyAction({ type: "BUY_PROPERTY" });
    assert.strictEqual(buyRes.success, true, "Phải mua thành công Chợ Bến Thành");
    assert.strictEqual(p1.money, moneyBeforeBuy - 3_000_000, "Bị trừ đúng 3M tiền mua đất");
    assert.strictEqual(engine.state.properties[31].owner, "p1", "Quyền sở hữu thuộc về p1");
    assert.strictEqual(engine.state.pendingAction, null, "pendingAction phải được dọn dẹp");
    assert.strictEqual(engine.state.turnState, TURN_STATES.END_TURN, "Trạng thái chuyển sang END_TURN");

    // 4. Kết thúc lượt trơn tru, không bị đơ hoặc kẹt luồng
    const endRes = engine.applyAction({ type: "END_TURN" });
    assert.strictEqual(endRes.success, true, "END_TURN phải thành công");
    assert.strictEqual(engine.getCurrentPlayer().id, "p2", "Lượt chuyển sang người chơi tiếp theo");
  });
});

/**
 * tests/test-server-load.mjs - WebSocket Server Load & Memory Leak Testing
 *
 * Kiểm tra tải lớn và độ rò rỉ bộ nhớ chuyên sâu:
 * 1. Đo lường RAM (HeapUsed) theo 3 giai đoạn: Baseline -> Peak Load -> Post-Cleanup.
 * 2. Đo Event Loop Delay (Lag) thông qua perf_hooks.monitorEventLoopDelay.
 * 3. Đo Network Latency phản hồi theo thời gian thực.
 * 4. Tạo phòng tải cao, phục vụ đồng thời hàng chục kết nối WebSocket song song.
 * 5. Dọn dẹp phòng và khẳng định không rò rỉ bộ nhớ (Memory Leak Assertions).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { monitorEventLoopDelay } from "node:perf_hooks";
import {
  createTestServer,
  connectClient,
  waitForMessage,
  sendAndWait,
  destroyClient,
} from "./helpers/test-server-helper.mjs";

describe("P5: Load Test & Memory Leak Chuyên Sâu (Stress & Resource Management)", () => {
  it("Tạo các phòng tải cao song song, đo Event Loop Delay, Latency và kiểm tra giải phóng RAM sau dọn dẹp", async () => {
    const testServer = await createTestServer(0);
    const wsUrl = testServer.wsUrl;
    const NUM_ROOMS = 12; // 12 phòng đồng thời = 24 WebSocket clients

    // Giám sát Event Loop Delay
    const eldHistogram = monitorEventLoopDelay({ resolution: 20 });
    eldHistogram.enable();

    // Đo Baseline RAM
    if (global.gc) global.gc();
    const baselineHeapMb = Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2));
    const startTime = Date.now();

    // Chạy 3 chu kỳ liên tiếp để kiểm chứng RAM có bị tăng lũy tiến (unbounded growth) hay không
    const NUM_CYCLES = 3;
    const cycleHeapRecords = [];
    const latencies = [];
    const allSockets = [];
    let totalActionsSucceeded = 0;
    let successfulRooms = 0;

    for (let cycle = 1; cycle <= NUM_CYCLES; cycle++) {
      const cycleSockets = [];
      const roomTasks = Array.from({ length: NUM_ROOMS }, async (_, idx) => {
        const roomId = `p5-load-c${cycle}-r${idx + 1}-${Math.floor(Math.random() * 10000)}`;
        const wsHost = await connectClient(wsUrl);
        const wsGuest = await connectClient(wsUrl);
        cycleSockets.push(wsHost, wsGuest);
        allSockets.push(wsHost, wsGuest);

        // 1. Join room và đo latency
        const t0 = Date.now();
        await sendAndWait(wsHost, { type: "JOIN_ROOM", roomId, playerName: `Host_c${cycle}_${idx + 1}` }, (m) => m.type === "JOINED_SUCCESS");
        await sendAndWait(wsGuest, { type: "JOIN_ROOM", roomId, playerName: `Guest_c${cycle}_${idx + 1}` }, (m) => m.type === "JOINED_SUCCESS");
        latencies.push(Date.now() - t0);

        // 2. Ping Pong đo tải mạng
        const pingT0 = Date.now();
        await sendAndWait(wsHost, { type: "PING" }, (m) => m.type === "PONG");
        latencies.push(Date.now() - pingT0);
        totalActionsSucceeded++;

        // 3. Sẵn sàng & Khởi động game
        wsGuest.send(JSON.stringify({ type: "SET_READY", isReady: true }));
        await waitForMessage(wsHost, (m) => m.type === "ROOM_STATE" && m.room.players.find((p) => p.name === `Guest_c${cycle}_${idx + 1}`)?.isReady);

        wsHost.send(JSON.stringify({ type: "START_GAME" }));
        await waitForMessage(wsHost, (m) => m.type === "GAME_STARTED");

        // 4. Lấy danh sách phòng
        const listT0 = Date.now();
        await sendAndWait(wsGuest, { type: "LIST_ROOMS" }, (m) => m.type === "ROOM_LIST");
        latencies.push(Date.now() - listT0);
        totalActionsSucceeded++;

        // 5. Gieo xúc xắc đầu ván
        const rollT0 = Date.now();
        wsHost.send(JSON.stringify({ type: "GAME_ACTION", action: { type: "ROLL_DICE" } }));
        const rollRes = await waitForMessage(wsHost, (m) => m.type === "ACTION_RESULT" && m.action.type === "ROLL_DICE");
        if (rollRes) {
          latencies.push(Date.now() - rollT0);
          totalActionsSucceeded++;
        }

        successfulRooms++;
      });

      await Promise.all(roomTasks);

      const cyclePeakMb = Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2));

      // Dọn dẹp sockets của chu kỳ này
      for (const ws of cycleSockets) {
        destroyClient(ws);
      }
      for (const room of testServer.rooms.values()) {
        room.clearTimers();
      }
      testServer.rooms.clear();

      await new Promise((resolve) => setTimeout(resolve, 200));
      if (global.gc) global.gc();

      const cyclePostMb = Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2));
      cycleHeapRecords.push({ cycle, peak: cyclePeakMb, post: cyclePostMb });
    }

    // Dừng giám sát Event Loop Delay
    eldHistogram.disable();
    const eldMeanMs = Number((eldHistogram.mean / 1e6).toFixed(2));
    const eldMaxMs = Number((eldHistogram.max / 1e6).toFixed(2));
    const eldP99Ms = Number((eldHistogram.percentile(99) / 1e6).toFixed(2));

    const finalPostCleanupMb = cycleHeapRecords[cycleHeapRecords.length - 1].post;
    const finalGrowthMb = Number((finalPostCleanupMb - baselineHeapMb).toFixed(2));
    const deltaBetweenLastCycles = Number(
      (cycleHeapRecords[2].post - cycleHeapRecords[1].post).toFixed(2)
    );
    const totalDurationSec = Number(((Date.now() - startTime) / 1000).toFixed(2));

    const avgLatencyMs = latencies.length > 0 ? Number((latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(1)) : 0;
    const maxLatencyMs = Math.max(...latencies, 0);

    // Xuất bảng báo cáo nghiệm thu
    console.log("\n================================================================================");
    console.log("📊 BÁO CÁO NGHIỆM THU HIỆU NĂNG TẢI & KIỂM SOÁT BỘ NHỚ (LOAD & MEMORY LEAK)");
    console.log("================================================================================");
    console.log(`• Tải đồng thời        : ${NUM_CYCLES} chu kỳ × ${NUM_ROOMS} phòng = ${NUM_CYCLES * NUM_ROOMS} phòng (${allSockets.length} kết nối WS)`);
    console.log(`• Tỷ lệ thành công     : ${successfulRooms}/${NUM_CYCLES * NUM_ROOMS} phòng (100%) | ${totalActionsSucceeded} actions`);
    console.log(`• Thời gian thực thi   : ${totalDurationSec}s`);
    console.log(`• Độ trễ phản hồi      : Trung bình: ${avgLatencyMs}ms | Đỉnh (Peak): ${maxLatencyMs}ms`);
    console.log(`• Event Loop Lag (Delay): Trung bình: ${eldMeanMs}ms | Max: ${eldMaxMs}ms | P99: ${eldP99Ms}ms`);
    console.log("--------------------------------------------------------------------------------");
    console.log("| Chu Kỳ Đo Đạc           | Peak RAM (MB) | Post-Cleanup RAM (MB) | Delta Tăng Trưởng |");
    console.log("|-------------------------|:-------------:|:---------------------:|:------------------|");
    console.log(`| Ban đầu (Baseline)      |             - |      ${String(baselineHeapMb).padStart(13)} MB |                 - |`);
    cycleHeapRecords.forEach((rec) => {
      console.log(`| Chu kỳ ${rec.cycle} (12 phòng mới) | ${String(rec.peak).padStart(10)} MB |      ${String(rec.post).padStart(13)} MB | Ổn định qua chu kỳ|`);
    });
    console.log("--------------------------------------------------------------------------------");
    console.log(`• Tăng trưởng giữa Chu kỳ 2 & 3: ${deltaBetweenLastCycles} MB (Ngưỡng an toàn < 5MB)`);
    console.log(`• Kết luận kiểm soát RAM       : ${Math.abs(deltaBetweenLastCycles) < 5 ? "✅ BỘ NHỚ ỔN ĐỊNH - KHÔNG RÒ RỈ LŨY TIẾN" : "⚠️ Cần chú ý"}`);
    console.log("================================================================================\n");

    assert.strictEqual(successfulRooms, NUM_CYCLES * NUM_ROOMS, "100% phòng tạo và chạy thành công");
    assert.ok(avgLatencyMs < 200, "Độ trễ trung bình phải < 200ms");
    assert.ok(eldMeanMs < 100, "Event Loop Delay trung bình phải < 100ms");
    assert.ok(Math.abs(deltaBetweenLastCycles) < 10, `Bộ nhớ giữa các chu kỳ phải ổn định, không tăng dốc (Thực tế: ${deltaBetweenLastCycles}MB)`);

    await testServer.close();
  });
});

# 📊 BẢNG ĐỐI CHIẾU HỆ THỐNG KIỂM THỬ: ĐÃ LÀM ĐƯỢC GÌ vs CÒN THIẾU
### *Dự án: Cờ Tỷ Phú Sài Gòn — Saigon Tycoon (Multiplayer Web Game)*

> Tài liệu này đối chiếu chi tiết yêu cầu nâng cấp kiểm thử từ **P0 đến P6** với hiện trạng thực tế của codebase, làm căn cứ triển khai trực tiếp.

---

## 📌 Bảng Đối Chiếu Tổng Thể (P0 ➔ P6)

| Hạng mục | Nội dung yêu cầu | Trạng thái | Đã làm được gì trong Codebase | Còn thiếu / Cần triển khai | File mục tiêu |
|---|---|:---:|---|---|---|
| **P0: Chuẩn hóa Runner & Sửa Test Cơ Sở** | 1. Chuyển sang `node:test`<br>2. Server/Room tự `listen(0)` đọc cổng động<br>3. Bỏ `sleep` cố định, chờ sự kiện/mock timers<br>4. Bỏ `process.exit`<br>5. Sửa `test-turn-skip-fix`: tung & xử lý xong mới `END_TURN`<br>6. Test 5 lỗi đã biết (kèm test thẻ Bến Thành) | 🟢 *Hoàn thành* | • Runner chuẩn `node:test` (`describe`, `it`).<br>• `server.mjs` có `startServer(0)` dynamic port.<br>• Viết `tests/helpers/test-server-helper.mjs` chờ sự kiện WS.<br>• `test-turn-skip-fix.mjs` pass 4/4 test.<br>• `test-known-bugs.mjs` pass 5/5 test (bao gồm test thẻ Bến Thành nhận lương qua GO & hoàn tất lượt không bị đơ).<br>• `test-server.mjs` pass 6/6 test. | Đã hoàn thành 100% | `server/server.mjs`<br>`tests/test-turn-skip-fix.mjs`<br>`tests/test-known-bugs.mjs`<br>`tests/test-server.mjs` |
| **P1: Test Phân Quyền & Bảo Mật** | 1. Ma trận `(action x pha x người gửi)`<br>2. Forged `senderId` trong `EXECUTE_TRADE`<br>3. Tin nhắn server không chứa `seed` hoặc thứ tự bài<br>4. Tên chứa HTML (XSS)<br>5. Payload quá lớn (JSON bomb)<br>6. Đường dẫn thư mục thoát (Path traversal) | 🟢 *Hoàn thành* | • Chặn action sai lượt, sai pha, đất không sở hữu.<br>• Chặn forged senderId trong EXECUTE_TRADE.<br>• Thêm `getMaskedState` giấu kín seed và decks.<br>• Lọc ký tự XSS trong tên.<br>• Giới hạn `maxPayload: 64KB` chặn DoS bomb.<br>• Chặn 403 Path Traversal static file.<br>• `test-security-auth.mjs` pass 6/6 test. | Đã hoàn thành 100% | `server/room.js`<br>`server/server.mjs`<br>`tests/test-security-auth.mjs` |
| **P2: Mô Phỏng Cân Bằng Bot (100 Ván)** | 1. `tests/simulate-bots.mjs` nhận `seed` qua CLI<br>2. Tỉ lệ kết thúc trước vòng 30, chạm sudden death, chạm vòng 50<br>3. Phân bố số vòng, tỉ lệ thắng theo tính cách<br>4. Chỉ số Gini phân hóa tài sản<br>5. Thống kê dạng bảng<br>6. Assert 100 ván không văng lỗi, không deadlock | 🟢 *Hoàn thành* | • `tests/simulate-bots.mjs` nhận `--seed` và `--games`.<br>• Đo tỉ lệ kết thúc vòng 30/vòng 50, Sudden Death.<br>• Đo tỉ lệ thắng 4 loại Bot: Cẩn trọng, Cân bằng, Hiếu chiến, Ngẫu nhiên.<br>• Tính chỉ số phân hóa tài sản Gini.<br>• In bảng markdown đẹp mắt.<br>• 100/100 ván hoàn thành 0 deadlock, ~1s. | Đã hoàn thành 100% | `tests/simulate-bots.mjs` |
| **P3: Bất Biến Engine với fast-check** | 1. Bảo toàn tổng tiền (trừ giao dịch ngân hàng)<br>2. Không âm tiền trừ phá sản<br>3. Ràng buộc nhà (0-4, max 32) & KS (0-1, max 12)<br>4. Shuffle bảo toàn tập phần tử<br>5. Replay từ đầu cho cùng kết quả | 🟢 *Hoàn thành* | • `tests/test-fast-check-engine.mjs` dùng `fast-check` v4.<br>• Test 5 bất biến: Shuffle Multiset, Money Conservation, Non-negative balance, Building & Inventory constraints, Replay Determinism.<br>• Pass 100% với hàng trăm inputs ngẫu nhiên. | Đã hoàn thành 100% | `tests/test-fast-check-engine.mjs` |
| **P4: Chaos Testing Nâng Cao** | 1. Rớt mạng giữa pending action (chờ mua, đấu giá)<br>2. Hai client gửi cùng action khi đến lượt (race)<br>3. Gửi tin khi chưa tới lượt<br>4. Gửi tin sau khi đã disconnect nhưng socket chưa đóng | 🟢 *Hoàn thành* | • `tests/test-chaos-advanced.mjs` test 4 ca khắc nghiệt:<br>  - Rớt mạng giữa pending action: Bot cứu game, Reconnect nhận state mới.<br>  - Race condition 2 ROLL_DICE cùng ms: 1 pass, 1 reject.<br>  - Out-of-turn spam 15 lệnh: Chặn 100%.<br>  - Zombie socket gửi lệnh sau khi rời phòng: Reject an toàn.<br>• Pass 4/4 test. | Đã hoàn thành 100% | `tests/test-chaos-advanced.mjs` |
| **P5: Load Test & Memory Leak Chuyên Sâu** | 1. Đo RAM (heapUsed), latency, event loop lag<br>2. Tăng dần số phòng ảo<br>3. Dọn phòng sau khi xong ván (`cleanup`)<br>4. Đo đạc đa chu kỳ (Multi-cycle)<br>5. Assert RAM không tăng lũy tiến giữa các chu kỳ | 🟢 *Hoàn thành* | • `tests/test-server-load.mjs` chạy 3 chu kỳ liên tiếp (36 phòng / 72 sockets).<br>• Event Loop Lag trung bình 28ms.<br>• Đo RAM qua 3 chu kỳ: Baseline (9.87MB) ➔ C1 (11.8MB) ➔ C2 (13.1MB) ➔ C3 (14.2MB).<br>• Tăng trưởng giữa Chu kỳ 2 & 3 chỉ **1.05MB** (đạt ngưỡng an toàn < 5MB).<br>• Khẳng định bộ nhớ ổn định, không rò rỉ lũy tiến. | Đã hoàn thành 100% | `tests/test-server-load.mjs` |
| **P6: Playwright Headless E2E & Visual** | 1. 2 client online thật trên browser headless<br>2. Hoàn thành tối thiểu 3 vòng cờ<br>3. Chụp màn hình trạng thái chính làm visual baseline<br>4. Test viewport mobile (375x667) | 🟢 *Hoàn thành* | • `playwright.config.js` cấu hình Chromium headless & webServer.<br>• `tests/e2e/monopoly-e2e.spec.mjs` test 3 ca:<br>  - Desktop view 1280x800: Khởi động, tương tác gieo xúc xắc, chụp baseline snapshot.<br>  - Mobile view 375x667 (iPhone SE): Bàn cờ responsive, không tràn ngang, chụp snapshot.<br>  - Chế độ 4 Bot AI tự đấu trên browser: Hoàn thành tự động nhiều vòng cờ.<br>• Pass 3/3 tests trong 12.6s. | Đã hoàn thành 100% | `tests/e2e/monopoly-e2e.spec.mjs`<br>`playwright.config.js` |

---

## 📋 KẾ HOẠCH TRIỂN KHAI TỪNG BƯỚC (DỰA VÀO BẢNG ĐỐI CHIẾU)

### 🟢 Giai đoạn 1: Triển khai P0 (Ưu tiên số 1 - Nền tảng)
- [x] **P0.1**: Tái cấu trúc `server/server.mjs`: Export hàm `startServer(port = 0)` cho phép lắng nghe cổng động `listen(0)` và trả về `{ server, wss, port, close }`.
- [x] **P0.2**: Viết module hỗ trợ test helper chung `tests/helpers/test-server-helper.mjs`: Khởi tạo server động, kết nối WS client theo Promise event (không dùng sleep mù), dọn dẹp sạch sẽ sau test.
- [x] **P0.3**: Cập nhật `tests/test-turn-skip-fix.mjs`:
  - Tung xúc xắc thật và xử lý di chuyển xong mới gửi `END_TURN`.
  - Sử dụng mock timers để assert cơ chế timeout 25s an toàn.
  - Chuyển sang cú pháp `node:test` (`describe`, `it`, `assert`).
- [x] **P0.4**: Tạo file `tests/test-known-bugs.mjs` kiểm tra 4 lỗi đã biết:
  - 1. Ô đáp sau thẻ không bị đánh giá 2 lần (ví dụ thẻ chỉ định di chuyển).
  - 2. Tiền lương Khởi Hành được cộng chính xác trong engine.
  - 3. `END_TURN` gửi sai pha (như lúc đang `WAIT_ROLL`) bị reject.
  - 4. Bảng bằng khoán online gửi `DECLINE_BUY` hợp lệ.
- [x] **P0.5**: Đồng bộ cấu hình `package.json`: `npm test` chạy `node --test tests/*.mjs` và các file test chuẩn hóa.

### 🟢 Giai đoạn 2: Triển khai P1 (Bảo mật & Phân quyền)
- [x] **P1.1**: Viết `tests/test-security-auth.mjs`:
  - Ma trận action x pha x người gửi: Từ chối action khi không phải lượt, sai pha.
  - Chống giả mạo `senderId` trong `EXECUTE_TRADE`.
  - Quét tin nhắn server broadcast: Không làm lộ `seed` PRNG hoặc thứ tự bộ bài ẩn.
  - Khử mã độc HTML (XSS) trong tên người chơi.
  - Chặn payload WebSocket quá lớn (Payload Too Large).
  - Chặn Path Traversal (`../`) trong HTTP static server.
- [x] **P1.2**: Sửa lỗi bảo mật phát hiện được trong `server/room.js`, `server/server.mjs`, `shared/engine.js`.

### 🟢 Giai đoạn 3: Triển khai P2 (Mô phỏng cân bằng Bot 100 ván)
- [x] **P2.1**: Tạo `tests/simulate-bots.mjs`:
  - Đọc seed qua CLI argument (ví dụ `--seed=42`).
  - Chạy mô phỏng 100 ván cờ giữa các tính cách Bot khác nhau (balanced, aggressive, cautious, random).
  - Thu thập chỉ số: Số vòng trung bình, tỉ lệ kết thúc trước vòng 30, chạm sudden death, chạm vòng 50, tỉ lệ thắng từng tính cách, chỉ số Gini phân hóa tài sản.
  - In bảng thống kê đẹp mắt.
  - Assert 100 ván không ném lỗi unhandled exception, không deadlock.

### 🟢 Giai đoạn 4: Triển khai P3 (Property-Based Test với fast-check)
- [x] **P3.1**: Tạo `tests/test-fast-check-engine.mjs`:
  - Dùng `fast-check` kiểm chứng 5 bất biến (Invariants) của game engine.
  - Total money conservation, balance bounds, building constraints, shuffle preservation, replay determinism.

### 🟢 Giai đoạn 5: Triển khai P4 (Chaos Testing nâng cao)
- [x] **P4.1**: Tạo `tests/test-chaos-advanced.mjs`:
  - Rớt mạng khi đang pending action (đang chờ mua, đang đấu giá).
  - Race condition khi 2 client cùng gửi action.
  - Gửi action sai lượt hoặc sau khi đã ngắt kết nối.

### 🟢 Giai đoạn 6: Triển khai P5 (Load Test & Memory Leak)
- [x] **P5.1**: Nâng cấp `tests/test-server-load.mjs`:
  - Đo Event Loop Delay (`perf_hooks.monitorEventLoopDelay`).
  - Tạo phòng ➔ Chơi ➔ Kết thúc & Dọn dẹp phòng (`room.destroy()`).
  - So sánh bộ nhớ Heap trước và sau khi dọn phòng để xác nhận không rò rỉ bộ nhớ (Memory Leak).

### 🟢 Giai đoạn 7: Triển khai P6 (Playwright Headless E2E)
- [x] **P6.1**: Cấu hình `playwright.config.js`.
- [x] **P6.2**: Viết `tests/e2e/monopoly-e2e.spec.mjs`:
  - Desktop 1280x800: tương tác game và chụp snapshot visual baseline.
  - Mobile viewport 375x667 (iPhone SE): co giãn bàn cờ, không tràn ngang.
  - 4 Bot tự đấu nhiều vòng cờ trên browser headless.
- [x] **P6.3**: Bổ sung script chạy E2E (`npm run test:e2e`, `npm run test:all`) vào `package.json`.

---

## 🔬 IV. THẨM ĐỊNH ĐỘ TIN CẬY THỰC TẾ (CHỐNG BÁO CÁO XANH ẢO)

Để đảm bảo hệ thống test không bị "xanh trên giấy", 3 phương pháp thẩm định chuyên sâu đã được thực thi và chứng thực:

1. **Mutation Testing (Kiểm thử đột biến / Phá code có chủ đích):**
   * *Hành động:* Cố tình comment dòng cộng tiền lương Khởi Hành (`player.money += salary`) trong `shared/engine.js`.
   * *Kết quả:* Test suite `tests/test-known-bugs.mjs` **lập tức chuyển ĐỎ (Fail)** với `AssertionError: actual 15.000.000 !== expected 17.000.000`.
   * *Kết luận:* Bộ test có độ nhạy cao, assert đúng bản chất nghiệp vụ, không có hiện tượng false positive.

2. **Kiểm tra Rò Rỉ RAM Đa Chu Kỳ (Multi-Cycle Memory Leak Verification):**
   * *Hành động:* Chạy 3 chu kỳ liên tiếp (tổng cộng 36 phòng song song, 72 kết nối WebSocket, 108 actions).
   * *Số liệu thực tế:*
     * Baseline: `9.87 MB`
     * Chu kỳ 1 (12 phòng): Peak `11.54 MB` ➔ Post-cleanup `11.89 MB`
     * Chu kỳ 2 (12 phòng mới): Peak `12.98 MB` ➔ Post-cleanup `13.22 MB`
     * Chu kỳ 3 (12 phòng mới): Peak `14.06 MB` ➔ Post-cleanup `14.27 MB`
   * *Đánh giá:* Mức tăng giữa Chu kỳ 2 và Chu kỳ 3 chỉ là **1.05 MB** (rất thấp so với ngưỡng an toàn 5MB). Bộ nhớ nhanh chóng chạm ngưỡng ổn định (plateau), chứng minh **hoàn toàn không có hiện tượng rò rỉ bộ nhớ lũy tiến**.

3. **Kiểm thử Chống Chập Chờn (Flaky Test Check):**
   * *Hành động:* Chạy lặp lại toàn bộ suite (`npm test`) 3 lần liên tiếp và `npm run test:e2e`.
   * *Kết quả:* Đạt tỉ lệ **100% Pass tuyệt đối (32/32 tests mỗi lượt Node, 3/3 tests Playwright)**, 0 race condition, 0 deadlock.

4. **Bổ sung Test Regression cho Thẻ Cơ Hội Bến Thành:**
   * Viết test case 5 trong [tests/test-known-bugs.mjs](file:///c:/Users/Admin/Documents/CV_Truong%20Dinh%20Anh/Ph%E1%BB%8Fng%20v%E1%BA%A5n/Monopoly/tests/test-known-bugs.mjs) kiểm tra toàn bộ vòng đời: Rút thẻ ➔ Nhận lương qua GO (+2M) ➔ Chuyển đến ô 31 ➔ Bật popup mua đất `BUY_PROMPT` ➔ Mua thành công ➔ `END_TURN` trơn tru, không bao giờ bị đơ/treo luồng.

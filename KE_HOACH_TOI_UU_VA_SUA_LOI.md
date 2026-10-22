# KẾ HOẠCH TỐI ƯU HÓA & SỬA LỖI TOÀN DIỆN (PROJECT IMPROVEMENT TASKS)
> **Dự án:** Cờ Tỷ Phú Sài Gòn (Saigon Tycoon)  
> **Mục tiêu:** Khắc phục lỗi hiển thị trên thiết bị di động, hoàn thiện cơ chế Tái kết nối (Reconnect) Multiplayer và chuẩn hóa mã nguồn.  
> **Nguyên tắc:** Sửa tận gốc nguyên nhân kỹ thuật, bảo đảm test pass 100%, không làm gián đoạn tính năng hiện có.

---

## 📋 DANH SÁCH HẠNG MỤC CẦN THỰC HIỆN

### 🔴 GIAI ĐOẠN 1: SỬA LỖI NGHIÊM TRỌNG (CRITICAL BUGS)

#### [x] Task 1.1: Khắc phục lỗi vỡ bàn cờ trên điện thoại (Mobile Responsive)
* **File tác động:** `client/css/board.css` & `client/css/main.css`
* **Vấn đề:** 
  * Biểu thức `width: min(calc(100dvh - 116px), calc(100vw - 520px), 614px);` tại dòng 24-25 của `board.css` cho kết quả âm khi màn hình `< 520px` (chiều rộng điện thoại thông thường 375px - 430px).
  * `board.css` thiếu media query cho giao diện dọc (portrait).
* **Yêu cầu kỹ thuật:**
  1. Thêm media query `@media (max-width: 900px)` trong `client/css/board.css`:
     * Đổi kích thước bàn cờ thành:  
       `width: min(94vw, calc(100dvh - 220px), 520px);`  
       `height: min(94vw, calc(100dvh - 220px), 520px);`
  2. Tinh chỉnh font chữ và khoảng đệm (padding) của 40 ô cờ trên mobile để icon và giá tiền không bị tràn viền.
  3. Đảm bảo bàn cờ căn giữa đẹp mắt khi xếp chồng dạng cột (`flex-direction: column`).

---

#### [x] Task 1.2: Bổ sung Grace Period cho cơ chế Reconnect trên WebSocket Server
* **File tác động:** `server/server.mjs`
* **Vấn đề:** 
  * Dòng 301-306 trong `server.mjs`: Khi socket ngắt kết nối và `!hasConnectedHuman && room.status === "PLAYING"`, server lập tức gọi `rooms.delete(currentRoomId)`.
  * Nếu phòng chơi 1 người với Bot hoặc mạng 4G/Wifi bị rớt 1-2 giây / người chơi F5 lại trang, phòng bị xóa tức thì khiến token `reconnectToken` trở nên vô dụng.
* **Yêu cầu kỹ thuật:**
  1. Thay vì xóa phòng ngay lập tức khi `!hasConnectedHuman`, khởi tạo một timer ân hạn (Grace Period) **45 giây**.
  2. Lưu timer này vào `room.cleanupTimer`.
  3. Nếu trong vòng 45 giây có người chơi tái kết nối (`reconnectToken`), hủy `cleanupTimer` và duy trì trận đấu bình thường.
  4. Nếu quá 45 giây mà không có ai kết nối lại, tiến hành dọn dẹp phòng và xóa khỏi `rooms`.

---

### 🟡 GIAI ĐOẠN 2: ĐỒNG BỘ GIAO DIỆN & TỐI ƯU TRẢI NGHIỆM (UI/UX)

#### [x] Task 2.1: Đồng bộ nút "Đấu Online" vào `client/index.html`
* **File tác động:** `client/index.html`
* **Vấn đề:** 
  * File gốc `index.html` đã có nút `#btn-online-lobby` (**🌐 Đấu Online**), nhưng file `client/index.html` bị thiếu nút này.
* **Yêu cầu kỹ thuật:**
  1. Thêm nút `#btn-online-lobby` vào cụm `header-right-tools` trong `client/index.html` giống 100% với file `index.html` gốc.
  2. Đảm bảo đường dẫn CSS/JS trong `client/index.html` hoạt động chuẩn khi mở độc lập.

---

#### [x] Task 2.2: Tối ưu thanh Header Bar trên màn hình hẹp
* **File tác động:** `client/css/main.css`
* **Vấn đề:** 
  * Header có `height: 38px; overflow: hidden;` chứa quá nhiều nút công cụ. Màn hình `< 768px` sẽ đẩy các nút bên phải (như Đấu Online, Ván Mới) ra khỏi tầm nhìn.
* **Yêu cầu kỹ thuật:**
  1. Tại `@media (max-width: 768px)`:
     * Ẩn các hình minh họa SVG phụ (`.benthanh-illustration`, `.notredame-illustration`).
     * Rút gọn text của các nút, ưu tiên hiển thị icon emoji rõ ràng.
     * Cho phép thanh công cụ cuộn ngang mượt mà (`overflow-x: auto`) nếu màn hình quá nhỏ.

---

### 🟢 GIAI ĐOẠN 3: TỐI ƯU HÓA MÃ NGUỒN & QUY TRÌNH TEST (CODE CLEANUP)

#### [x] Task 3.1: Bổ sung lệnh chạy toàn bộ Test vào `package.json`
* **File tác động:** `package.json`
* **Yêu cầu kỹ thuật:**
  1. Bổ sung script `"test:all"` vào `package.json`:
     ```json
     "test:all": "node tests/test-client-imports.mjs && node tests/test-deterministic.mjs && node tests/test-server.mjs && node tests/test-audit-fixes.mjs && node tests/test-online-simulation.mjs && node tests/test-turn-skip-fix.mjs"
     ```
  2. Đảm bảo chạy `npm run test:all` là pass 100% tất cả các kịch bản.

---

#### [x] Task 3.2: Chuẩn hóa tên file âm thanh xúc xắc
* **File tác động:** 
  * `client/js/audio/u_qpfzpydtro-dice-142528.mp3` -> Đổi tên thành `client/js/audio/dice-roll.mp3`
  * `client/js/audio/SoundEffects.js` (cập nhật đường dẫn import mới)
* **Yêu cầu kỹ thuật:**
  * Giữ nguyên chất lượng âm thanh, đường dẫn nạp không bị 404.

---

## 🔍 TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)
1. ✅ **Mobile Ready:** Mở trình duyệt giả lập mobile (375px - 430px) thấy bàn cờ hiển thị trọn vẹn, không vỡ layout, không tràn viền.
2. ✅ **Online Resilient:** Vào phòng chơi online, thử F5 trang web hoặc ngắt mạng 5 giây rồi vào lại -> Ván cờ tự động phục hồi đúng lượt và điểm số (không bị mất phòng).
3. ✅ **Test Suite:** Chạy lệnh `npm run test:all` pass toàn bộ các bài kiểm tra logic, engine, server và anti-cheat.

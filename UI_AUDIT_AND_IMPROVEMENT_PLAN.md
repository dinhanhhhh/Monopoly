# KẾ HOẠCH TOÀN DIỆN: NHÌN NHẬN & TỐI ƯU HÓA GIAO DIỆN (UI/UX AUDIT & REFACTOR PLAN)
> Dự án: Cờ Tỷ Phú Sài Gòn (Saigon Tycoon)
> Thời gian lập: 2026-10-16
> Nguyên tắc: Kiểm tra trực quan từ thực tế giao diện, sửa tận gốc (Root Cause), TUYỆT ĐỐI KHÔNG PUSH CODE LÊN GITHUB.

---

## 1. TỔNG QUAN HIỆN TRẠNG QUA HÌNH ẢNH THỰC TẾ

Dựa trên ảnh chụp màn hình ván đấu thực tế trên trình duyệt (`http://localhost:3000/`), hệ thống vận hành game logic tốt nhưng tồn tại 7 điểm nghẽn giao diện (UI Glitches & Ergonomics) làm giảm tính thẩm mỹ hoài cổ và trải nghiệm người dùng:

| STT | Vấn đề giao diện | Vị trí | Mức độ | Nguyên nhân kỹ thuật |
|---|---|---|---|---|
| 1 | **Huy hiệu quân cờ trên thẻ người chơi bị trống rỗng** | Bảng xếp hạng bên trái (Leaderboard HUD) | 🔴 Cao | `HUD.js` render `${p.token?.svg}` nhưng trong Online mode hoặc qua Server, `p.token` là string ID (`"car"`, `"token_coffee"`) hoặc ID không khớp, dẫn đến `svg` là `undefined` tạo thành vòng tròn trắng rỗng `○`. |
| 2 | **Cắt cụt chữ tên ô cờ dưới Cockpit (`📍 Quỹ Trún...`)** | Thanh đáy buồng lái (Cockpit Bottom Dock) | 🔴 Cao | `.cockpit-tile-section` bị giới hạn cứng `max-width: 155px` và `.cockpit-tile-name` bị `max-width: 100px`, khiến tên dài (Quỹ Trúng Thưởng, Bến Xe Miền Đông, Nguyễn Huệ,...) bị cắt `...` dù còn nhiều khoảng trống. |
| 3 | **Cụm 4 nút thao tác đáy quá nhỏ và khó đọc** | Cánh phải Cockpit (`.dock-actions-cluster`) | 🟡 Trung bình | Mỗi nút chỉ cao `14.5px` (`height: 14.5px`), chữ `0.62rem` bị dẹt, viền sát chữ, gây cảm giác chật chội, khó bấm. |
| 4 | **Bong bóng cảm xúc (Emotes) che khuất ô cờ** | Ô cờ cạnh trái (Ô 17, 18, 19, 20) | 🟡 Trung bình | `.token-emote-bubble` ở cạnh trái dùng `bubble-above` trỏ lên trên làm đè kín chữ ô phía trên thay vì trỏ ngang vào khoảng trống trung tâm bàn cờ. |
| 5 | **Băng rôn thông báo giữa bàn cờ (Toast) đè tranh retro** | Trung tâm bàn cờ (`#game-toast`) | 🟡 Trung bình | Banner jackpot xanh lá nổi giữa tranh Chợ Bến Thành quá to, thiếu padding thoáng, che mất artwork cốt lõi. |
| 6 | **Lệch bộ nhận diện quân cờ giữa Client và Server** | `server/room.js` vs `TokensData.js` | 🔴 Cao | Server dùng token cũ `["car", "hat", "dog", "ship"]` trong khi bộ token Sài Gòn chuẩn gồm `["token_coffee", "token_banhmi", "token_hutieu", "token_nonla", "token_motorbike", "token_xichlo", "token_boat"]`. |
| 7 | **Dải khẩu hiệu Header & Dòng cuối Nhật Ký trận đấu** | Header top bar & Sidebar phải | 🟢 Thấp | Khẩu hiệu header dễ bị ép sát khi đổi kích thước màn hình; dòng cuối của nhật ký trận đấu sát mép dưới không có khoảng thở (padding). |

---

## 2. KẾ HOẠCH CHI TIẾT CÁC BƯỚC SỬA LỖI (STEP-BY-STEP FIX PLAN)

### 📌 Giai đoạn 1: Chuẩn hóa Bộ Dữ Liệu Quân Cờ Thống Nhất (Token Data Normalization)
- **File tác động:**
  - `shared/data/tokens.js` (hoặc module chuẩn hóa chung)
  - `server/room.js`
  - `client/js/render/TokensData.js`
  - `client/js/ui/HUD.js`
  - `client/js/render/TokenRenderer.js`
  - `client/js/render/BoardRenderer.js`
  - `client/js/main.js`
- **Nội dung xử lý:**
  1. Trong `server/room.js`: Đổi `availableTokens` sang danh sách chuẩn các ID quân cờ Sài Gòn:
     `['token_coffee', 'token_banhmi', 'token_hutieu', 'token_nonla', 'token_motorbike', 'token_xichlo', 'token_boat']`.
  2. Tạo hàm `resolveToken(tokenRef, fallbackIndex)` nhận cả string ID hoặc Object token:
     - Nếu truyền `"car"` hoặc `"token_coffee"`, ánh xạ đúng vào đối tượng `GAME_TOKENS` có đầy đủ: `id`, `name`, `svg`, `color`, `bgColor`.
     - Đảm bảo `p.token.svg` luôn luôn có dữ liệu SVG chất lượng cao.
  3. Cập nhật `HUD.js`: Khi render thẻ người chơi, gọi `resolveToken(p.token, origIdx)` để huy hiệu quân cờ bên phải hiển thị icon SVG xe vespa, nón lá, cà phê sữa đá, xích lô rực rỡ, kèm hiệu ứng hover đẹp mắt.

---

### 📌 Giai đoạn 2: Sửa Thanh Đáy Cockpit (Bottom Dock Ergonomics)
- **File tác động:** `client/css/main.css` & `index.html`
- **Nội dung xử lý:**
  1. **Ô Đang Đứng (`.cockpit-tile-section`):**
     - Nâng `max-width` từ `155px` lên `240px` (hoặc `flex: 0 1 auto; max-width: 260px`).
     - Tăng `max-width` của `.cockpit-tile-name` từ `100px` lên `170px`, đảm bảo hiển thị trọn vẹn "Quỹ Trúng Thưởng", "Nguyễn Huệ", "Bến Xe Miền Đông".
     - Giữ font `Baloo 2` đậm chất retro, màu vàng rơm cổ kính.
  2. **Cụm 4 Nút Thao Tác (`.dock-actions-cluster`):**
     - Mở rộng chiều rộng vùng từ `138px` lên `170px - 180px`.
     - Tăng chiều cao mỗi nút từ `14.5px` lên `22px - 24px` (tăng gần gấp đôi), cỡ chữ từ `0.62rem` lên `0.72rem`.
     - Tăng padding và khoảng cách (gap) giữa các nút lên `4px`, thêm bo góc `5px`.
     - Tạo trạng thái `disabled` và `hover` có chiều sâu, rõ ràng hơn khi đến lượt mua đất / xây nhà / giao dịch.

---

### 📌 Giai đoạn 3: Tối Ưu Bong Bóng Cảm Xúc (Emote Bubbles & Overlap Prevention)
- **File tác động:** `client/js/render/TokenRenderer.js` & `client/css/ui.css`
- **Nội dung xử lý:**
  1. Trong `TokenRenderer.showEmote`:
     - Xác định hướng hiển thị thông minh dựa trên vị trí ô cờ:
       - Cạnh trái bàn cờ (ô 11 - 19): Hiển thị bubble lệch sang PHẢI (hướng vào lòng bàn cờ), không trỏ lên trên làm che mất ô đất phía trên.
       - Cạnh phải bàn cờ (ô 31 - 39): Hiển thị bubble lệch sang TRÁI (hướng vào lòng bàn cờ).
       - Cạnh trên (ô 20 - 30): Hiển thị bubble hướng XUỐNG DƯỚI.
       - Cạnh đáy (ô 0 - 10): Hiển thị bubble hướng LÊN TRÊN.
  2. Trong CSS `.token-emote-bubble`:
     - Giảm nhẹ font-size từ `1.45rem` xuống `1.25rem` gọn gàng hơn.
     - Giảm thời gian tồn tại từ `2600ms` xuống `1800ms` để không bị đọng rác thị giác trên bàn cờ.

---

### 📌 Giai đoạn 4: Tinh Chỉnh Băng Rôn Thông Báo Giữa Bàn Cờ (Toast Banner Refinement)
- **File tác động:** `client/css/board.css` & `client/js/main.js`
- **Nội dung xử lý:**
  1. Chỉnh sửa `#game-toast`:
     - Đặt vị trí cân đối ở 1/3 phía trên tranh hoặc phía dưới tranh hoài cổ, không nằm che mất tiêu đề "CỜ TỶ PHÚ".
     - Bo góc mềm mại `8px`, nền bán trong suốt `rgba(23, 107, 120, 0.92)` hoặc xanh lá đậm Sài Gòn `rgba(30, 130, 76, 0.95)`, viền vàng gold `1.5px solid #F1C40F`.
     - Thêm hiệu ứng xuất hiện `pop-in` và tự động mờ dần `fade-out` sau 2.5s.

---

### 📌 Giai đoạn 5: Header Bar & Sidebar Layout Polish
- **File tác động:** `client/css/main.css`
- **Nội dung xử lý:**
  1. Header: Thêm `flex-shrink: 1` cho khẩu hiệu `.vintage-slogan` và ẩn gọn trên màn hình hẹp (`@media (max-width: 1200px)`).
  2. Nhật ký trận đấu (`.recent-log-messages`): Bổ sung `padding-bottom: 16px;` để item cuối cùng không bị sát sạt mép dưới container.
  3. Leaderboard thẻ người chơi: Tinh chỉnh khoảng cách giữa các thẻ để tỷ lệ phân bổ trên cột trái đều đặn, đẹp mắt.

---

## 3. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)

1. ✅ Huy hiệu quân cờ trên Leaderboard cột trái hiển thị đầy đủ icon SVG đại diện (Nón lá, xe vespa, cà phê sữa đá, xích lô...) thay vì vòng tròn trắng rỗng.
2. ✅ Tên ô cờ ở thanh Cockpit đáy hiển thị đầy đủ (ví dụ: `📍 Quỹ Trúng Thưởng • Hũ: 500k`), không còn bị `Quỹ Trún...`.
3. ✅ 4 nút hành động ở Cockpit đáy to rõ ràng, dễ đọc, bấm nhạy và chiều cao vừa vặn.
4. ✅ Bong bóng emote xuất hiện đúng hướng vào lòng bàn cờ, không che lấp chữ và giá tiền của ô bên cạnh.
5. ✅ Băng rôn Toast thông báo tinh tế, không làm nát bố cục bức tranh trung tâm Bến Thành.
6. ✅ Toàn bộ test tự động (`npm run test`, `npm run test:server`, `node tests/test-online-simulation.mjs`) tiếp tục pass 100%.
7. ✅ Kiểm chứng trực tiếp trên trình duyệt thật qua `browser_subagent`.
8. ✅ TUYỆT ĐỐI KHÔNG push code lên GitHub.

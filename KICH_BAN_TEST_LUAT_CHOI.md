# 📜 KỊCH BẢN KIỂM THỬ TOÀN DIỆN TẤT CẢ LUẬT CHƠI

## CỜ TỶ PHÚ SÀI GÒN (MONOPOLY SAIGON)

> **Mục tiêu:** Kiểm tra và xác minh 100% các luật chơi, cơ chế kinh tế và tính năng tương tác của game trong duy nhất **1 ván đấu**.
> **Thiết lập khuyến nghị:** Chế độ 2 người chơi (**P1: Người chơi** vs **P2: Bot hoặc Người chơi 2**).

---

## 🎯 DANH MỤC CÁC LUẬT CẦN KIỂM TRẢ

1. Di chuyển xúc xắc & Nhận 2.000.000đ khi qua ô Khởi Hành (GO).
2. Mua đất trực tiếp & trừ tiền, cập nhật chủ quyền (dải màu/chấm màu).
3. Bỏ qua mua đất $\rightarrow$ Kích hoạt Đấu Giá công khai (Auction).
4. Tiền thuê bến xe (lũy tiến theo số lượng bến sở hữu).
5. Tiền thuê tiện ích (Điện Lực / Cấp Nước nhân điểm xúc xắc).
6. Độc quyền bộ màu: Nhân đôi tiền thuê đất trống (x2).
7. Luật Xây Nhà Đều Tay (Even Building) & Chặn vi phạm.
8. Nâng cấp Khách Sạn Đỏ (Cấp 5).
9. Thẻ Khí Vận & Cơ Hội (thưởng tiền, phạt tiền, di chuyển cưỡng bức).
10. Ô Thuế Thu Nhập / Thuế Xa Xỉ.
11. Ô Bãi Đỗ Xe (Free Parking) & Ô Thăm Tù an toàn.
12. Vào Tù (Ô 30 Cảnh sát bắt, Lắc đôi 3 lần, hoặc Rút thẻ).
13. Cơ chế Ra Tù (Lựa chọn Đổ xúc xắc đôi HOẶC Trả tiền phạt 500k).
14. Giao dịch đổi đất / tiền giữa hai người chơi (Trade).
15. Thế chấp đất (Mortgage: đóng băng tiền thuê) & Chuộc đất (Unmortgage: +10% lãi).
16. Phá sản (Bankruptcy) & Điều kiện phân định Thắng/Thua.

---

## 🕹️ CÁC BƯỚC THỰC HIỆN KỊCH BẢN (6 GIAI ĐOẠN)

### GIAI ĐOẠN 1: Mua Đất Trực Tiếp & Kích Hoạt Đấu Giá (Auction)

| Bước    | Hành động                                                                                                            | Luật & Kết quả mong đợi                                                                                                                                                                                                                                 |
| :------ | :------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1.1** | **P1 tung xúc xắc** rơi vào ô đất trống (Ví dụ: ô số 1 _Bến Bình Đông_ hoặc ô số 3 _Chợ Dân Sinh_).                  | • Nút **"Mua Đất"** trên thanh Dock sáng đèn kèm giá tiền.<br>• Bấm mua: Tiền P1 bị trừ đúng giá niêm yết.<br>• Chấm màu và dải màu chủ sở hữu của P1 xuất hiện chuẩn trên ô cờ.                                                                        |
| **1.2** | **P2 tung xúc xắc** rơi vào một ô đất trống khác (Ví dụ: ô số 6 _Bến Xe Miền Đông_ hoặc ô số 8 _Đường Nguyễn Trãi_). | • P2 (hoặc bạn điều khiển P2) **chọn nút "Bỏ Qua"** (không mua).                                                                                                                                                                                        |
| **1.3** | **Kiểm tra Đấu Giá**                                                                                                 | • Modal **Đấu Giá Đất** lập tức tự động xuất hiện giữa màn hình.<br>• Cả P1 và P2 đều được quyền tham gia đặt giá.<br>• Thử bấm tăng giá (+50k, +100k) $\rightarrow$ Bên còn lại bấm "Rút lui" $\rightarrow$ Người thắng nhận ô đất với giá trúng thầu. |

---

### GIAI ĐOẠN 2: Tiền Thuê Bến Xe & Tiện Ích

| Bước    | Hành động                                                   | Luật & Kết quả mong đợi                                                                                                                                                    |
| :------ | :---------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **2.1** | **Mua 1 Bến Xe** (Ví dụ: _Ga Sài Gòn_ hoặc _Cảng Sài Gòn_). | • Cho P2 dẫm vào ô Bến Xe này $\rightarrow$ P2 bị trừ tiền thuê cơ bản (500.000đ) chuyển cho P1.                                                                           |
| **2.2** | **Mua thêm Bến Xe thứ 2**                                   | • P1 sở hữu 2 bến xe $\rightarrow$ Khi P2 dẫm vào bất kỳ bến nào trong 2 bến $\rightarrow$ Tiền thuê tự động tăng gấp đôi (1.000.000đ).                                    |
| **2.3** | **Tiện Ích (Điện Lực / Cấp Nước)**                          | • P1 sở hữu ô _Điện Lực TP_.<br>• Khi P2 dẫm vào: Tiền thuê = **(Điểm xúc xắc của P2) × 4** (nếu sở hữu 1 tiện ích) hoặc **× 10** (nếu P1 gom đủ cả Điện Lực và Cấp Nước). |

---

### GIAI ĐOẠN 3: Gom Đủ Bộ Màu, Tiền Thuê x2 & Xây Đều Tay

| Bước    | Hành động                                                                                             | Luật & Kết quả mong đợi                                                                                                                                                                                                                                                                                                          |
| :------ | :---------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **3.1** | **P1 gom trọn bộ 1 nhóm màu** (Dễ nhất: Nhóm Nâu gồm ô số 1 _Bến Bình Đông_ + ô số 3 _Chợ Dân Sinh_). | • Khi chưa xây nhà nào, P2 dẫm vào bất kỳ ô nào trong bộ này:<br>• **Tiền thuê đất trống tự động x2** (nhân đôi) so với giá gốc.                                                                                                                                                                                                 |
| **3.2** | **Thử nghiệm Luật Xây Đều Tay (Even Building)**                                                       | • Mở menu xây nhà $\rightarrow$ Xây 1 nhà xanh trên ô _Bến Bình Đông_ (thành công).<br>• Cố tình bấm xây tiếp nhà thứ 2 trên ô _Bến Bình Đông_ **trong khi ô Chợ Dân Sinh vẫn là 0 nhà**:<br>👉 **Kết quả:** Hệ thống phải chặn lại và hiển thị cảnh báo: _"Luật xây đều tay: Bạn phải nâng cấp các ô đất cùng màu khác trước."_ |
| **3.3** | **Xây chuẩn đều tay**                                                                                 | • Xây 1 nhà cho ô _Chợ Dân Sinh_ $\rightarrow$ Bây giờ mới được nâng ô _Bến Bình Đông_ lên nhà thứ 2.<br>• Nâng cả 2 ô lên 4 nhà xanh.                                                                                                                                                                                           |
| **3.4** | **Nâng cấp Khách Sạn Đỏ (Cấp 5)**                                                                     | • Khi đã có 4 nhà xanh, chọn nâng cấp tiếp $\rightarrow$ 4 nhà xanh biến mất, thay bằng **1 Khách Sạn Đỏ** rực rỡ.<br>• P2 dẫm vào $\rightarrow$ Thu tiền thuê kịch trần theo biểu phí khách sạn.                                                                                                                                |

---

### GIAI ĐOẠN 4: Thẻ Bài, Ô Thuế, Thăm Tù & Ô Khởi Hành

| Bước    | Hành động                            | Luật & Kết quả mong đợi                                                                                                                                        |
| :------ | :----------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **4.1** | **Ô Cơ Hội (?) & Ô Khí Vận (Rương)** | • Quân cờ dừng tại ô Thẻ bài $\rightarrow$ Modal rút thẻ hiện lên giữa màn hình.<br>• Kiểm tra hiệu ứng: Cộng/trừ tiền hoặc thẻ bắt di chuyển đến vị trí khác. |
| **4.2** | **Ô Thuế (Thuế Thu Nhập / Xa Xỉ)**   | • Quân cờ dừng tại ô Thuế $\rightarrow$ Bị trừ trực tiếp tiền vào ngân hàng, có log ghi nhận.                                                                  |
| **4.3** | **Ô An Toàn (Bãi Đỗ Xe & Thăm Tù)**  | • Dừng tại ô 20 (_Bãi Đỗ Xe Miễn Phí_) hoặc ô 10 (_Chỉ Thăm Tù / Just Visiting_) $\rightarrow$ Lượt an toàn, không bị phạt tiền, không bị vào tù.              |
| **4.4** | **Vượt Ô Khởi Hành (GO)**            | • Di chuyển đi qua hoặc dừng đúng ô số 0 (_Khởi Hành_) $\rightarrow$ P1 nhận ngay **+2.000.000 VNĐ**, tiền nhảy trên bảng chỉ số.                              |

---

### GIAI ĐOẠN 5: Vào Tù & Chọn Cơ Chế Ra Tù Mới

| Bước    | Hành động                                     | Luật & Kết quả mong đợi                                                                                                                                                                                                                           |
| :------ | :-------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **5.1** | **Kích hoạt Vào Tù**                          | • Di chuyển quân cờ dẫm vào **Ô số 30 ("Vào Tù" / Cảnh Sát Bắt)** (hoặc tung xúc xắc đôi 3 lần liên tiếp).<br>• Quân cờ bay thẳng về ô số 10 (Nhà Tù), trạng thái người chơi chuyển sang _"Đang ở tù"_.                                           |
| **5.2** | **Thử Lựa chọn 1: Đổ xúc xắc đôi để ra tù**   | • Khi đến lượt người trong tù, Modal hỏi ra tù hiện lên với 2 lựa chọn.<br>• Chọn **"Tung Xúc Xắc Đôi"**:<br> - Nếu không ra số đôi: Ở lại tù, số lượt tù đếm ngược (tối đa 3 lượt).<br> - Nếu ra số đôi: Ra tù ngay và tiến đúng số bước vừa đổ. |
| **5.3** | **Thử Lựa chọn 2: Trả 500.000 VNĐ tiền phạt** | • Ở lượt kế tiếp trong tù, bấm chọn **"Trả 500k ra tù ngay"**.<br>• Tiền bị trừ 500k, trạng thái tù được giải tỏa ngay lập tức và người chơi được gieo xúc xắc đi tiếp.                                                                           |

---

### GIAI ĐOẠN 6: Giao Dịch (Trade), Thế Chấp (Mortgage) & Phá Sản

| Bước    | Hành động                              | Luật & Kết quả mong đợi                                                                                                                                                                                                                                                |
| :------ | :------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **6.1** | **Giao Dịch Đổi Đất (Trade)**          | • Bấm nút **"Giao Dịch"** trên thanh Dock.<br>• Chọn gửi đề nghị cho P2: Đổi 1 ô đất + tiền để lấy 1 ô đất của P2.<br>• P2 chấp thuận $\rightarrow$ Sổ đỏ và tiền hoán đổi chính xác giữa 2 bên.                                                                       |
| **6.2** | **Thế Chấp Đất (Mortgage)**            | • Nhấp vào thẻ đất đang sở hữu (không có nhà) $\rightarrow$ Chọn **"Thế Chấp"**.<br>• Người chơi nhận 50% giá trị đất từ Bank.<br>• Ô đất chuyển sang trạng thái đã cầm cố.<br>• Cho P2 dẫm vào ô đang thế chấp $\rightarrow$ **Tiền thuê = 0đ** (miễn phí tiền thuê). |
| **6.3** | **Chuộc Lại Đất (Unmortgage)**         | • Chọn lại ô đất đang thế chấp $\rightarrow$ Bấm **"Chuộc Lại"**.<br>• Ngân hàng thu lại 50% tiền gốc + 10% phí lãi.<br>• Ô đất phục hồi trạng thái thu tiền thuê bình thường.                                                                                         |
| **6.4** | **Phá Sản (Bankruptcy) & Chiến Thắng** | • Cho P2 dẫm vào ô Khách Sạn của P1 khi số tiền của P2 không đủ chi trả và không còn tài sản thế chấp.<br>• P2 bị tuyên bố **Phá Sản**.<br>• Game hiển thị màn hình thông báo chiến thắng cho P1 $\rightarrow$ Ván đấu kết thúc.                                       |

---

### GIAI ĐOẠN 7: Tương Tác Khay Bài Cọc Ở Trung Tâm Bàn Cờ (Mới)

| Bước    | Hành động                                    | Luật & Kết quả mong đợi                                                                                                                                                                                                                                                                                                                                                                                          |
| :------ | :------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **7.1** | **Bấm vào Khay thẻ Cơ Hội (Góc trên-trái)**  | • Modal tra cứu cọc bài Cơ Hội bật lên với theme Đỏ Cam hoài cổ.<br>• Thống kê chính xác số thẻ còn lại trong cọc bài (VD: `16 / 16 thẻ`) và số lượt đã rút.<br>• **Tab 1 (Lịch sử đã rút):** Hiển thị danh sách các lượt rút trong ván (người rút, thời gian, tên thẻ, kết quả).<br>• **Tab 2 (Toàn bộ 16 thẻ):** Tra cứu toàn bộ 16 thẻ Cơ Hội Sài Gòn kèm badge trạng thái (_Trong cọc bài_ / _Đã từng rút_). |
| **7.2** | **Bấm vào Khay thẻ Khí Vận (Góc dưới-phải)** | • Modal tra cứu cọc bài Khí Vận bật lên với theme Xanh Dương hoài cổ.<br>• Thống kê và hiển thị chuẩn xác danh mục 16 thẻ Khí Vận.                                                                                                                                                                                                                                                                               |
| **7.3** | **Đồng bộ số lượng Realtime**                | • Khi người chơi di chuyển vào ô Cơ Hội / Khí Vận và rút thẻ:<br>• Tag số thẻ trên mặt khay (`#chance-deck-count`, `#chest-deck-count`) tự động đếm giảm realtime.                                                                                                                                                                                                                                               |

---

## ⚡ BỘ LỆNH TEST NHANH SIÊU TỐC TRONG CONSOLE (F12) & BẢNG TEST DEV

> 💡 **Lưu ý quan trọng về Môi trường:** Toàn bộ công cụ Test Luật (`dev-tools.js` và bảng modal test) được đóng gói riêng trong `client/js/dev/` và được `.gitignore` bảo vệ. Khi chạy ở máy Local Dev, nút **"⚡ Test Luật"** sẽ tự động xuất hiện trên thanh Header; khi push lên GitHub, code test hoàn toàn không tồn tại trên repository để giữ mã nguồn sản phẩm sạch 100%.

Bạn có thể nhấn nút **"⚡ Test Luật"** trên thanh Header (ở local) hoặc mở **F12** $\rightarrow$ chọn tab **Console** và gõ lệnh:

```javascript
// 1. Nhảy thẳng đến ô bất kỳ và kích hoạt sự kiện ô đó
test.nhay(30); // Nhảy đến ô 30: Kích hoạt Vào Tù
test.nhay(4); // Nhảy đến ô 4: Ô Thuế Thu Nhập
test.nhay(7); // Nhảy đến ô 7: Rút thẻ Cơ Hội
test.nhay(0); // Nhảy về ô 0: Nhận thưởng 2M Khởi Hành
test.nhay(12); // Nhảy đến ô 12: Thử ô Điện Lực

// 2. Thêm tiền xả láng để thử xây nhà/khách sạn (mặc định +20M)
test.choTien(50); // Cộng ngay 50.000.000 VNĐ

// 3. Cấp quyền sở hữu BĐS ngay lập tức
test.choTatCaDat(); // Cấp TOÀN BỘ 28 BĐS trên bàn cờ (tất cả đường phố, bến xe, điện lực)
test.choBoDat("brown"); // Cấp trọn bộ Nâu (Bến Bình Đông + Chợ Dân Sinh) để test Xây Nhà & Tiền Thuê x2
test.choBoDat("orange"); // Cấp trọn bộ Cam

// 4. Vào tù ngay lập tức & mở Modal thử Ra Tù
test.vaoTu(); // Thử 2 lựa chọn: Đổ xúc xắc đôi HOẶC Trả 500k ra tù

// 5. Mở ngay phiên Đấu Giá đất
test.dauGia(); // Mở đấu giá ô đang đứng (hoặc test.dauGia(5) cho ô số 5)

// 6. Rút nhanh Thẻ Bài để xem hiệu ứng
test.rutThe("chance"); // Rút thẻ Cơ Hội
test.rutThe("chest"); // Rút thẻ Khí Vận

// 7. Test Phá Sản cực nhanh
test.phaSanP2(); // Cho Bot 2 phá sản ngay lập tức
test.thangNgay(); // Thắng game ngay lập tức
```

---

## ✅ BẢNG TỔNG KẾT ĐÁNH GIÁ (CHECKLIST)

| STT | Tính Năng / Luật Chơi                                     | Trạng Thái | Ghi Chú                                       |
| :-: | :-------------------------------------------------------- | :--------: | :-------------------------------------------- |
|  1  | Thưởng 2M khi qua ô Khởi Hành (GO)                        |  [x] Đạt   | Có thông báo & hiệu ứng tiền bay              |
|  2  | Mua đất trực tiếp & dải màu chủ quyền                     |  [x] Đạt   | Cập nhật dot màu và dải màu 4 cạnh            |
|  3  | Phiên Đấu Giá (Auction) khi bỏ qua mua                    |  [x] Đạt   | Đấu giá tự động, bot tự trả giá               |
|  4  | Thu tiền thuê Bến Xe (1 bến, 2 bến...)                    |  [x] Đạt   | Lũy tiến 500K - 1M - 2M - 4M                  |
|  5  | Thu tiền thuê Điện Lực / Cấp Nước                         |  [x] Đạt   | 4x hoặc 10x điểm xúc xắc                      |
|  6  | Đủ bộ màu $\rightarrow$ Nhân đôi tiền thuê đất trống (x2) |  [x] Đạt   | Tự động x2 khi chưa có nhà                    |
|  7  | Chặn xây lệch (Luật Xây Đều Tay)                          |  [x] Đạt   | Thông báo chặn khi xây chênh lệch > 1 nhà     |
|  8  | Xây Khách Sạn Đỏ (Cấp 5)                                  |  [x] Đạt   | Khách sạn 3D xoay chuẩn hướng dải ô           |
|  9  | Thẻ Cơ Hội & Khí Vận hoạt động chuẩn                      |  [x] Đạt   | 32 thẻ bản sắc Sài Gòn                        |
| 10  | Tương tác khay thẻ giữa bàn cờ                            |  [x] Đạt   | Tra cứu thẻ còn lại, lịch sử, danh mục 32 thẻ |
| 11  | Trừ thuế & Ô Thăm Tù / Bãi Đỗ Xe an toàn                  |  [x] Đạt   | Jackpot tích lũy tại ô Bãi Đỗ Xe              |
| 12  | Vào tù (Ô 30, Đôi 3 lần, Thẻ bài)                         |  [x] Đạt   | Bay về ô 10, hiển thị buồng giam              |
| 13  | Ra tù (Chọn Đổ Đôi hoặc Trả 500k)                         |  [x] Đạt   | Đầy đủ 2 lựa chọn + thẻ ra tù                 |
| 14  | Giao dịch đổi đất/tiền (Trade)                            |  [x] Đạt   | Trao đổi tự do giữa người và bot              |
| 15  | Thế chấp (Không thu tiền) & Chuộc lại (+10% lãi)          |  [x] Đạt   | Đóng băng tiền thuê, chuộc lại hoàn tiền      |
| 16  | Phá sản & Thông báo kết thúc ván thắng                    |  [x] Đạt   | Phân định người thắng cuộc duy nhất           |
| 17  | Tách biệt công cụ test (.gitignore)                       |  [x] Đạt   | Sạch sẽ trên repo production                  |

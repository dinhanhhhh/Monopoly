# 🎲 CỜ TỶ PHÚ SÀI GÒN — SAIGON TYCOON

> Trò chơi Cờ Tỷ Phú mang đậm phong cách văn hóa Sài Gòn hoài cổ, xây dựng hoàn toàn bằng **Vanilla JavaScript (ES Modules)**, **HTML5** và **CSS3** không phụ thuộc thư viện ngoài, chuẩn xác 100% luật thi đấu quốc tế.

---

## 🌟 Tổng Quan Dự Án

**Cờ Tỷ Phú Sài Gòn (Saigon Tycoon)** tái hiện không khí kinh doanh bất động sản sôi động tại "Hòn ngọc Viễn Đông" xưa và nay. Người chơi sẽ bắt đầu hành trình từ ô Khởi Hành (GO), thu mua các cung đường huyền thoại như _Nguyễn Huệ, Đồng Khởi, Lê Lợi, Bến Bình Đông..._, xây dựng chuỗi nhà phố, biệt thự và khách sạn cao cấp để trở thành đại gia thống trị thành phố.

Dự án được thiết kế với kiến trúc tách biệt rõ ràng giữa **Engine logic dùng chung (`shared/`)** và **Giao diện người dùng (`client/`)**, giúp code dễ bảo trì, mở rộng và kiểm thử độc lập.

---

## ✨ Tính Năng Nổi Bật

### 1. 🏛️ Luật Chơi Monopoly Chuẩn Quốc Tế

- **28 Bất động sản**: Gồm 22 ô đất thuộc 8 nhóm màu, 4 Bến Xe (Miền Đông, Miền Tây, Ga Sài Gòn, Bến Xe Chợ Lớn) và 2 Công ty dịch vụ tiện ích (Cấp Điện & Cấp Nước).
- **Nhân đôi tiền thuê (x2 Rent)**: Khi người chơi gom đủ trọn bộ các ô đất cùng màu (Monopoly), tiền thuê đất trống tự động x2 ngay cả khi chưa xây nhà.
- **Xây nhà & Khách sạn đều tay (Even-Building Rule)**: Quy tắc công bằng quốc tế — chỉ được xây nhà khi có trọn bộ màu, và các ô trong cùng bộ không được chênh nhau quá 1 cấp công trình (4 Nhà Phố Xanh ➔ 1 Khách Sạn Đỏ 3D).
- **Đấu giá đất công khai (Auction)**: Nếu người chơi dừng vào đất trống nhưng chọn bỏ qua không mua, ngân hàng sẽ tự động mở phiên đấu giá cho tất cả người chơi tham gia.
- **Thế chấp & Chuộc sổ đỏ (Mortgage System)**: Nhận ngay 50% giá trị đất khi thiếu tiền mặt và chuộc lại với lãi suất 10% khi tài chính phục hồi.
- **Giao dịch tự do (Trade System)**: Mở bàn đàm phán trao đổi bất động sản kèm tiền mặt giữa bạn và các đối thủ.
- **Cơ chế Vào Tù / Ra Tù chuẩn xác**: Bị phạt giam khi lắc đôi 3 lần liên tiếp, dẫm ô Vào Tù (#30), hoặc rút trúng thẻ Vào Tù. Ra tù bằng cách trả 500.000đ, dùng thẻ Ra Tù, hoặc lắc đôi trong 3 lượt.
- **Hũ Quỹ Khởi Hành / Jackpot**: Tích lũy tiền thuế và phạt vào ô Bãi Đỗ Xe (#20), trao toàn bộ tiền thưởng cho đại gia may mắn dừng chân.

### 2. 🤖 Trí Tuệ Nhân Tạo (AI Bot) Tự Động

- Tích hợp các nhân vật Bot đặc trưng Sài Gòn (_Cô Ba Bọt, Bác Xích Lô, Tiệm Bánh..._).
- Thuật toán `BotAI` tự động phân tích tình hình tài chính, tỷ lệ sở hữu bộ màu để ra quyết định mua đất, đấu giá, thế chấp hoặc nâng cấp nhà phố tối ưu.

### 3. 🎴 Bộ 32 Thẻ Cơ Hội & Khí Vận Thuần Sài Gòn

- **16 Thẻ Cơ Hội (Cam)** & **16 Thẻ Khí Vận (Xanh)**: Thiết kế gần gũi với đời sống Sài Gòn (_Thưởng Tết, Lì Xì, Viện Phí Chợ Rẫy, Ghé Chợ Bến Thành, Kẹt xe Cầu Sài Gòn..._).
- **Khay thẻ tương tác trung tâm**: Bấm vào 2 cọc bài ở giữa bàn cờ để tra cứu số lượng thẻ còn lại, lịch sử các thẻ vừa rút trong ván và toàn bộ danh mục 32 thẻ bài.

### 4. 🎨 Giao Diện Hoài Cổ & Hiệu Ứng Sống Động

- **Bố cục 3 Cột (Cockpit Layout)**:
  - _Cột Trái_: Thông tin 4 người chơi, chỉ số tài sản, bấm vào thẻ người chơi để mở sổ chi tiết danh mục sở hữu (Portfolio).
  - _Cột Giữa_: Sân khấu bàn cờ 11x11 hoài cổ với tranh trung tâm Sài Gòn, khay bài chéo 3D và quân cờ di chuyển mượt mà.
  - _Cột Phải_: Bảng điều khiển xúc xắc 3D, cụm nút Mua/Xây/Giao Dịch/Bỏ Lượt, và hộp nhật ký ván đấu thời gian thực.
- **Hiệu ứng tiền bay (Floating Cash)**: Hiển thị tiền cộng/trừ trực quan bay lên từ thẻ người chơi và quân cờ.
- **Âm thanh chân thực**: Tiếng lắc xúc xắc, tiếng còi xe bóp kèn Sài Gòn vui nhộn, tiếng mở khóa nhà và nhạc chiến thắng.

### 5. 💾 Tự Động Lưu Trạng Thái (Auto Save)

- Tự động lưu tiến trình ván đấu vào `LocalStorage`. Khi mở lại trang, người chơi có thể tiếp tục ván đấu trước đó mà không bị mất dữ liệu.

---

## 📁 Cấu Trúc Dự Án

```
Monopoly/
├── client/                      # Giao diện & Trải nghiệm người dùng
│   ├── index.html               # File HTML chính của game
│   ├── css/
│   │   ├── main.css             # Layout 3 cột, Header, Reset & Biến CSS
│   │   ├── board.css            # Thiết kế 40 ô cờ, khay thẻ, nhà & khách sạn 3D
│   │   └── ui.css               # Hệ thống Modal, HUD người chơi, Card Viewer
│   ├── js/
│   │   ├── main.js              # Controller kết nối Engine, Renderer & Modals
│   │   ├── audio/
│   │   │   └── SoundEffects.js  # Hệ thống âm thanh & Web Audio API
│   │   ├── render/
│   │   │   ├── BoardRenderer.js # Render 40 ô cờ & cập nhật nhà phố
│   │   │   ├── TokenRenderer.js # Render & diễn hoạt bước nhảy quân cờ
│   │   │   ├── DiceRenderer.js  # Xúc xắc 3D & hiệu ứng quay
│   │   │   ├── TokensData.js    # Dữ liệu hình dáng quân cờ
│   │   │   └── AvatarsData.js   # SVG Avatar cho từng nhân vật
│   │   └── ui/
│   │       ├── HUD.js           # Bảng thông tin người chơi & tài sản
│   │       ├── CardDeckModal.js # Tra cứu cọc bài Cơ Hội / Khí Vận
│   │       ├── TitleDeedModal.js# Xem sổ đỏ, bằng khoán & xây nhà
│   │       ├── CardModal.js     # Modal hiển thị thẻ bài vừa rút
│   │       ├── AuctionModal.js  # Phòng đấu giá đất
│   │       ├── TradeModal.js    # Bàn đàm phán giao dịch tài sản
│   │       ├── JailModal.js     # Tù giam & các lựa chọn ra tù
│   │       ├── PortfolioModal.js# Sổ tay danh mục tài sản cá nhân
│   │       ├── GameSetupModal.js# Thiết lập ván cờ (Số người chơi, Bot, Chế độ nhanh)
│   │       └── RulebookModal.js # Sổ tay cẩm nang luật chơi
│   └── assets/                  # Hình ảnh tranh Sài Gòn trung tâm
│
├── shared/                      # Core Logic độc lập (Platform-agnostic)
│   ├── engine.js                # State machine & GameEngine Monopoly
│   ├── rules.js                 # Bộ quy tắc kiểm tra luật (Can Build, Can Mortgage...)
│   ├── BotAI.js                 # Trí tuệ nhân tạo điều khiển Bot
│   ├── constants.js             # Định dạng tiền tệ VND, hằng số luật
│   └── data/
│       ├── board-data.js        # Dữ liệu 40 ô cờ Sài Gòn chuẩn
│       ├── chance-cards.js      # Danh sách 16 thẻ Cơ Hội
│       └── chest-cards.js       # Danh sách 16 thẻ Khí Vận
│
├── .gitignore                   # Bỏ qua node_modules, log, và công cụ local dev
└── README.md                    # Tài liệu dự án
```

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Local

Dự án sử dụng **ES Modules** chuẩn của trình duyệt nên cần chạy qua một Web Server tĩnh (không mở trực tiếp bằng đường dẫn `file://`).

### Cách 1: Sử dụng Extension "Live Server" trên VS Code (Khuyên dùng)

1. Cài đặt extension **Live Server** trên Visual Studio Code.
2. Click chuột phải vào file `client/index.html` và chọn **Open with Live Server**.
3. Game sẽ tự động mở tại địa chỉ: `http://localhost:5500/client/index.html`.

### Cách 2: Sử dụng Node.js (`npx serve` hoặc `http-server`)

```bash
# Clone dự án về máy
git clone https://github.com/<your-username>/Monopoly.git
cd Monopoly

# Khởi chạy server tĩnh
npx serve .
# Hoặc:
# npx http-server -p 5500
```

Truy cập trình duyệt tại `http://localhost:5500/client/index.html`.

### Cách 3: Sử dụng Python

```bash
# Python 3
python -m http.server 5500
```

Mở trình duyệt: `http://localhost:5500/client/index.html`.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

| Thành Phần            | Công Nghệ                         | Mô Tả                                                                     |
| --------------------- | --------------------------------- | ------------------------------------------------------------------------- |
| **Core Architecture** | Vanilla HTML5 / ES6+ Modules      | Không dùng Framework (React/Vue), tối ưu hiệu năng thao tác DOM trực tiếp |
| **Styling**           | Vanilla CSS3                      | Custom Properties (CSS Variables), CSS Grid, Flexbox, 3D Transforms       |
| **Typography**        | Baloo 2, Playfair Display, Outfit | Bộ font mang phong cách biển hiệu Sài Gòn hoài cổ                         |
| **Audio**             | HTML5 Audio & Web Audio API       | Hiệu ứng âm thanh sinh động                                               |
| **Storage**           | Web Storage API (LocalStorage)    | Lưu trữ và khôi phục ván đấu tự động                                      |

---

## 📜 Giấy Phép & Bản Quyền

Dự án được phát hành theo giấy phép **MIT License**. Bạn được tự do học tập, sử dụng và phát triển thêm.

_Chúc bạn có những giờ phút trải nghiệm kinh doanh bất động sản vui vẻ trên bàn cờ Cờ Tỷ Phú Sài Gòn!_ 🏙️🎩🎲

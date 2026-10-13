/**
 * RulebookModal.js - Sổ Tay Luật Chơi Cờ Tỷ Phú Sài Gòn
 */

export class RulebookModal {
  constructor() {
    this.overlay = null;
    this.init();
  }

  init() {
    let overlay = document.getElementById('rulebook-modal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'rulebook-modal';
      overlay.className = 'modal-backdrop';
      overlay.style.display = 'none';
      document.body.appendChild(overlay);
    }
    this.overlay = overlay;
  }

  show() {
    this.overlay.innerHTML = `
      <div class="rulebook-container">
        <div class="rulebook-header">
          <div class="rulebook-badge">CẨM NANG ĐẠI GIA</div>
          <h2>📜 LUẬT CHƠI CỜ TỶ PHÚ SÀI GÒN</h2>
          <p>Bí quyết làm giàu & thâu tóm bất động sản hòn ngọc Viễn Đông</p>
          <button id="btn-close-rulebook" class="rulebook-close-btn">&times;</button>
        </div>

        <div class="rulebook-body">
          <!-- Mục 1 -->
          <div class="rule-card">
            <div class="rule-icon">🎯</div>
            <div class="rule-content">
              <h3>1. Mục Tiêu Chiến Thắng</h3>
              <p>Mỗi người khởi đầu với <strong>15.000.000 VNĐ</strong> (15M). Thu gom đất đai, xây dựng chuỗi nhà phố & khách sạn để thu tiền thuê. Người chiến thắng là đại gia duy nhất trụ lại sau khi các đối thủ phá sản.</p>
            </div>
          </div>

          <!-- Mục 2 -->
          <div class="rule-card">
            <div class="rule-icon">🏙️</div>
            <div class="rule-content">
              <h3>2. Mua Đất & Nhân Đôi Tiền Thuê (x2)</h3>
              <p>Dừng chân tại ô đất trống: Bạn được quyền mua theo giá niêm yết. Khi sở hữu <strong>trọn bộ các ô cùng màu</strong>, tiền thuê đất trống lập tức được <strong>nhân đôi (x2)</strong> ngay cả khi chưa xây nhà.</p>
            </div>
          </div>

          <!-- Mục 3 -->
          <div class="rule-card">
            <div class="rule-icon">🏗️</div>
            <div class="rule-content">
              <h3>3. Xây Nhà Xanh & Khách Sạn Đỏ</h3>
              <p>Chỉ được xây nhà khi đã gom đủ trọn bộ màu. Luật xây đều: Mỗi ô phải nâng cấp đều tay (không chênh lệch quá 1 căn). Khi đạt 4 Nhà Xanh, có thể nâng cấp lên <strong>1 Khách Sạn Đỏ</strong> để thu tiền thuê cực khủng.</p>
            </div>
          </div>

          <!-- Mục 4 -->
          <div class="rule-card">
            <div class="rule-icon">🔨</div>
            <div class="rule-content">
              <h3>4. Đấu Giá Đất (Auction)</h3>
              <p>Nếu bạn dừng vào đất trống nhưng chọn <em>"Bỏ qua"</em> không mua, Ngân hàng sẽ <strong>mở phiên đấu giá công khai</strong> cho tất cả người chơi. Ai đặt giá cao nhất sẽ sở hữu ô đất đó.</p>
            </div>
          </div>

          <!-- Mục 5 -->
          <div class="rule-card">
            <div class="rule-icon">🔒</div>
            <div class="rule-content">
              <h3>5. Thế Chấp (Mortgage) & Giao Dịch (Trade)</h3>
              <p>Khi thiếu tiền mặt, bạn có thể <strong>Thế chấp sổ đỏ</strong> để nhận 50% giá trị đất từ Bank. Khi có tiền, chuộc lại với phí lãi 10%. Bạn cũng có thể mở bảng <strong>Giao Dịch</strong> để đổi đất và tiền với người chơi khác.</p>
            </div>
          </div>

          <!-- Mục 6 -->
          <div class="rule-card">
            <div class="rule-icon">🚔</div>
            <div class="rule-content">
              <h3>6. Vào Tù & Cơ Hội / Khí Vận</h3>
              <p>Bị vào tù khi: Tung 3 lần xúc xắc đôi liên tiếp, rút trúng thẻ Vào Tù, hoặc dẫm trúng ô Vào Tù. Ra tù bằng cách: Nộp phạt 500K, dùng thẻ Ra Tù, hoặc tung xúc xắc ra điểm đôi trong 3 lượt.</p>
            </div>
          </div>
        </div>

        <div class="rulebook-footer">
          <button id="btn-rulebook-understand" class="btn-rulebook-confirm">ĐÃ HIỂU - VÀO TRẬN NGAY</button>
        </div>
      </div>
    `;

    this.overlay.style.display = 'flex';
    this.overlay.classList.add('active');

    const closeHandler = () => this.close();
    document.getElementById('btn-close-rulebook')?.addEventListener('click', closeHandler);
    document.getElementById('btn-rulebook-understand')?.addEventListener('click', closeHandler);
  }

  close() {
    if (this.overlay) {
      this.overlay.classList.remove('active');
      this.overlay.style.display = 'none';
    }
  }
}

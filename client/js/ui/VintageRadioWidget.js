/**
 * VintageRadioWidget.js - Giao diện Máy Phát Nhạc Cát-xét & Đài Radio Sài Gòn Cổ Điển
 */

import { LoFiSynthesizer, RADIO_STATIONS } from "../audio/LoFiSynthesizer.js";

export class VintageRadioWidget {
  constructor(options = {}) {
    this.synthesizer = new LoFiSynthesizer();
    this.container = null;
    // Mặc định đài radio đóng hoàn toàn khi vừa tải trang, chỉ mở khi người dùng bấm
    this.isOpen = false;
    this.isExpanded = true;
    this.isDragging = false;
    this.init();
  }

  init() {
    let el = document.getElementById("vintage-radio-widget");
    if (!el) {
      el = document.createElement("div");
      el.id = "vintage-radio-widget";
      el.className = "vintage-radio-widget hidden";
      document.body.appendChild(el);
    }
    this.container = el;
    this.render();
    this.bindEvents();
    this.initDraggable();
    this.restorePosition();
    this.updateUI();
  }

  /**
   * Khởi tạo cây DOM duy nhất 1 lần (tránh render lại làm nháy giao diện)
   */
  render() {
    const station = this.synthesizer.getCurrentStation();
    const isPlaying = this.synthesizer.isPlaying;
    const volPercent = Math.round(this.synthesizer.getVolume() * 100);

    this.container.className = `vintage-radio-widget ${this.isOpen ? "" : "hidden"} ${this.isExpanded ? "expanded" : "minimized"} ${isPlaying ? "playing" : "stopped"}`;

    this.container.innerHTML = `
      <!-- Widget Thu Gọn (Mini Floating Badge) -->
      <div class="radio-mini-bar" id="radio-mini-trigger" title="Nhấn để mở đài • Giữ chuột để kéo di chuyển">
        <div class="mini-radio-drag-handle" title="Kéo di chuyển">⋮⋮</div>
        <div class="mini-radio-icon ${isPlaying ? "pulse" : ""}">📻</div>
        <div class="mini-radio-info">
          <span class="mini-radio-title">Đài Sài Gòn</span>
          <span class="mini-radio-station">FM ${station.freq} • ${station.name}</span>
        </div>
        <button class="mini-radio-toggle-btn" id="btn-mini-play-pause" title="${isPlaying ? "Tạm dừng" : "Phát nhạc"}">
          ${isPlaying ? "⏸" : "▶"}
        </button>
        <button class="mini-expand-btn" id="btn-expand-radio" title="Mở rộng máy cát-xét">
          ⤢
        </button>
        <button class="mini-close-btn" id="btn-mini-close-radio" title="Tắt hẳn đài radio">
          &times;
        </button>
      </div>

      <!-- Quai xách cong hình chữ U ngược Boombox Cổ Điển thập niên 80-90 -->
      <div class="radio-boombox-handle" id="radio-boombox-handle" title="Cầm quai xách kéo để di chuyển đài radio">
        <div class="handle-hinge hinge-left" title="Khớp nối quai bên trái">
          <span class="hinge-bolt"></span>
        </div>
        <div class="handle-u-arch">
          <div class="handle-grip-wrap" title="Bọc tay cầm chống trượt">
            <span class="grip-ridge"></span>
            <span class="grip-ridge"></span>
            <span class="grip-ridge"></span>
            <span class="grip-ridge"></span>
            <span class="grip-ridge"></span>
          </div>
        </div>
        <div class="handle-hinge hinge-right" title="Khớp nối quai bên phải">
          <span class="hinge-bolt"></span>
        </div>
      </div>

      <!-- Thân Máy Cassette Cổ Điển Hoàn Chỉnh -->
      <div class="cassette-radio-body">
        <!-- Nóc đài & Bảng điều khiển (Vùng giữ chuột để kéo di chuyển) -->
        <div class="radio-top-handle" id="radio-drag-handle" title="Kéo nóc máy hoặc quai xách để di chuyển đài radio">
          <div class="handle-controls">
            <button class="btn-radio-min" id="btn-minimize-radio" title="Thu nhỏ về góc màn hình">_</button>
            <button class="btn-radio-close" id="btn-close-radio" title="Tắt hẳn đài radio">&times;</button>
          </div>
        </div>

        <!-- Khung Máy Chính -->
        <div class="radio-main-housing">
          <!-- Hàng 1: Màn hình LCD Tuner & Đèn LED Sóng Âm -->
          <div class="radio-lcd-screen">
            <div class="lcd-glow-layer"></div>
            <div class="lcd-header-line">
              <span class="lcd-brand">SAIGON STEREO CASSETTE RECORDER</span>
              <span class="lcd-stereo-indicator ${isPlaying ? "active" : ""}">● STEREO FM</span>
            </div>
            
            <div class="lcd-station-frequency">
              <span class="freq-number">${station.freq}</span>
              <span class="freq-unit">MHz</span>
            </div>

            <div class="lcd-station-name-marquee">
              <span class="station-marquee-text">${station.name} — ${station.genre}</span>
            </div>

            <!-- Equalizer LED nhấp nháy theo điệu nhạc -->
            <div class="lcd-vu-meter ${isPlaying ? "active" : ""}">
              <span class="vu-bar"></span>
              <span class="vu-bar"></span>
              <span class="vu-bar"></span>
              <span class="vu-bar"></span>
              <span class="vu-bar"></span>
              <span class="vu-bar"></span>
              <span class="vu-bar"></span>
              <span class="vu-bar"></span>
            </div>
          </div>

          <!-- Hàng 2: Hộc Băng Cassette Trong Suốt & 2 Cuộn Băng Xoay Tít -->
          <div class="cassette-deck-window">
            <div class="cassette-tape-body">
              <div class="tape-label">
                <span class="tape-label-text">SAIGON LO-FI TAPE 60</span>
                <span class="tape-side">SIDE A</span>
              </div>
              <div class="tape-transparent-hub">
                <!-- Cuộn bánh răng trái -->
                <div class="tape-spool left ${isPlaying ? "spinning" : ""}">
                  <div class="spool-core"></div>
                  <div class="spool-teeth"></div>
                </div>
                <!-- Cầu nối cuộn từ -->
                <div class="tape-window-bridge"></div>
                <!-- Cuộn bánh răng phải -->
                <div class="tape-spool right ${isPlaying ? "spinning" : ""}">
                  <div class="spool-core"></div>
                  <div class="spool-teeth"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Hàng 3: Cụm Nút Cơ Bấm Lồi - Thuần Việt Dễ Hiểu -->
          <div class="cassette-keys-bar">
            <button class="cassette-key" id="btn-radio-prev" title="Bài / Kênh trước đó">
              <span class="key-icon">⏮</span>
              <span class="key-label">LÙI</span>
            </button>
            <button class="cassette-key key-play ${isPlaying ? "pressed" : ""}" id="btn-radio-play" title="${isPlaying ? "Tạm dừng" : "Phát nhạc"}">
              <span class="key-icon">${isPlaying ? "⏸" : "▶"}</span>
              <span class="key-label">${isPlaying ? "TẠM DỪNG" : "PHÁT"}</span>
            </button>
            <button class="cassette-key" id="btn-radio-next" title="Bài / Kênh tiếp theo">
              <span class="key-icon">⏭</span>
              <span class="key-label">TỚI</span>
            </button>
            <button class="cassette-key key-stop" id="btn-radio-stop" title="Dừng hẳn đài">
              <span class="key-icon">⏹</span>
              <span class="key-label">DỪNG</span>
            </button>
          </div>

          <!-- Hàng 4: Bảng Điều Khiển Núm Vặn & Volume Slider -->
          <div class="radio-controls-footer">
            <!-- Thanh trượt Volume -->
            <div class="volume-slider-box">
              <span class="vol-label">ÂM LƯỢNG:</span>
              <input type="range" id="radio-volume-slider" min="0" max="100" value="${volPercent}" class="vintage-slider" title="Chỉnh âm lượng">
              <span class="vol-value" id="radio-vol-percent">${volPercent}%</span>
            </div>

            <!-- Nút chọn nhanh danh sách kênh radio -->
            <div class="station-selector-dropdown-box">
              <select id="radio-station-select" class="station-select">
                ${RADIO_STATIONS.map(
                  (st, idx) => `
                  <option value="${idx}" ${idx === this.synthesizer.currentStationIndex ? "selected" : ""}>
                    FM ${st.freq} - ${st.name}
                  </option>
                `,
                ).join("")}
              </select>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Cập nhật các phần tử thay đổi trên giao diện mà không sinh lại DOM
   */
  updateUI() {
    if (!this.container) return;

    const station = this.synthesizer.getCurrentStation();
    const isPlaying = this.synthesizer.isPlaying;
    const volPercent = Math.round(this.synthesizer.getVolume() * 100);

    // 1. Cập nhật class hiển thị và trạng thái
    this.container.classList.toggle("hidden", !this.isOpen);
    this.container.classList.toggle("playing", isPlaying);
    this.container.classList.toggle("stopped", !isPlaying);
    this.container.classList.toggle("expanded", this.isExpanded);
    this.container.classList.toggle("minimized", !this.isExpanded);

    // 2. Mini bar
    const miniIcon = this.container.querySelector(".mini-radio-icon");
    if (miniIcon) miniIcon.classList.toggle("pulse", isPlaying);

    const miniStation = this.container.querySelector(".mini-radio-station");
    if (miniStation) {
      miniStation.textContent = `FM ${station.freq} • ${station.name}`;
    }

    const miniPlayBtn = document.getElementById("btn-mini-play-pause");
    if (miniPlayBtn) {
      miniPlayBtn.textContent = isPlaying ? "⏸" : "▶";
      miniPlayBtn.title = isPlaying ? "Tạm dừng" : "Phát nhạc";
    }

    // 3. LCD screen
    const stereoInd = this.container.querySelector(".lcd-stereo-indicator");
    if (stereoInd) stereoInd.classList.toggle("active", isPlaying);

    const freqNum = this.container.querySelector(".freq-number");
    if (freqNum) freqNum.textContent = station.freq;

    const marqueeText = this.container.querySelector(".station-marquee-text");
    if (marqueeText) {
      marqueeText.textContent = `${station.name} — ${station.genre}`;
    }

    const vuMeter = this.container.querySelector(".lcd-vu-meter");
    if (vuMeter) vuMeter.classList.toggle("active", isPlaying);

    // 4. Cassette spools
    this.container.querySelectorAll(".tape-spool").forEach((spool) => {
      spool.classList.toggle("spinning", isPlaying);
    });

    // 5. Play / Pause key (Tiếng Việt rõ ràng)
    const playKey = document.getElementById("btn-radio-play");
    if (playKey) {
      playKey.classList.toggle("pressed", isPlaying);
      const icon = playKey.querySelector(".key-icon");
      const label = playKey.querySelector(".key-label");
      if (icon) icon.textContent = isPlaying ? "⏸" : "▶";
      if (label) label.textContent = isPlaying ? "TẠM DỪNG" : "PHÁT";
      playKey.title = isPlaying ? "Tạm dừng" : "Phát nhạc";
    }

    // 6. Station dropdown
    const select = document.getElementById("radio-station-select");
    if (
      select &&
      select.value !== String(this.synthesizer.currentStationIndex)
    ) {
      select.value = String(this.synthesizer.currentStationIndex);
    }

    // 7. Volume
    const slider = document.getElementById("radio-volume-slider");
    if (slider && slider.value !== String(volPercent)) {
      slider.value = String(volPercent);
    }
    const volPercentEl = document.getElementById("radio-vol-percent");
    if (volPercentEl) volPercentEl.textContent = `${volPercent}%`;

    // 8. Đồng bộ nút Header
    this.updateHeaderRadioStatus();
  }

  bindEvents() {
    // 1. Phóng to từ mini bar
    const miniTrigger = document.getElementById("radio-mini-trigger");
    const btnExpand = document.getElementById("btn-expand-radio");
    const btnMiniClose = document.getElementById("btn-mini-close-radio");

    if (btnExpand) {
      btnExpand.onclick = (e) => {
        e.stopPropagation();
        this.toggleExpand(true);
      };
    }
    if (btnMiniClose) {
      btnMiniClose.onclick = (e) => {
        e.stopPropagation();
        this.close();
      };
    }
    if (miniTrigger) {
      miniTrigger.onclick = (e) => {
        if (
          e.target.id === "btn-mini-play-pause" ||
          e.target.id === "btn-mini-close-radio" ||
          e.target.id === "btn-expand-radio" ||
          this.isDragging
        ) {
          return;
        }
        this.toggleExpand(true);
      };
    }

    // 2. Nút thu nhỏ và nút đóng hẳn trên quai xách máy
    const btnMinimize = document.getElementById("btn-minimize-radio");
    const btnClose = document.getElementById("btn-close-radio");

    if (btnMinimize) {
      btnMinimize.onclick = (e) => {
        e.stopPropagation();
        this.toggleExpand(false);
      };
    }
    if (btnClose) {
      btnClose.onclick = (e) => {
        e.stopPropagation();
        this.close();
      };
    }

    // 3. Nút Play / Pause trên mini bar
    const miniPlayBtn = document.getElementById("btn-mini-play-pause");
    if (miniPlayBtn) {
      miniPlayBtn.onclick = (e) => {
        e.stopPropagation();
        this.togglePlayPause();
      };
    }

    // 4. Nút Play / Pause trên thân máy
    const playBtn = document.getElementById("btn-radio-play");
    if (playBtn) {
      playBtn.onclick = () => this.togglePlayPause();
    }

    // 5. Nút Stop
    const stopBtn = document.getElementById("btn-radio-stop");
    if (stopBtn) {
      stopBtn.onclick = () => {
        this.synthesizer.stop();
        this.updateUI();
      };
    }

    // 6. Nút Prev / Next Station
    const prevBtn = document.getElementById("btn-radio-prev");
    const nextBtn = document.getElementById("btn-radio-next");

    if (prevBtn) {
      prevBtn.onclick = () => {
        this.synthesizer.prevStation();
        this.updateUI();
      };
    }
    if (nextBtn) {
      nextBtn.onclick = () => {
        this.synthesizer.nextStation();
        this.updateUI();
      };
    }

    // 7. Dropdown chọn kênh
    const selectStation = document.getElementById("radio-station-select");
    if (selectStation) {
      selectStation.onchange = (e) => {
        this.synthesizer.setStation(parseInt(e.target.value, 10));
        this.updateUI();
      };
    }

    // 8. Slider Volume
    const slider = document.getElementById("radio-volume-slider");
    const volPercentEl = document.getElementById("radio-vol-percent");
    if (slider) {
      slider.oninput = (e) => {
        const val = parseInt(e.target.value, 10);
        this.synthesizer.setVolume(val / 100);
        if (volPercentEl) volPercentEl.textContent = `${val}%`;
      };
    }
  }

  /**
   * Khởi tạo tính năng kéo thả (Draggable) tự do trên toàn màn hình
   */
  initDraggable() {
    const handleMain = document.getElementById("radio-drag-handle");
    const handleBoombox = document.getElementById("radio-boombox-handle");
    const handleMini = document.getElementById("radio-mini-trigger");

    const setupDrag = (handleElement) => {
      if (!handleElement) return;

      const onStart = (clientX, clientY, target) => {
        // Bỏ qua nếu bấm trúng nút bấm con
        if (
          target.tagName === "BUTTON" ||
          target.tagName === "INPUT" ||
          target.tagName === "SELECT"
        ) {
          return;
        }

        const rect = this.container.getBoundingClientRect();
        const offsetX = clientX - rect.left;
        const offsetY = clientY - rect.top;
        let moved = false;

        const onMove = (moveX, moveY) => {
          if (!moved) {
            const dist = Math.hypot(moveX - clientX, moveY - clientY);
            if (dist > 4) {
              moved = true;
              this.isDragging = true;
              this.container.classList.add("dragging");
            }
          }

          if (moved) {
            let left = moveX - offsetX;
            let top = moveY - offsetY;

            // Giới hạn trong viewport
            const maxLeft = window.innerWidth - rect.width - 8;
            const maxTop = window.innerHeight - rect.height - 8;
            left = Math.max(8, Math.min(maxLeft, left));
            top = Math.max(8, Math.min(maxTop, top));

            this.container.style.right = "auto";
            this.container.style.bottom = "auto";
            this.container.style.left = `${left}px`;
            this.container.style.top = `${top}px`;
          }
        };

        const onEnd = () => {
          document.removeEventListener("mousemove", mouseMoveHandler);
          document.removeEventListener("mouseup", mouseUpHandler);
          document.removeEventListener("touchmove", touchMoveHandler);
          document.removeEventListener("touchend", touchEndHandler);

          if (moved) {
            this.container.classList.remove("dragging");
            const finalRect = this.container.getBoundingClientRect();
            localStorage.setItem(
              "monopoly_radio_coords",
              JSON.stringify({ left: finalRect.left, top: finalRect.top }),
            );
            setTimeout(() => {
              this.isDragging = false;
            }, 50);
          } else {
            this.isDragging = false;
          }
        };

        const mouseMoveHandler = (e) => onMove(e.clientX, e.clientY);
        const mouseUpHandler = () => onEnd();
        const touchMoveHandler = (e) => {
          if (e.touches && e.touches.length > 0) {
            onMove(e.touches[0].clientX, e.touches[0].clientY);
          }
        };
        const touchEndHandler = () => onEnd();

        document.addEventListener("mousemove", mouseMoveHandler);
        document.addEventListener("mouseup", mouseUpHandler);
        document.addEventListener("touchmove", touchMoveHandler, {
          passive: true,
        });
        document.addEventListener("touchend", touchEndHandler);
      };

      handleElement.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return; // Chỉ bắt chuột trái
        onStart(e.clientX, e.clientY, e.target);
      });

      handleElement.addEventListener(
        "touchstart",
        (e) => {
          if (e.touches && e.touches.length > 0) {
            onStart(e.touches[0].clientX, e.touches[0].clientY, e.target);
          }
        },
        { passive: true },
      );
    };

    setupDrag(handleMain);
    setupDrag(handleBoombox);
    setupDrag(handleMini);
  }

  /**
   * Khôi phục vị trí người dùng đã kéo lần trước
   */
  restorePosition() {
    try {
      const saved = localStorage.getItem("monopoly_radio_coords");
      if (saved && this.container) {
        const coords = JSON.parse(saved);
        if (
          typeof coords.left === "number" &&
          typeof coords.top === "number" &&
          coords.left < window.innerWidth &&
          coords.top < window.innerHeight
        ) {
          this.container.style.right = "auto";
          this.container.style.bottom = "auto";
          this.container.style.left = `${Math.max(8, coords.left)}px`;
          this.container.style.top = `${Math.max(8, coords.top)}px`;
        }
      }
    } catch (e) {
      console.warn("Không thể khôi phục vị trí đài radio:", e);
    }
  }

  /**
   * Mở đài và bắt đầu phát nhạc
   */
  open() {
    this.isOpen = true;
    this.isExpanded = true;
    this.synthesizer.play();
    this.updateUI();
  }

  /**
   * Tắt hẳn đài, ngắt nhạc và ẩn hoàn toàn khỏi màn hình
   */
  close() {
    this.isOpen = false;
    this.synthesizer.stop();
    this.updateUI();
  }

  /**
   * Bật / Tắt toàn bộ đài radio từ Header
   */
  toggleOpen() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  togglePlayPause() {
    if (this.synthesizer.isPlaying) {
      this.synthesizer.stop();
    } else {
      this.synthesizer.play();
    }
    this.updateUI();
  }

  toggleExpand(expand) {
    this.isExpanded = expand !== undefined ? expand : !this.isExpanded;
    this.updateUI();
  }

  /**
   * Đồng bộ trạng thái phát nhạc lên nút trên Header
   */
  updateHeaderRadioStatus() {
    const btnHeaderRadio = document.getElementById("btn-open-radio");
    if (!btnHeaderRadio) return;
    const isPlaying = this.synthesizer.isPlaying;
    const station = this.synthesizer.getCurrentStation();

    if (this.isOpen && isPlaying) {
      btnHeaderRadio.classList.add("radio-playing");
      btnHeaderRadio.title = `Đang phát: FM ${station.freq} - ${station.name} (Nhấn để tắt hẳn)`;
      btnHeaderRadio.innerHTML = `<span class="btn-tool-icon animate-pulse">📻</span> <span class="btn-tool-label radio-header-freq">FM ${station.freq}</span>`;
    } else {
      btnHeaderRadio.classList.remove("radio-playing");
      btnHeaderRadio.title = "Mở Đài Radio Cát-xét Sài Gòn";
      btnHeaderRadio.innerHTML = `<span class="btn-tool-icon">📻</span> <span class="btn-tool-label">Đài Radio</span>`;
    }
  }
}

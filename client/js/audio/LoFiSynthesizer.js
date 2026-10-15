/**
 * LoFiSynthesizer.js - Bộ tổng hợp nhạc nền Lo-fi hoài niệm Sài Gòn bằng Web Audio API thuần
 * Tự phát các bản Lo-Fi Jazz, Chillhop, tiếng rè đài cassette và âm thanh đường phố Sài Gòn
 */

export const RADIO_STATIONS = [
  {
    id: "station_1",
    freq: "88.5",
    name: "Chiều Mưa Bến Bạch Đằng",
    genre: "Lo-Fi Jazz Piano & Tiếng Mưa Rào",
    bpm: 68,
    scale: ["C4", "E4", "G4", "B4", "D5"], // Cmaj9 vibe
    chords: [
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
      [220.0, 261.63, 329.63, 392.0], // Am7
      [293.66, 349.23, 440.0, 523.25], // Dm7
      [196.0, 246.94, 293.66, 349.23], // G7
    ],
    streetFx: "rain", // mưa rào
  },
  {
    id: "station_2",
    freq: "94.0",
    name: "Đêm Sài Gòn Phố Lên Đèn",
    genre: "Retro Synthwave & Chuông Leng Keng",
    bpm: 76,
    chords: [
      [349.23, 440.0, 523.25, 659.25], // Fmaj7
      [329.63, 392.0, 493.88, 587.33], // Em7
      [293.66, 349.23, 440.0, 523.25], // Dm7
      [261.63, 329.63, 392.0, 523.25], // Cmaj7
    ],
    streetFx: "bell", // chuông xe buýt / xe đạp leng keng
  },
  {
    id: "station_3",
    freq: "99.9",
    name: "Hẻm Nhỏ Tiếng Rao Xưa",
    genre: "Acoustic Hoài Niệm & Hủ Tiếu Gõ",
    bpm: 72,
    chords: [
      [220.0, 261.63, 329.63, 440.0], // Am
      [174.61, 220.0, 261.63, 349.23], // F
      [261.63, 329.63, 392.0, 523.25], // C
      [196.0, 246.94, 293.66, 392.0], // G
    ],
    streetFx: "hutieu", // tiếng gõ lốc cốc tre
  },
  {
    id: "station_4",
    freq: "104.2",
    name: "Cà Phê Vỉa Hè Bossa",
    genre: "Bossa Nova Chill & Đá Muỗng Leng Keng",
    bpm: 82,
    chords: [
      [293.66, 349.23, 440.0, 523.25], // Dm7
      [196.0, 246.94, 293.66, 349.23], // G7
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
      [220.0, 277.18, 329.63, 392.0], // A7
    ],
    streetFx: "spoon", // thìa khuấy ly cà phê đá
  },
];

export class LoFiSynthesizer {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.filterNode = null;
    this.crackleNode = null;
    this.crackleGain = null;

    this.isPlaying = false;
    this.currentStationIndex = 0;
    this.volume = parseFloat(
      localStorage.getItem("monopoly_radio_volume") ?? 0.45,
    );
    this.isMuted = false;

    this.stepIndex = 0;
    this.loopTimer = null;
    this.streetFxTimer = null;

    // Buffer tiếng rè đài cát-xét
    this.staticNoiseBuffer = null;
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

      // Lowpass Filter tạo chất Lo-fi ấm cúng (cắt bớt treble quá gắt, mô phỏng băng cassette)
      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = "lowpass";
      this.filterNode.frequency.setValueAtTime(1750, this.ctx.currentTime);
      this.filterNode.Q.setValueAtTime(1.2, this.ctx.currentTime);

      // Nối: filter -> masterGain -> destination
      this.filterNode.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      // Tạo tiếng vinyl crackle nền
      this.setupCrackle();
      this.generateStaticBuffer();
    }

    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  /**
   * Tạo tiếng nổ lách tách nhẹ nhàng của đĩa than / cuộn băng cassette (Vinyl Crackle)
   */
  setupCrackle() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(
      1,
      bufferSize,
      this.ctx.sampleRate,
    );
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      // 99% im lặng, 1% xuất hiện tiếng lách tách
      if (Math.random() > 0.993) {
        output[i] = (Math.random() * 2 - 1) * 0.45;
      } else {
        output[i] = (Math.random() * 2 - 1) * 0.015;
      }
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const crackleFilter = this.ctx.createBiquadFilter();
    crackleFilter.type = "bandpass";
    crackleFilter.frequency.setValueAtTime(1200, this.ctx.currentTime);
    crackleFilter.Q.setValueAtTime(1.8, this.ctx.currentTime);

    this.crackleGain = this.ctx.createGain();
    this.crackleGain.gain.setValueAtTime(0.06, this.ctx.currentTime);

    whiteNoise.connect(crackleFilter);
    crackleFilter.connect(this.crackleGain);
    this.crackleGain.connect(this.masterGain);

    whiteNoise.start();
    this.crackleNode = whiteNoise;
  }

  /**
   * Tạo sẵn buffer tiếng rè sóng dò đài AM/FM vintage (Static Burst)
   */
  generateStaticBuffer() {
    if (!this.ctx) return;
    const length = this.ctx.sampleRate * 0.4; // 400ms
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.staticNoiseBuffer = buffer;
  }

  /**
   * Phát tiếng rè sóng khi xoay núm dò đài
   */
  playTuningStatic() {
    this.initContext();
    if (!this.ctx || !this.staticNoiseBuffer) return;

    const now = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    source.buffer = this.staticNoiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(2200 + Math.random() * 1200, now);
    filter.Q.setValueAtTime(3.5, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(now);
    source.stop(now + 0.35);
  }

  /**
   * Bắt đầu phát đài Radio
   */
  play() {
    this.initContext();
    if (!this.ctx) return;
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.stepIndex = 0;
    this.playTuningStatic();

    setTimeout(() => {
      if (this.isPlaying) {
        this.scheduleNextBeat();
        this.startStreetFxLoop();
      }
    }, 280);
  }

  /**
   * Dừng phát đài
   */
  stop() {
    this.isPlaying = false;
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
    if (this.streetFxTimer) {
      clearTimeout(this.streetFxTimer);
      this.streetFxTimer = null;
    }
  }

  /**
   * Chuyển sang kênh kế tiếp
   */
  nextStation() {
    this.currentStationIndex =
      (this.currentStationIndex + 1) % RADIO_STATIONS.length;
    this.handleStationChange();
    return this.getCurrentStation();
  }

  /**
   * Chuyển sang kênh trước đó
   */
  prevStation() {
    this.currentStationIndex =
      (this.currentStationIndex - 1 + RADIO_STATIONS.length) %
      RADIO_STATIONS.length;
    this.handleStationChange();
    return this.getCurrentStation();
  }

  /**
   * Đặt kênh cụ thể theo index
   */
  setStation(index) {
    if (index >= 0 && index < RADIO_STATIONS.length) {
      this.currentStationIndex = index;
      this.handleStationChange();
    }
    return this.getCurrentStation();
  }

  handleStationChange() {
    this.playTuningStatic();
    this.stepIndex = 0;
    if (this.isPlaying) {
      if (this.loopTimer) clearTimeout(this.loopTimer);
      if (this.streetFxTimer) clearTimeout(this.streetFxTimer);
      this.loopTimer = setTimeout(() => {
        if (this.isPlaying) {
          this.scheduleNextBeat();
          this.startStreetFxLoop();
        }
      }, 320);
    }
  }

  getCurrentStation() {
    return RADIO_STATIONS[this.currentStationIndex];
  }

  /**
   * Điều chỉnh âm lượng từ 0.0 đến 1.0
   */
  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, parseFloat(val)));
    localStorage.setItem("monopoly_radio_volume", this.volume);
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.isMuted ? 0 : this.volume,
        this.ctx.currentTime,
        0.05,
      );
    }
  }

  getVolume() {
    return this.volume;
  }

  setMute(muted) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        muted ? 0 : this.volume,
        this.ctx.currentTime,
        0.05,
      );
    }
  }

  /**
   * Lịch trình đánh nhịp nhạc Lo-fi lặp tuần hoàn (Music Sequencer)
   */
  scheduleNextBeat() {
    if (!this.isPlaying || !this.ctx) return;

    const station = this.getCurrentStation();
    const bpm = station.bpm;
    const beatDuration = 60 / bpm; // thời gian 1 nhịp (s)
    const subStepTime = beatDuration / 2; // nốt móc đơn (eighth note)

    const now = this.ctx.currentTime;
    const currentStep = this.stepIndex % 16;
    const chordIndex = Math.floor(currentStep / 4) % station.chords.length;
    const currentChord = station.chords[chordIndex];

    // 1. Chơi Hợp Âm Piano / E-Piano ấm áp ở đầu mỗi 4 nhịp hoặc đệm ngắt
    if (currentStep % 4 === 0) {
      this.playRhodesChord(currentChord, now, beatDuration * 2.2);
      this.playBassNote(currentChord[0] / 2, now, beatDuration * 1.8);
    } else if (currentStep % 4 === 2 && Math.random() > 0.4) {
      // Đệm nhẹ ngắt quãng
      this.playRhodesChord(currentChord, now, beatDuration * 0.9, 0.04);
    }

    // 2. Nhịp Kick Lo-fi êm dịu (ở bước 0, 6, 10)
    if (currentStep === 0 || currentStep === 6 || currentStep === 10) {
      this.playLoFiKick(now);
    }

    // 3. Nhịp Snare / Rimshot đanh nhẹ (ở bước 4 và 12)
    if (currentStep === 4 || currentStep === 12) {
      this.playLoFiSnare(now);
    }

    // 4. Nhịp Hi-hat / Shaker khẽ khàng
    if (currentStep % 2 === 0) {
      this.playLoFiHiHat(now, currentStep % 4 === 0 ? 0.04 : 0.025);
    }

    this.stepIndex++;
    this.loopTimer = setTimeout(() => {
      this.scheduleNextBeat();
    }, subStepTime * 1000);
  }

  /**
   * Hợp âm E-Piano Rhodes ấm áp qua bộ lọc Lo-fi
   */
  playRhodesChord(freqArray, startTime, duration = 1.2, volumeGain = 0.065) {
    freqArray.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Giả lập âm sắc Rhodes bằng sóng Sine + Triangle
      osc.type = idx % 2 === 0 ? "sine" : "triangle";

      // Wow & Flutter: dao động cao độ nhẹ nhàng như băng cũ
      const detune = (Math.random() - 0.5) * 6;
      osc.frequency.setValueAtTime(freq, startTime);
      osc.detune.setValueAtTime(detune, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(volumeGain, startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.filterNode);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
    });
  }

  /**
   * Bassline analog trầm ấm
   */
  playBassNote(freq, startTime, duration = 0.8) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq / 2, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.09, startTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.filterNode);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  /**
   * Tiếng Trống Bass (Lo-Fi Kick)
   */
  playLoFiKick(startTime) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(110, startTime);
    osc.frequency.exponentialRampToValueAtTime(38, startTime + 0.12);

    gain.gain.setValueAtTime(0.14, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.16);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(startTime + 0.18);
  }

  /**
   * Tiếng Snare / Rimshot mộc mạc
   */
  playLoFiSnare(startTime) {
    // 1. Tonal body
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(160, startTime);
    osc.frequency.exponentialRampToValueAtTime(80, startTime + 0.08);

    oscGain.gain.setValueAtTime(0.08, startTime);
    oscGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.09);
    osc.connect(oscGain);
    oscGain.connect(this.filterNode);

    osc.start(startTime);
    osc.stop(startTime + 0.1);

    // 2. White noise snap
    const bufferSize = this.ctx.sampleRate * 0.08;
    const noiseBuffer = this.ctx.createBuffer(
      1,
      bufferSize,
      this.ctx.sampleRate,
    );
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = "highpass";
    noiseFilter.frequency.setValueAtTime(1400, startTime);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.055, startTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start(startTime);
    noise.stop(startTime + 0.09);
  }

  /**
   * Tiếng Hi-hat / Shaker khẽ
   */
  playLoFiHiHat(startTime, vol = 0.035) {
    const bufferSize = this.ctx.sampleRate * 0.04;
    const noiseBuffer = this.ctx.createBuffer(
      1,
      bufferSize,
      this.ctx.sampleRate,
    );
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(6500, startTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.035);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(startTime);
    source.stop(startTime + 0.04);
  }

  /**
   * Vòng lặp phát âm thanh đường phố đặc trưng Sài Gòn theo từng kênh
   */
  startStreetFxLoop() {
    if (!this.isPlaying || !this.ctx) return;
    const station = this.getCurrentStation();

    const triggerInterval = 8000 + Math.random() * 7000; // mỗi 8 - 15 giây điểm 1 âm thanh phố
    this.streetFxTimer = setTimeout(() => {
      if (!this.isPlaying) return;

      const now = this.ctx.currentTime;
      if (station.streetFx === "bell") {
        this.playStreetBell(now);
      } else if (station.streetFx === "hutieu") {
        this.playHutieuClack(now);
      } else if (station.streetFx === "spoon") {
        this.playCoffeeSpoon(now);
      } else if (station.streetFx === "rain") {
        this.playGentleRainDrop(now);
      }

      this.startStreetFxLoop();
    }, triggerInterval);
  }

  // Tiếng chuông leng keng xe buýt / xe đạp
  playStreetBell(startTime) {
    const tones = [1975.53, 2349.32]; // B6, D7
    tones.forEach((freq, idx) => {
      setTimeout(() => {
        if (!this.isPlaying || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.045, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.65);
      }, idx * 140);
    });
  }

  // Tiếng gõ lốc cốc hủ tiếu gõ tre
  playHutieuClack(startTime) {
    const clacks = [540, 680];
    clacks.forEach((freq, idx) => {
      setTimeout(() => {
        if (!this.isPlaying || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.04);

        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.05);
      }, idx * 130);
    });
  }

  // Tiếng muỗng inox gõ ly cà phê đá leng keng
  playCoffeeSpoon(startTime) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(2800, startTime);
    osc.frequency.exponentialRampToValueAtTime(2200, startTime + 0.06);

    gain.gain.setValueAtTime(0.035, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(startTime + 0.45);
  }

  // Giọt mưa rào rơi nhẹ
  playGentleRainDrop(startTime) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(950, startTime);
    osc.frequency.exponentialRampToValueAtTime(420, startTime + 0.08);

    gain.gain.setValueAtTime(0.03, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(startTime + 0.1);
  }
}

/**
 * SoundEffects.js - Hệ thống âm thanh sống động bằng Web Audio API
 * Tự tổng hợp âm thanh chân thực 100% không phụ thuộc file mp3 ngoài
 */

class SoundManager {
  constructor() {
    this.ctx = null;
    this.isMuted = localStorage.getItem("monopoly_sound_muted") === "true";

    // Nạp sẵn file âm thanh xúc xắc thực tế
    try {
      this.diceAudio = new Audio("js/audio/u_qpfzpydtro-dice-142528.mp3");
      this.diceAudio.preload = "auto";
    } catch (e) {
      this.diceAudio = null;
    }
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem("monopoly_sound_muted", this.isMuted);
    if (this.isMuted && this.diceAudio) {
      this.diceAudio.pause();
      this.diceAudio.currentTime = 0;
    }
    return !this.isMuted;
  }

  // Tiếng lắc xí ngầu: Phát file MP3 chân thực, tự động fallback nếu cần
  playDiceRoll() {
    if (this.isMuted) return;

    if (this.diceAudio) {
      try {
        this.diceAudio.currentTime = 0;
        const playPromise = this.diceAudio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Fallback sang Web Audio API nếu trình duyệt yêu cầu tương tác hoặc lỗi nạp
            this.playSynthDiceRoll();
          });
        }
        return;
      } catch (e) {
        // Fallback
      }
    }

    this.playSynthDiceRoll();
  }

  // Alias lắc xí ngầu
  playDiceShake() {
    this.playDiceRoll();
  }

  // Âm thanh xúc xắc dự phòng bằng Web Audio API
  playSynthDiceRoll() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const delays = [0, 65, 135, 210, 290, 375, 465, 555, 650];
    delays.forEach((delay, idx) => {
      setTimeout(() => {
        if (this.isMuted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const isFinalThud = idx === delays.length - 1;

        const oscHigh = this.ctx.createOscillator();
        const gainHigh = this.ctx.createGain();
        oscHigh.type = "sine";
        const highFreq = isFinalThud ? 1400 : 1800 + Math.random() * 800;
        oscHigh.frequency.setValueAtTime(highFreq, now);
        oscHigh.frequency.exponentialRampToValueAtTime(250, now + (isFinalThud ? 0.08 : 0.045));

        gainHigh.gain.setValueAtTime(isFinalThud ? 0.38 : 0.22, now);
        gainHigh.gain.exponentialRampToValueAtTime(0.001, now + (isFinalThud ? 0.08 : 0.045));

        oscHigh.connect(gainHigh);
        gainHigh.connect(this.ctx.destination);
        oscHigh.start(now);
        oscHigh.stop(now + (isFinalThud ? 0.08 : 0.045));

        const oscLow = this.ctx.createOscillator();
        const gainLow = this.ctx.createGain();
        oscLow.type = "triangle";
        const lowFreq = isFinalThud ? 180 : 240 + Math.random() * 100;
        oscLow.frequency.setValueAtTime(lowFreq, now);
        oscLow.frequency.exponentialRampToValueAtTime(50, now + (isFinalThud ? 0.09 : 0.05));

        gainLow.gain.setValueAtTime(isFinalThud ? 0.35 : 0.18, now);
        gainLow.gain.exponentialRampToValueAtTime(0.001, now + (isFinalThud ? 0.09 : 0.05));

        oscLow.connect(gainLow);
        gainLow.connect(this.ctx.destination);
        oscLow.start(now);
        oscLow.stop(now + (isFinalThud ? 0.09 : 0.05));
      }, delay);
    });
  }

  // Tiếng bước nhảy quân cờ tí tách (Popping hop)
  playTokenStep() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.07);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  // Tiếng tiền rơi leng keng ngân vang (Coin Tinkles)
  playCoin() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const notes = [987.77, 1318.51, 1567.98]; // B5, E6, G6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        if (this.isMuted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.35);
      }, idx * 75);
    });
  }

  // Tiếng mua đất thành công (Fanfare ấm áp C-E-G)
  playSuccess() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        if (this.isMuted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.3);
      }, idx * 80);
    });
  }

  // Tiếng lật mở thẻ bài Cơ Hội / Khí Vận huyền bí
  playCardDraw() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(1100, now + 0.25);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  // Tiếng búa đóng đinh xây nhà (Construction hammers)
  playBuildHouse() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    [0, 110, 220].forEach((delay) => {
      setTimeout(() => {
        if (this.isMuted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "square";
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.05);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.05);
      }, delay);
    });
  }

  // Tiếng còi xe máy Sài Gòn bíp bíp đặc trưng
  playSaigonHorn() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    [0, 120].forEach((delay) => {
      setTimeout(() => {
        if (this.isMuted) return;
        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = "sawtooth";
        osc2.type = "sawtooth";
        osc1.frequency.setValueAtTime(420, now);
        osc2.frequency.setValueAtTime(440, now);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.08);
        osc2.stop(now + 0.08);
      }, delay);
    });
  }

  // Tiếng vào tù (Siren + Clang)
  playJail() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.linearRampToValueAtTime(300, now + 0.35);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  // Gia vị giọng thoại vui nhộn đậm chất Sài Gòn
  speakSaigon(text) {
    if (this.isMuted) return;
    if (!("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "vi-VN";
      utterance.rate = 1.08;
      utterance.pitch = 1.12;
      const voices = window.speechSynthesis.getVoices();
      const viVoice = voices.find(
        (v) => v.lang.includes("vi") || v.lang.includes("VN"),
      );
      if (viVoice) utterance.voice = viVoice;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("SpeechSynthesis:", e);
    }
  }
}

export const sound = new SoundManager();

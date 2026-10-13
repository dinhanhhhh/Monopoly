/**
 * SoundEffects.js - Hệ thống âm thanh sống động bằng Web Audio API
 * Tự tổng hợp âm thanh chân thực 100% không phụ thuộc file mp3 ngoài
 */

class SoundManager {
  constructor() {
    this.ctx = null;
    this.isMuted = localStorage.getItem("monopoly_sound_muted") === "true";
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
    return !this.isMuted;
  }

  // Tiếng lắc xí ngầu xóc lốc cốc trong hộp gỗ
  playDiceRoll() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const count = 5;
    for (let i = 0; i < count; i++) {
      setTimeout(
        () => {
          if (this.isMuted) return;
          const now = this.ctx.currentTime;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          // Âm thanh gõ gỗ biến thiên tần số
          osc.type = "triangle";
          osc.frequency.setValueAtTime(120 + Math.random() * 80, now);
          osc.frequency.exponentialRampToValueAtTime(40, now + 0.06);

          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(now);
          osc.stop(now + 0.06);
        },
        i * 90 + Math.random() * 30,
      );
    }
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

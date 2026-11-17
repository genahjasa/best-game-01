// All sound is synthesized with WebAudio — no audio files, no network. The mixer
// starts on the first user gesture (browsers block audio before that) and every
// effect is a tiny oscillator/noise burst. Nothing here throws when audio is
// unavailable (screenshot mode runs with no gesture at all).
export function createAudio() {
  const audio = {
    ctx: null,
    master: null,
    musicGain: null,
    muted: false,
    musicTimer: 0,
    musicStep: 0,
    ensure() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        return true;
      }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.14;
        this.musicGain.connect(this.master);
        return true;
      } catch (err) {
        return false;
      }
    },
    toggleMute() {
      this.muted = !this.muted;
      if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
      return this.muted;
    },
    tone(freq, dur, type, vol, slideTo) {
      if (!this.ensure() || this.muted) return;
      try {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq, t);
        if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
        gain.gain.setValueAtTime(vol || 0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(gain);
        gain.connect(this.master);
        osc.start(t);
        osc.stop(t + dur + 0.02);
      } catch (err) { /* sound is decoration, never fatal */ }
    },
    noise(dur, vol, lowpass) {
      if (!this.ensure() || this.muted) return;
      try {
        const t = this.ctx.currentTime;
        const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
        const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = lowpass || 1200;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol || 0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.master);
        src.start(t);
      } catch (err) { /* sound is decoration, never fatal */ }
    },
    shoot() { this.tone(720, 0.07, 'square', 0.08, 340); },
    hit() { this.tone(180, 0.06, 'triangle', 0.14, 90); },
    kill() { this.noise(0.14, 0.2, 900); this.tone(320, 0.12, 'sawtooth', 0.1, 60); },
    ember() { this.tone(880 + Math.random() * 220, 0.09, 'sine', 0.12, 1320); },
    hurt() { this.tone(140, 0.25, 'sawtooth', 0.22, 55); this.noise(0.2, 0.18, 500); },
    beam() { this.noise(0.5, 0.3, 2400); this.tone(220, 0.5, 'sine', 0.2, 880); },
    horn() { this.tone(196, 0.5, 'triangle', 0.2, 196); this.tone(294, 0.5, 'triangle', 0.14, 294); },
    boss() { this.tone(98, 0.8, 'sawtooth', 0.22, 49); this.noise(0.7, 0.2, 300); },
    bless() { this.tone(523, 0.12, 'sine', 0.14); setTimeout(() => this.tone(659, 0.12, 'sine', 0.14), 90); setTimeout(() => this.tone(784, 0.2, 'sine', 0.16), 180); },
    over() { this.tone(392, 0.4, 'triangle', 0.18, 196); setTimeout(() => this.tone(262, 0.7, 'triangle', 0.18, 131), 350); },
    win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, 'triangle', 0.16), i * 130)); },
    // A slow minor-key pad arpeggio, one note per call from the world clock.
    musicTick(dt) {
      if (!this.ensure() || this.muted) return;
      this.musicTimer -= dt;
      if (this.musicTimer > 0) return;
      this.musicTimer = 0.34;
      const scale = [220, 261.6, 329.6, 392, 440, 523.25];
      const note = scale[this.musicStep % scale.length];
      this.musicStep += 1;
      try {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = note / 2;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.5, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(t);
        osc.stop(t + 0.65);
      } catch (err) { /* decoration only */ }
    },
  };
  return audio;
}

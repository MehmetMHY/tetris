import { AUDIO_VOLUME } from "../config/constants.js";

/**
 * GameAudio: Web Audio API playback with HTML audio fallback.
 *
 * Web Audio is preferred for low-latency SFX. HTML audio elements are
 * kept as a fallback pool for browsers that don't support or can't
 * unlock Web Audio (notably some mobile browsers).
 */
export class GameAudio {
  constructor({ sfxVolume, muteSfx }) {
    this.sfxVolume = sfxVolume;
    this.muteSfx = muteSfx;
    this.ctx = null;
    this.masterGain = null;
    this.buffers = new Map();
    this.unlocked = false;
    this.unlocking = null;
    this.htmlFallback = new Map();
  }

  async init() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;

    try {
      this.ctx = new Ctx({ latencyHint: "interactive" });
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muteSfx ? 0 : this.sfxVolume;
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {}

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") this.resumeIfNeeded();
    });
    window.addEventListener("pageshow", () => this.resumeIfNeeded());
  }

  async unlock() {
    if (this.unlocked) return true;
    if (this.unlocking) return this.unlocking;

    this.unlocking = (async () => {
      await this.init();
      if (!this.ctx) return false;

      if (this.ctx.state === "suspended" || this.ctx.state === "interrupted") {
        try {
          await this.ctx.resume();
        } catch (e) {}
      }

      try {
        const buffer = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(this.masterGain);
        src.start(0);
      } catch (e) {}

      this.unlocked = this.ctx.state === "running";
      return this.unlocked;
    })();

    try {
      return await this.unlocking;
    } finally {
      this.unlocking = null;
    }
  }

  async resumeIfNeeded() {
    if (!this.ctx) return;
    if (this.ctx.state === "suspended" || this.ctx.state === "interrupted") {
      try {
        await this.ctx.resume();
      } catch (e) {}
    }
  }

  async loadBuffer(name, url) {
    await this.init();
    if (!this.ctx) return null;

    try {
      const res = await fetch(url, { cache: "force-cache" });
      if (!res.ok) throw new Error();
      const arr = await res.arrayBuffer();
      const buffer = await this.ctx.decodeAudioData(arr);
      this.buffers.set(name, buffer);
      return buffer;
    } catch (e) {
      return null;
    }
  }

  registerHtmlFallback(name, url, poolSize = 4) {
    const pool = Array.from({ length: poolSize }, () => {
      const a = new Audio(url);
      a.preload = "auto";
      a.playsInline = true;
      a.volume = this.sfxVolume;
      return a;
    });
    this.htmlFallback.set(name, { pool, i: 0 });
  }

  async play(name) {
    await this.resumeIfNeeded();

    const buffer = this.buffers.get(name);
    if (this.ctx && this.ctx.state === "running" && buffer) {
      try {
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(this.masterGain);
        src.start(this.ctx.currentTime);
        return true;
      } catch (e) {}
    }

    return this.playHtmlFallback(name);
  }

  async playHtmlFallback(name) {
    const entry = this.htmlFallback.get(name);
    if (!entry) return false;

    const a = entry.pool[entry.i++ % entry.pool.length];
    try {
      a.pause();
      a.currentTime = 0;
      await a.play();
      return true;
    } catch (e) {
      return false;
    }
  }

  setMuteSfx(muted) {
    this.muteSfx = muted;
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : this.sfxVolume;
    }
  }

  setGainZero() {
    if (this.masterGain) {
      this.masterGain.gain.value = 0;
    }
  }

  restoreGain() {
    if (this.masterGain) {
      this.masterGain.gain.value = this.muteSfx ? 0 : this.sfxVolume;
    }
  }
}

/**
 * AudioManager ties together background music (HTML audio element),
 * SFX (GameAudio), and mute state.
 */
export class AudioManager {
  constructor({
    audioEl,
    isMobile,
    storage,
    muteMusic,
    muteSfx,
    visualEffects,
  }) {
    this.audioEl = audioEl;
    this.storage = storage;
    this.audioStarted = false;
    this.muteMusic = muteMusic || false;
    this.muteSfx = muteSfx || false;
    this._visualEffects = visualEffects || false;

    const sfxVolume = isMobile ? 0.55 : 0.15;
    this.sfxVolume = sfxVolume;

    this.gameAudio = new GameAudio({ sfxVolume, muteSfx: this.muteSfx });
    this.gameAudio.registerHtmlFallback("lineClear", "assets/UMViM2tHrOk.mp3");
    this.gameAudio.loadBuffer("lineClear", "assets/UMViM2tHrOk.mp3");
  }

  setMuteMusic(muted) {
    this.muteMusic = muted;
    this.applyMute();
  }

  setMuteSfx(muted) {
    this.muteSfx = muted;
    this.gameAudio.setMuteSfx(muted);
    this.applyMute();
  }

  setMute(muteMusic, muteSfx) {
    this.muteMusic = muteMusic;
    this.muteSfx = muteSfx;
    this.gameAudio.setMuteSfx(muteSfx);
    this.applyMute();
  }

  applyMute() {
    this.audioEl.muted = this.muteMusic;
    this.audioEl.volume = this.muteMusic ? 0 : AUDIO_VOLUME;
    this.gameAudio.restoreGain();
  }

  startAudio() {
    if (!this.audioStarted) {
      this.applyMute();
      this.gameAudio.unlock();
      this.audioEl
        .play()
        .then(() => {
          this.audioStarted = true;
          this.applyMute();
        })
        .catch(() => {});
    }
  }

  playLineClearSound() {
    if (!this.muteSfx) {
      this.gameAudio.play("lineClear");
    }
  }

  pauseMusic() {
    this.audioEl.pause();
    this.gameAudio.setGainZero();
  }

  resumeMusic() {
    if (!this.muteMusic && this.audioStarted) {
      this.audioEl.play().catch(() => {});
    }
    this.applyMute();
  }

  set visualEffects(v) {
    this._visualEffects = v;
  }

  get visualEffects() {
    return this._visualEffects;
  }
}

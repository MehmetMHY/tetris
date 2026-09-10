/**
 * Storage wrapper around localStorage with safe error handling.
 *
 * The backend is injectable so this module can be unit-tested in Node
 * without a real browser localStorage. In the browser, it defaults to
 * the global localStorage.
 *
 * Existing localStorage keys (must remain stable):
 *   tetris-high-score
 *   tetris-mute-music
 *   tetris-mute-sfx
 *   tetris-visual-effects
 *
 * Legacy keys migrated away:
 *   tetris-muted, tetris-mute-all
 */

// Legacy keys that are migrated to the new separate mute keys.
const LEGACY_MUTED_KEY = "tetris-muted";
const LEGACY_MUTE_ALL_KEY = "tetris-mute-all";

export const KEYS = {
  HIGH_SCORE: "tetris-high-score",
  MUTE_MUSIC: "tetris-mute-music",
  MUTE_SFX: "tetris-mute-sfx",
  VISUAL_EFFECTS: "tetris-visual-effects",
};

export class Storage {
  constructor(backend = globalThis.localStorage) {
    this.backend = backend;
  }

  _safe(fn) {
    try {
      return fn();
    } catch {
      return null;
    }
  }

  get(key) {
    return this._safe(() => this.backend.getItem(key));
  }

  set(key, value) {
    this._safe(() => this.backend.setItem(key, value));
  }

  remove(key) {
    this._safe(() => this.backend.removeItem(key));
  }

  getNumber(key, fallback = 0) {
    const raw = this.get(key);
    if (raw === null || raw === undefined) return fallback;
    const n = parseInt(raw, 10);
    return isNaN(n) ? fallback : n;
  }

  getBool(key, fallback = false) {
    const raw = this.get(key);
    if (raw === null || raw === undefined) return fallback;
    return raw === "true";
  }

  setBool(key, value) {
    this.set(key, value ? "true" : "false");
  }

  setNumber(key, value) {
    this.set(key, String(value));
  }

  /**
   * Load all settings, migrating legacy keys if present.
   * Returns { highScore, muteMusic, muteSfx, visualEffects }.
   */
  loadSettings() {
    let highScore = this.getNumber(KEYS.HIGH_SCORE, 0);
    let muteMusic = this.getBool(KEYS.MUTE_MUSIC, false);
    let muteSfx = this.getBool(KEYS.MUTE_SFX, false);
    let visualEffects = this.getBool(KEYS.VISUAL_EFFECTS, false);

    // Migrate from old mute keys
    const legacyMuted = this.getBool(LEGACY_MUTED_KEY, false);
    const legacyMuteAll = this.getBool(LEGACY_MUTE_ALL_KEY, false);
    if (legacyMuted || legacyMuteAll) {
      muteMusic = true;
      muteSfx = true;
      this.setBool(KEYS.MUTE_MUSIC, true);
      this.setBool(KEYS.MUTE_SFX, true);
    }
    this.remove(LEGACY_MUTED_KEY);
    this.remove(LEGACY_MUTE_ALL_KEY);

    return { highScore, muteMusic, muteSfx, visualEffects };
  }

  saveHighScore(value) {
    this.setNumber(KEYS.HIGH_SCORE, value);
  }

  saveMute(muteMusic, muteSfx) {
    this.setBool(KEYS.MUTE_MUSIC, muteMusic);
    this.setBool(KEYS.MUTE_SFX, muteSfx);
  }

  saveVisualEffects(enabled) {
    this.setBool(KEYS.VISUAL_EFFECTS, enabled);
  }
}

/**
 * Create a simple in-memory storage backend for tests.
 * Matches the Web Storage API subset used above.
 */
export function createMemoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => void map.set(key, String(value)),
    removeItem: (key) => void map.delete(key),
  };
}

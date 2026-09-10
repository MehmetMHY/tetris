import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Storage, KEYS, createMemoryStorage } from "../src/platform/storage.js";

describe("storage", () => {
  test("getNumber returns stored number", () => {
    const s = new Storage(createMemoryStorage({ "tetris-high-score": "4200" }));
    assert.equal(s.getNumber(KEYS.HIGH_SCORE), 4200);
  });

  test("getNumber returns fallback for missing key", () => {
    const s = new Storage(createMemoryStorage());
    assert.equal(s.getNumber(KEYS.HIGH_SCORE, 0), 0);
  });

  test("getNumber returns fallback for invalid number", () => {
    const s = new Storage(createMemoryStorage({ "tetris-high-score": "abc" }));
    assert.equal(s.getNumber(KEYS.HIGH_SCORE, 0), 0);
  });

  test("getBool returns true only for 'true'", () => {
    const s = new Storage(createMemoryStorage({ "tetris-mute-music": "true" }));
    assert.equal(s.getBool(KEYS.MUTE_MUSIC), true);
  });

  test("getBool returns false for 'false'", () => {
    const s = new Storage(
      createMemoryStorage({ "tetris-mute-music": "false" }),
    );
    assert.equal(s.getBool(KEYS.MUTE_MUSIC), false);
  });

  test("getBool returns fallback for missing key", () => {
    const s = new Storage(createMemoryStorage());
    assert.equal(s.getBool(KEYS.MUTE_MUSIC, false), false);
    assert.equal(s.getBool(KEYS.MUTE_MUSIC, true), true);
  });

  test("setBool stores string 'true' or 'false'", () => {
    const backend = createMemoryStorage();
    const s = new Storage(backend);
    s.setBool(KEYS.MUTE_MUSIC, true);
    assert.equal(backend.getItem(KEYS.MUTE_MUSIC), "true");
    s.setBool(KEYS.MUTE_MUSIC, false);
    assert.equal(backend.getItem(KEYS.MUTE_MUSIC), "false");
  });

  test("setNumber stores string representation", () => {
    const backend = createMemoryStorage();
    const s = new Storage(backend);
    s.setNumber(KEYS.HIGH_SCORE, 9999);
    assert.equal(backend.getItem(KEYS.HIGH_SCORE), "9999");
  });

  test("remove deletes a key", () => {
    const backend = createMemoryStorage({ "tetris-muted": "true" });
    const s = new Storage(backend);
    s.remove("tetris-muted");
    assert.equal(backend.getItem("tetris-muted"), null);
  });

  describe("loadSettings", () => {
    test("returns defaults when storage is empty", () => {
      const s = new Storage(createMemoryStorage());
      const settings = s.loadSettings();
      assert.equal(settings.highScore, 0);
      assert.equal(settings.muteMusic, false);
      assert.equal(settings.muteSfx, false);
      assert.equal(settings.visualEffects, false);
    });

    test("loads stored values", () => {
      const s = new Storage(
        createMemoryStorage({
          "tetris-high-score": "5000",
          "tetris-mute-music": "true",
          "tetris-mute-sfx": "false",
          "tetris-visual-effects": "true",
        }),
      );
      const settings = s.loadSettings();
      assert.equal(settings.highScore, 5000);
      assert.equal(settings.muteMusic, true);
      assert.equal(settings.muteSfx, false);
      assert.equal(settings.visualEffects, true);
    });

    test("migrates legacy tetris-muted key", () => {
      const backend = createMemoryStorage({ "tetris-muted": "true" });
      const s = new Storage(backend);
      const settings = s.loadSettings();
      assert.equal(settings.muteMusic, true);
      assert.equal(settings.muteSfx, true);
      assert.equal(backend.getItem(KEYS.MUTE_MUSIC), "true");
      assert.equal(backend.getItem(KEYS.MUTE_SFX), "true");
      assert.equal(backend.getItem("tetris-muted"), null);
    });

    test("migrates legacy tetris-mute-all key", () => {
      const backend = createMemoryStorage({ "tetris-mute-all": "true" });
      const s = new Storage(backend);
      const settings = s.loadSettings();
      assert.equal(settings.muteMusic, true);
      assert.equal(settings.muteSfx, true);
      assert.equal(backend.getItem("tetris-mute-all"), null);
    });

    test("removes legacy keys even when not set", () => {
      const backend = createMemoryStorage();
      const s = new Storage(backend);
      s.loadSettings();
      assert.equal(backend.getItem("tetris-muted"), null);
      assert.equal(backend.getItem("tetris-mute-all"), null);
    });
  });

  test("saveHighScore and saveMute persist correctly", () => {
    const backend = createMemoryStorage();
    const s = new Storage(backend);
    s.saveHighScore(12345);
    s.saveMute(true, false);
    assert.equal(backend.getItem(KEYS.HIGH_SCORE), "12345");
    assert.equal(backend.getItem(KEYS.MUTE_MUSIC), "true");
    assert.equal(backend.getItem(KEYS.MUTE_SFX), "false");
  });

  test("saveVisualEffects persists", () => {
    const backend = createMemoryStorage();
    const s = new Storage(backend);
    s.saveVisualEffects(true);
    assert.equal(backend.getItem(KEYS.VISUAL_EFFECTS), "true");
  });

  test("safe storage handles errors gracefully", () => {
    const brokenBackend = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    const s = new Storage(brokenBackend);
    // Should not throw
    assert.equal(s.get(KEYS.HIGH_SCORE), null);
    assert.equal(s.getNumber(KEYS.HIGH_SCORE, 42), 42);
    assert.doesNotThrow(() => s.set(KEYS.HIGH_SCORE, "100"));
    assert.doesNotThrow(() => s.remove(KEYS.HIGH_SCORE));
    assert.doesNotThrow(() => s.loadSettings());
  });
});

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  LEVEL_SPEEDS,
  getSpeed,
  getLockDelay,
  getDASDelay,
  getDASRepeat,
  MAX_START_LEVEL,
} from "../src/config/timing.js";

describe("timing", () => {
  test("LEVEL_SPEEDS has 13 entries (levels 1-13+)", () => {
    assert.equal(LEVEL_SPEEDS.length, 13);
  });

  test("level 1 speed is 800ms", () => {
    assert.equal(getSpeed(1), 800);
  });

  test("speed decreases with level", () => {
    for (let lvl = 1; lvl < LEVEL_SPEEDS.length; lvl++) {
      assert.ok(
        getSpeed(lvl) >= getSpeed(lvl + 1),
        `level ${lvl} should be >= level ${lvl + 1}`,
      );
    }
  });

  test("speed caps at level 13+ value (33ms)", () => {
    assert.equal(getSpeed(13), 33);
    assert.equal(getSpeed(20), 33);
    assert.equal(getSpeed(100), 33);
  });

  test("level 1 speed matches LEVEL_SPEEDS[0]", () => {
    assert.equal(getSpeed(1), LEVEL_SPEEDS[0]);
  });

  test("getLockDelay is 500ms at level 1 on desktop", () => {
    assert.equal(getLockDelay(1, false), 500);
  });

  test("getLockDelay is 500ms at level 1 on mobile", () => {
    assert.equal(getLockDelay(1, true), 500);
  });

  test("getLockDelay decreases with level", () => {
    assert.ok(getLockDelay(10, false) < getLockDelay(1, false));
  });

  test("getLockDelay has higher floor on mobile (450ms)", () => {
    assert.equal(getLockDelay(100, true), 450);
  });

  test("getLockDelay has lower floor on desktop (350ms)", () => {
    assert.equal(getLockDelay(100, false), 350);
  });

  test("getLockDelay default isMobile is false", () => {
    assert.equal(getLockDelay(1), 500);
  });

  test("getDASDelay is 170ms at level 1", () => {
    assert.equal(getDASDelay(1), 170);
  });

  test("getDASDelay is 100ms at level 10+", () => {
    assert.equal(getDASDelay(10), 100);
    assert.equal(getDASDelay(20), 100);
  });

  test("getDASDelay decreases with level", () => {
    for (let lvl = 1; lvl < 10; lvl++) {
      assert.ok(getDASDelay(lvl) >= getDASDelay(lvl + 1));
    }
  });

  test("getDASRepeat is 50ms at level 1", () => {
    assert.equal(getDASRepeat(1), 50);
  });

  test("getDASRepeat is 30ms at level 10+", () => {
    assert.equal(getDASRepeat(10), 30);
    assert.equal(getDASRepeat(20), 30);
  });

  test("getDASRepeat decreases with level", () => {
    for (let lvl = 1; lvl < 10; lvl++) {
      assert.ok(getDASRepeat(lvl) >= getDASRepeat(lvl + 1));
    }
  });

  test("MAX_START_LEVEL equals LEVEL_SPEEDS.length", () => {
    assert.equal(MAX_START_LEVEL, 13);
  });
});

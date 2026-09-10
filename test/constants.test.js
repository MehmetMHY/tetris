import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  COLS,
  ROWS,
  BLOCK,
  EMPTY,
  COLORS,
  LINE_SCORES,
  SOFT_DROP_SCORE,
  HARD_DROP_SCORE,
  GROUND_LOCK_MAX,
  GROUND_FLICKER_START,
  MAX_LOCK_MOVES,
  DAS_DELAY_BASE,
  DAS_DELAY_MIN,
  DAS_REPEAT_BASE,
  DAS_REPEAT_MIN,
} from "../src/config/constants.js";

describe("constants", () => {
  test("board dimensions are standard Tetris", () => {
    assert.equal(COLS, 10);
    assert.equal(ROWS, 20);
  });

  test("BLOCK is 30px", () => {
    assert.equal(BLOCK, 30);
  });

  test("EMPTY is 0", () => {
    assert.equal(EMPTY, 0);
  });

  test("COLORS has 7 entries for IOTSZJL", () => {
    assert.equal(Object.keys(COLORS).length, 7);
    for (let i = 1; i <= 7; i++) {
      assert.ok(typeof COLORS[i] === "string");
      assert.ok(COLORS[i].startsWith("#"));
    }
  });

  test("LINE_SCORES matches standard Tetris guideline", () => {
    assert.deepEqual(LINE_SCORES, [0, 100, 300, 500, 800]);
  });

  test("drop scoring constants", () => {
    assert.equal(SOFT_DROP_SCORE, 1);
    assert.equal(HARD_DROP_SCORE, 2);
  });

  test("ground lock cap and flicker start", () => {
    assert.equal(GROUND_LOCK_MAX, 8000);
    assert.equal(GROUND_FLICKER_START, 6000);
    assert.ok(GROUND_FLICKER_START < GROUND_LOCK_MAX);
  });

  test("lock move reset limit is 15", () => {
    assert.equal(MAX_LOCK_MOVES, 15);
  });

  test("DAS constants", () => {
    assert.equal(DAS_DELAY_BASE, 170);
    assert.equal(DAS_DELAY_MIN, 100);
    assert.equal(DAS_REPEAT_BASE, 50);
    assert.equal(DAS_REPEAT_MIN, 30);
    assert.ok(DAS_DELAY_MIN < DAS_DELAY_BASE);
    assert.ok(DAS_REPEAT_MIN < DAS_REPEAT_BASE);
  });
});

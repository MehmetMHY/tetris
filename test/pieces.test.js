import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  SHAPES,
  KICK_JLSTZ,
  KICK_JLSTZ_CCW,
  KICK_I,
  KICK_I_CCW,
  PIECE_NAMES,
  getShape,
} from "../src/config/pieces.js";

describe("pieces", () => {
  test("PIECE_NAMES is the standard 7 pieces", () => {
    assert.deepEqual(PIECE_NAMES, ["I", "O", "T", "S", "Z", "J", "L"]);
  });

  test("every piece has 4 rotation states", () => {
    for (const name of PIECE_NAMES) {
      assert.equal(SHAPES[name].length, 4, `${name} should have 4 rotations`);
    }
  });

  test("I piece spawn state is horizontal", () => {
    const s = SHAPES.I[0];
    // Row 1 should be all filled
    assert.deepEqual(s[1], [1, 1, 1, 1]);
    assert.deepEqual(s[0], [0, 0, 0, 0]);
  });

  test("O piece is 2x2 and identical in all rotations", () => {
    for (let r = 0; r < 4; r++) {
      assert.deepEqual(SHAPES.O[r], [
        [2, 2],
        [2, 2],
      ]);
    }
  });

  test("T piece spawn state has T pointing up", () => {
    const s = SHAPES.T[0];
    assert.deepEqual(s[0], [0, 3, 0]);
    assert.deepEqual(s[1], [3, 3, 3]);
    assert.deepEqual(s[2], [0, 0, 0]);
  });

  test("S and Z are mirrors", () => {
    const s = SHAPES.S[0];
    const z = SHAPES.Z[0];
    assert.deepEqual(s[0], [0, 4, 4]);
    assert.deepEqual(s[1], [4, 4, 0]);
    assert.deepEqual(z[0], [5, 5, 0]);
    assert.deepEqual(z[1], [0, 5, 5]);
  });

  test("J and L are mirrors", () => {
    const j = SHAPES.J[0];
    const l = SHAPES.L[0];
    assert.deepEqual(j[0], [6, 0, 0]);
    assert.deepEqual(l[0], [0, 0, 7]);
  });

  test("getShape returns the correct rotation", () => {
    assert.equal(getShape("I", 0), SHAPES.I[0]);
    assert.equal(getShape("T", 2), SHAPES.T[2]);
  });

  test("SRS kick tables have 4 rotation transitions each", () => {
    assert.equal(KICK_JLSTZ.length, 4);
    assert.equal(KICK_JLSTZ_CCW.length, 4);
    assert.equal(KICK_I.length, 4);
    assert.equal(KICK_I_CCW.length, 4);
  });

  test("every kick entry has 5 offsets", () => {
    for (const table of [KICK_JLSTZ, KICK_JLSTZ_CCW, KICK_I, KICK_I_CCW]) {
      for (const kicks of table) {
        assert.equal(kicks.length, 5);
        for (const [kx, ky] of kicks) {
          assert.ok(typeof kx === "number");
          assert.ok(typeof ky === "number");
        }
      }
    }
  });

  test("first kick offset is always [0,0]", () => {
    for (const table of [KICK_JLSTZ, KICK_JLSTZ_CCW, KICK_I, KICK_I_CCW]) {
      for (const kicks of table) {
        assert.deepEqual(kicks[0], [0, 0]);
      }
    }
  });

  test("piece cell values match their color IDs", () => {
    // I uses color 1, O uses 2, T uses 3, S uses 4, Z uses 5, J uses 6, L uses 7
    const expected = { I: 1, O: 2, T: 3, S: 4, Z: 5, J: 6, L: 7 };
    for (const [piece, id] of Object.entries(expected)) {
      const shape = SHAPES[piece][0];
      let found = false;
      for (const row of shape) {
        for (const cell of row) {
          if (cell !== 0) {
            assert.equal(cell, id, `${piece} should use color ${id}`);
            found = true;
          }
        }
      }
      assert.ok(found, `${piece} should have at least one filled cell`);
    }
  });
});

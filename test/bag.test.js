import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { shuffledBag } from "../src/game/bag.js";
import { PIECE_NAMES } from "../src/config/pieces.js";

describe("bag", () => {
  test("returns 7 pieces", () => {
    const bag = shuffledBag();
    assert.equal(bag.length, 7);
  });

  test("contains each piece exactly once", () => {
    const bag = shuffledBag();
    for (const piece of PIECE_NAMES) {
      assert.equal(bag.filter((p) => p === piece).length, 1);
    }
  });

  test("is a permutation of PIECE_NAMES", () => {
    const bag = shuffledBag();
    assert.deepEqual([...bag].sort(), [...PIECE_NAMES].sort());
  });

  test("with deterministic RNG produces deterministic output", () => {
    let seed = 12345;
    const rng = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const bag1 = shuffledBag(rng);
    seed = 12345;
    const bag2 = shuffledBag(rng);
    assert.deepEqual(bag1, bag2);
  });

  test("different seeds usually produce different bags", () => {
    let s1 = 1;
    const rng1 = () => {
      s1 = (s1 * 1103515245 + 12345) & 0x7fffffff;
      return s1 / 0x7fffffff;
    };
    let s2 = 999;
    const rng2 = () => {
      s2 = (s2 * 1103515245 + 12345) & 0x7fffffff;
      return s2 / 0x7fffffff;
    };
    // Not guaranteed, but extremely likely
    assert.notDeepEqual(shuffledBag(rng1), shuffledBag(rng2));
  });

  test("consecutive bags are usually different", () => {
    const bag1 = shuffledBag();
    const bag2 = shuffledBag();
    // Very unlikely to be the same
    assert.notDeepEqual(bag1, bag2);
  });
});

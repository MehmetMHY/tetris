import { PIECE_NAMES } from "../config/pieces.js";

// Standard seven-bag randomizer. RNG is injectable for deterministic tests.
export function shuffledBag(rng = Math.random) {
  const arr = [...PIECE_NAMES];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

import {
  DAS_DELAY_BASE,
  DAS_DELAY_MIN,
  DAS_REPEAT_BASE,
  DAS_REPEAT_MIN,
} from "./constants.js";

// NES-inspired speed curve (ms per drop). Each level is noticeably faster.
export const LEVEL_SPEEDS = [
  800, // Level 1
  650, // Level 2
  500, // Level 3
  370, // Level 4
  280, // Level 5
  200, // Level 6
  150, // Level 7
  115, // Level 8
  85, // Level 9
  65, // Level 10
  50, // Level 11
  40, // Level 12
  33, // Level 13+  (NES lvl 19-28 feel)
];

export function getSpeed(lvl) {
  const idx = Math.min(lvl - 1, LEVEL_SPEEDS.length - 1);
  return LEVEL_SPEEDS[idx];
}

// Lock delay scaling: 500ms at level 1, minimum 450ms on mobile / 350ms on desktop.
// isMobile is injected so this function remains pure and testable.
export function getLockDelay(lvl, isMobile = false) {
  const minDelay = isMobile ? 450 : 350;
  return Math.max(minDelay, 500 - (lvl - 1) * 10);
}

// DAS delay scales from 170ms (L1) to 100ms (L10+).
export function getDASDelay(lvl) {
  const t = Math.min((lvl - 1) / 9, 1); // 0 at L1, 1 at L10+
  return DAS_DELAY_BASE - t * (DAS_DELAY_BASE - DAS_DELAY_MIN);
}

// DAS repeat scales from 50ms (L1) to 30ms (L10+).
export function getDASRepeat(lvl) {
  const t = Math.min((lvl - 1) / 9, 1);
  return DAS_REPEAT_BASE - t * (DAS_REPEAT_BASE - DAS_REPEAT_MIN);
}

export const MAX_START_LEVEL = LEVEL_SPEEDS.length;

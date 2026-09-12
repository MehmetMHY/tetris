export const COLS = 10;
export const ROWS = 20;
export const BLOCK = 30;
export const EMPTY = 0;

export const COLORS = {
  1: "#00f0f0", // I - cyan
  2: "#f0f000", // O - yellow
  3: "#a000f0", // T - purple
  4: "#00f000", // S - green
  5: "#f00000", // Z - red
  6: "#3366ff", // J - blue
  7: "#f0a000", // L - orange
};

export const GHOST_ALPHA = 0.25;
export const PREVIEW_BLOCK = 20;

export const LINE_SCORES = [0, 100, 300, 500, 800];
export const SOFT_DROP_SCORE = 1;
export const HARD_DROP_SCORE = 2;

// Hard cap on how long a piece can sit on the ground before force-locking.
// Prevents indefinite stalling via DAS + soft-drop combos.
export const GROUND_LOCK_MAX = 8000;
export const GROUND_FLICKER_START = 6000;

export const MAX_LOCK_MOVES = 15;

// DAS / Auto-repeat constants (scales with level)
export const DAS_DELAY_BASE = 170;
export const DAS_DELAY_MIN = 100;
export const DAS_REPEAT_BASE = 50;
export const DAS_REPEAT_MIN = 30;

// Touch tuning constants
export const CLASSIFY_DIST = 8;
export const AXIS_DOMINANCE = 1.15;
export const SOFT_DROP_DIST = 1.0;
export const FLICK_VEL_THRESH = 1.2;
export const FLICK_MIN_DIST = 50;
export const TAP_MAX_DIST = 14;
export const TAP_MAX_TIME = 250;
export const H_TO_V_VEL = 0.8;

// Audio
export const AUDIO_VOLUME = 0.12;

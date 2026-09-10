import {
  COLS,
  ROWS,
  EMPTY,
  LINE_SCORES,
  SOFT_DROP_SCORE,
  HARD_DROP_SCORE,
  GROUND_LOCK_MAX,
  GROUND_FLICKER_START,
  MAX_LOCK_MOVES,
} from "../config/constants.js";
import {
  SHAPES,
  KICK_JLSTZ,
  KICK_JLSTZ_CCW,
  KICK_I,
  KICK_I_CCW,
  getShape,
} from "../config/pieces.js";
import { getSpeed, getLockDelay } from "../config/timing.js";
import { shuffledBag } from "./bag.js";

/**
 * GameEngine encapsulates all pure game logic: board state, piece movement,
 * rotation, collision, locking, line clearing, scoring, and timing.
 *
 * It has zero DOM or browser dependencies. All side effects (audio, particles,
 * UI updates, rendering) are communicated through the `hooks` callback object,
 * which is wired by the composition layer (main.js).
 *
 * This preserves the exact gameplay feel of the original single-IIFE
 * implementation while making the rules independently testable.
 */
export class GameEngine {
  constructor({ rng = Math.random, isMobile = () => false } = {}) {
    this.rng = rng;
    this.isMobile = isMobile;

    // Hooks — set by the composition layer
    this.hooks = {
      onLineClear: null, // ({ count, rows, isHardDropTetris }) => void
      onScoreChange: null, // () => void
      onSpawn: null, // () => void  (draw next + hold previews)
      onHold: null, // () => void  (draw hold preview)
      onGameOver: null, // ({ score }) => void
    };

    this._initState();
  }

  _initState() {
    // Board
    this.board = this.createBoard();
    this.boardDirty = true;

    // Scoring / progression
    this.score = 0;
    this.lines = 0;
    this.level = 1;

    // Lifecycle
    this.gameOver = false;
    this.paused = false;
    this.started = false;

    // Current piece
    this.currentType = null;
    this.currentRotation = 0;
    this.currentX = 0;
    this.currentY = 0;

    // Queue / hold
    this.nextType = null;
    this.holdType = null;
    this.holdUsed = false;
    this.bag = [];

    // Timing
    this.pieceSerial = 0;
    this.dropTimer = 0;
    this.lastTime = 0;
    this.lockTimer = 0;
    this.lockMoves = 0;
    this.groundTime = 0;

    // Hard-drop flag (used to trigger slam shake on Tetris clears)
    this.hardDropLockPending = false;

    // Ghost-piece Y cache
    this._cachedGhostY = 0;
    this._ghostCacheType = "";
    this._ghostCacheRot = -1;
    this._ghostCacheX = -1;
    this._ghostCacheY = -1;
  }

  // ─── Board helpers ───

  createBoard() {
    return Array.from({ length: ROWS }, () => new Array(COLS).fill(EMPTY));
  }

  getShape(type, rot) {
    return getShape(type, rot);
  }

  shuffledBag() {
    return shuffledBag(this.rng);
  }

  nextPiece() {
    if (this.bag.length === 0) this.bag = this.shuffledBag();
    return this.bag.pop();
  }

  // ─── Collision ───

  collides(shape, bx, by) {
    const rows = shape.length;
    for (let r = 0; r < rows; r++) {
      const row = shape[r];
      const ny = by + r;
      const cols = row.length;
      for (let c = 0; c < cols; c++) {
        if (row[c] !== 0) {
          const nx = bx + c;
          if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
          if (ny >= 0 && this.board[ny][nx] !== EMPTY) return true;
        }
      }
    }
    return false;
  }

  // ─── Locking ───

  lockPiece() {
    const shape = this.getShape(this.currentType, this.currentRotation);
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] !== 0) {
          const ny = this.currentY + r;
          const nx = this.currentX + c;
          if (ny < 0) {
            this.triggerGameOver();
            return;
          }
          this.board[ny][nx] = shape[r][c];
        }
      }
    }
    this.boardDirty = true;
    this.clearLines();
  }

  isRowFull(row) {
    for (let c = 0; c < COLS; c++) {
      if (row[c] === EMPTY) return false;
    }
    return true;
  }

  clearLines() {
    const full = [];
    for (let r = 0; r < ROWS; r++) {
      if (this.isRowFull(this.board[r])) full.push(r);
    }

    if (full.length === 0) {
      this.holdUsed = false;
      this.spawn();
      return;
    }

    // Capture row colors before mutation (for particle effects)
    const rowsData = full.map((r) => ({ row: r, colors: [...this.board[r]] }));
    const isHardDropTetris =
      this.hardDropLockPending && full.length === 4;

    // Process board immediately — no input blocking
    full.sort((a, b) => b - a);
    for (const r of full) {
      this.board.splice(r, 1);
    }
    for (let i = 0; i < full.length; i++) {
      this.board.unshift(new Array(COLS).fill(EMPTY));
    }
    this.boardDirty = true;

    // Score
    const count = full.length;
    this.lines += count;
    this.score += LINE_SCORES[count] * this.level;
    this.level = Math.floor(this.lines / 10) + 1;

    // Notify composition layer
    this.hooks.onLineClear?.({ count, rows: rowsData, isHardDropTetris });
    this.hooks.onScoreChange?.();

    this.holdUsed = false;
    this.spawn();
  }

  // ─── Spawning ───

  spawn() {
    this.pieceSerial++;
    this.currentType = this.nextType;
    this.nextType = this.nextPiece();
    this.currentRotation = 0;
    const shape = this.getShape(this.currentType, 0);
    this.currentX = Math.floor((COLS - shape[0].length) / 2);
    this.currentY = -1;
    this.lockTimer = 0;
    this.lockMoves = 0;
    this.groundTime = 0;
    this.dropTimer = 0;

    if (this.collides(shape, this.currentX, this.currentY)) {
      this.triggerGameOver();
      return;
    }
    this.hooks.onSpawn?.();
  }

  triggerGameOver() {
    this.gameOver = true;
    this.hooks.onGameOver?.({ score: this.score });
  }

  // ─── Ghost piece ───

  ghostY() {
    if (
      this.currentType === this._ghostCacheType &&
      this.currentRotation === this._ghostCacheRot &&
      this.currentX === this._ghostCacheX &&
      this.currentY === this._ghostCacheY
    )
      return this._cachedGhostY;
    const shape = this.getShape(this.currentType, this.currentRotation);
    let gy = this.currentY;
    while (!this.collides(shape, this.currentX, gy + 1)) gy++;
    this._cachedGhostY = gy;
    this._ghostCacheType = this.currentType;
    this._ghostCacheRot = this.currentRotation;
    this._ghostCacheX = this.currentX;
    this._ghostCacheY = this.currentY;
    return gy;
  }

  // ─── Movement ───

  moveLeft() {
    const shape = this.getShape(this.currentType, this.currentRotation);
    if (!this.collides(shape, this.currentX - 1, this.currentY)) {
      this.currentX--;
      this.resetLock();
      return true;
    }
    return false;
  }

  moveRight() {
    const shape = this.getShape(this.currentType, this.currentRotation);
    if (!this.collides(shape, this.currentX + 1, this.currentY)) {
      this.currentX++;
      this.resetLock();
      return true;
    }
    return false;
  }

  moveDown() {
    const shape = this.getShape(this.currentType, this.currentRotation);
    if (!this.collides(shape, this.currentX, this.currentY + 1)) {
      this.currentY++;
      return true;
    }
    return false;
  }

  hardDrop() {
    const shape = this.getShape(this.currentType, this.currentRotation);
    let dropped = 0;
    while (!this.collides(shape, this.currentX, this.currentY + 1)) {
      this.currentY++;
      dropped++;
    }
    this.score += dropped * HARD_DROP_SCORE;
    this.hardDropLockPending = true;
    this.lockPiece();
    this.hardDropLockPending = false;
  }

  rotate(dir) {
    const newRot = (this.currentRotation + dir + 4) % 4;
    const shape = this.getShape(this.currentType, newRot);

    let kicks;
    if (this.currentType === "I") {
      kicks =
        dir === 1 ? KICK_I[this.currentRotation] : KICK_I_CCW[this.currentRotation];
    } else if (this.currentType === "O") {
      kicks = [[0, 0]];
    } else {
      kicks =
        dir === 1
          ? KICK_JLSTZ[this.currentRotation]
          : KICK_JLSTZ_CCW[this.currentRotation];
    }

    for (const [kx, ky] of kicks) {
      if (!this.collides(shape, this.currentX + kx, this.currentY - ky)) {
        this.currentX += kx;
        this.currentY -= ky;
        this.currentRotation = newRot;
        this.resetLock();
        return true;
      }
    }
    return false;
  }

  holdPiece() {
    if (this.holdUsed) return;
    this.holdUsed = true;
    if (this.holdType === null) {
      this.holdType = this.currentType;
      this.spawn();
    } else {
      this.pieceSerial++;
      const tmp = this.holdType;
      this.holdType = this.currentType;
      this.currentType = tmp;
      this.currentRotation = 0;
      const shape = this.getShape(this.currentType, 0);
      this.currentX = Math.floor((COLS - shape[0].length) / 2);
      this.currentY = -1;
      this.lockTimer = 0;
      this.lockMoves = 0;
      this.groundTime = 0;
      this.dropTimer = 0;
    }
    this.hooks.onHold?.();
  }

  resetLock() {
    if (this.lockMoves < MAX_LOCK_MOVES) {
      this.lockTimer = 0;
      this.lockMoves++;
    }
  }

  // ─── Game loop simulation ───

  /**
   * Advances the simulation by `delta` milliseconds.
   * `softDropping` mirrors the original `keys["down"]` flag.
   *
   * This is the exact logic from the original gameLoop, extracted verbatim
   * (minus DOM/rendering concerns) to preserve the gameplay feel.
   */
  update(delta, softDropping) {
    if (this.paused || this.gameOver) return;

    this.dropTimer += delta;

    const shape = this.getShape(this.currentType, this.currentRotation);
    let onGround = this.collides(shape, this.currentX, this.currentY + 1);

    const lockDelay = getLockDelay(this.level, this.isMobile());
    if (onGround) {
      this.groundTime += delta;
      if (!softDropping) {
        this.lockTimer += delta;
      }
      if (this.lockTimer >= lockDelay || this.groundTime >= GROUND_LOCK_MAX) {
        this.lockPiece();
        this.dropTimer = 0;
      }
    } else {
      this.lockTimer = 0;
      this.groundTime = 0;
    }

    const speed = getSpeed(this.level);
    const dropInterval = softDropping ? Math.min(50, speed) : speed;

    // Cap accumulated time to prevent massive catch-up after frame hitches.
    this.dropTimer = Math.min(this.dropTimer, dropInterval * 3);

    // Gravity catch-up: move multiple rows if needed for consistent drop speed
    while (this.dropTimer >= dropInterval && !onGround) {
      this.dropTimer -= dropInterval;
      onGround = this.collides(shape, this.currentX, this.currentY + 1);
      if (onGround) break;

      if (this.moveDown()) {
        if (softDropping) this.score += SOFT_DROP_SCORE;
      } else {
        break;
      }
    }

    this.hooks.onScoreChange?.();
  }

  // ─── Lifecycle ───

  startGame(startLevel) {
    this.board = this.createBoard();
    this.boardDirty = true;
    this.score = 0;
    this.lines = (startLevel - 1) * 10;
    this.level = startLevel;
    this.gameOver = false;
    this.paused = false;
    this.started = true;
    this.holdType = null;
    this.holdUsed = false;
    this.bag = this.shuffledBag();
    this.nextType = this.nextPiece();
    this.dropTimer = 0;
    this.lockTimer = 0;
    this.lockMoves = 0;
    this.groundTime = 0;

    // Reset ghost cache (stale data from previous game)
    this._ghostCacheType = "";
    this._ghostCacheRot = -1;
    this._ghostCacheX = -1;
    this._ghostCacheY = -1;

    this.spawn();
  }

  quitToTitle() {
    this.paused = false;
    this.gameOver = false;
    this.started = false;
  }

  togglePause() {
    this.paused = !this.paused;
    return this.paused;
  }

  resume() {
    this.paused = false;
  }

  // ─── Queries for the renderer ───

  getGhostY() {
    return this.ghostY();
  }

  isOnGround() {
    const shape = this.getShape(this.currentType, this.currentRotation);
    return this.collides(shape, this.currentX, this.currentY + 1);
  }

  isFlickering() {
    return this.groundTime >= GROUND_FLICKER_START;
  }

  getSpeed() {
    return getSpeed(this.level);
  }

  getLockDelay() {
    return getLockDelay(this.level, this.isMobile());
  }
}

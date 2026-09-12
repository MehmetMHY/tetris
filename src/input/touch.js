import {
  CLASSIFY_DIST,
  AXIS_DOMINANCE,
  SOFT_DROP_DIST,
  FLICK_VEL_THRESH,
  FLICK_MIN_DIST,
  TAP_MAX_DIST,
  TAP_MAX_TIME,
  H_TO_V_VEL,
} from "../config/constants.js";
import { getShape } from "../config/pieces.js";

/**
 * Phase-based touch gesture controller.
 *
 * Phases:  IDLE → UNDECIDED → HORIZONTAL | VERTICAL | TAP
 *
 * Key principles:
 *   1. During UNDECIDED, accumulate movement but don't act until we
 *      have enough data to classify confidently.
 *   2. Once in VERTICAL phase, horizontal position is FROZEN — no
 *      horizontal moves are applied regardless of thumb drift.
 *   3. HORIZONTAL → VERTICAL transition is allowed (L-shape move):
 *      when the user was sliding horizontally and starts moving
 *      downward fast, we snapshot X and freeze it.
 *   4. Horizontal drag maps finger distance to board cells so the
 *      piece stays under control instead of outrunning the finger.
 *   5. Velocity is computed from a rolling window, not just
 *      start-to-end, for accurate intent detection.
 *
 * @param {object} opts
 * @param {object} opts.engine - GameEngine instance
 * @param {function} opts.getCellPx - () => number (cached cell pixel size)
 * @param {function} opts.getIsStarted - () => boolean
 * @param {function} opts.getIsPaused - () => boolean
 * @param {function} opts.getIsGameOver - () => boolean
 */
export class TouchInput {
  constructor(opts) {
    this.engine = opts.engine;
    this.getCellPx = opts.getCellPx;
    this.getIsStarted = opts.getIsStarted;
    this.getIsPaused = opts.getIsPaused;
    this.getIsGameOver = opts.getIsGameOver;

    // Touch state
    this.touchId = null;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchStartTime = 0;
    this.touchPhase = "IDLE";
    this.hOriginX = 0;
    this.hOriginPieceX = 0;
    this.hOriginPieceSerial = 0;
    this.vAnchorY = 0;
    this.isSoftDropping = false;

    // Rolling history for velocity (last ~120ms) — ring buffer
    this.SAMPLE_WINDOW = 120;
    this.MAX_SAMPLES = 32;
    this.touchSampleBuf = new Float64Array(this.MAX_SAMPLES * 3);
    this.sampleHead = 0;
    this.sampleCount = 0;

    // Reusable velocity result
    this.velResult = { vx: 0, vy: 0 };

    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);
    this._onTouchCancel = this._onTouchCancel.bind(this);

    document.addEventListener("touchstart", this._onTouchStart, {
      passive: false,
    });
    document.addEventListener("touchmove", this._onTouchMove, {
      passive: false,
    });
    document.addEventListener("touchend", this._onTouchEnd, {
      passive: false,
    });
    document.addEventListener("touchcancel", this._onTouchCancel, {
      passive: false,
    });
  }

  isUIElement(e) {
    return (
      e.target.closest("button") ||
      e.target.closest(".panel-box") ||
      e.target.closest(".box-buttons")
    );
  }

  getTrackedTouch(e) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === this.touchId) {
        return e.changedTouches[i];
      }
    }
    return null;
  }

  addSample(x, y) {
    const t = performance.now();
    const idx = (this.sampleHead % this.MAX_SAMPLES) * 3;
    this.touchSampleBuf[idx] = x;
    this.touchSampleBuf[idx + 1] = y;
    this.touchSampleBuf[idx + 2] = t;
    this.sampleHead++;
    if (this.sampleCount < this.MAX_SAMPLES) this.sampleCount++;
    const cutoff = t - this.SAMPLE_WINDOW;
    while (this.sampleCount > 1) {
      const oldest =
        ((this.sampleHead - this.sampleCount + this.MAX_SAMPLES) %
          this.MAX_SAMPLES) *
        3;
      if (this.touchSampleBuf[oldest + 2] < cutoff) {
        this.sampleCount--;
      } else {
        break;
      }
    }
  }

  getVelocity() {
    if (this.sampleCount < 2) {
      this.velResult.vx = 0;
      this.velResult.vy = 0;
      return this.velResult;
    }
    const firstIdx =
      ((this.sampleHead - this.sampleCount + this.MAX_SAMPLES) %
        this.MAX_SAMPLES) *
      3;
    const lastIdx =
      ((this.sampleHead - 1 + this.MAX_SAMPLES) % this.MAX_SAMPLES) * 3;
    const dt =
      this.touchSampleBuf[lastIdx + 2] - this.touchSampleBuf[firstIdx + 2];
    if (dt < 5) {
      this.velResult.vx = 0;
      this.velResult.vy = 0;
      return this.velResult;
    }
    this.velResult.vx =
      (this.touchSampleBuf[lastIdx] - this.touchSampleBuf[firstIdx]) / dt;
    this.velResult.vy =
      (this.touchSampleBuf[lastIdx + 1] - this.touchSampleBuf[firstIdx + 1]) /
      dt;
    return this.velResult;
  }

  resetHorizontalTracking(clientX) {
    this.hOriginX = clientX;
    this.hOriginPieceX = this.engine.currentX;
    this.hOriginPieceSerial = this.engine.pieceSerial;
  }

  applyHorizontalDrag(clientX) {
    if (this.hOriginPieceSerial !== this.engine.pieceSerial) {
      this.resetHorizontalTracking(clientX);
      return;
    }
    const cellPx = this.getCellPx();
    const targetX =
      this.hOriginPieceX + Math.round((clientX - this.hOriginX) / cellPx);
    while (this.engine.currentX !== targetX) {
      const moved =
        targetX > this.engine.currentX
          ? this.engine.moveRight()
          : this.engine.moveLeft();
      if (!moved) break;
    }
  }

  enterVerticalPhase(clientX, clientY) {
    this.touchPhase = "VERTICAL";
    this.vAnchorY = clientY;
    this.resetHorizontalTracking(clientX);
  }

  _onTouchStart(e) {
    if (
      this.isUIElement(e) ||
      !this.getIsStarted() ||
      this.getIsPaused() ||
      this.getIsGameOver()
    )
      return;
    if (this.touchId !== null) return;

    const t = e.changedTouches[0];
    this.touchId = t.identifier;
    this.touchStartX = t.clientX;
    this.touchStartY = t.clientY;
    this.touchStartTime = performance.now();
    this.touchPhase = "UNDECIDED";
    this.resetHorizontalTracking(t.clientX);
    this.vAnchorY = t.clientY;
    this.isSoftDropping = false;
    this.sampleHead = 0;
    this.sampleCount = 0;
    this.addSample(t.clientX, t.clientY);
  }

  _onTouchMove(e) {
    if (!this.getIsStarted() || this.getIsPaused() || this.getIsGameOver())
      return;
    if (this.isUIElement(e)) return;
    e.preventDefault();

    const t = this.getTrackedTouch(e);
    if (!t) return;

    const x = t.clientX;
    const y = t.clientY;
    this.addSample(x, y);

    const totalDX = x - this.touchStartX;
    const totalDY = y - this.touchStartY;
    const cellPx = this.getCellPx();

    // ── UNDECIDED: wait for enough movement to classify ──
    if (this.touchPhase === "UNDECIDED") {
      const distSq = totalDX * totalDX + totalDY * totalDY;
      if (distSq < CLASSIFY_DIST * CLASSIFY_DIST) return;

      const absDX = Math.abs(totalDX);
      const absDY = Math.abs(totalDY);

      if (absDX > absDY * AXIS_DOMINANCE) {
        this.touchPhase = "HORIZONTAL";
        this.resetHorizontalTracking(this.touchStartX);
      } else if (absDY > absDX * AXIS_DOMINANCE) {
        this.enterVerticalPhase(x, y);
      } else {
        const commitDist = cellPx * 0.55;
        if (distSq < commitDist * commitDist) return;

        if (absDX >= absDY) {
          this.touchPhase = "HORIZONTAL";
          this.resetHorizontalTracking(this.touchStartX);
        } else {
          this.enterVerticalPhase(x, y);
        }
      }
    }

    // ── HORIZONTAL phase: finger-to-cell sliding ──
    if (this.touchPhase === "HORIZONTAL") {
      this.applyHorizontalDrag(x);

      const vel = this.getVelocity();
      if (vel.vy > H_TO_V_VEL && Math.abs(vel.vy) > Math.abs(vel.vx) * 1.5) {
        this.enterVerticalPhase(x, y);
      }
    }

    // ── VERTICAL phase: soft drop + horizontal sliding on ground ──
    if (this.touchPhase === "VERTICAL") {
      const shape = getShape(
        this.engine.currentType,
        this.engine.currentRotation,
      );
      const onGround = this.engine.collides(
        shape,
        this.engine.currentX,
        this.engine.currentY + 1,
      );

      if (onGround) {
        this.applyHorizontalDrag(x);
      } else {
        this.resetHorizontalTracking(x);
      }

      const downDist = y - this.vAnchorY;
      if (downDist > cellPx * SOFT_DROP_DIST) {
        if (!this.isSoftDropping) {
          this.isSoftDropping = true;
          this.keyboardSoftDrop(true);
        }
      } else if (this.isSoftDropping && downDist < cellPx * 0.3) {
        this.isSoftDropping = false;
        this.keyboardSoftDrop(false);
      }
    }
  }

  _onTouchEnd(e) {
    const t = this.getTrackedTouch(e);
    if (!t) return;
    const endPhase = this.touchPhase;
    this.touchId = null;
    this.touchPhase = "IDLE";

    this.keyboardSoftDrop(false);
    this.isSoftDropping = false;

    if (
      this.isUIElement(e) ||
      !this.getIsStarted() ||
      this.getIsPaused() ||
      this.getIsGameOver()
    )
      return;

    const x = t.clientX;
    const y = t.clientY;
    this.addSample(x, y);
    const totalDX = x - this.touchStartX;
    const totalDY = y - this.touchStartY;
    const duration = performance.now() - this.touchStartTime;

    // ── TAP detection ──
    if (
      duration < TAP_MAX_TIME &&
      Math.abs(totalDX) < TAP_MAX_DIST &&
      Math.abs(totalDY) < TAP_MAX_DIST
    ) {
      this.engine.rotate(1);
      return;
    }

    if (endPhase === "UNDECIDED" && duration < TAP_MAX_TIME) {
      this.engine.rotate(1);
      return;
    }

    // ── Flick detection (hard drop or hold) ──
    const vel = this.getVelocity();
    const absVelY = Math.abs(vel.vy);

    // Upward flick = hold piece
    if (
      vel.vy < -FLICK_VEL_THRESH &&
      totalDY < -FLICK_MIN_DIST &&
      absVelY > Math.abs(vel.vx) * 0.8
    ) {
      this.engine.holdPiece();
      return;
    }

    // Downward flick = hard drop
    if (
      endPhase !== "HORIZONTAL" &&
      vel.vy > FLICK_VEL_THRESH &&
      totalDY > FLICK_MIN_DIST &&
      absVelY > Math.abs(vel.vx) * 1.5
    ) {
      this.engine.hardDrop();
      return;
    }
  }

  _onTouchCancel(e) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === this.touchId) {
        this.touchId = null;
        this.touchPhase = "IDLE";
        this.keyboardSoftDrop(false);
        this.isSoftDropping = false;
        break;
      }
    }
  }

  // Bridge to keyboard's soft-drop state
  keyboardSoftDrop(active) {
    // This will be wired by main.js to set the keyboard's keys["down"]
    if (this._softDropCallback) {
      this._softDropCallback(active);
    }
  }

  setSoftDropCallback(fn) {
    this._softDropCallback = fn;
  }

  destroy() {
    document.removeEventListener("touchstart", this._onTouchStart);
    document.removeEventListener("touchmove", this._onTouchMove);
    document.removeEventListener("touchend", this._onTouchEnd);
    document.removeEventListener("touchcancel", this._onTouchCancel);
  }
}

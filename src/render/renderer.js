import {
  COLS,
  ROWS,
  BLOCK,
  EMPTY,
  PREVIEW_BLOCK,
  GROUND_FLICKER_START,
} from "../config/constants.js";
import { getShape } from "../config/pieces.js";
import { buildSprites, buildBgCanvas } from "./sprites.js";
import { ParticleSystem } from "./particles.js";

/**
 * Renderer owns all canvas drawing: the game board, next/hold previews,
 * the board cache, particles, and screen-shake effects.
 *
 * It reads state from the engine and a visual-effects getter function.
 */
export class Renderer {
  constructor({ engine, boardCanvas, nextCanvas, holdCanvas }) {
    this.engine = engine;
    this.boardCanvas = boardCanvas;
    this.nextCanvas = nextCanvas;
    this.holdCanvas = holdCanvas;

    this.ctx = boardCanvas.getContext("2d");
    this.nctx = nextCanvas.getContext("2d");
    this.hctx = holdCanvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
    this.nctx.imageSmoothingEnabled = false;
    this.hctx.imageSmoothingEnabled = false;

    const { blockSprites, ghostSprites, previewSprites } = buildSprites();
    this.blockSprites = blockSprites;
    this.ghostSprites = ghostSprites;
    this.previewSprites = previewSprites;

    this.bgCanvas = buildBgCanvas();

    // Board cache (locked pieces drawn once, blitted each frame)
    this.boardCacheCanvas = document.createElement("canvas");
    this.boardCacheCanvas.width = COLS * BLOCK;
    this.boardCacheCanvas.height = ROWS * BLOCK;
    this.boardCacheCtx = this.boardCacheCanvas.getContext("2d");
    this.boardCacheCtx.imageSmoothingEnabled = false;

    this.particles = new ParticleSystem();

    // Preview caches to skip redundant redraws
    this.prevNextType = null;
    this.prevHoldType = undefined;

    // Previous piece state for dirty-redraw detection
    this.prevPieceX = -1;
    this.prevPieceY = -1;
    this.prevPieceRot = -1;
    this.prevPieceType = "";

    // Cached cell pixel size for touch input
    this.cachedCellPx = BLOCK;
  }

  updateCellPx() {
    const rect = this.boardCanvas.getBoundingClientRect();
    if (rect.width > 0) this.cachedCellPx = rect.width / COLS;
  }

  // ─── Board cache ───

  rebuildBoardCache() {
    this.boardCacheCtx.drawImage(this.bgCanvas, 0, 0);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.engine.board[r][c] !== EMPTY) {
          this.boardCacheCtx.drawImage(
            this.blockSprites[this.engine.board[r][c]],
            (c * BLOCK) | 0,
            (r * BLOCK) | 0,
          );
        }
      }
    }
    this.engine.boardDirty = false;
  }

  // ─── Block drawing ───

  drawBlock(context, x, y, colorId, ghost) {
    context.drawImage(
      ghost ? this.ghostSprites[colorId] : this.blockSprites[colorId],
      (x * BLOCK) | 0,
      (y * BLOCK) | 0,
    );
  }

  // ─── Board drawing ───

  drawBoard() {
    // Locked pieces (cached – only rebuilt when board changes)
    if (this.engine.boardDirty) this.rebuildBoardCache();
    this.ctx.drawImage(this.boardCacheCanvas, 0, 0);

    if (this.engine.gameOver || !this.engine.currentType) {
      this.particles.draw(this.ctx);
      return;
    }

    // Flicker warning: when a piece has been on the ground near the
    // force-lock cap, gently pulse it so the player knows it's about
    // to lock. On-phase is longer than off-phase so the piece stays
    // visible most of the time.
    let showPiece = true;
    if (this.engine.groundTime >= GROUND_FLICKER_START) {
      const onMs = 400;
      const offMs = 200;
      const phase =
        (this.engine.groundTime - GROUND_FLICKER_START) % (onMs + offMs);
      showPiece = phase < onMs;
    }

    // Ghost + current piece (single pass)
    const gy = this.engine.ghostY();
    const shape = getShape(
      this.engine.currentType,
      this.engine.currentRotation,
    );
    const drawGhost = gy !== this.engine.currentY;
    for (let r = 0; r < shape.length; r++) {
      const row = shape[r];
      for (let c = 0; c < row.length; c++) {
        if (row[c] !== 0) {
          if (drawGhost) {
            const gpy = gy + r;
            if (gpy >= 0)
              this.drawBlock(
                this.ctx,
                this.engine.currentX + c,
                gpy,
                row[c],
                true,
              );
          }
          if (showPiece) {
            const py = this.engine.currentY + r;
            if (py >= 0)
              this.drawBlock(
                this.ctx,
                this.engine.currentX + c,
                py,
                row[c],
              );
          }
        }
      }
    }

    this.particles.draw(this.ctx);
  }

  // ─── Preview drawing ───

  drawPreview(context, canvas, type) {
    context.fillStyle = "#1a1a2e";
    context.fillRect(0, 0, canvas.width, canvas.height);
    if (!type) return;

    const shape = getShape(type, 0);
    const rows = shape.length;
    const cols = shape[0].length;
    const ox = ((canvas.width - cols * PREVIEW_BLOCK) / 2) | 0;
    const oy = ((canvas.height - rows * PREVIEW_BLOCK) / 2) | 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (shape[r][c] !== 0) {
          context.drawImage(
            this.previewSprites[shape[r][c]],
            ox + c * PREVIEW_BLOCK,
            oy + r * PREVIEW_BLOCK,
          );
        }
      }
    }
  }

  drawNext() {
    if (this.engine.nextType === this.prevNextType) return;
    this.prevNextType = this.engine.nextType;
    this.drawPreview(this.nctx, this.nextCanvas, this.engine.nextType);
  }

  drawHold() {
    if (this.engine.holdType === this.prevHoldType) return;
    this.prevHoldType = this.engine.holdType;
    this.drawPreview(this.hctx, this.holdCanvas, this.engine.holdType);
  }

  // ─── Effects ───

  triggerSlamShake() {
    const el = document.querySelector(".game-container");
    if (!el) return;
    el.classList.remove("slam-shake");
    void el.offsetWidth;
    el.classList.add("slam-shake");
  }

  // ─── Dirty-redraw check ───

  shouldRedraw() {
    const pieceChanged =
      this.engine.currentX !== this.prevPieceX ||
      this.engine.currentY !== this.prevPieceY ||
      this.engine.currentRotation !== this.prevPieceRot ||
      this.engine.currentType !== this.prevPieceType;
    const flickering = this.engine.groundTime >= GROUND_FLICKER_START;
    const effectsActive = this.particles.active;
    if (this.engine.boardDirty || pieceChanged || flickering || effectsActive) {
      this.prevPieceX = this.engine.currentX;
      this.prevPieceY = this.engine.currentY;
      this.prevPieceRot = this.engine.currentRotation;
      this.prevPieceType = this.engine.currentType;
      return true;
    }
    return false;
  }

  // ─── Reset for new game / quit ───

  resetPreviews() {
    this.prevNextType = null;
    this.prevHoldType = undefined;
  }

  clearPreviews() {
    this.drawPreview(this.nctx, this.nextCanvas, null);
    this.drawPreview(this.hctx, this.holdCanvas, null);
  }

  clearBoard() {
    this.ctx.drawImage(this.bgCanvas, 0, 0);
  }

  resetPieceTracking() {
    this.prevPieceX = -1;
    this.prevPieceY = -1;
    this.prevPieceRot = -1;
    this.prevPieceType = "";
  }
}

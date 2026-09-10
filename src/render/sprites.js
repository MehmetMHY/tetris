import { BLOCK, COLORS, GHOST_ALPHA, PREVIEW_BLOCK, COLS, ROWS } from "../config/constants.js";

/**
 * Pre-rendered block sprites for performance (1 drawImage vs 6 draw calls per block).
 * Three sizes: board (BLOCK), preview (PREVIEW_BLOCK), and ghost (alpha'd board).
 */
export function buildSprites() {
  const blockSprites = {};
  const ghostSprites = {};
  const previewSprites = {};

  function boardSprite(colorId, alpha) {
    const c = document.createElement("canvas");
    c.width = BLOCK;
    c.height = BLOCK;
    const x = c.getContext("2d");
    x.globalAlpha = alpha;
    x.fillStyle = COLORS[colorId];
    x.fillRect(0, 0, BLOCK, BLOCK);
    x.fillStyle = "rgba(255,255,255,0.2)";
    x.fillRect(0, 0, BLOCK, 2);
    x.fillRect(0, 0, 2, BLOCK);
    x.fillStyle = "rgba(0,0,0,0.25)";
    x.fillRect(BLOCK - 2, 0, 2, BLOCK);
    x.fillRect(0, BLOCK - 2, BLOCK, 2);
    x.strokeStyle = "rgba(0,0,0,0.4)";
    x.lineWidth = 1;
    x.strokeRect(0.5, 0.5, BLOCK - 1, BLOCK - 1);
    return c;
  }

  function prevSprite(colorId) {
    const s = PREVIEW_BLOCK;
    const c = document.createElement("canvas");
    c.width = s;
    c.height = s;
    const x = c.getContext("2d");
    x.fillStyle = COLORS[colorId];
    x.fillRect(0, 0, s, s);
    x.strokeStyle = "rgba(0,0,0,0.4)";
    x.lineWidth = 1;
    x.strokeRect(0.5, 0.5, s - 1, s - 1);
    x.fillStyle = "rgba(255,255,255,0.15)";
    x.fillRect(0, 0, s, 2);
    x.fillRect(0, 0, 2, s);
    return c;
  }

  for (let id = 1; id <= 7; id++) {
    blockSprites[id] = boardSprite(id, 1);
    ghostSprites[id] = boardSprite(id, GHOST_ALPHA);
    previewSprites[id] = prevSprite(id);
  }

  return { blockSprites, ghostSprites, previewSprites };
}

/**
 * Pre-rendered background + grid (drawn once, blitted each frame).
 */
export function buildBgCanvas() {
  const bgCanvas = document.createElement("canvas");
  bgCanvas.width = COLS * BLOCK;
  bgCanvas.height = ROWS * BLOCK;
  const g = bgCanvas.getContext("2d");
  g.fillStyle = "#111122";
  g.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
  const isMobile = window.innerWidth <= 768;
  g.strokeStyle = isMobile
    ? "rgba(255,255,255,0.13)"
    : "rgba(255,255,255,0.03)";
  g.lineWidth = 1;
  for (let r = 0; r <= ROWS; r++) {
    g.beginPath();
    g.moveTo(0, r * BLOCK);
    g.lineTo(COLS * BLOCK, r * BLOCK);
    g.stroke();
  }
  for (let c = 0; c <= COLS; c++) {
    g.beginPath();
    g.moveTo(c * BLOCK, 0);
    g.lineTo(c * BLOCK, ROWS * BLOCK);
    g.stroke();
  }
  return bgCanvas;
}

import { GameEngine } from "./game/engine.js";
import { Renderer } from "./render/renderer.js";
import { KeyboardInput } from "./input/keyboard.js";
import { TouchInput } from "./input/touch.js";
import { AudioManager } from "./platform/audio.js";
import { Storage } from "./platform/storage.js";
import { setupIOS } from "./platform/ios.js";
import {
  setupVisibilityHandling,
  setupBlurHandling,
} from "./platform/lifecycle.js";
import { getDOMElements } from "./ui/dom.js";
import { HUD } from "./ui/hud.js";
import { OverlayManager } from "./ui/overlays.js";
import { LevelPicker } from "./ui/levelPicker.js";

// ─── Service Worker ───
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

// ─── iOS Safe Area + Zoom Fix ───
setupIOS();

// ─── DOM ───
const dom = getDOMElements();

// ─── Storage ───
const storage = new Storage();
const settings = storage.loadSettings();
let highScore = settings.highScore;

// ─── Audio ───
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const audioManager = new AudioManager({
  audioEl: dom.audioEl,
  isMobile,
  storage,
  muteMusic: settings.muteMusic,
  muteSfx: settings.muteSfx,
  visualEffects: settings.visualEffects,
});
audioManager.applyMute();

// ─── Engine ───
const engine = new GameEngine({
  rng: Math.random,
  isMobile: () => window.innerWidth <= 768,
});

let rafId = null;

// ─── Renderer ───
const renderer = new Renderer({
  engine,
  boardCanvas: dom.boardCanvas,
  nextCanvas: dom.nextCanvas,
  holdCanvas: dom.holdCanvas,
});

// ─── HUD ───
const hud = new HUD({
  engine,
  dom,
  getHighScore: () => highScore,
  setHighScore: (v) => {
    highScore = v;
  },
});

// Initialize high score display
dom.highScoreEl.textContent = highScore;
dom.menuHighScoreEl.textContent = highScore;

// ─── Overlays ───
const overlays = new OverlayManager({
  engine,
  dom,
  hud,
  audioManager,
  storage,
  renderer,
  getHighScore: () => highScore,
});

// ─── Level Picker ───
let startLevel = 1;
const levelPicker = new LevelPicker({
  dom,
  getStartLevel: () => startLevel,
  setStartLevel: (v) => {
    startLevel = v;
  },
});

// ─── Game Loop ───
function gameLoop(time) {
  rafId = requestAnimationFrame(gameLoop);

  if (engine.paused || engine.gameOver) {
    engine.lastTime = time;
    return;
  }

  const rawDelta = time - engine.lastTime;
  engine.lastTime = time;
  // Clamp delta to ~4 frames (~67ms at 60fps) to prevent post-hitch
  // catch-up that causes pieces to teleport multiple rows at once
  const delta = Math.min(rawDelta, 67);

  // Update effects
  renderer.particles.update();

  engine.update(delta, keyboard.softDropping);

  hud.updateUI();

  // Only redraw when board or piece state changed
  if (renderer.shouldRedraw()) {
    renderer.drawBoard();
  }
}

// ─── Engine Hooks ───
engine.hooks.onLineClear = ({ count, rows, isHardDropTetris }) => {
  for (const { row, colors } of rows) {
    renderer.particles.spawn(row, colors, audioManager.visualEffects);
  }
  if (isHardDropTetris && audioManager.visualEffects) {
    renderer.triggerSlamShake();
  }
  audioManager.playLineClearSound();
  hud.updateUI();
};

engine.hooks.onScoreChange = () => {
  hud.updateUI();
};

engine.hooks.onSpawn = () => {
  renderer.drawNext();
  renderer.drawHold();
};

engine.hooks.onHold = () => {
  renderer.drawHold();
};

engine.hooks.onGameOver = ({ score }) => {
  cancelAnimationFrame(rafId);
  rafId = null;
  const isNewBest = score > 0 && score >= highScore;
  if (score > highScore) {
    highScore = score;
    dom.highScoreEl.textContent = highScore;
  }
  storage.saveHighScore(highScore);
  dom.finalScoreEl.textContent = `${score}`;
  dom.newBestEl.style.display = isNewBest ? "block" : "none";
  dom.gameoverOverlay.classList.remove("hidden");
  audioManager.applyMute();
};

// ─── Start / Restart / Quit ───
function startGame() {
  engine.startGame(startLevel);
  renderer.particles.clear();
  renderer.resetPreviews();
  renderer.resetPieceTracking();

  dom.startOverlay.classList.add("hidden");
  dom.gameoverOverlay.classList.add("hidden");
  dom.settingsOverlay.classList.add("hidden");

  audioManager.applyMute();
  audioManager.startAudio();
  renderer.updateCellPx();
  hud.updateUI();

  engine.lastTime = performance.now();
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(gameLoop);
}

overlays.setCallbacks({
  onStart: startGame,
  onRestart: startGame,
  onQuit: () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  },
});

// ─── Keyboard Input ───
const keyboard = new KeyboardInput({
  engine,
  onStartGame: startGame,
  onChangeStartLevel: (delta) => levelPicker.changeStartLevel(delta),
  onTogglePause: () => overlays.togglePause(),
  onQuitToTitle: () =>
    overlays.quitToTitle(() => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }),
  onRestart: () => {
    dom.gameoverOverlay.classList.add("hidden");
    startGame();
  },
  onPauseMenuUp: () => overlays.pauseMenuUp(),
  onPauseMenuDown: () => overlays.pauseMenuDown(),
  onPauseMenuSelect: () => overlays.pauseMenuSelect(),
  getIsStarted: () => engine.started,
  getIsGameOver: () => engine.gameOver,
  getIsPaused: () => engine.paused,
  getLevel: () => engine.level,
});

// ─── Touch Input ───
const touch = new TouchInput({
  engine,
  getCellPx: () => renderer.cachedCellPx,
  getIsStarted: () => engine.started,
  getIsPaused: () => engine.paused,
  getIsGameOver: () => engine.gameOver,
});

// Bridge touch soft-drop to keyboard's keys["down"]
touch.setSoftDropCallback((active) => {
  keyboard.keys["down"] = active;
});

// ─── Cell pixel size updates ───
window.addEventListener("resize", () => renderer.updateCellPx());
window.addEventListener("orientationchange", () =>
  setTimeout(() => renderer.updateCellPx(), 100),
);
setTimeout(() => renderer.updateCellPx(), 0);

// ─── Visibility handling ───
setupVisibilityHandling({
  audioManager,
  isPlaying: () => engine.started,
  isPaused: () => engine.paused,
  isGameOver: () => engine.gameOver,
  togglePause: () => overlays.togglePause(),
});

// ─── Blur handling (prevent stuck keys) ───
setupBlurHandling(keyboard);

// ─── Initial draw ───
renderer.clearBoard();
renderer.clearPreviews();

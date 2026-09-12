import { getDASDelay, getDASRepeat } from "../config/timing.js";

/**
 * Keyboard input handler with DAS (Delayed Auto Shift).
 *
 * DAS timing scales with level: delay from 170ms → 100ms,
 * repeat from 50ms → 30ms.
 *
 * @param {object} opts
 * @param {object} opts.engine - GameEngine instance
 * @param {function} opts.onStartGame - called when user starts game
 * @param {function} opts.onChangeStartLevel - (delta) => void
 * @param {function} opts.onTogglePause - called for Esc/M
 * @param {function} opts.onQuitToTitle - called for Esc on game over
 * @param {function} opts.onRestart - called when restarting from game over
 * @param {function} opts.onPauseMenuUp - move pause menu selection up
 * @param {function} opts.onPauseMenuDown - move pause menu selection down
 * @param {function} opts.onPauseMenuSelect - click the selected pause menu button
 * @param {function} opts.getIsStarted - () => boolean
 * @param {function} opts.getIsGameOver - () => boolean
 * @param {function} opts.getIsPaused - () => boolean
 * @param {function} opts.getLevel - () => number (for DAS timing)
 */
export class KeyboardInput {
  constructor(opts) {
    this.engine = opts.engine;
    this.onStartGame = opts.onStartGame;
    this.onChangeStartLevel = opts.onChangeStartLevel;
    this.onTogglePause = opts.onTogglePause;
    this.onQuitToTitle = opts.onQuitToTitle;
    this.onRestart = opts.onRestart;
    this.onPauseMenuUp = opts.onPauseMenuUp;
    this.onPauseMenuDown = opts.onPauseMenuDown;
    this.onPauseMenuSelect = opts.onPauseMenuSelect;
    this.getIsStarted = opts.getIsStarted;
    this.getIsGameOver = opts.getIsGameOver;
    this.getIsPaused = opts.getIsPaused;
    this.getLevel = opts.getLevel;

    this.keys = {};
    this.dasTimer = {};
    this.dasActive = {};

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    document.addEventListener("keydown", this._onKeyDown);
    document.addEventListener("keyup", this._onKeyUp);
  }

  get softDropping() {
    return !!this.keys["down"];
  }

  getDASDelay() {
    return getDASDelay(this.getLevel());
  }

  getDASRepeat() {
    return getDASRepeat(this.getLevel());
  }

  startDAS(key, action) {
    if (this.dasActive[key]) return;
    action();
    this.dasActive[key] = true;
    this.dasTimer[key] = setTimeout(() => {
      this.dasTimer[key] = setInterval(() => {
        if (!this.getIsPaused() && !this.getIsGameOver() && this.getIsStarted())
          action();
      }, this.getDASRepeat());
    }, this.getDASDelay());
  }

  stopDAS(key) {
    clearTimeout(this.dasTimer[key]);
    clearInterval(this.dasTimer[key]);
    this.dasActive[key] = false;
  }

  /** Clear all input state (call on blur, visibility change, pause) */
  reset() {
    this.keys = {};
    for (const key of Object.keys(this.dasTimer)) {
      this.stopDAS(key);
    }
    this.dasActive = {};
  }

  _onKeyDown(e) {
    if (!this.getIsStarted()) {
      if (e.code === "ArrowLeft" || e.code === "KeyA") {
        e.preventDefault();
        this.onChangeStartLevel(-1);
      } else if (e.code === "ArrowRight" || e.code === "KeyD") {
        e.preventDefault();
        this.onChangeStartLevel(1);
      } else if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        this.onStartGame();
      } else if (e.code === "KeyG") {
        e.preventDefault();
        window.open("https://github.com/MehmetMHY/tetris", "_blank");
      }
      return;
    }

    if (this.getIsGameOver()) {
      if (e.code === "Escape") {
        this.onQuitToTitle();
      } else {
        this.onRestart();
      }
      return;
    }

    if (e.code === "Escape" || e.code === "KeyM") {
      this.onTogglePause();
      return;
    }

    if (this.getIsPaused()) {
      if (e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        this.onPauseMenuUp();
      } else if (e.code === "ArrowDown" || e.code === "KeyS") {
        e.preventDefault();
        this.onPauseMenuDown();
      } else if (e.code === "Enter" || e.code === "Space") {
        e.preventDefault();
        this.onPauseMenuSelect();
      }
      return;
    }

    switch (e.code) {
      case "ArrowLeft":
      case "KeyA":
        e.preventDefault();
        this.startDAS("left", () => this.engine.moveLeft());
        break;
      case "ArrowRight":
      case "KeyD":
        e.preventDefault();
        this.startDAS("right", () => this.engine.moveRight());
        break;
      case "ArrowDown":
      case "KeyS":
        e.preventDefault();
        if (!this.keys["down"]) {
          this.keys["down"] = true;
        }
        break;
      case "ArrowUp":
      case "KeyW":
      case "KeyX":
        e.preventDefault();
        this.engine.rotate(1);
        break;
      case "KeyZ":
        e.preventDefault();
        this.engine.rotate(-1);
        break;
      case "Space":
        e.preventDefault();
        this.engine.hardDrop();
        break;
      case "KeyC":
      case "ShiftLeft":
        e.preventDefault();
        this.engine.holdPiece();
        break;
    }
  }

  _onKeyUp(e) {
    switch (e.code) {
      case "ArrowLeft":
      case "KeyA":
        this.stopDAS("left");
        break;
      case "ArrowRight":
      case "KeyD":
        this.stopDAS("right");
        break;
      case "ArrowDown":
      case "KeyS":
        this.keys["down"] = false;
        break;
    }
  }

  destroy() {
    document.removeEventListener("keydown", this._onKeyDown);
    document.removeEventListener("keyup", this._onKeyUp);
  }
}

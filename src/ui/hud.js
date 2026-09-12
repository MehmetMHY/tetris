import { getSpeed } from "../config/timing.js";

/**
 * HUD (heads-up display) manager.
 * Updates score, level, speed, lines, and high score in the DOM.
 * Uses caching to skip redundant DOM writes.
 */
export class HUD {
  constructor({ engine, dom, getHighScore, setHighScore }) {
    this.engine = engine;
    this.dom = dom;
    this._getHighScore = getHighScore;
    this._setHighScore = setHighScore;

    // Display caches
    this.isShowingBest = false;
    this.scoreTimeout = null;
    this.prevScoreVal = 0;
    this.prevLevelVal = 1;
    this.prevSpeedVal = 0;
    this.prevLinesVal = 0;
    this.prevShowingBest = false;

    this._setupScoreToggle();
  }

  updateUI() {
    const displayScore = this.isShowingBest
      ? this._getHighScore()
      : this.engine.score;
    if (
      displayScore !== this.prevScoreVal ||
      this.isShowingBest !== this.prevShowingBest
    ) {
      this.dom.scoreEl.textContent = displayScore;
      this.prevScoreVal = displayScore;
      this.prevShowingBest = this.isShowingBest;
    }
    if (this.engine.level !== this.prevLevelVal) {
      this.dom.levelEl.textContent = this.engine.level;
      this.prevLevelVal = this.engine.level;
    }
    const spd = getSpeed(this.engine.level);
    if (spd !== this.prevSpeedVal) {
      this.dom.speedEl.textContent = spd;
      this.prevSpeedVal = spd;
    }
    if (this.engine.lines !== this.prevLinesVal) {
      this.dom.linesEl.textContent = this.engine.lines;
      this.prevLinesVal = this.engine.lines;
    }
    if (this.engine.score > this._getHighScore()) {
      this._setHighScore(this.engine.score);
      this.dom.highScoreEl.textContent = this._getHighScore();
      this.dom.menuHighScoreEl.textContent = this._getHighScore();
    }
  }

  _setupScoreToggle() {
    const scoreBox = this.dom.scoreBox;
    if (!scoreBox) return;
    const scoreTitle = scoreBox.querySelector("h3");

    scoreBox.addEventListener("click", () => {
      if (this.isShowingBest) {
        this.isShowingBest = false;
        scoreTitle.textContent = "Score";
        clearTimeout(this.scoreTimeout);
        this.updateUI();
      } else {
        this.isShowingBest = true;
        scoreTitle.textContent = "Best";
        this.updateUI();
        this.scoreTimeout = setTimeout(() => {
          this.isShowingBest = false;
          scoreTitle.textContent = "Score";
          this.updateUI();
        }, 3000);
      }
    });
  }

  reset() {
    this.prevScoreVal = 0;
    this.prevLevelVal = 1;
    this.prevSpeedVal = 0;
    this.prevLinesVal = 0;
  }
}

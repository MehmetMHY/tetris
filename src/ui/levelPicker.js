import { MAX_START_LEVEL } from "../config/timing.js";

/**
 * Level picker for the start screen.
 * Allows the player to choose a starting level before starting the game.
 */
export class LevelPicker {
  constructor({ dom, getStartLevel, setStartLevel }) {
    this.dom = dom;
    this.getStartLevel = getStartLevel;
    this.setStartLevel = setStartLevel;

    this.dom.levelUpBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.changeStartLevel(1);
    });

    this.dom.levelDownBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.changeStartLevel(-1);
    });
  }

  changeStartLevel(delta) {
    const newLevel =
      ((this.getStartLevel() - 1 + delta + MAX_START_LEVEL) % MAX_START_LEVEL) + 1;
    this.setStartLevel(newLevel);
    this.dom.startLevelEl.textContent = newLevel;
  }
}

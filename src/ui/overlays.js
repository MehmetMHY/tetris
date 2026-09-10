import { getSpeed } from "../config/timing.js";

/**
 * Overlay manager: start screen, pause/settings menu, and game-over screen.
 *
 * The settings overlay doubles as the pause menu (same DOM element).
 */
export class OverlayManager {
  constructor({
    engine,
    dom,
    hud,
    audioManager,
    storage,
    renderer,
    getHighScore,
  }) {
    this.engine = engine;
    this.dom = dom;
    this.hud = hud;
    this.audioManager = audioManager;
    this.storage = storage;
    this.renderer = renderer;
    this._getHighScore = getHighScore || (() => 0);

    // Pause menu state
    this.pauseMenuIdx = 0;
    this.pauseMenuBtns = [
      this.dom.btnResume,
      this.dom.btnMuteMusic,
      this.dom.btnMuteSfx,
      this.dom.btnVisualEffects,
      this.dom.btnRestart,
      this.dom.btnQuit,
    ];

    this._setupListeners();
  }

  get pauseMenu() {
    return {
      buttons: this.pauseMenuBtns,
      index: this.pauseMenuIdx,
      highlight: () => this.highlightPauseBtn(),
    };
  }

  highlightPauseBtn() {
    for (let i = 0; i < this.pauseMenuBtns.length; i++)
      this.pauseMenuBtns[i].classList.toggle(
        "selected",
        i === this.pauseMenuIdx,
      );
  }

  pauseMenuUp() {
    this.pauseMenuIdx =
      (this.pauseMenuIdx - 1 + this.pauseMenuBtns.length) %
      this.pauseMenuBtns.length;
    this.highlightPauseBtn();
  }

  pauseMenuDown() {
    this.pauseMenuIdx = (this.pauseMenuIdx + 1) % this.pauseMenuBtns.length;
    this.highlightPauseBtn();
  }

  pauseMenuSelect() {
    this.pauseMenuBtns[this.pauseMenuIdx].click();
  }

  updateAudioMenuLabels() {
    this.dom.btnMuteMusic.textContent = this.audioManager.muteMusic
      ? "Unmute Music"
      : "Mute Music";
    this.dom.btnMuteMusic.classList.toggle(
      "active",
      this.audioManager.muteMusic,
    );
    this.dom.btnMuteSfx.textContent = this.audioManager.muteSfx
      ? "Unmute SFX"
      : "Mute SFX";
    this.dom.btnMuteSfx.classList.toggle("active", this.audioManager.muteSfx);
    this.dom.btnVisualEffects.textContent = this.audioManager.visualEffects
      ? "Disable Visuals"
      : "Enable Visuals";
    this.dom.btnVisualEffects.classList.toggle(
      "active",
      !this.audioManager.visualEffects,
    );
  }

  togglePause() {
    const paused = this.engine.togglePause();
    if (paused) {
      this.pauseMenuIdx = 0;
      this.dom.btnResume.textContent = "Resume";
      this.updateAudioMenuLabels();
      this.highlightPauseBtn();
      this.dom.settingsOverlay.classList.remove("hidden");
      this.audioManager.pauseMusic();
    } else {
      this.dom.settingsOverlay.classList.add("hidden");
      this.engine.lastTime = performance.now();
      this.audioManager.resumeMusic();
    }
  }

  resumeGame() {
    this.dom.settingsOverlay.classList.add("hidden");
    if (!this.engine.started) return;
    if (!this.engine.paused) return;
    this.engine.resume();
    this.engine.lastTime = performance.now();
    this.audioManager.resumeMusic();
  }

  quitToTitle(onQuit) {
    this.engine.quitToTitle();
    this.renderer.particles.clear();
    this.dom.settingsOverlay.classList.add("hidden");
    this.dom.gameoverOverlay.classList.add("hidden");
    this.dom.startOverlay.classList.remove("hidden");
    this.renderer.clearBoard();
    this.renderer.clearPreviews();
    this.renderer.resetPreviews();
    this.renderer.resetPieceTracking();
    this.hud.reset();
    this.dom.scoreEl.textContent = "0";
    this.dom.levelEl.textContent = "1";
    this.dom.speedEl.textContent = getSpeed(1);
    this.dom.linesEl.textContent = "0";
    this.dom.menuHighScoreEl.textContent = this._getHighScore();
    this.audioManager.applyMute();

    if (onQuit) onQuit();
  }

  openStartSettings() {
    this.dom.btnResume.textContent = "Back";
    this.updateAudioMenuLabels();
    this.highlightPauseBtn();
    this.dom.settingsOverlay.classList.remove("hidden");
  }

  _setupListeners() {
    // Settings button (in-game)
    this.dom.settingsBtn.addEventListener("click", () => {
      this.dom.settingsBtn.blur();
      if (this.engine.started && !this.engine.gameOver) this.togglePause();
    });

    // Mute music
    this.dom.btnMuteMusic.addEventListener("click", () => {
      this.dom.btnMuteMusic.blur();
      this.audioManager.setMute(
        !this.audioManager.muteMusic,
        this.audioManager.muteSfx,
      );
      this.storage.saveMute(
        this.audioManager.muteMusic,
        this.audioManager.muteSfx,
      );
      this.audioManager.startAudio();
      this.updateAudioMenuLabels();
    });

    // Mute SFX
    this.dom.btnMuteSfx.addEventListener("click", () => {
      this.dom.btnMuteSfx.blur();
      this.audioManager.setMute(
        this.audioManager.muteMusic,
        !this.audioManager.muteSfx,
      );
      this.storage.saveMute(
        this.audioManager.muteMusic,
        this.audioManager.muteSfx,
      );
      this.audioManager.startAudio();
      this.updateAudioMenuLabels();
    });

    // Visual effects toggle
    this.dom.btnVisualEffects.addEventListener("click", () => {
      this.dom.btnVisualEffects.blur();
      this.audioManager.visualEffects = !this.audioManager.visualEffects;
      this.storage.saveVisualEffects(this.audioManager.visualEffects);
      this.updateAudioMenuLabels();
    });

    // Pause menu buttons
    this.dom.btnResume.addEventListener("click", () => this.resumeGame());
    this.dom.btnRestart.addEventListener("click", () => {
      this.dom.settingsOverlay.classList.add("hidden");
      this.engine.paused = false;
      // restart is handled by main.js via callback
      if (this._onRestart) this._onRestart();
    });
    this.dom.btnQuit.addEventListener("click", () =>
      this.quitToTitle(this._onQuit),
    );

    // Start screen settings button
    this.dom.startSettingsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.openStartSettings();
    });

    // Start overlay click
    this.dom.startOverlay.addEventListener("click", (e) => {
      if (e.target.closest(".level-selector, .icon-link")) return;
      if (!this.engine.started) {
        if (this._onStart) this._onStart();
      }
    });

    // Game over overlay click
    this.dom.gameoverOverlay.addEventListener("click", (e) => {
      if (this.engine.gameOver) {
        this.quitToTitle(this._onQuit);
      }
    });
  }

  setCallbacks({ onStart, onRestart, onQuit }) {
    this._onStart = onStart;
    this._onRestart = onRestart;
    this._onQuit = onQuit;
  }
}

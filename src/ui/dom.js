/**
 * Central DOM element references.
 * All element lookups happen here so they're easy to audit and maintain.
 */
export function getDOMElements() {
  return {
    // Audio elements
    audioEl: document.getElementById("background-audio"),

    // Canvas elements
    boardCanvas: document.getElementById("board"),
    nextCanvas: document.getElementById("next-canvas"),
    holdCanvas: document.getElementById("hold-canvas"),

    // HUD elements
    scoreEl: document.getElementById("score"),
    levelEl: document.getElementById("level"),
    speedEl: document.getElementById("speed-display"),
    linesEl: document.getElementById("lines"),
    highScoreEl: document.getElementById("high-score"),
    menuHighScoreEl: document.getElementById("menu-high-score"),

    // Overlays
    startOverlay: document.getElementById("start-overlay"),
    settingsOverlay: document.getElementById("settings-overlay"),
    gameoverOverlay: document.getElementById("gameover-overlay"),
    finalScoreEl: document.getElementById("final-score"),
    newBestEl: document.getElementById("new-best"),

    // Settings / pause buttons
    settingsBtn: document.getElementById("settings-btn"),
    btnMuteMusic: document.getElementById("btn-mute-music"),
    btnMuteSfx: document.getElementById("btn-mute-sfx"),
    btnVisualEffects: document.getElementById("btn-visual-effects"),
    btnResume: document.getElementById("btn-resume"),
    btnRestart: document.getElementById("btn-restart"),
    btnQuit: document.getElementById("btn-quit"),
    startSettingsBtn: document.getElementById("start-settings-btn"),

    // Level picker
    startLevelEl: document.getElementById("start-level"),
    levelUpBtn: document.getElementById("level-up"),
    levelDownBtn: document.getElementById("level-down"),

    // Score box (for click-to-toggle score/best)
    scoreBox: document.querySelector(".box-score"),
  };
}

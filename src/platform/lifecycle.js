/**
 * Visibility and page lifecycle handling.
 *
 * Auto-pauses the game when the page becomes hidden (iOS home swipe,
 * tab switch, etc.) and resumes music when returning.
 */
export function setupVisibilityHandling({
  audioManager,
  isPlaying,
  isPaused,
  isGameOver,
  togglePause,
}) {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      audioManager.audioEl.pause();
      if (isPlaying() && !isGameOver() && !isPaused()) {
        togglePause();
      }
    } else {
      audioManager.resumeMusic();
    }
  });
}

/**
 * Clear input state on blur to prevent stuck keys.
 */
export function setupBlurHandling(keyboardInput) {
  window.addEventListener("blur", () => {
    keyboardInput.reset();
  });
}

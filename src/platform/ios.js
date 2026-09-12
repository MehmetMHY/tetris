/**
 * iOS safe-area detection, zoom prevention, and gesture blocking.
 *
 * This module is side-effect-only: it installs event listeners on import.
 * It prevents double-tap zoom, multi-touch pinch, and Safari gesture zoom,
 * and applies Dynamic Island / notch padding when env(safe-area-inset-*) is 0.
 */
export function setupIOS() {
  let lastTouchEnd = 0;
  let lastTouchStart = 0;

  function updateAppHeight() {
    document.documentElement.style.setProperty(
      "--app-height",
      `${window.innerHeight}px`,
    );
  }

  updateAppHeight();
  window.addEventListener("resize", updateAppHeight);
  window.addEventListener("orientationchange", () =>
    setTimeout(updateAppHeight, 100),
  );
  window.visualViewport?.addEventListener("resize", updateAppHeight);

  document.addEventListener(
    "dblclick",
    (e) => {
      e.preventDefault();
    },
    { passive: false },
  );

  document.addEventListener(
    "touchstart",
    (e) => {
      const now = Date.now();
      if (e.touches.length > 1) {
        e.preventDefault();
      } else if (now - lastTouchStart <= 300) {
        if (
          !e.target.closest(
            "button, .overlay, .panel-box, .menu-btn, .level-selector",
          )
        ) {
          e.preventDefault();
        }
      }
      lastTouchStart = now;
    },
    { passive: false },
  );

  document.addEventListener(
    "touchend",
    (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        if (
          !e.target.closest(
            "button, .overlay, .panel-box, .menu-btn, .level-selector",
          )
        ) {
          e.preventDefault();
        }
      }
      lastTouchEnd = now;
    },
    { passive: false },
  );

  document.addEventListener("gesturestart", function (e) {
    e.preventDefault();
  });
  document.addEventListener("gesturechange", function (e) {
    e.preventDefault();
  });
  document.addEventListener("gestureend", function (e) {
    e.preventDefault();
  });

  // Detect iOS and apply Dynamic Island / notch padding if safe-area is 0
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) {
    const test = document.createElement("div");
    test.style.paddingTop = "env(safe-area-inset-top, 0px)";
    document.body.appendChild(test);
    const inset = parseInt(getComputedStyle(test).paddingTop) || 0;
    document.body.removeChild(test);
    if (inset === 0) {
      if (window.screen.height >= 812) {
        document.documentElement.style.setProperty("--ios-top-inset", "50px");
        document.documentElement.style.setProperty(
          "--ios-bottom-inset",
          "34px",
        );
      }
    }
  }
}

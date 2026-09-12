# AGENTS.md

Guidance for future agents working in this repository.

## Project Overview

This is a dependency-free static browser Tetris game and PWA. The app is served directly from the repository root and is deployed through GitHub Pages.

Primary files:

- `index.html`: HTML structure and markup only (~245 lines). No inline CSS or JavaScript.
- `styles/`: CSS split into 4 files — `base.css`, `layout.css`, `components.css`, `animations.css`.
- `src/`: ES module source code, organized by subsystem.
- `sw.js`: service worker cache list and cache version.
- `site.webmanifest`: PWA metadata and install icons.
- `src/cli.js`: local server helper and interactive deploy/cache bump helper.
- `assets/`: icons, social image, SVGs, and audio files.
- `test/`: unit tests using Node's built-in `node --test` runner.
- `package.json`: minimal — `"type": "module"` and scripts for `test`, `serve`, and `deploy`. No dependencies, no bundler.

There is no bundler, transpiler, or automated test suite beyond `node --test`. Python is no longer required — the project uses Node as its sole runtime.

## Module Architecture

The code is split into dependency-free ES modules loaded via `<script type="module" src="src/main.js">`:

```
src/
  main.js              Entry point. Wires all modules together. Owns the game loop and engine hooks.
  cli.js               Node CLI: local dev server (-r) and deploy helper (-d).

  config/
    constants.js       Board dimensions, colors, scoring, timing, DAS, touch, and audio constants.
    pieces.js           Tetromino shapes, SRS wall-kick tables, PIECE_NAMES, getShape().
    timing.js           LEVEL_SPEEDS, getSpeed(), getLockDelay(), getDASDelay(), getDASRepeat().

  game/
    engine.js           GameEngine class: pure game logic (no DOM). Board, collision, movement,
                        rotation, hold, locking, line clearing, scoring, spawning, game-over.
                        Communicates side effects via hooks (onLineClear, onScoreChange, onSpawn,
                        onHold, onGameOver).
    bag.js              Seven-bag randomizer with injectable RNG for deterministic tests.

  render/
    sprites.js          Pre-rendered block, ghost, and preview sprites. Background grid canvas.
    particles.js         Particle class and ParticleSystem for line-clear visual effects.
    renderer.js          Renderer class: board cache, board/preview drawing, slam shake,
                          cell-pixel-size caching, dirty-redraw detection.

  input/
    keyboard.js          KeyboardInput class: keyboard bindings and DAS (Delayed Auto Shift).
    touch.js             TouchInput class: phase-based touch gesture recognition.

  platform/
    audio.js             GameAudio (Web Audio + HTML fallback) and AudioManager (music, SFX, mute).
    storage.js           Storage class: safe localStorage wrapper with legacy key migration.
    ios.js               iOS safe-area detection, zoom prevention, and gesture blocking.
    lifecycle.js         Visibility change and blur handling (auto-pause, stuck-key prevention).

  ui/
    dom.js               Central DOM element references (getDOMElements()).
    hud.js               HUD class: score/level/speed/lines/high-score DOM updates with caching.
    overlays.js          OverlayManager: start screen, pause/settings menu, game-over screen.
    levelPicker.js       LevelPicker: start-level selection on the title screen.
```

### Dependency Direction

```
config (pure, no DOM)
  → game/engine (pure, no DOM, communicates via hooks)
  → game/bag (pure)

render (consumes engine state + canvas)
input (sends commands to engine)
platform (audio, storage, iOS, lifecycle)
ui (DOM updates, overlays, HUD)
main.js (composition layer — wires everything together)
```

The engine is fully testable in Node without any browser mocks. The renderer, input, platform, and UI modules require browser APIs and are tested via manual smoke testing.

## Run And Verify

### Local server

```bash
npm run serve
# or: node src/cli.js -r
```

Starts a Node HTTP server on the first open port at or above `8000` and opens the game in the default browser. Prefer this over opening `index.html` directly when checking service worker, PWA, audio, and asset behavior.

### Unit tests

```bash
npm test
# or: node --test test/*.test.js
```

Runs all unit tests using Node's built-in test runner. No dependencies required. Tests cover:

- Constants, piece shapes, SRS kick tables
- Speed curve, lock delay, DAS timing
- Seven-bag randomizer (with deterministic RNG)
- Engine: collision, movement, rotation, wall kicks, hard drop, soft drop scoring,
  hold, line clearing, scoring, level progression, lock delay, ground lock cap,
  ghost piece, game over, lifecycle, and game loop simulation
- Storage: load/save, legacy key migration, error handling

### Syntax check

```bash
node --check src/cli.js
```

### Manual smoke test checklist

- Start the game from the title screen with keyboard and with tap.
- Move left/right, soft drop, hard drop, rotate both directions, hold piece, pause/resume, restart, and quit.
- Confirm score, lines, level, speed, next, hold, and high score update correctly.
- Test desktop layout and mobile-width layout in browser dev tools.
- For touch changes, test tap rotate, horizontal swipe, drag down soft drop, flick down hard drop, and flick up hold.
- For audio/settings changes, test mute music, mute SFX, visual effects toggle, pause menu navigation, and localStorage persistence.
- For PWA/offline changes, test through the local HTTP server and verify service worker registration/cache behavior.

## Coding Conventions

- Keep the app dependency-free unless the user explicitly asks for a build system or library.
- Prefer small, direct edits in the existing module structure. Each module has a single responsibility.
- Preserve the current browser-first style: plain HTML, CSS, and vanilla JavaScript ES modules.
- Use 2-space indentation in all files (`index.html`, `styles/*.css`, `sw.js`, `src/cli.js`, and all `src/**/*.js` files).
- Follow existing naming: constants in `UPPER_CASE`, mutable game state in concise camelCase names.
- Keep performance-sensitive rendering patterns intact: pre-rendered sprites, board cache, dirty redraw checks, and `requestAnimationFrame` loop.
- The `GameEngine` class must remain pure (no DOM, no canvas, no browser APIs). All side effects go through hooks.
- Be cautious with touch input. The current touch system is phase-based to avoid accidental hard drops from diagonal or L-shaped swipes.
- Be cautious with iOS behavior. The app intentionally disables zoom gestures, handles safe areas, pauses on visibility changes, and works around mobile audio restrictions.
- Keep localStorage keys stable unless there is a concrete migration need. Existing keys include `tetris-high-score`, `tetris-mute-music`, `tetris-mute-sfx`, and `tetris-visual-effects`. Legacy keys `tetris-muted` and `tetris-mute-all` are migrated by `Storage.loadSettings()`.
- Do not add generated files, temporary files, dependency directories, or local tool config to the repo.

## Service Worker And PWA Notes

- `sw.js` uses a cache-first strategy and a versioned `CACHE_NAME` like `tetris-v47`.
- Every `.js` module file and CSS file must be listed in the `ASSETS` array in `sw.js`. If you add a new module or stylesheet, update `ASSETS`.
- If a change needs to reach existing offline/PWA users, bump `CACHE_NAME` in `sw.js`.
- Do not run `npm run deploy` unless the user explicitly asks to deploy. It is interactive and can stage, commit, and push changes.
- `site.webmanifest` uses relative icon paths (`assets/...`) for GitHub Pages compatibility under `/tetris/`.

## Git And Deployment

- Check the worktree before making broad edits; this repo may contain user or tool-generated local changes.
- Do not commit, push, or run the deploy helper unless explicitly requested.
- If asked to deploy, inspect `git status` and the diff first, then use the existing `npm run deploy` (or `node src/cli.js -d`) flow only if it matches the requested action.

## Project-Specific Risk Areas

- Gameplay timing: gravity speed, DAS, lock delay, and ground lock cap are tightly coupled. Test high levels when modifying any timing constants. The speed curve is in `src/config/timing.js`.
- Rotation/collision: SRS wall kick tables and tetromino shapes should stay aligned with `PIECE_NAMES` and color IDs. Data is in `src/config/pieces.js`.
- Canvas rendering: `BLOCK`, `COLS`, `ROWS`, cached canvases, previews, and mobile cell sizing are interconnected. Rendering code is in `src/render/renderer.js` and `src/render/sprites.js`.
- Mobile layout: CSS uses viewport units, safe-area env vars, fixed body positioning, and grid placement for the HUD. Test portrait mobile after layout edits.
- Audio: WebAudio and HTML audio fallback both exist to support mobile browsers. Preserve user-gesture unlock behavior. Audio code is in `src/platform/audio.js`.
- Engine purity: the `GameEngine` class in `src/game/engine.js` must not import or reference any browser APIs. This is enforced by the unit test suite, which runs in Node.
- Offline caching: stale service worker caches can hide changes during testing. Hard refresh, unregister the service worker, or bump the cache version when appropriate.
- Behavioral preservation: when refactoring, always run `npm test` after changes. The test suite documents and enforces the exact gameplay behavior.

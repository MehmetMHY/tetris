# AGENTS.md

Guidance for future agents working in this repository.

## Project Overview

This is a dependency-free static browser Tetris game and PWA. The app is served directly from the repository root and is deployed through GitHub Pages.

Primary files:

- `index.html`: all game UI, CSS, and JavaScript live here.
- `sw.js`: service worker cache list and cache version.
- `site.webmanifest`: PWA metadata and install icons.
- `cli.py`: local server helper and interactive deploy/cache bump helper.
- `assets/`: icons, social image, SVGs, and audio files.

There is no `package.json`, bundler, transpiler, or automated test suite.

## Run And Verify

Use the local helper from the repo root:

```bash
python3 cli.py -r
```

This starts a Python HTTP server on the first open port at or above `8000` and opens the game in the default browser.

You can also open `index.html` directly, but prefer the local HTTP server when checking service worker, PWA, audio, and asset behavior.

Basic syntax checks:

```bash
python3 -m py_compile cli.py
```

Manual smoke test checklist for gameplay changes:

- Start the game from the title screen with keyboard and with tap.
- Move left/right, soft drop, hard drop, rotate both directions, hold piece, pause/resume, restart, and quit.
- Confirm score, lines, level, speed, next, hold, and high score update correctly.
- Test desktop layout and mobile-width layout in browser dev tools.
- For touch changes, test tap rotate, horizontal swipe, drag down soft drop, flick down hard drop, and flick up hold.
- For audio/settings changes, test mute music, mute SFX, visual effects toggle, pause menu navigation, and localStorage persistence.
- For PWA/offline changes, test through the local HTTP server and verify service worker registration/cache behavior.

## Coding Conventions

- Keep the app dependency-free unless the user explicitly asks for a build system or library.
- Prefer small, direct edits in the existing file structure. Do not split `index.html` into modules unless explicitly requested.
- Preserve the current browser-first style: plain HTML, CSS, and vanilla JavaScript.
- Use 2-space indentation in `index.html` and `sw.js`; use 4-space indentation in `cli.py`.
- Follow existing naming: constants in `UPPER_CASE`, mutable game state in concise camelCase names, DOM references near the DOM section.
- Keep performance-sensitive rendering patterns intact: pre-rendered sprites, board cache, dirty redraw checks, and `requestAnimationFrame` loop.
- Be cautious with touch input. The current touch system is phase-based to avoid accidental hard drops from diagonal or L-shaped swipes.
- Be cautious with iOS behavior. The app intentionally disables zoom gestures, handles safe areas, pauses on visibility changes, and works around mobile audio restrictions.
- Keep localStorage keys stable unless there is a concrete migration need. Existing keys include `tetris-high-score`, `tetris-mute-music`, `tetris-mute-sfx`, and `tetris-visual-effects`.
- Do not add generated files, temporary files, dependency directories, or local tool config to the repo.

## Service Worker And PWA Notes

- `sw.js` uses a cache-first strategy and a versioned `CACHE_NAME` like `tetris-v41`.
- If you add, remove, rename, or replace cached assets, update the `ASSETS` array in `sw.js`.
- If a change needs to reach existing offline/PWA users, bump `CACHE_NAME` in `sw.js`.
- Do not run `python3 cli.py -d` unless the user explicitly asks to deploy. It is interactive and can stage, commit, and push changes.
- If editing `site.webmanifest`, keep icon paths, `start_url`, `scope`, and theme/background colors consistent with GitHub Pages deployment under `/tetris/`.

## Git And Deployment

- Check the worktree before making broad edits; this repo may contain user or tool-generated local changes.
- Do not commit, push, or run the deploy helper unless explicitly requested.
- If asked to deploy, inspect `git status` and the diff first, then use the existing `cli.py -d` flow only if it matches the requested action.

## Project-Specific Risk Areas

- Gameplay timing: gravity speed, DAS, lock delay, and ground lock cap are tightly coupled. Test high levels when modifying any timing constants.
- Rotation/collision: SRS wall kick tables and tetromino shapes should stay aligned with `PIECE_NAMES` and color IDs.
- Canvas rendering: `BLOCK`, `COLS`, `ROWS`, cached canvases, previews, and mobile cell sizing are interconnected.
- Mobile layout: CSS uses viewport units, safe-area env vars, fixed body positioning, and grid placement for the HUD. Test portrait mobile after layout edits.
- Audio: WebAudio and HTML audio fallback both exist to support mobile browsers. Preserve user-gesture unlock behavior.
- Offline caching: stale service worker caches can hide changes during testing. Hard refresh, unregister the service worker, or bump the cache version when appropriate.

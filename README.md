<div align="center">
  <img src="./assets/logo.png" width="175">
</div>

<h1 align="center">Tetris</h1>

<br>

## About

[Tetris](https://en.wikipedia.org/wiki/Tetris) is a legendary game and one that I enjoy very much. I really love the game and enjoy playing it; it is a great stress reliever. For a fun weekend project, I decided to build the game as a browser game/app designed for both Desktop and Mobile, using the principles of [vibe coding](https://en.wikipedia.org/wiki/Vibe_coding). The overall feel of this version of Tetris was inspired by [Play Tetris](https://play.tetris.com/).

## Why This?

Tetris has been one of the few things that reliably helps me when I am really stressed, whether from work or life. Instead of stress eating junk food or binge watching YouTube and TV, I can play for about 10 to 30 minutes and feel like my brain has been cleared out a bit. It is not just casual unwinding for me, it is a way to have something simple and focused to pour that stress into. There is even some cool research showing Tetris can affect how the brain handles intrusive memories and stress, for example [in trauma film experiments](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0004153), [in people treated after real accidents](https://doi.org/10.1038/mp.2017.23), and [as a supplement to therapy with measurable brain changes](https://pmc.ncbi.nlm.nih.gov/articles/PMC7828932/). I am not trying to turn this game into a medical treatment, I just like that a thing that already works for me as a healthy outlet also happens to be studied in interesting ways.

The problem was that there was no version that fit how I wanted to play. Mobile apps on the iOS App Store are full of ads and microtransactions, web versions often lag or feel bad on mobile, and the best classic implementations like [Tetris (NES 1989)](<https://en.wikipedia.org/wiki/Tetris_(NES_video_game)>) require emulators and extra hardware. I even bought a [Miyoo Mini](https://officialmiyoomini.com/) and found that I mostly just played Tetris on it, while having to carry another device around. With modern browsers, LLM tools like Claude Code CLI, and workflows like vibe coding, it finally felt like the right time to build the Tetris I actually wanted myself, one that is fast, minimal, runs in a browser on desktop and mobile, fully open source, and under my control instead of tied to ads, an app store, or some random website. In about a day I was able to put this together, and I am sharing it in the hope that it can be a small, healthy outlet for other people too when they are stressed and need to clear their head.

## Features

- Classic 10x20 Tetris board
- Full keyboard controls on Desktop and touch gesture controls on Mobile
- Standard seven-bag piece randomizer
- Hold piece and next piece previews
- Ghost piece projection showing where pieces will land
- Level-based speed curve with dynamic lock delay
- Score, lines, level, and high score tracking persisted to local storage
- Soft drop and hard drop scoring
- In-game menu with resume, restart, quit, and options to toggle music, SFX, and visual effects
- Line clear particle animations, screen shake, and sound effects
- iOS safe area support (Dynamic Island, notch, home indicator)
- Offline support via Service Worker (works without internet after first visit)
- Installable as a PWA (add to home screen on iOS/Android for app-like experience)

## Controls

### Desktop (Keyboard)

| Action      | Keys                 |
| ----------- | -------------------- |
| Move        | `←` `→` or `A` `D`   |
| Soft Drop   | `↓` or `S`           |
| Hard Drop   | `Space`              |
| Rotate CW   | `↑` `W` `X`          |
| Rotate CCW  | `Z`                  |
| Hold        | `C` or `LShift`      |
| Menu        | `Esc` or `M`         |
| Source Code | `G` _(title screen)_ |

### Mobile (Touch)

| Action    | Gesture            |
| --------- | ------------------ |
| Move      | Swipe left / right |
| Soft Drop | Hold and drag down |
| Hard Drop | Quick flick down   |
| Rotate CW | Tap                |
| Hold      | Quick flick up     |

## How To Run Locally

From the project directory run

```bash
python3 cli.py -r
```

_Starts a local Python HTTP server and opens the game in your browser. You can also open `index.html` directly in a browser._

To bump the Service Worker cache version, commit, and push:

```bash
python3 cli.py -d
```

## Built With

- [Claude Code CLI](https://code.claude.com/docs/en/overview) _(writing code)_
- [Gemini CLI](https://github.com/google-gemini/gemini-cli) _(writing code)_
- [Cha CLI](https://github.com/MehmetMHY/ch) _(research, CLI scripts, README)_
- [xAI Grok Web App](https://grok.com/) _(logos/icons)_
- [Perplexity](https://www.perplexity.ai/) _(research/bugs)_
- [Google Search](https://www.google.com/) _(finding SVGs and other assets)_
- [YouTube](https://www.youtube.com/) + [yt-dlp](https://github.com/yt-dlp/yt-dlp) _(sourcing audio clips)_
- [FFmpeg](https://www.ffmpeg.org/) _(editing audio files)_
- [macOS Preview](<https://en.wikipedia.org/wiki/Preview_(Apple)>) _(editing logos/images)_
- [Python](https://www.python.org/) _(misc scripting)_

## Speed Tuning & Game Theory

The speed curve and lock delay in this version were tuned using research into how classic and modern Tetris games handle difficulty progression. In the original [NES Tetris](<https://en.wikipedia.org/wiki/Tetris_(NES_video_game)>), gravity reaches one row per frame at level 29, which became the famous ["kill screen"](https://tetris.wiki/Tetris_%28NES%29) where the game becomes effectively unplayable for most humans. That was not really a designed ending, it was more of a side effect of the hardware and how DAS (Delayed Auto Shift) was too slow to keep up with the drop speed. Willis Gibson proved this in 2024 when he [pushed past it and crashed the game at level 157](https://apnews.com/article/tetris-win-kill-screen-blue-scuti-willis-gibson-df9325c62d42292e854cadb54d8f4cb3).

Modern games like [TGM (Tetris: The Grand Master)](https://tetris.wiki/Tetris_The_Grand_Master) solved this differently. Instead of just making pieces fall faster until the game breaks, TGM caps gravity at 20G (instant drop) and then tightens other timing windows like lock delay and DAS to increase difficulty. The [Tetris Guideline](https://tetris.wiki/Tetris_Guideline) standard uses 500ms lock delay with up to 15 move resets, which this version follows. Research into [TGM2 Death mode](https://tetris.wiki/Tetris_The_Absolute_The_Grand_Master_2) and [TGM3 Shirase](https://tetris.wiki/Tetris_The_Grand_Master_3_Terror-Instinct) showed that the practical floor for competitive play is around 250ms of lock delay with fast DAS, while anything below 133ms is specialist territory.

Based on all of this, the speed curve here caps gravity at 33ms per row (similar to [NES levels 19 through 28](https://tetris.wiki/Tetris_%28NES%29)) instead of going to instant drop, and DAS scales from 170ms down to 100ms at higher levels so you can actually traverse the board during lock delay. The goal was to make high levels feel brutally fast but still fair, closer to how [Tetris 99](https://harddrop.com/wiki/Tetris_99) and TGM handle endgame difficulty rather than the original NES approach of just letting raw speed outrun your inputs.

## Implementation Notes

- Responsive design optimized for both Desktop and Mobile (portrait)
- Pre-rendered block sprites and grid background for performance
- Uses Super Rotation System (SRS) style wall kicks for piece rotation
- Velocity-based touch gesture detection for reliable flick vs drag distinction
- Level-based timing system for gravity speed and lock delay
- High scores and audio settings persisted with `localStorage`
- To push updates to offline/PWA users, run `python3 cli.py -d` which bumps `CACHE_NAME` in `sw.js`, stages changes, and commits/pushes in one step
- Assets (icons, audio) live in the `assets/` directory
- Background music source [NmCCQxVBfyM](https://www.youtube.com/watch?v=NmCCQxVBfyM)
- Line clear sound effect source [UMViM2tHrOk](https://www.youtube.com/watch?v=UMViM2tHrOk)

## License

Feel free to fork, tweak the tuning, or use this as a reference for your own Tetris experiments. Licensed under the [MIT License](./LICENSE).

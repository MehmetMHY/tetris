<p align="center">
  <img src="./logo.png" width="175">
</p>

<h1 align="center">Tetris</h1>

_A lightweight Tetris clone built with vanilla HTML, Canvas, CSS, and JavaScript (no dependencies)_

## About

[Tetris](https://en.wikipedia.org/wiki/Tetris) is a legendary game and one that I enjoy very much. I really love the game and enjoy playing it, it's a great stress reliever, so for a fun weekend project I decided to build the game, as a browser game/app designed for Desktop, using the principles of [vibe coding](https://en.wikipedia.org/wiki/Vibe_coding).

## Features

- Classic 10 by 20 Tetris board with smooth controls
- Standard seven bag piece randomizer
- Hold piece and next piece previews
- Ghost piece projection
- Level based speed curve and dynamic lock delay
- Score lines level and best score tracking persisted in local storage
- Soft drop and hard drop scoring
- Pause menu with resume restart and quit to title
- Line clear flash animation
- Background music with mute and unmute toggle and mute state persisted

## How To Run Locally

From the project directory run

```bash
# NOTE: python is used to run lightweight web server for the site
bash run.sh
```

The script starts a local Python HTTP server and opens the game in your browser. You can also open `index.html` directly in a browser although some browsers may restrict audio autoplay or local file APIs

## Tools Used

- [Claude Code CLI](https://code.claude.com/docs/en/overview)
- [Gemini CLI](https://github.com/google-gemini/gemini-cli)
- [Cha CLI](https://github.com/MehmetMHY/ch)

## Implementation Notes

- This game/app was optimized for a Desktop experience not mobile
- Rendering uses pre rendered block sprites on offscreen canvases for better performance
- There is a pre rendered grid background that is blitted each frame
- Rotation uses Super Rotation System style wall kicks
- There is a simple level based timing system for gravity and lock delay
- High scores and mute state are stored with `localStorage`
- The music is from [this](https://www.youtube.com/watch?v=NmCCQxVBfyM) YouTube video

## License

Feel free to fork tweak the tuning or use this as a reference for your own Tetris experiments. Licensed under the [MIT License](./LICENSE).

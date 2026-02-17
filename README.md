<p align="center">
  <img src="./logo.png" width="150">
</p>

<h1 align="center">Tetris</h1>

<p align="center"><em>
A simple modern Tetris clone built with plain HTML Canvas CSS and JavaScript with no frameworks no build steps no external dependencies
</em></p>

<h2>About</h2>

<p>
This was a fun weekend project that I enjoy playing and it was very much
<a href="https://en.wikipedia.org/wiki/Vibe_coding">vibe coded</a><br/>
I built it primarily using:
</p>

<ul>
  <li><a href="https://code.claude.com/docs/en/overview">Anthropic's Claude Code CLI</a></li>
  <li><a href="https://github.com/google-gemini/gemini-cli">Google's Gemini CLI</a></li>
  <li><a href="https://github.com/MehmetMHY/ch">Cha CLI</a></li>
</ul>

<h2>Features</h2>

<ul>
  <li>Classic 10 by 20 Tetris board with smooth controls</li>
  <li>Standard seven bag piece randomizer</li>
  <li>Hold piece and next piece previews</li>
  <li>Ghost piece projection</li>
  <li>Level based speed curve and dynamic lock delay</li>
  <li>Score lines level and best score tracking persisted in local storage</li>
  <li>Soft drop and hard drop scoring</li>
  <li>Pause menu with resume restart and quit to title</li>
  <li>Line clear flash animation</li>
  <li>Background music with mute and unmute toggle and mute state persisted</li>
</ul>

<h2>How To Run</h2>

<p>Python is required for the lightweight web server that hosts the game</p>

<p>From the project directory run</p>

```bash
bash run.sh
```

<p>The script starts a local Python HTTP server and opens the game in your browser</p>

<p>
You can also open <code>index.html</code> directly in a browser although some browsers may restrict audio autoplay or local file APIs
</p>

<h2>Implementation Notes</h2>

<ul>
  <li>This game/app was optimized for a Desktop experience not mobile</li>
  <li>Rendering uses pre rendered block sprites on offscreen canvases for better performance</li>
  <li>There is a pre rendered grid background that is blitted each frame</li>
  <li>Rotation uses Super Rotation System style wall kicks</li>
  <li>There is a simple level based timing system for gravity and lock delay</li>
  <li>High scores and mute state are stored with <code>localStorage</code></li>
  <li>The music is from <a href="https://www.youtube.com/watch?v=NmCCQxVBfyM">this</a> YouTube video</li>
</ul>

<h2>License</h2>

<p>
Feel free to fork tweak the tuning or use this as a reference for your own Tetris experiments.
Licensed under the <a href="./LICENSE">MIT License</a>.
</p>

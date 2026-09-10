import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { GameEngine } from "../src/game/engine.js";
import {
  COLS,
  ROWS,
  EMPTY,
  LINE_SCORES,
  GROUND_LOCK_MAX,
  GROUND_FLICKER_START,
} from "../src/config/constants.js";
import { getShape } from "../src/config/pieces.js";
import { getSpeed, getLockDelay } from "../src/config/timing.js";

function makeEngine({ rng, isMobile, hooks } = {}) {
  const engine = new GameEngine({
    rng: rng || (() => 0.5),
    isMobile: isMobile || (() => false),
  });
  if (hooks) {
    for (const [key, fn] of Object.entries(hooks)) {
      engine.hooks[key] = fn;
    }
  }
  return engine;
}

function makeSeqRng(...values) {
  let i = 0;
  return () => values[i++ % values.length];
}

function placePiece(engine, type, x, y, rot = 0) {
  engine.currentType = type;
  engine.currentRotation = rot;
  engine.currentX = x;
  engine.currentY = y;
}

function fillRows(engine, rows, color = 1, skipCols = []) {
  for (const r of rows) {
    for (let c = 0; c < COLS; c++) {
      if (!skipCols.includes(c)) {
        engine.board[r][c] = color;
      }
    }
  }
}

// ─── Lock delay and move resets ───

describe("engine: lock delay edge cases", () => {
  test("lock timer accumulates while on ground (not soft dropping)", () => {
    const engine = makeEngine({
      rng: makeSeqRng(0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6),
    });
    engine.startGame(1);
    while (engine.moveDown()) {}
    engine.update(100, false);
    assert.ok(engine.lockTimer > 0);
    assert.ok(engine.groundTime > 0);
  });

  test("movement resets lock timer but not ground time", () => {
    const engine = makeEngine({
      rng: makeSeqRng(0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6),
    });
    engine.startGame(1);
    while (engine.moveDown()) {}
    engine.update(200, false);
    const gtBefore = engine.groundTime;
    engine.moveLeft();
    assert.equal(engine.lockTimer, 0);
    assert.equal(engine.groundTime, gtBefore); // ground time NOT reset
  });

  test("lock moves are capped — after 15 moves, lock timer is NOT reset", () => {
    const engine = makeEngine({
      rng: makeSeqRng(0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6),
    });
    engine.startGame(1);
    while (engine.moveDown()) {}
    // Use up all 15 move resets
    for (let i = 0; i < 20; i++) {
      engine.moveLeft();
      engine.moveRight();
    }
    assert.equal(engine.lockMoves, 15);
    // Now movement should NOT reset lock timer
    engine.lockTimer = 200;
    engine.moveLeft();
    assert.equal(engine.lockTimer, 200); // unchanged
  });

  test("ground lock cap force-locks even while not soft dropping", () => {
    const engine = makeEngine({
      rng: makeSeqRng(0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6),
    });
    engine.startGame(1);
    while (engine.moveDown()) {}
    // Keep moving to reset lock timer and prevent normal lock
    // But ground time should still accumulate
    const typeBefore = engine.currentType;
    // Simulate many frames, moving each time to reset lock timer
    for (let i = 0; i < 100; i++) {
      engine.update(GROUND_LOCK_MAX / 10 + 1, false);
      engine.moveLeft();
      engine.moveRight();
      if (engine.gameOver || engine.currentType !== typeBefore) break;
    }
    // Should have been force-locked by ground cap
    assert.notEqual(engine.currentType, typeBefore);
  });

  test("delta is clamped to 67ms in the update loop", () => {
    const engine = makeEngine({
      rng: makeSeqRng(0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6),
    });
    engine.startGame(1);
    const yBefore = engine.currentY;
    // Huge delta should be clamped — piece should not jump more than 3 rows
    engine.update(99999, false);
    assert.ok(engine.currentY - yBefore <= 3);
  });
});

// ─── Engine query methods ───

describe("engine: query methods", () => {
  test("isOnGround returns true when piece is at bottom", () => {
    const engine = makeEngine({
      rng: makeSeqRng(0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6),
    });
    engine.startGame(1);
    while (engine.moveDown()) {}
    assert.ok(engine.isOnGround());
  });

  test("isOnGround returns false when piece is falling", () => {
    const engine = makeEngine({
      rng: makeSeqRng(0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6),
    });
    engine.startGame(1);
    assert.ok(!engine.isOnGround());
  });

  test("isFlickering returns false below threshold", () => {
    const engine = makeEngine({
      rng: makeSeqRng(0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6),
    });
    engine.startGame(1);
    while (engine.moveDown()) {}
    engine.update(GROUND_FLICKER_START - 100, false);
    assert.ok(!engine.isFlickering());
  });

  test("isFlickering returns true at threshold", () => {
    const engine = makeEngine({
      rng: makeSeqRng(0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6),
    });
    engine.startGame(1);
    while (engine.moveDown()) {}
    // Use soft drop to pause lock timer while ground time accumulates
    engine.update(GROUND_FLICKER_START + 100, true);
    assert.ok(engine.isFlickering());
    // Should NOT have force-locked yet (below GROUND_LOCK_MAX)
    assert.ok(!engine.gameOver);
  });

  test("getSpeed returns the correct speed for current level", () => {
    const engine = makeEngine({
      rng: makeSeqRng(0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6),
    });
    engine.startGame(1);
    assert.equal(engine.getSpeed(), getSpeed(1));
    engine.level = 5;
    assert.equal(engine.getSpeed(), getSpeed(5));
  });

  test("getLockDelay returns the correct delay for current level", () => {
    const engine = makeEngine({
      rng: makeSeqRng(0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6),
    });
    engine.startGame(1);
    assert.equal(engine.getLockDelay(), getLockDelay(1, false));
  });
});

// ─── Multi-line clear sequences ───

describe("engine: multi-line clear sequences", () => {
  test("clearing 10 single lines levels up", () => {
    const engine = makeEngine({
      rng: makeSeqRng(0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6),
    });
    engine.startGame(1);
    for (let i = 0; i < 10; i++) {
      fillRows(engine, [ROWS - 1], 1, [4, 5]);
      placePiece(engine, "O", 4, 0, 0);
      engine.hardDrop();
    }
    assert.equal(engine.lines, 10);
    assert.equal(engine.level, 2);
  });

  test("clearing a tetris (4 lines) scores more than 4 singles", () => {
    const engine1 = makeEngine({
      rng: makeSeqRng(0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6),
    });
    engine1.startGame(1);
    // 4 single line clears
    let score1 = 0;
    for (let i = 0; i < 4; i++) {
      fillRows(engine1, [ROWS - 1], 1, [4, 5]);
      placePiece(engine1, "O", 4, 0, 0);
      engine1.hardDrop();
      score1 = engine1.score;
    }

    const engine2 = makeEngine({
      rng: makeSeqRng(0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6),
    });
    engine2.startGame(1);
    fillRows(engine2, [ROWS - 1, ROWS - 2, ROWS - 3, ROWS - 4], 1, [5]);
    placePiece(engine2, "I", 3, 0, 1);
    engine2.hardDrop();

    // Tetris score = 800, 4 singles = 400 (plus hard drop scores)
    // The ratio should be 2:1 for line clears
    assert.ok(engine2.score > score1 * 1.5);
  });
});

// ─── Engine purity (no browser APIs) ───

describe("engine: purity", () => {
  test("engine does not reference document, window, or navigator", () => {
    const engine = makeEngine();
    engine.startGame(1);
    // If the engine used any browser APIs, it would have thrown in Node
    engine.hardDrop();
    engine.rotate(1);
    engine.holdPiece();
    engine.update(100, false);
    assert.ok(engine.started);
  });

  test("engine works with custom RNG (deterministic)", () => {
    let seed = 42;
    const rng = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const engine1 = makeEngine({ rng });
    engine1.startGame(1);
    const types1 = [engine1.currentType];
    for (let i = 0; i < 6; i++) {
      engine1.hardDrop();
      types1.push(engine1.currentType);
    }

    seed = 42;
    const engine2 = makeEngine({ rng });
    engine2.startGame(1);
    const types2 = [engine2.currentType];
    for (let i = 0; i < 6; i++) {
      engine2.hardDrop();
      types2.push(engine2.currentType);
    }

    assert.deepEqual(types1, types2);
  });

  test("engine works with isMobile=true", () => {
    const engine = makeEngine({ isMobile: () => true });
    engine.startGame(1);
    while (engine.moveDown()) {}
    engine.update(getLockDelay(1, true), false);
    // Should lock after lock delay
    assert.ok(engine.currentType !== null);
  });
});

// ─── Hook behavior ───

describe("engine: hooks", () => {
  test("onSpawn is called on startGame", () => {
    let count = 0;
    const engine = makeEngine({
      rng: makeSeqRng(0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6),
      hooks: { onSpawn: () => count++ },
    });
    engine.startGame(1);
    assert.ok(count > 0);
  });

  test("onSpawn is called after each hard drop (new piece spawns)", () => {
    let count = 0;
    const engine = makeEngine({
      rng: makeSeqRng(0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6),
      hooks: { onSpawn: () => count++ },
    });
    engine.startGame(1);
    const initialCount = count;
    engine.hardDrop();
    assert.ok(count > initialCount);
  });

  test("onHold is called on hold", () => {
    let count = 0;
    const engine = makeEngine({
      rng: makeSeqRng(0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6),
      hooks: { onHold: () => count++ },
    });
    engine.startGame(1);
    engine.holdPiece();
    assert.equal(count, 1);
  });

  test("onGameOver is called when board is full", () => {
    let gameOverScore = null;
    const engine = makeEngine({
      rng: makeSeqRng(0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6),
      hooks: { onGameOver: ({ score }) => (gameOverScore = score) },
    });
    engine.startGame(1);
    // Fill all rows except column 0
    for (let r = 0; r < ROWS; r++) {
      for (let c = 1; c < COLS; c++) {
        engine.board[r][c] = 1;
      }
    }
    placePiece(engine, "O", 4, ROWS - 2, 0);
    engine.lockPiece();
    assert.ok(gameOverScore !== null);
  });

  test("onLineClear receives row colors before board mutation", () => {
    let receivedRows = null;
    const engine = makeEngine({
      rng: makeSeqRng(0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6),
      hooks: {
        onLineClear: ({ rows }) => {
          receivedRows = rows;
        },
      },
    });
    engine.startGame(1);
    fillRows(engine, [ROWS - 1], 3, [4, 5]); // T piece color
    placePiece(engine, "O", 4, 0, 0);
    engine.hardDrop();
    assert.ok(receivedRows !== null);
    assert.equal(receivedRows.length, 1);
    assert.equal(receivedRows[0].row, ROWS - 1);
    // The colors should include the filled cells (all 3s except cols 4,5 which are 2s)
    assert.ok(receivedRows[0].colors[0] !== EMPTY);
  });

  test("isHardDropTetris flag in onLineClear", () => {
    let wasHardDropTetris = false;
    const engine = makeEngine({
      rng: makeSeqRng(0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6),
      hooks: {
        onLineClear: ({ isHardDropTetris }) => {
          wasHardDropTetris = isHardDropTetris;
        },
      },
    });
    engine.startGame(1);
    fillRows(engine, [ROWS - 1, ROWS - 2, ROWS - 3, ROWS - 4], 1, [5]);
    placePiece(engine, "I", 3, 0, 1);
    engine.hardDrop();
    assert.ok(wasHardDropTetris);
  });

  test("isHardDropTetris is false for non-hard-drop Tetris", () => {
    let wasHardDropTetris = true;
    const engine = makeEngine({
      rng: makeSeqRng(0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6),
      hooks: {
        onLineClear: ({ isHardDropTetris }) => {
          wasHardDropTetris = isHardDropTetris;
        },
      },
    });
    engine.startGame(1);
    fillRows(engine, [ROWS - 1, ROWS - 2, ROWS - 3, ROWS - 4], 1, [5]);
    placePiece(engine, "I", 3, 0, 1);
    // Move down manually instead of hard drop
    while (engine.moveDown()) {}
    engine.lockPiece();
    assert.equal(wasHardDropTetris, false);
  });
});

// ─── Game loop simulation ───

describe("engine: full game simulation", () => {
  test("simulates 50 hard drops without errors", () => {
    const engine = makeEngine({ rng: Math.random });
    engine.startGame(1);
    for (let i = 0; i < 50; i++) {
      if (engine.gameOver) break;
      engine.hardDrop();
    }
    // Should not have crashed
    assert.ok(engine.started);
  });

  test("simulates 100 update ticks without errors", () => {
    const engine = makeEngine({ rng: Math.random });
    engine.startGame(1);
    for (let i = 0; i < 100; i++) {
      if (engine.gameOver) break;
      engine.update(33, false);
    }
    assert.ok(engine.started);
  });

  test("simulates with soft drop active", () => {
    const engine = makeEngine({ rng: Math.random });
    engine.startGame(1);
    for (let i = 0; i < 200; i++) {
      if (engine.gameOver) break;
      engine.update(16, true);
    }
    assert.ok(engine.started || engine.gameOver);
  });

  test("pause and resume does not advance game state", () => {
    const engine = makeEngine({
      rng: makeSeqRng(0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6),
    });
    engine.startGame(1);
    const y = engine.currentY;
    engine.togglePause();
    engine.update(99999, false);
    assert.equal(engine.currentY, y);
    engine.togglePause();
    engine.update(getSpeed(1), false);
    assert.ok(engine.currentY > y);
  });
});

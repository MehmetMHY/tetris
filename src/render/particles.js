import { COLS, BLOCK, COLORS } from "../config/constants.js";

/**
 * Particle system for line-clear visual effects.
 * Particles are only spawned when visual effects are enabled.
 */
export class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 4 + 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 1.0;
    this.decay = Math.random() * 0.02 + 0.02;
    this.size = Math.random() * 4 + 2;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.15; // Gravity
    this.life -= this.decay;
  }

  draw(c) {
    c.globalAlpha = this.life;
    c.fillStyle = this.color;
    c.fillRect(this.x, this.y, this.size, this.size);
    c.globalAlpha = 1;
  }
}

export class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  spawn(row, colorIds, visualEffects) {
    if (!visualEffects) return;
    const py = row * BLOCK + BLOCK / 2;
    for (let c = 0; c < COLS; c++) {
      const px = c * BLOCK + BLOCK / 2;
      const color = COLORS[colorIds[c]] || "#fff";
      for (let i = 0; i < 6; i++) {
        this.particles.push(new Particle(px, py, color));
      }
    }
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].life <= 0) this.particles.splice(i, 1);
    }
  }

  draw(c) {
    for (const p of this.particles) p.draw(c);
  }

  clear() {
    this.particles.length = 0;
  }

  get active() {
    return this.particles.length > 0;
  }
}

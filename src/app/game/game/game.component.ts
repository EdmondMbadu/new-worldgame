// -----------------------------------------------------------------------------
// game.component.ts — emoji‑based World‑Game mini‑loop (Angular 17+ / strict TS)
// Paste this entire file into src/app/…/game.component.ts
// -----------------------------------------------------------------------------

import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';

/* ════════════  Simple models  ════════════ */
interface Bullet {
  x: number;
  y: number;
  r: number;
  vy: number;
}
interface Problem {
  x: number;
  y: number;
  size: number;
  vy: number;
  char: string; // rendered as an emoji on canvas
}

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css'],
})
export class GameComponent implements AfterViewInit, OnDestroy {
  /* ───────────── canvas refs ───────────── */
  @ViewChild('gameCanvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private raf = 0;

  /* ───────────── public state ───────────── */
  score = 0;
  running = false;
  gameOver = false;

  /* ───────────── entities ───────────── */
  private player = {
    char: '🧑‍🚀', // Bucky placeholder
    x: 0,
    y: 0,
    size: 64,
    speed: 320, // px/s
  };
  private bullets: Bullet[] = [];
  private problems: Problem[] = [];

  /* ───────────── constants ───────────── */
  private readonly BULLET_SPEED = 540; // px/s
  private readonly PROBLEM_BASE_SPEED = 70; // px/s
  private readonly PROBLEM_ACCEL = 15; // per 10 s
  private readonly SPAWN_INTERVAL = 1100; // ms

  /* ───────────── time helpers ───────────── */
  private lastFrame = 0;
  private spawnTimer = 0;
  private elapsedTotal = 0;

  /* ════════════ lifecycle ════════════ */
  ngAfterViewInit() {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.bindControls();
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.raf);
  }

  /* ════════════ public method called by template ════════════ */
  start() {
    this.score = 0;
    this.elapsedTotal = 0;
    this.spawnTimer = 0;
    this.running = true;
    this.gameOver = false;
    this.bullets = [];
    this.problems = [];

    const c = this.canvasRef.nativeElement;
    this.player.x = c.clientWidth / 2;
    this.player.y = c.clientHeight - this.player.size - 20;

    // kick off loop
    this.lastFrame = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  /* ════════════ main loop ════════════ */
  private loop = (now: number) => {
    const dt = (now - this.lastFrame) / 1000; // seconds since previous frame
    this.lastFrame = now;

    if (this.running) {
      this.update(dt);
      this.render();
      this.raf = requestAnimationFrame(this.loop);
    }
  };

  /* ════════════ update step ════════════ */
  private update(dt: number) {
    this.elapsedTotal += dt;

    // ── spawn new problems ──
    this.spawnTimer += dt * 1000; // ms
    if (this.spawnTimer >= this.SPAWN_INTERVAL) {
      this.spawnTimer = 0;
      const EMOJIS = ['🔥', '🪖', '🦠', '🌡️'];
      const size = 48 + Math.random() * 32;
      const xMax = this.canvasRef.nativeElement.clientWidth - size;
      this.problems.push({
        x: Math.random() * xMax,
        y: -size,
        size,
        vy: this.currentProblemSpeed(),
        char: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      });
    }

    // ── move bullets ──
    this.bullets.forEach((b) => (b.y -= b.vy * dt));
    this.bullets = this.bullets.filter((b) => b.y + b.r > 0);

    // ── move problems ──
    this.problems.forEach((p) => (p.y += p.vy * dt));

    // ── handle bullet ↔ problem collisions ──
    this.bullets.forEach((b) => {
      this.problems.forEach((p) => {
        const dx = p.x + p.size / 2 - b.x;
        const dy = p.y + p.size / 2 - b.y;
        if (Math.hypot(dx, dy) < p.size / 2 + b.r) {
          this.score += 100;
          p.size = 0; // mark for deletion
          b.r = 0;
        }
      });
    });
    this.problems = this.problems.filter(
      (p) => p.size > 0 && p.y < this.canvasRef.nativeElement.clientHeight
    );
    this.bullets = this.bullets.filter((b) => b.r > 0);

    // ── check player collision ──
    for (const p of this.problems) {
      if (
        p.y + p.size > this.player.y &&
        p.x < this.player.x + this.player.size / 2 &&
        p.x + p.size > this.player.x - this.player.size / 2
      ) {
        this.running = false;
        this.gameOver = true;
        cancelAnimationFrame(this.raf);
        break;
      }
    }
  }

  private currentProblemSpeed(): number {
    return (
      this.PROBLEM_BASE_SPEED +
      this.PROBLEM_ACCEL * Math.floor(this.elapsedTotal / 10)
    );
  }

  /* ════════════ render step ════════════ */
  private render() {
    const c = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, c.clientWidth, c.clientHeight);

    // player
    this.ctx.font = `${this.player.size}px "Apple Color Emoji","Segoe UI Emoji"`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(this.player.char, this.player.x, this.player.y);

    // bullets
    this.ctx.fillStyle = '#14b8a6';
    this.bullets.forEach((b) => {
      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      this.ctx.fill();
    });

    // problems (emojis)
    this.problems.forEach((p) => {
      this.ctx.font = `${p.size}px "Apple Color Emoji","Segoe UI Emoji"`;
      this.ctx.textAlign = 'left';
      this.ctx.fillText(p.char, p.x, p.y);
    });
  }

  /* ════════════ helpers ════════════ */
  private bindControls() {
    // keyboard
    window.addEventListener('keydown', (e) => {
      if (!this.running) return;
      if (e.code === 'ArrowLeft') this.player.x -= this.player.speed / 12;
      if (e.code === 'ArrowRight') this.player.x += this.player.speed / 12;
      if (e.code === 'Space') this.fire();
    });

    // touch move & shoot
    const onTouchMove = (e: Event) => {
      if (!this.running) return;
      const t = (e as TouchEvent).touches[0];
      if (t) this.player.x = t.clientX;
    };
    (['touchstart', 'touchmove'] as const).forEach((evt) =>
      window.addEventListener(evt as keyof WindowEventMap, onTouchMove, {
        passive: true,
      })
    );
    window.addEventListener('touchend', () => this.fire(), { passive: true });
  }

  private fire() {
    if (!this.running) return;
    this.bullets.push({
      x: this.player.x,
      y: this.player.y,
      r: 6,
      vy: this.BULLET_SPEED,
    });
  }

  private resize() {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    this.ctx.scale(devicePixelRatio, devicePixelRatio);
  }
}

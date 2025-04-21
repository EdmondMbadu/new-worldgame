import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
} from '@angular/core';

interface Obstacle {
  x: number;
  y: number;
  size: number;
  vy: number;
  emoji: string; // 🔥 ⚔️ ☣️
}

interface PowerUp {
  x: number;
  y: number;
  size: number;
  vy: number;
  type: 'shield' | 'blaster';
}

interface Bullet {
  x: number;
  y: number;
  vy: number;
  size: number;
}

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css'],
})
export class GameComponent implements AfterViewInit, OnDestroy {
  /* ---------- Canvas ---------- */
  @ViewChild('gameCanvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private cw = 0;
  private ch = 0;
  private dpr = window.devicePixelRatio || 1;
  private groundY = 0;

  /* ---------- Player ---------- */
  private runnerX = 100;
  private runnerY = 0;
  private runnerW = 40;
  private runnerH = 60;
  private runnerV = 0;
  private gravity = 0.6;
  private jumpStrength = -13;
  private moveLeft = false;
  private moveRight = false;
  private readonly runnerSpeed = 6;

  /* ---------- Game objects ---------- */
  private obstacles: Obstacle[] = [];
  private powerUps: PowerUp[] = [];
  private bullets: Bullet[] = [];
  private hasShield = false;
  private blasterLevel = 1;

  /* ---------- Timing ---------- */
  private frame = 0;
  private animationId = 0;
  private lastShot = 0;
  private difficulty = 1;

  /* ---------- Public (bound) ---------- */
  public score = 0;
  public running = false;
  public gameOver = false;

  /* ---------- Lifecycle ---------- */
  ngAfterViewInit() {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.resizeCanvas();
    this.reset(false); // wait for Play
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animationId);
  }

  /* ---------- Resize & Hi‑DPI fix ---------- */
  @HostListener('window:resize')
  onResize() {
    this.resizeCanvas();
  }

  private resizeCanvas() {
    const canvas = this.canvasRef.nativeElement;
    // logical CSS pixels
    this.cw = canvas.clientWidth;
    this.ch = canvas.clientHeight;

    // match device pixels to avoid blur
    canvas.width = this.cw * this.dpr;
    canvas.height = this.ch * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);

    this.groundY = this.ch - 40;
  }

  /* ---------- Input ---------- */
  @HostListener('window:keydown', ['$event'])
  handleKeyDown(e: KeyboardEvent) {
    if (!this.running) return;
    switch (e.code) {
      case 'Space':
      case 'ArrowUp':
        this.jump();
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.moveLeft = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.moveRight = true;
        break;
      case 'KeyF':
        this.fire();
        break;
    }
  }

  @HostListener('window:keyup', ['$event'])
  handleKeyUp(e: KeyboardEvent) {
    if (!this.running) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.moveLeft = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') this.moveRight = false;
  }

  /* ---------- Controls ---------- */
  start() {
    this.reset(true);
    this.loop();
  }

  /* ---------- Main loop ---------- */
  private loop = () => {
    this.update();
    this.draw();
    if (this.running) this.animationId = requestAnimationFrame(this.loop);
  };

  /* ---------- Update ---------- */
  private update() {
    this.frame++;

    // increase difficulty every 7 s
    if (this.frame % 420 === 0) this.difficulty += 0.25;

    // player movement
    if (this.moveLeft) this.runnerX -= this.runnerSpeed;
    if (this.moveRight) this.runnerX += this.runnerSpeed;
    this.runnerX = Math.max(0, Math.min(this.cw - this.runnerW, this.runnerX));

    // gravity
    this.runnerV += this.gravity;
    this.runnerY += this.runnerV;
    if (this.runnerY > this.groundY - this.runnerH) {
      this.runnerY = this.groundY - this.runnerH;
      this.runnerV = 0;
    }

    // spawn stuff
    if (this.frame % 40 === 0) this.spawnObstacle();
    if (this.frame % 600 === 0) this.spawnPowerUp();

    // move world
    const speedFactor = this.difficulty;
    this.obstacles.forEach((o) => (o.y += o.vy * speedFactor));
    this.powerUps.forEach((p) => (p.y += p.vy * speedFactor));
    this.bullets.forEach((b) => (b.y -= b.vy));

    // cull
    this.obstacles = this.obstacles.filter((o) => o.y - o.size < this.ch);
    this.powerUps = this.powerUps.filter((p) => p.y - p.size < this.ch);
    this.bullets = this.bullets.filter((b) => b.y + b.size > 0);

    // bullet vs obstacle
    this.bullets.forEach((b) => {
      this.obstacles = this.obstacles.filter((o) => {
        const hit =
          b.x + b.size > o.x &&
          b.x < o.x + o.size &&
          b.y + b.size > o.y &&
          b.y < o.y + o.size;
        if (hit) this.score += 10;
        return !hit;
      });
    });

    // player vs power‑up
    this.powerUps = this.powerUps.filter((p) => {
      const hit =
        this.runnerX < p.x + p.size &&
        this.runnerX + this.runnerW > p.x &&
        this.runnerY < p.y + p.size &&
        this.runnerY + this.runnerH > p.y;
      if (hit) this.collectPowerUp(p.type);
      return !hit;
    });

    // player vs obstacle
    for (const o of this.obstacles) {
      const crash =
        this.runnerX < o.x + o.size &&
        this.runnerX + this.runnerW > o.x &&
        this.runnerY < o.y + o.size &&
        this.runnerY + this.runnerH > o.y;
      if (crash) {
        if (this.hasShield) {
          this.hasShield = false;
          this.obstacles = this.obstacles.filter((ob) => ob !== o);
        } else {
          this.endGame();
        }
        break;
      }
    }
  }

  /* ---------- Draw ---------- */
  private draw() {
    this.ctx.clearRect(0, 0, this.cw, this.ch);

    // ground
    this.ctx.fillStyle = 'rgba(0,0,0,0.15)';
    this.ctx.fillRect(0, this.groundY, this.cw, this.ch - this.groundY);

    // player – simple stick figure
    this.drawStickFigure(
      this.runnerX,
      this.runnerY,
      this.runnerW,
      this.runnerH,
      this.hasShield
    );

    // obstacles
    this.ctx.font = '36px serif';
    this.ctx.textBaseline = 'top';
    this.obstacles.forEach((o) => this.ctx.fillText(o.emoji, o.x, o.y));

    // power‑ups
    this.powerUps.forEach((p) => {
      this.ctx.fillStyle = p.type === 'shield' ? '#FDE047' : '#4ADE80';
      this.ctx.fillRect(p.x, p.y, p.size, p.size);
    });

    // bullets – fiery emoji
    this.ctx.font = '28px serif';
    this.bullets.forEach((b) => this.ctx.fillText('🔥', b.x, b.y));
  }

  /* ---------- Drawing helper ---------- */
  private drawStickFigure(
    x: number,
    y: number,
    w: number,
    h: number,
    shield: boolean
  ) {
    const ctx = this.ctx;
    const headR = w * 0.3;
    const bodyLen = h - headR * 2;

    ctx.save();
    ctx.strokeStyle = shield ? '#81E6D9' : '#0D9488';
    ctx.lineWidth = 3;

    // head
    ctx.beginPath();
    ctx.arc(x + w / 2, y + headR, headR, 0, Math.PI * 2);
    ctx.stroke();

    // body
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y + headR * 2);
    ctx.lineTo(x + w / 2, y + headR * 2 + bodyLen * 0.5);
    ctx.stroke();

    // arms
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y + headR * 2 + bodyLen * 0.25);
    ctx.lineTo(x, y + headR * 2 + bodyLen * 0.3);
    ctx.moveTo(x + w / 2, y + headR * 2 + bodyLen * 0.25);
    ctx.lineTo(x + w, y + headR * 2 + bodyLen * 0.3);
    ctx.stroke();

    // legs
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y + headR * 2 + bodyLen * 0.5);
    ctx.lineTo(x + w * 0.2, y + h);
    ctx.moveTo(x + w / 2, y + headR * 2 + bodyLen * 0.5);
    ctx.lineTo(x + w * 0.8, y + h);
    ctx.stroke();

    ctx.restore();
  }

  /* ---------- Helpers ---------- */
  private jump() {
    if (this.runnerY >= this.groundY - this.runnerH)
      this.runnerV = this.jumpStrength;
  }

  private fire() {
    const now = performance.now();
    const delay = 250 / this.blasterLevel;
    if (now - this.lastShot > delay) {
      this.bullets.push({
        x: this.runnerX + this.runnerW / 2 - 14,
        y: this.runnerY - 32,
        vy: 10,
        size: 28,
      });
      this.lastShot = now;
    }
  }

  private spawnObstacle() {
    const emojis = ['🔥', '⚔️', '☣️'];
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    const size = 36;
    const vy = 2 + Math.random() * 3;

    const drops = Math.random() < 0.3 ? 2 : 1;
    for (let i = 0; i < drops; i++) {
      this.obstacles.push({
        x: Math.random() * (this.cw - size),
        y: -size - i * 40,
        size,
        vy,
        emoji,
      });
    }
  }

  private spawnPowerUp() {
    const type: PowerUp['type'] = Math.random() < 0.5 ? 'shield' : 'blaster';
    const size = 28;
    const vy = 2;
    this.powerUps.push({
      x: Math.random() * (this.cw - size),
      y: -size,
      size,
      vy,
      type,
    });
  }

  private collectPowerUp(kind: PowerUp['type']) {
    if (kind === 'shield') this.hasShield = true;
    else this.blasterLevel = Math.min(this.blasterLevel + 1, 3);
    this.score += 20;
  }

  private endGame() {
    this.running = false;
    this.gameOver = true;
    cancelAnimationFrame(this.animationId);
  }

  private reset(autoRun = false) {
    this.score = 0;
    this.runnerX = 100;
    this.runnerY = this.groundY - this.runnerH;
    this.runnerV = 0;
    this.moveLeft = this.moveRight = false;
    this.hasShield = false;
    this.blasterLevel = 1;
    this.obstacles = [];
    this.powerUps = [];
    this.bullets = [];
    this.frame = 0;
    this.difficulty = 1;
    this.gameOver = false;
    this.running = autoRun;
  }
}

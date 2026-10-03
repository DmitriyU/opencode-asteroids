'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.points  = POINTS[size];   // recompensa al destruirlo
    this.burst   = size * 5;       // partículas de la explosión
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Estrella fugaz ────────────────────────────────────────────────────────────
const STAR_LIFETIME    = 7;     // segundos en pantalla antes de desvanecerse
const STAR_SPEED       = 210;   // px/s, más rápida que cualquier asteroide
const STAR_POINTS      = 300;   // recompensa por destruirla
const STAR_SPAWN_EVERY = 12;    // segundos entre apariciones

class ShootingStar extends Asteroid {
  constructor(x, y) {
    super(x, y, 1);
    this.points = STAR_POINTS;
    this.burst  = 22;

    // Conserva la dirección del padre pero con su propia velocidad
    const angle = Math.atan2(this.vy, this.vx);
    const speed = STAR_SPEED + rand(-25, 25);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this.ttl  = STAR_LIFETIME;
    this.life = STAR_LIFETIME;
  }

  update(dt) {
    super.update(dt);
    this.ttl -= dt;
    if (this.ttl <= 0) {
      this.dead = true;
      explode(this.x, this.y, 6);   // se desvanece dejando chispas
    }
  }

  split() { return []; }   // no se fragmenta al ser destruida

  draw() {
    // Parpadea justo antes de expirar
    if (this.ttl < 1.5 && Math.floor(this.ttl * 10) % 2 === 0) return;

    // Estela orientada hacia atrás respecto al avance
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.atan2(this.vy, this.vx));

    const tail = this.radius * rand(2.4, 3.6);
    const grad = ctx.createLinearGradient(-tail, 0, 0, 0);
    grad.addColorStop(0, 'rgba(255,190,60,0)');
    grad.addColorStop(1, 'rgba(255,245,200,0.9)');
    ctx.strokeStyle = grad;
    ctx.lineWidth   = 3;
    ctx.lineCap    = 'round';
    ctx.beginPath();
    ctx.moveTo(-tail, 0);
    ctx.lineTo(-this.radius * 0.3, 0);
    ctx.stroke();

    ctx.restore();

    // Cuerpo irregular heredado del asteroide
    super.draw();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
const BOOST_TIME  = 5;   // duración del power-up de velocidad x2
const TRIPLE_TIME = 5;   // duración del power-up de disparo x3

class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.speedBoost    = 0;   // segundos restantes de velocidad x2
    this.tripleShot    = 0;   // segundos restantes de disparo x3
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.speedBoost    > 0) this.speedBoost    -= dt;
    if (this.tripleShot    > 0) this.tripleShot    -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = 260;  // px/s²
    const DRAG   = 0.987;
    // El power-up duplica el empuje; la rotación se mantiene igual
    const BOOST = this.speedBoost > 0 ? 2 : 1;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * BOOST * dt;
      this.vy += Math.sin(this.angle) * THRUST * BOOST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  applySpeedBoost() {
    this.speedBoost = BOOST_TIME;
  }

  applyTripleShot() {
    this.tripleShot = TRIPLE_TIME;
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;

    if (this.tripleShot <= 0) return [new Bullet(ox, oy, this.angle)];

    // Tres disparos en línea recta: mismo ángulo, separados solo lateralmente
    const GAP = 10;
    const px = -Math.sin(this.angle);   // perpendicular a la proa
    const py =  Math.cos(this.angle);
    return [-GAP, 0, GAP].map(off => new Bullet(ox + px * off, oy + py * off, this.angle));
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo( 20,  0);   // nariz
    ctx.lineTo(-12, -9);   // ala izquierda
    ctx.lineTo( -7,  0);   // muesca trasera
    ctx.lineTo(-12,  9);   // ala derecha
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = 'rgba(255, 130, 0, 0.85)';
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Power-up (velocidad x2 / disparo x3) ───────────────────────────────────────
const MAGNET_DIST = 150;   // radio de atracción hacia la nave
const MAGNET_PULL = 420;   // fuerza de atracción (px/s²)

// Tipos posibles: color de trazo y etiqueta del HUD
const POWERUP_TYPES = {
  boost:  { color: '#0ff', label: 'VELOCIDAD x2' },
  triple: { color: '#f4f', label: 'DISPARO x3'   },
};

class PowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.type      = Math.random() < 0.5 ? 'boost' : 'triple';   // 50/50
    this.radius   = 10;
    this.rotSpeed = rand(-1.5, 1.5);
    this.rot      = rand(0, Math.PI * 2);
    this.ttl      = 20;   // segundos antes de desaparecer
    this.dead     = false;

    // Deriva lenta en una dirección aleatoria
    const angle = rand(0, Math.PI * 2);
    const speed = rand(15, 35);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  update(dt) {
    this.x  = wrap(this.x + this.vx * dt, W);
    this.y  = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
    this.ttl -= dt;
    // Parpadea al expirar
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    if (this.ttl < 2 && Math.floor(this.ttl * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = POWERUP_TYPES[this.type].color;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Rombo con doble punta hacia los lados (indica avance)
    ctx.beginPath();
    ctx.moveTo( 11, 0);
    ctx.lineTo(  0,  8);
    ctx.lineTo(-11, 0);
    ctx.lineTo(  0, -8);
    ctx.closePath();
    ctx.stroke();

    // Glifo interior: una barra = velocidad, tres barras = disparo triple
    ctx.beginPath();
    if (this.type === 'boost') {
      ctx.moveTo(-4, 0);
      ctx.lineTo( 4, 0);
    } else {
      for (const off of [-5, 0, 5]) {
        ctx.moveTo(off, -4);
        ctx.lineTo(off,  4);
      }
    }
    ctx.stroke();

    ctx.restore();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerUps;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let starTimer;  // cuenta atrás hasta la próxima estrella fugaz

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function spawnShootingStar() {
  const SAFE_DIST = 220;
  let x, y;
  do {
    x = rand(0, W);
    y = rand(0, H);
  } while (Math.hypot(x - ship.x, y - ship.y) < SAFE_DIST);
  asteroids.push(new ShootingStar(x, y));
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerUps  = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  spawnAsteroids(4);
  spawnShootingStar();
  starTimer = STAR_SPAWN_EVERY;
  powerUps.push(new PowerUp(rand(0, W), rand(0, H)));
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerUps  = [];
  ship.reset();
  spawnAsteroids(3 + level);
  spawnShootingStar();
  starTimer = STAR_SPAWN_EVERY;
  powerUps.push(new PowerUp(rand(0, W), rand(0, H)));
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  ship.speedBoost = 0;   // ningún power-up sobrevive a la muerte
  ship.tripleShot = 0;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  // Estrella fugaz: reaparece periódicamente mientras no haya una en pantalla
  starTimer -= dt;
  if (starTimer <= 0) {
    if (!asteroids.some(a => a instanceof ShootingStar)) spawnShootingStar();
    starTimer = STAR_SPAWN_EVERY + rand(-3, 3);
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  const DROP_CHANCE = 0.25;   // probabilidad de soltar un power-up
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += a.points;
        explode(a.x, a.y, a.burst);
        if (Math.random() < DROP_CHANCE) powerUps.push(new PowerUp(a.x, a.y));
        newAsteroids.push(...a.split());
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Power-ups (con imán: se sienten atraídos si la nave se acerca)
  powerUps.forEach(p => p.update(dt));
  for (const p of powerUps) {
    const d = dist(ship, p);
    if (d < MAGNET_DIST && d > 1) {
      p.vx += (ship.x - p.x) / d * MAGNET_PULL * dt;
      p.vy += (ship.y - p.y) / d * MAGNET_PULL * dt;
    }
  }
  powerUps = powerUps.filter(p => !p.dead);

  // Nave vs power-up
  if (!ship.dead) {
    for (const p of powerUps) {
      if (dist(ship, p) < ship.radius + p.radius * 3) {
        p.dead = true;
        if (p.type === 'boost') ship.applySpeedBoost();
        else ship.applyTripleShot();
        explode(p.x, p.y, 6);
        break;
      }
    }
    powerUps = powerUps.filter(p => !p.dead);
  }

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        killShip();
        break;
      }
    }
  }

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo( 9,  0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-3,  0);
  ctx.lineTo(-6,  5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

// Barra de tiempo restante en la esquina superior izquierda
function drawTimerBar(x, y, frac, color, label) {
  const w = 140, h = 8;
  frac = Math.max(0, Math.min(frac, 1));

  // Carril
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  // Relleno proporcional al tiempo restante
  ctx.globalAlpha = 1;
  ctx.fillRect(x, y, w * frac, h);

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.fillText(label, x, y + h + 13);
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  const star = asteroids.find(a => a instanceof ShootingStar);

  // Vida restante de la estrella fugaz
  let row = 40;
  if (star) {
    drawTimerBar(14, row, star.ttl / star.life, '#ffd24a', 'ESTRELLA FUGAZ');
    row += 34;
  }

  // Indicadores de power-ups con barra de tiempo restante
  if (!ship.dead && ship.speedBoost > 0) {
    const t = POWERUP_TYPES.boost;
    drawTimerBar(14, row, ship.speedBoost / BOOST_TIME, t.color, t.label);
    row += 34;
  }
  if (!ship.dead && ship.tripleShot > 0) {
    const t = POWERUP_TYPES.triple;
    drawTimerBar(14, row, ship.tripleShot / TRIPLE_TIME, t.color, t.label);
  }
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  bullets.forEach(b => b.draw());
  powerUps.forEach(p => p.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);

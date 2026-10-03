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

// ── Skins de la nave ──────────────────────────────────────────────────────────
const SKIN_KEY   = 'asteroids.skin';   // clave en localStorage
const SKIN_TASTE = 1.5;                // segundos que se muestra el nombre al cambiar

// Cada skin define su silueta en coordenadas locales de la nave más sus colores.
// La punta delantera se mantiene cerca de x = 20 porque la bala sale de NOSE (21),
// y la trasera cerca de x = -12 para no desalinear el radio de colisión.
const SKINS = [
  {
    id: 'clasica', name: 'CLÁSICA', stroke: '#fff', flame: 'rgba(255,130,0,0.85)',
    hull: [[ 20,  0], [-12, -9], [ -7,  0], [-12,  9]],
  },
  {
    id: 'delta', name: 'DELTA', stroke: '#0ff', flame: 'rgba(0,220,255,0.85)',
    hull: [[ 21,  0], [ -4, -5], [-13, -9], [ -9,  0], [-13,  9], [ -4,  5]],
  },
  {
    id: 'manta', name: 'MANTA', stroke: '#ffd24a', flame: 'rgba(255,170,40,0.9)',
    hull: [[ 20,  0], [-13,-13], [ -3, -4], [ -9,  0], [ -3,  4], [-13, 13]],
  },
  {
    id: 'cruz', name: 'CRUZ', stroke: '#7cff7c', flame: 'rgba(150,255,120,0.85)',
    hull: [[ -9,-10], [ -1,-10], [ -1, -4], [ 19, -4], [ 19,  4], [ -1,  4], [ -1, 10], [ -9, 10]],
  },
  {
    id: 'diamante', name: 'DIAMANTE', stroke: '#c58cff', flame: 'rgba(190,130,255,0.85)',
    hull: [[ 20,  0], [  3,-12], [-13, -4], [-13,  4], [  3, 12]],
  },
];

let skinIndex = 0;   // skin activa dentro de SKINS
let skinToast = 0;   // segundos restantes del nombre en pantalla

function loadSkin() {
  try {
    const saved = localStorage.getItem(SKIN_KEY);
    if (saved === null) return;
    const i = SKINS.findIndex(s => s.id === saved);
    if (i >= 0) skinIndex = i;
  } catch (e) {
    // localStorage puede estar bloqueado (file://, modo privado): se juega igual
  }
}

function setSkin(i) {
  skinIndex = i;
  skinToast = SKIN_TASTE;
  try {
    localStorage.setItem(SKIN_KEY, SKINS[i].id);
  } catch (e) {
    // sin persistencia la skin solo dura esta sesión, no es crítico
  }
}

// Silueta en coordenadas locales: el llamante ya translating/rotó y fijó lineWidth
function drawHull(skin) {
  ctx.strokeStyle = skin.stroke;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo(skin.hull[0][0], skin.hull[0][1]);
  for (let i = 1; i < skin.hull.length; i++)
    ctx.lineTo(skin.hull[i][0], skin.hull[i][1]);
  ctx.closePath();
  ctx.stroke();
}

// ── Ship ──────────────────────────────────────────────────────────────────────
const BOOST_TIME = 5;   // duración del power-up de velocidad x2

// Escudo: burbuja que se alza manteniendo pulsada Mayús y se recarga al soltarla
const SHIELD_RADIUS   = 22;    // radio de la burbuja alrededor de la nave
const SHIELD_DRAIN    = 0.34;  // energía/s consumida mientras se mantiene
const SHIELD_RECHARGE = 0.25;  // energía/s recuperada al soltarla
const SHIELD_MIN      = 0.15;  // carga mínima necesaria para volver a alzarla
const SHIELD_MIN_OUT  = 60;    // px/s mínimos de salida tras el rebote

class Ship {
  constructor() {
    this.shield = 1;   // energía del escudo (0-1), a tope en cada partida nueva
    this.reset();
  }

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
    // La energía del escudo no se reinicia aquí: sobrevive al reaparición y al
    // cambio de nivel; solo una partida nueva lo repone a tope
    this.shieldActive  = false;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.speedBoost    > 0) this.speedBoost    -= dt;

    // Escudo: se alza mientras haya energía y se mantenga Mayús pulsada.
    // Por debajo del mínimo no puede volver a levantarse hasta recargar.
    const holding = keys['ShiftLeft'] || keys['ShiftRight'];
    if (holding && this.shield > SHIELD_MIN) {
      this.shieldActive = true;
      this.shield = Math.max(0, this.shield - SHIELD_DRAIN * dt);
    } else {
      this.shieldActive = false;
      this.shield = Math.min(1, this.shield + SHIELD_RECHARGE * dt);
    }

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

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    const skin = SKINS[skinIndex];

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.lineWidth = 1.5;

    drawHull(skin);

    // Llama del propulsor, anclada al punto más trasero de la silueta
    if (this.thrusting && Math.random() > 0.35) {
      const tail = Math.min(...skin.hull.map(p => p[0])) + 2;
      ctx.beginPath();
      ctx.moveTo(tail, -4);
      ctx.lineTo(tail - rand(6, 14), 0);
      ctx.lineTo(tail, 4);
      ctx.strokeStyle = skin.flame;
      ctx.stroke();
    }

    // Burbuja de escudo, más tenue cuanto menos energía le queda
    if (this.shieldActive) {
      const low = this.shield < SHIELD_MIN * 2;
      if (!low || Math.floor(this.shield * 20) % 2 === 0) {
        ctx.strokeStyle = `rgba(120,220,255,${(0.25 + 0.4 * this.shield).toFixed(2)})`;
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.arc(0, 0, SHIELD_RADIUS, 0, Math.PI * 2);
        ctx.stroke();
      }
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

// ── Power-up (velocidad x2) ───────────────────────────────────────────────────
const MAGNET_DIST = 150;   // radio de atracción hacia la nave
const MAGNET_PULL = 420;   // fuerza de atracción (px/s²)

class PowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
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
    ctx.strokeStyle = '#0ff';
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

    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo( 4, 0);
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

// Rebote de un asteroide contra la burbuja: no muere ni puntúa, solo cambia de rumbo
function deflectAsteroid(a) {
  const dx = a.x - ship.x;
  const dy = a.y - ship.y;

  // El solapamiento a través del borde toroidal se ignora: la normal apuntaría
  // en sentido contrario y el rebote cruzaría la nave de lado a lado
  if (Math.abs(dx) > W / 2 || Math.abs(dy) > H / 2) return;

  const d  = Math.max(1, Math.hypot(dx, dy));
  const nx = dx / d;
  const ny = dy / d;

  // Reflexión especular de la velocidad sobre la normal
  const vn = a.vx * nx + a.vy * ny;
  a.vx -= 2 * vn * nx;
  a.vy -= 2 * vn * ny;

  // Empuje mínimo hacia fuera: un rebote rasante podría dejar al asteroide
  // rozando la burbuja y golpeándola de nuevo cada frame
  const out = a.vx * nx + a.vy * ny;
  if (out < SHIELD_MIN_OUT) {
    a.vx += nx * (SHIELD_MIN_OUT - out);
    a.vy += ny * (SHIELD_MIN_OUT - out);
  }

  explode(a.x, a.y, 4);
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  ship.speedBoost   = 0;   // el boost no sobrevive a la muerte
  ship.shieldActive = false;   // la burbuja se apaga; la energía sí se conserva
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
  // Cambio de skin: por encima de la máquina de estados para funcionar en todos
  if (pressed('KeyC')) setSkin((skinIndex + 1) % SKINS.length);
  if (skinToast > 0) skinToast -= dt;

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
        ship.applySpeedBoost();
        explode(p.x, p.y, 6);
        break;
      }
    }
    powerUps = powerUps.filter(p => !p.dead);
  }

  // Escudo: los asteroides rebotan contra la burbuja sin hacer daño
  if (!ship.dead && ship.shieldActive) {
    for (const a of asteroids) {
      if (dist(ship, a) < SHIELD_RADIUS + a.radius) deflectAsteroid(a);
    }
  }

  // Nave vs asteroide. Con el escudo alzado no hay daño: el rebote empuja al
  // asteroide hacia fuera, pero el solapamiento que ya existía en el frame en
  // que se levantó la burbuja lo dejaría dentro del radio de impacto
  if (ship.invincible <= 0 && !ship.shieldActive) {
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
  ctx.scale(0.45, 0.45);
  // lineWidth escala con la transformación: 2.4 deja un trazo de ~1.2px en pantalla
  ctx.lineWidth = 2.4;
  drawHull(SKINS[skinIndex]);
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

  // Indicador de velocidad x2 con barra de tiempo restante
  if (!ship.dead && ship.speedBoost > 0) {
    drawTimerBar(14, row, ship.speedBoost / BOOST_TIME, '#0ff', 'VELOCIDAD x2');
row += 34;
  }

  // Energía del escudo: visible mientras está activo o aún recargándose
  if (!ship.dead && (ship.shieldActive || ship.shield < 1))
    drawTimerBar(14, row, ship.shield, '#78dcff', 'ESCUDO');

  // Nombre de la skin recién elegida, abajo al centro y desvaneciéndose
  if (skinToast > 0) {
    const skin = SKINS[skinIndex];
    ctx.save();
    ctx.globalAlpha = Math.min(1, skinToast);
    ctx.textAlign   = 'center';
    ctx.fillStyle   = skin.stroke;
    ctx.font        = '16px monospace';
    ctx.fillText(`SKIN: ${skin.name}`, W / 2, H - 28);
    ctx.restore();
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

loadSkin();   // antes que initGame: reiniciar con Espacio no debe borrar la elección
initGame();
requestAnimationFrame(loop);

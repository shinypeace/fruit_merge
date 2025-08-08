import { FRUIT_DEFS, getFruitDef, preloadAllImages, getCachedImage } from './fruit.js';
import { ParticleSystem } from './particles.js';

const {
  Engine, Render, Runner, World, Bodies, Body, Events, Composite, Constraint, Detector, Query
} = Matter;

// Canvas and scaling
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Logical size in game units (pixels)
const LOGICAL_WIDTH = 540;
const LOGICAL_HEIGHT = 960;

// UI elements
const menuScreen = document.getElementById('menu-screen');
const statsScreen = document.getElementById('stats-screen');
const pauseScreen = document.getElementById('pause-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const hud = document.getElementById('hud');
const scoreValueEl = document.getElementById('score-value');
const comboBannerEl = document.getElementById('combo-banner');
const finalScoreEl = document.getElementById('final-score');

const playBtn = document.getElementById('play-btn');
const statsBtn = document.getElementById('stats-btn');
const backFromStatsBtn = document.getElementById('back-from-stats');
const resetStatsBtn = document.getElementById('reset-stats');
const pauseBtn = document.getElementById('pause-btn');
const resumeBtn = document.getElementById('resume-btn');
const retryBtn = document.getElementById('retry-btn');
const retryBtn2 = document.getElementById('retry-btn-2');
const toMenuBtn = document.getElementById('to-menu-btn');
const toMenuBtn2 = document.getElementById('to-menu-btn-2');

const statBest = document.getElementById('stat-best');
const statGames = document.getElementById('stat-games');
const statMerges = document.getElementById('stat-merges');
const statMaxCombo = document.getElementById('stat-max-combo');
const statMaxFruit = document.getElementById('stat-max-fruit');
const statPlaytime = document.getElementById('stat-playtime');

// Game state
let engine, world, runner;
let fruits = [];
let walls = [];
let currentFruit = null;
let score = 0;
let isPaused = false;
let isGameOver = false;
let combo = 0;
let maxCombo = 0;
let totalMerges = 0;
let maxFruitLevel = 0;
let dropX = LOGICAL_WIDTH / 2;
let canDrop = true;
let lastDropTime = 0;
let playStartTime = 0;

// Particles
const particles = new ParticleSystem(ctx);

// Responsive sizing
function resizeCanvas() {
  const wrapper = document.getElementById('game-wrapper');
  const rect = wrapper.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  const scaleX = rect.width / LOGICAL_WIDTH;
  const scaleY = rect.height / LOGICAL_HEIGHT;
  ctx.setTransform(dpr * scaleX, 0, 0, dpr * scaleY, 0, 0);
}
window.addEventListener('resize', resizeCanvas);

function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

function setScreen(screen) {
  hide(menuScreen); hide(statsScreen); hide(pauseScreen); hide(gameoverScreen); hide(hud);
  if (screen === 'menu') show(menuScreen);
  if (screen === 'stats') show(statsScreen);
  if (screen === 'pause') show(pauseScreen);
  if (screen === 'gameover') show(gameoverScreen);
  if (screen === 'game') show(hud);
}

function initPhysics() {
  engine = Engine.create({ enableSleeping: true });
  world = engine.world;
  world.gravity.y = 1.0; // tuned for juicy bounces

  // Boundaries
  const wallThickness = 50;
  const groundY = LOGICAL_HEIGHT - 20;
  const left = Bodies.rectangle(-wallThickness / 2, LOGICAL_HEIGHT / 2, wallThickness, LOGICAL_HEIGHT, { isStatic: true, restitution: 0.2 });
  const right = Bodies.rectangle(LOGICAL_WIDTH + wallThickness / 2, LOGICAL_HEIGHT / 2, wallThickness, LOGICAL_HEIGHT, { isStatic: true, restitution: 0.2 });
  const ground = Bodies.rectangle(LOGICAL_WIDTH / 2, groundY + wallThickness / 2, LOGICAL_WIDTH, wallThickness, { isStatic: true, restitution: 0.05 });
  const ceiling = Bodies.rectangle(LOGICAL_WIDTH / 2, -wallThickness / 2, LOGICAL_WIDTH, wallThickness, { isStatic: true });

  walls = [left, right, ground, ceiling];
  World.add(world, walls);

  // Collisions for merging
  Events.on(engine, 'collisionStart', handleCollision);
}

function randomStartLevel() {
  // Slightly biased towards smaller fruits
  const r = Math.random();
  if (r < 0.6) return 0;
  if (r < 0.85) return 1;
  return 2;
}

function spawnFruit(x, level = randomStartLevel()) {
  const def = getFruitDef(level);
  const body = Bodies.circle(x, 60, def.radius, {
    restitution: 0.45,
    friction: 0.01,
    frictionAir: 0.002,
    label: `fruit_${level}`,
    render: { visible: false },
  });
  body.plugin = { level };
  Body.setStatic(body, true);
  World.add(world, body);
  fruits.push(body);
  currentFruit = body;
  canDrop = false;
  lastDropTime = performance.now();
}

function handleCollision(evt) {
  for (const pair of evt.pairs) {
    const a = pair.bodyA; const b = pair.bodyB;
    if (!a.plugin || !b.plugin) continue;
    const la = a.plugin.level; const lb = b.plugin.level;
    if (la !== lb) continue;

    // Distance check to ensure centers are within merge threshold
    const dx = a.position.x - b.position.x;
    const dy = a.position.y - b.position.y;
    const dist = Math.hypot(dx, dy);
    const def = getFruitDef(la);
    if (dist > def.radius * 0.9 + def.radius * 0.9) continue;

    // Merge
    mergeFruits(a, b, la + 1);
  }
}

function mergeFruits(a, b, newLevel) {
  if (!fruits.includes(a) || !fruits.includes(b)) return;

  const pos = {
    x: (a.position.x + b.position.x) / 2,
    y: (a.position.y + b.position.y) / 2,
  };

  // Remove old
  World.remove(world, a);
  World.remove(world, b);
  fruits = fruits.filter(f => f !== a && f !== b);

  // Score and combo
  const earned = getFruitDef(newLevel - 1).score;
  score += earned;
  combo += 1;
  maxCombo = Math.max(maxCombo, combo);
  totalMerges += 1;
  maxFruitLevel = Math.max(maxFruitLevel, newLevel);
  flashCombo(combo, earned);

  // Particles
  const color = getFruitDef(newLevel - 1).color;
  particles.emitBurst(pos.x, pos.y, color, 24 + Math.floor(Math.random() * 18));

  // Spawn new higher fruit
  const cappedLevel = Math.min(newLevel, FRUIT_DEFS.length - 1);
  const def = getFruitDef(cappedLevel);
  const merged = Bodies.circle(pos.x, pos.y, def.radius, {
    restitution: 0.47,
    friction: 0.01,
    frictionAir: 0.002,
    label: `fruit_${cappedLevel}`,
    render: { visible: false },
  });
  merged.plugin = { level: cappedLevel };
  World.add(world, merged);
  fruits.push(merged);
}

function flashCombo(c, earned) {
  scoreValueEl.textContent = score.toString();
  comboBannerEl.textContent = c > 1 ? `Комбо x${c} • +${earned}` : `+${earned}`;
  comboBannerEl.classList.remove('hidden');
  comboBannerEl.classList.add('show');
  clearTimeout(flashCombo._t);
  flashCombo._t = setTimeout(() => {
    comboBannerEl.classList.add('hidden');
    comboBannerEl.classList.remove('show');
    combo = 0; // reset window
  }, 900);
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Playfield rounded rect
  const w = LOGICAL_WIDTH; const h = LOGICAL_HEIGHT;
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.02)';
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 2;
  roundRect(8, 8, w - 16, h - 16, 24);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFruits() {
  for (const f of fruits) {
    const level = f.plugin.level;
    const def = getFruitDef(level);
    const img = getCachedImage(def.sprite);
    const x = f.position.x; const y = f.position.y; const r = def.radius;

    // Drop shadow
    ctx.save();
    ctx.filter = 'drop-shadow(0px 8px 16px rgba(0,0,0,0.45))';
    ctx.translate(x, y);
    ctx.rotate(f.angle);

    // Glossy sprite circle mask
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    if (img) {
      ctx.drawImage(img, -r, -r, r * 2, r * 2);
    } else {
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    }

    // Gloss layer
    const g = ctx.createLinearGradient(-r, -r, r, r);
    g.addColorStop(0, 'rgba(255,255,255,0.35)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.05)');
    g.addColorStop(1, 'rgba(0,0,0,0.15)');
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = g;
    ctx.fillRect(-r, -r, r * 2, r * 2);

    ctx.restore();

    // Rim light
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r - 1, 0, Math.PI * 2); ctx.stroke();

    ctx.restore();
  }
}

function drawAim() {
  if (!currentFruit) return;
  const y = 40;
  ctx.save();
  ctx.globalAlpha = 0.8;
  const grd = ctx.createLinearGradient(dropX - 60, y, dropX + 60, y);
  grd.addColorStop(0, 'rgba(126,240,255,0.0)');
  grd.addColorStop(0.5, 'rgba(126,240,255,0.8)');
  grd.addColorStop(1, 'rgba(255,134,215,0.0)');
  ctx.strokeStyle = grd;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(dropX - 60, y);
  ctx.lineTo(dropX + 60, y);
  ctx.stroke();
  ctx.restore();
}

function gameLoop(time) {
  if (!engine) return;
  if (!isPaused) Engine.update(engine, 1000 / 60);

  drawBackground();
  drawFruits();
  drawAim();
  particles.update(1/60);
  particles.draw();

  // Check game over (fruit above ceiling)
  if (!isGameOver) {
    for (const f of fruits) {
      if (f.position.y < 10) {
        endGame();
        break;
      }
    }
  }

  requestAnimationFrame(gameLoop);
}

function endGame() {
  isGameOver = true;
  saveStatsOnGameOver();
  finalScoreEl.textContent = String(score);
  setScreen('gameover');
}

function resetGame() {
  if (engine) {
    // Remove all bodies except walls
    for (const b of fruits) World.remove(world, b);
    fruits = [];
    currentFruit = null;
  }
  score = 0;
  combo = 0;
  maxCombo = 0;
  totalMerges = 0;
  maxFruitLevel = 0;
  isPaused = false;
  isGameOver = false;
  canDrop = true;
  dropX = LOGICAL_WIDTH / 2;
  scoreValueEl.textContent = '0';
}

function startGame() {
  setScreen('game');
  resetGame();
  if (!engine) initPhysics();
  playStartTime = performance.now();
  spawnFruit(dropX);
}

function togglePause() {
  if (isGameOver) return;
  isPaused = !isPaused;
  if (isPaused) setScreen('pause'); else setScreen('game');
}

// Input
canvas.addEventListener('pointermove', (e) => {
  if (!currentFruit || isPaused || isGameOver) return;
  const rect = canvas.getBoundingClientRect();
  const nx = (e.clientX - rect.left) / rect.width; // 0..1
  dropX = Math.max(40, Math.min(LOGICAL_WIDTH - 40, nx * LOGICAL_WIDTH));
  if (currentFruit && currentFruit.isStatic) {
    Body.setPosition(currentFruit, { x: dropX, y: 60 });
  }
});
canvas.addEventListener('pointerdown', (e) => {
  if (!currentFruit || isPaused || isGameOver) return;
  if (!canDrop && performance.now() - lastDropTime < 300) return;
  // Release current fruit (allow it to fall)
  Body.setStatic(currentFruit, false);
  currentFruit = null;
  canDrop = true;
  // Queue next spawn after short delay
  setTimeout(() => spawnFruit(dropX), 250);
});

// Buttons
playBtn.addEventListener('click', () => startGame());
statsBtn.addEventListener('click', () => { updateStatsUI(); setScreen('stats'); });
backFromStatsBtn.addEventListener('click', () => setScreen('menu'));
resetStatsBtn.addEventListener('click', () => { localStorage.removeItem('fruit_merge_stats'); updateStatsUI(); });
pauseBtn.addEventListener('click', () => togglePause());
resumeBtn.addEventListener('click', () => togglePause());
retryBtn.addEventListener('click', () => { setScreen('game'); startGame(); });
retryBtn2.addEventListener('click', () => { setScreen('game'); startGame(); });
toMenuBtn.addEventListener('click', () => { setScreen('menu'); });
toMenuBtn2.addEventListener('click', () => { setScreen('menu'); });

// Stats persistence
function loadStats() {
  try {
    const raw = localStorage.getItem('fruit_merge_stats');
    if (!raw) return { best: 0, games: 0, merges: 0, maxCombo: 0, maxFruit: 0, playtimeMs: 0 };
    return JSON.parse(raw);
  } catch { return { best: 0, games: 0, merges: 0, maxCombo: 0, maxFruit: 0, playtimeMs: 0 }; }
}
function saveStatsOnGameOver() {
  const stats = loadStats();
  stats.best = Math.max(stats.best, score);
  stats.games += 1;
  stats.merges += totalMerges;
  stats.maxCombo = Math.max(stats.maxCombo, maxCombo);
  stats.maxFruit = Math.max(stats.maxFruit, maxFruitLevel);
  stats.playtimeMs += Math.max(0, performance.now() - playStartTime);
  localStorage.setItem('fruit_merge_stats', JSON.stringify(stats));
}
function updateStatsUI() {
  const s = loadStats();
  statBest.textContent = String(s.best);
  statGames.textContent = String(s.games);
  statMerges.textContent = String(s.merges);
  statMaxCombo.textContent = String(s.maxCombo);
  statMaxFruit.textContent = getFruitDef(s.maxFruit)?.name ?? '—';
  const mins = Math.round(s.playtimeMs / 60000);
  statPlaytime.textContent = `${mins} мин`;
}

// Boot
(async function boot() {
  setScreen('menu');
  resizeCanvas();
  updateStatsUI();
  // Preload images with a small shimmer on the logo
  await preloadAllImages();
  Runner.stop(runner);
  runner = Runner.create();
  requestAnimationFrame(gameLoop);
})();
/* Metaball grid — full‑screen toggle, 160 px spacing, 80 px margin
   mic‑reactive size & field strength with explicit volume range
---------------------------------------------------------------- */
let metaballShader;

/* ───────── microphone controls ───────── */
const MIN_VOL   = 0.10;   // treat below 3 % as silence
const MAX_VOL   = 0.60;   // treat above 60 % as full volume
const GAIN      =  6.0;   // extra boost after mapping (set 1 to disable)
const smoothK   = 0.08;   // smoothing factor (lower = steadier)

let mic, amplitude, smoothedVol = 0;

/* blob‑field parameters */
const minStrength = 0.20;
const maxStrength = 12.00;

/* dot size scaling */
const minScale = 0.5;     // quiet → 50 % of wobble size
const maxScale = 2.0;     // loud  → 200 %

/* ───────── grid settings ───────── */
const spacing = 160;
const marginL = spacing / 2;  // 80 px
const marginT = spacing / 2;
const dotSize = 50;
const dots    = [];

/* helper: clamped map */
function mapClamp(v, a1, a2, b1, b2) {
  return constrain(map(v, a1, a2, b1, b2), min(b1, b2), max(b1, b2));
}

/* ───────── Dot class ───────── */
class Dot {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.curr = random(10, dotSize);          // current diameter
    this.tgt  = random(10, dotSize);          // target diameter
    this.next = millis() + random(1000, 3000);
  }
  update(vol) {
    /* pick a new wobble target every 1‑3 s */
    if (millis() > this.next) {
      this.tgt  = random(10, dotSize);
      this.next = millis() + random(1000, 3000);
    }
    /* faster easing when volume low, smoother when loud */
    const lerpF = mapClamp(vol, 0, 0.7, 0.25, 0.04);
    this.curr   = lerp(this.curr, this.tgt, lerpF);
  }
  radius(scale) { return this.curr * 0.5 * scale; }
}

/* ───────── p5 lifecycle ───────── */
function preload() {
  metaballShader = loadShader('shaders/meta.vert', 'shaders/meta.frag');
}

function setup() {
  pixelDensity(1);                              // sync CSS & GL pixels
  createCanvas(windowWidth, windowHeight, WEBGL);
  noStroke();
  rectMode(CENTER);

  mic       = new p5.AudioIn();
  amplitude = new p5.Amplitude();
  mic.start(() => amplitude.setInput(mic));

  buildGrid();
}

function draw() {
  background(0);

  /* ── mic level normalisation ── */
  let raw = amplitude.getLevel();                         // 0–1 (≈0–0.3)
  raw = map(raw, MIN_VOL, MAX_VOL, 0, 1);                 // apply range
  raw = constrain(raw * GAIN, 0, 1);                      // boost + clamp

  smoothedVol = lerp(smoothedVol, raw, smoothK);

  const strength  = map(smoothedVol, 0, 1, minStrength, maxStrength);
  const sizeScale = map(smoothedVol, 0, 1, minScale,    maxScale);

  /* ── update dots & pack uniforms ── */
  const buf = new Float32Array(dots.length * 3);
  dots.forEach((d, i) => {
    d.update(smoothedVol);
    const j = 3 * i;
    buf[j]     = d.x + width  / 2;          // X pixel
    buf[j + 1] = d.y + height / 2;          // Y pixel
    buf[j + 2] = d.radius(sizeScale);       // radius scaled by volume
  });

  shader(metaballShader);
  metaballShader.setUniform('iResolution', [width, height]);
  metaballShader.setUniform('dots',       buf);
  metaballShader.setUniform('dotCount',   dots.length);
  metaballShader.setUniform('uStrength',  strength);

  rect(0, 0, width, height);               // full‑screen quad
}

/* ───────── responsive grid ───────── */
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  buildGrid();
}

function buildGrid() {
  dots.length = 0;
  const startX = -width  / 2 + marginL;
  const startY = -height / 2 + marginT;
  for (let y = startY; y <= height / 2; y += spacing) {
    for (let x = startX; x <= width  / 2; x += spacing) {
      dots.push(new Dot(x, y));
    }
  }
}

/* ───────── full‑screen toggle ───────── */
function keyPressed() {
  if (key === 'f' || key === 'F') fullscreen(!fullscreen());
  if (keyCode === 27) fullscreen(false);   // Esc
}

/* ───────── mobile autoplay unlock ───────── */
function touchStarted() {
  if (getAudioContext().state !== 'running')
    getAudioContext().resume();
}

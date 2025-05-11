/* Metaball grid — full‑screen, mic‑reactive size & merging
   160 px spacing, 80 px margin (left & top)
---------------------------------------------------------------- */
let metaballShader;

/* ── microphone normalisation ───────────────────────────── */
const MIN_VOL = 0.20;     // below this = silence   (adjust!)
const MAX_VOL = 0.60;     // above this = full loud (adjust!)
const GAIN    = 6.0;      // extra boost after mapping (set 1 to disable)
const smoothK = 0.08;     // smoothing factor

let mic, amplitude, smoothedVol = 0;

/* ── blob field strength range ──────────────────────────── */
const minStrength = 0.05;   // very weak in silence
const maxStrength = 4.00;   // strong when loud

/* ── dot size scaling range ─────────────────────────────── */
const minScale = 0.5;       // shrink to 50 % in silence
const maxScale = 2.0;       // grow to 200 % in loud sound

/* ── grid layout ────────────────────────────────────────── */
const spacing = 160;
const marginL = spacing / 2;  // 80 px
const marginT = spacing / 2;
const dotSize = 50;           // wobble diameter range
const dots    = [];

/* helper: clamped map ------------------------------------ */
function mapClamp(v, a1, a2, b1, b2) {
  return constrain(map(v, a1, a2, b1, b2), min(b1, b2), max(b1, b2));
}

/* ── Dot class ─────────────────────────────────────────── */
class Dot {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.curr = random(10, dotSize);      // current diameter
    this.tgt  = random(10, dotSize);      // target diameter
    this.next = millis() + random(1000, 3000);
  }
  update(vol) {
    /* pick a new wobble target every 1‑3 s */
    if (millis() > this.next) {
      this.tgt  = random(10, dotSize);
      this.next = millis() + random(1000, 3000);
    }
    /* quiet  → faster shrink; loud → smoother growth */
    const lerpF = mapClamp(vol, 0, 0.7, 0.25, 0.04);
    this.curr   = lerp(this.curr, this.tgt, lerpF);
  }
  radius(scale) { return this.curr * 0.5 * scale; }
}

/* ── p5 lifecycle ───────────────────────────────────────── */
function preload() {
  metaballShader = loadShader('shaders/meta.vert', 'shaders/meta.frag');
}

function setup() {
  pixelDensity(1);                   // keep CSS & GL pixels aligned
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

  /* ---- mic level → smoothedVol (0‑1) ------------------- */
  let raw = amplitude.getLevel();                        // 0‑‑1 (≈0‑0.3)
  raw = (raw - MIN_VOL) / (MAX_VOL - MIN_VOL);           // linear map
  raw = constrain(raw, 0, 1);                            // clamp 0‑1
  raw = constrain(raw * GAIN, 0, 1);                     // optional boost
  smoothedVol = lerp(smoothedVol, raw, smoothK);

  /* derive parameters from smoothed volume --------------- */
  const sizeScale = lerp(minScale,    maxScale,    smoothedVol);
  const strength  = lerp(minStrength, maxStrength, smoothedVol);

  /* update dots, build uniform buffer -------------------- */
  const buf = new Float32Array(dots.length * 3);
  dots.forEach((d, i) => {
    d.update(smoothedVol);
    const j = 3 * i;
    buf[j]     = d.x + width  / 2;
    buf[j + 1] = d.y + height / 2;
    buf[j + 2] = d.radius(sizeScale);
  });

  /* render ----------------------------------------------- */
  shader(metaballShader);
  metaballShader.setUniform('iResolution', [width, height]);
  metaballShader.setUniform('dots',       buf);
  metaballShader.setUniform('dotCount',   dots.length);
  metaballShader.setUniform('uStrength',  strength);

  rect(0, 0, width, height);           // full‑screen quad
}

/* ── responsive grid -------------------------------------- */
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

/* ── full‑screen toggle (F / Esc) ------------------------- */
function keyPressed() {
  if (key === 'f' || key === 'F') fullscreen(!fullscreen());
  if (keyCode === 27) fullscreen(false);
}

/* ── mobile autoplay unlock ------------------------------- */
function touchStarted() {
  if (getAudioContext().state !== 'running')
    getAudioContext().resume();
}

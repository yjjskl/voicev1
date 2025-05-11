/* Metaball grid — lively and responsive version
---------------------------------------------------------------- */
let metaballShader;

/* ───────── microphone controls ───────── */
const MIN_VOL = 0.02;   // treat <2 % as silence
const MAX_VOL = 0.60;   // >60 % = full volume
const GAIN    = 10.0;   // boost the mapped value
const smoothK = 0.08;   // volume smoothing

let mic, amplitude, smoothedVol = 0;

/* blob field strength range */
const minStrength = 0.05;
const maxStrength = 4.00;

/* dot size scaling range */
const minScale = 0.8;   // quiet: 80 % of base
const maxScale = 3.0;   // loud : 300 % of base

/* ───────── grid settings ───────── */
const spacing = 160;
const marginL = spacing / 2;   // 80 px left margin
const marginT = spacing / 2;   // 80 px top  margin
const dotSize = 50;            // wobble diameter range
const dots    = [];

/* helper --------------------------------------------------- */
function mapClamp(v, a1, a2, b1, b2) {
  return constrain(map(v, a1, a2, b1, b2), min(b1, b2), max(b1, b2));
}

/* Dot class ------------------------------------------------ */
class Dot {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.curr = random(10, dotSize);
    this.tgt  = random(10, dotSize);
    this.next = millis() + random(1000, 3000);
  }
  update(vol) {
    if (millis() > this.next) {
      this.tgt  = random(10, dotSize);
      this.next = millis() + random(1000, 3000);
    }
    const lerpF = mapClamp(vol, 0, 0.7, 0.25, 0.04);
    this.curr   = lerp(this.curr, this.tgt, lerpF);
  }
  radius(scale) { return this.curr * 0.5 * scale; }
}

/* p5 lifecycle -------------------------------------------- */
function preload() {
  metaballShader = loadShader('shaders/meta.vert', 'shaders/meta.frag');
}

function setup() {
  pixelDensity(1);
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

  /* ---- mic volume mapping --------------------------------- */
  let raw = amplitude.getLevel();                       // 0‑‑1
  raw = (raw - MIN_VOL) / (MAX_VOL - MIN_VOL);          // map to 0‑1
  raw = constrain(raw, 0, 1);
  raw = constrain(raw * GAIN, 0, 1);                    // boost
  smoothedVol = lerp(smoothedVol, raw, smoothK);

  const sizeScale = lerp(minScale,    maxScale,    smoothedVol);
  const strength  = lerp(minStrength, maxStrength, smoothedVol);

  /* update dots & pack buffer -------------------------------- */
  const buf = new Float32Array(dots.length * 3);
  dots.forEach((d, i) => {
    d.update(smoothedVol);
    const j = 3 * i;
    buf[j]     = d.x + width  / 2;
    buf[j + 1] = d.y + height / 2;
    buf[j + 2] = d.radius(sizeScale);
  });

  /* render --------------------------------------------------- */
  shader(metaballShader);
  metaballShader.setUniform('iResolution', [width, height]);
  metaballShader.setUniform('dots',       buf);
  metaballShader.setUniform('dotCount',   dots.length);
  metaballShader.setUniform('uStrength',  strength);
  rect(0, 0, width, height);
}

/* responsive grid ----------------------------------------- */
function windowResized() { resizeCanvas(windowWidth, windowHeight); buildGrid(); }
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

/* full‑screen toggle -------------------------------------- */
function keyPressed() {
  if (key === 'f' || key === 'F') fullscreen(!fullscreen());
  if (keyCode === 27) fullscreen(false);
}

/* mobile autoplay unlock ---------------------------------- */
function touchStarted() {
  if (getAudioContext().state !== 'running')
    getAudioContext().resume();
}

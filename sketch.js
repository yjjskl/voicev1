/* Metaball grid — press F for full‑screen, Esc to exit
   160 px spacing, 80 px margin (left + top only)
   Dot diameter never below 40 px, but still breathes with mic volume
------------------------------------------------------------------- */
let metaballShader;

/* ── microphone controls ── */
let mic, amplitude, smoothedVol = 0;
const smoothK     = 0.08;   // smoothing factor
const minStrength = 2.0;    // blob field at silence
const maxStrength = 8.0;    // blob field at loud volume

/* ── grid settings ── */
const spacing = 160;
const marginL = spacing / 2;   // 80 px
const marginT = spacing / 2;
const dotSize = 80;            // upper limit of random wobble
const MIN_DIAM = 40;           // absolute minimum diameter
const dots    = [];

/* ---------------------------------------------------------- */
class Dot {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.curr = random(MIN_DIAM, dotSize);      // ≥ 40 px
    this.tgt  = random(MIN_DIAM, dotSize);
    this.next = millis() + random(1000, 3000);  // 1–3 s
  }
  update() {
    if (millis() > this.next) {
      this.tgt  = random(MIN_DIAM, dotSize);
      this.next = millis() + random(1000, 3000);
    }
    this.curr = lerp(this.curr, this.tgt, 0.05);
  }
  r() { return this.curr * 0.5; }               // radius, no cap
}

/* ---------------------------------------------------------- */
function preload() {
  metaballShader = loadShader('shaders/meta.vert','shaders/meta.frag');
}

function setup() {
  pixelDensity(1);                              // sync CSS & GL pixels
  createCanvas(windowWidth, windowHeight, WEBGL);
  noStroke(); rectMode(CENTER);

  mic       = new p5.AudioIn();
  amplitude = new p5.Amplitude();
  mic.start(() => amplitude.setInput(mic));     // ask permission

  buildGrid();
}

function draw() {
  background(0);

  /* mic loudness -> smoothedVol (0‑1) -------------------- */
  smoothedVol = lerp(
    smoothedVol,
    constrain(amplitude.getLevel() * 3.0, 0, 1),   // gain = 3
    smoothK
  );

  /* map volume to field strength & size scaling ---------- */
  const strength  = lerp(minStrength, maxStrength, smoothedVol);
  const sizeScale = lerp(0.2,         2.0,         smoothedVol);
  // quiet → ×0.5, loud → ×2.0

  /* pack dot uniforms ------------------------------------ */
  const buf = new Float32Array(dots.length * 3);
  dots.forEach((d, i) => {
    d.update();
    const j = 3 * i;
    buf[j]     = d.x + width  / 2;            // X pixel
    buf[j + 1] = d.y + height / 2;            // Y pixel
    buf[j + 2] = d.r() * sizeScale;           // radius scaled by volume
  });

  shader(metaballShader);
  metaballShader.setUniform('iResolution', [width, height]);
  metaballShader.setUniform('dots',       buf);
  metaballShader.setUniform('dotCount',   dots.length);
  metaballShader.setUniform('uStrength',  strength);

  rect(0, 0, width, height);                // full‑screen quad
}

/* ---------------------------------------------------------- */
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

/* -------- full‑screen & audio‑context unlock -------------- */
function keyPressed() {
  if (key === 'f' || key === 'F') fullscreen(!fullscreen());
  if (keyCode === 27)             fullscreen(false);
}

function resumeAudio() {
  if (getAudioContext().state !== 'running')
    getAudioContext().resume();
}
function mousePressed() { resumeAudio(); }
function touchStarted() { resumeAudio(); }

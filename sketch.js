/* Metaball grid — full‑screen toggle, 160 px spacing,
   80 px margin (left & top), mic‑reactive easing & merging
---------------------------------------------------------------- */
let metaballShader;

/* ── mic vars ── */
let mic, amplitude, smoothedVol = 0;
const minStrength = 1.00;
const maxStrength = 12.00;
const smoothK     = 0.08;

/* ── grid settings ── */
const spacing = 160;
const marginL = spacing / 2;        // 80 px left gap
const marginT = spacing / 2;        // 80 px top  gap
const dotSize = 50;                 // diameter range
const dots    = [];

/* helper: clamped map ------------------------------------ */
function mapClamp(v, a1, a2, b1, b2) {
  return constrain(map(v, a1, a2, b1, b2),
                   min(b1, b2), max(b1, b2));
}

/* Dot class ---------------------------------------------- */
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
    const lerpF = mapClamp(vol, 0, 0.7, 0.25, 0.04); // fast when quiet
    this.curr   = lerp(this.curr, this.tgt, lerpF);
  }
  r() { return this.curr * 0.5; }                   // NO size cap
}

/* -------------------------------------------------------- */
function preload() {
  metaballShader = loadShader('shaders/meta.vert', 'shaders/meta.frag');
}

function setup() {
  pixelDensity(1);                                  // sync CSS & GL px
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

  /* mic loudness → strength */
  const raw = constrain(amplitude.getLevel() * 6.0, 0, 1); // gain = 6
  smoothedVol = lerp(smoothedVol, raw, smoothK);
  const strength = map(smoothedVol, 0, 1, minStrength, maxStrength);

  /* update dots & build uniform buffer */
  const buf = new Float32Array(dots.length * 3);
  dots.forEach((d, i) => {
    d.update(smoothedVol);
    const j = 3 * i;
    buf[j]     = d.x + width  / 2;
    buf[j + 1] = d.y + height / 2;   // no Y‑flip
    buf[j + 2] = d.r();
  });

  shader(metaballShader);
  metaballShader.setUniform('iResolution', [width, height]);
  metaballShader.setUniform('dots',       buf);
  metaballShader.setUniform('dotCount',   dots.length);
  metaballShader.setUniform('uStrength',  strength);

  rect(0, 0, width, height);          // full‑screen quad
}

/* rebuild grid on resize ---------------------------------- */
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

/* full‑screen toggle -------------------------------------- */
function keyPressed() {
  if (key === 'f' || key === 'F') fullscreen(!fullscreen());
  if (keyCode === 27)             fullscreen(false);   // Esc
}

/* mobile autoplay unlock ---------------------------------- */
function touchStarted() {
  if (getAudioContext().state !== 'running')
    getAudioContext().resume();
}

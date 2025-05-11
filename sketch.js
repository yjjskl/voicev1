/* Metaball grid — full‑screen toggle, 160‑px spacing,
   80‑px margin (left & top), mic‑reactive merging,
   volume‑responsive dot easing
---------------------------------------------------------------- */
let metaballShader;

/* ── mic‑control vars ── */
let mic, amplitude, smoothedVol = 0;
const minStrength = 0.20;         // silence → little merging
const maxStrength = 2.00;         // loud sound → heavy merging
const smoothK     = 0.08;         // smoothing factor for volume

/* ── grid settings ── */
const spacing = 160;
const marginL = spacing / 2;      // 80 px left gap
const marginT = spacing / 2;      // 80 px top  gap
const dotSize = 50;               // max wobble diameter
const dots    = [];

/* ----- helper: clamped map ---------------------------------- */
function mapClamp(v, in1, in2, out1, out2) {
  return constrain(map(v, in1, in2, out1, out2),
                   min(out1, out2), max(out1, out2));
}

/* ----- Dot class ------------------------------------------- */
class Dot {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.curr = random(10, dotSize);        // current diameter
    this.tgt  = random(10, dotSize);        // target diameter
    this.next = millis() + random(1000, 3000);
  }

  update(volume) {                          // pass smoothedVol in
    if (millis() > this.next) {
      this.tgt  = random(10, dotSize);
      this.next = millis() + random(1000, 3000);
    }

    /* volume‑responsive easing:
        quiet  (vol≈0)   → factor 0.25  (fast)
        loud   (vol≈0.7) → factor 0.04  (slow) */
    const lerpF = mapClamp(volume, 0, 0.7, 0.25, 0.04);
    this.curr   = lerp(this.curr, this.tgt, lerpF);
  }

  r() { return this.curr * 0.5; }           // radius for shader
}

/* ----- p5 lifecycle ---------------------------------------- */
function preload() {
  metaballShader = loadShader('shaders/meta.vert', 'shaders/meta.frag');
}

function setup() {
  pixelDensity(1);                          // unify CSS & GL pixels
  createCanvas(windowWidth, windowHeight, WEBGL);
  noStroke();
  rectMode(CENTER);

  /* microphone */
  mic       = new p5.AudioIn();
  amplitude = new p5.Amplitude();
  mic.start(() => amplitude.setInput(mic));

  buildGrid();
}

function draw() {
  background(0);

  /* mic level → smoothedVol & blob strength */
  const raw = constrain(amplitude.getLevel() * 6.0, 0, 1); // ↑ gain=6
  smoothedVol = lerp(smoothedVol, raw, smoothK);
  const strength = map(smoothedVol, 0, 1, minStrength, maxStrength);

  /* update dots, build uniform buffer */
  const buf = new Float32Array(dots.length * 3);
  dots.forEach((d, i) => {
    d.update(smoothedVol);                  // << volume to dot
    const j = 3 * i;
    buf[j]     = d.x + width  / 2;
    buf[j + 1] = d.y + height / 2;          // no Y‑flip
    buf[j + 2] = d.r();
  });

  /* send uniforms & draw */
  shader(metaballShader);
  metaballShader.setUniform('iResolution', [width, height]);
  metaballShader.setUniform('dots',       buf);
  metaballShader.setUniform('dotCount',   dots.length);
  metaballShader.setUniform('uStrength',  strength);

  rect(0, 0, width, height);
}

/* ----- responsive grid ------------------------------------- */
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

/* ----- full‑screen toggle (F / Esc) ------------------------- */
function keyPressed() {
  if (key === 'f' || key === 'F') fullscreen(!fullscreen());
  if (keyCode === 27) fullscreen(false);   // ESC
}

/* ----- mobile autoplay unlock ------------------------------ */
function touchStarted() {
  if (getAudioContext().state !== 'running') getAudioContext().resume();
}

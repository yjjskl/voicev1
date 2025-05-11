/* Metaball grid — press F for full‑screen, Esc to exit,
   mic‑reactive blobs, 160‑px grid, 80‑px margin (left & top)
---------------------------------------------------------------- */
let metaballShader;

/* audio */
let mic, amplitude, smoothedVol = 0;
const minStrength = 2.00;
const maxStrength = 8.00;
const smoothK     = 0.08;

/* grid */
const spacing = 160;
const marginL = spacing / 2;
const marginT = spacing / 2;
const dotSize = 80;
const dots    = [];

/* ---------------------------------------------------------- */
class Dot {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.curr = random(40, dotSize);
    this.tgt  = random(40, dotSize);
    this.next = millis() + random(1000, 3000);
  }
  update() {
    if (millis() > this.next) {
      this.tgt  = random(10, dotSize);
      this.next = millis() + random(1000, 3000);
    }
    this.curr = lerp(this.curr, this.tgt, 0.05);
  }
  r() { return this.curr * 0.5; }
}

/* ---------------------------------------------------------- */
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
  mic.start(() => amplitude.setInput(mic));   // ask permission

  buildGrid();
}

function draw() {
  background(0);

  smoothedVol = lerp(
    smoothedVol,
    constrain(amplitude.getLevel() * 3.0, 0, 1),
    smoothK
  );
  const strength = map(smoothedVol, 0, 1, minStrength, maxStrength);

  /* pack dot uniforms */
  const buf = new Float32Array(dots.length * 3);
  dots.forEach((d, i) => {
    d.update();
    const j = 3 * i;
    buf[j]   = d.x + width  / 2;
    buf[j+1] = d.y + height / 2;
    buf[j+2] = d.r();
  });

  shader(metaballShader);
  metaballShader.setUniform('iResolution', [width, height]);
  metaballShader.setUniform('dots',       buf);
  metaballShader.setUniform('dotCount',   dots.length);
  metaballShader.setUniform('uStrength',  strength);

  rect(0, 0, width, height);
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
  if (keyCode === 27)             fullscreen(false);       // Esc
}

function resumeAudio() {
  if (getAudioContext().state !== 'running') getAudioContext().resume();
}

function mousePressed() { resumeAudio(); }
function touchStarted() { resumeAudio(); }

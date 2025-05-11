/* Metaball grid — toggle full‑screen with “F”, mic‑reactive blobs
   160‑px spacing, 80‑px margin (left & top only)
---------------------------------------------------------------- */
let metaballShader;

/* audio */
let mic, amplitude, smoothedVol = 0;
const minStrength = 0.20;
const maxStrength = 10.00;
const smoothK     = 0.08;

/* grid settings */
const spacing = 160;
const marginL = spacing / 2;     // 80 px
const marginT = spacing / 2;
const dotSize = 80;
const dots = [];

/* ---------------------------------------------------------- */
class Dot {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.curr = random(10, dotSize);
    this.tgt  = random(10, dotSize);
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
  pixelDensity(1);                           // sync CSS & GL pixels
  createCanvas(windowWidth, windowHeight, WEBGL);
  noStroke();
  rectMode(CENTER);

  mic = new p5.AudioIn();
  amplitude = new p5.Amplitude();
  mic.start(() => amplitude.setInput(mic));

  buildGrid();
}

function draw() {
  background(0);

  /* mic volume → strength */
  smoothedVol = lerp(
    smoothedVol,
    constrain(amplitude.getLevel() * 6.0, 0, 1),
    smoothK
  );
  const strength = map(smoothedVol, 0, 1, minStrength, maxStrength);

  /* pack uniforms */
  const buf = new Float32Array(dots.length * 3);
  dots.forEach((d, i) => {
    d.update();
    const j = 3 * i;
    buf[j]     = d.x + width  / 2;
    buf[j + 1] = d.y + height / 2;
    buf[j + 2] = d.r();
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
  buildGrid();                              // rebuild to new size
}

/* build grid with margin on left & top only */
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

/* ---------------------------------------------------------- */
/*  Full‑screen toggle                                        */
function keyPressed() {
  if (key === 'f' || key === 'F') {
    const fs = fullscreen();
    fullscreen(!fs);         // toggle
    // buildGrid will be called automatically via windowResized
  }
  // ESC automatically exits full‑screen in browsers,
  // but you can manually ensure it here if desired:
  if (keyCode === 27) {      // 27 = ESC
    fullscreen(false);
  }
}

/* autoplay unlock for mobile                                 */
function touchStarted() {
  if (getAudioContext().state !== 'running') {
    getAudioContext().resume();
  }
}

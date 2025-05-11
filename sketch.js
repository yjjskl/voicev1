/* Metaball grid — full‑screen toggle, 160 px spacing,
   80 px margin (left & top), mic‑scaled dot size & merging
---------------------------------------------------------------- */
let metaballShader;

/* ── microphone settings ── */
let mic, amplitude, smoothedVol = 0;
const GAIN        = 8.0;        // bigger → more sensitive (was 6)
const smoothK     = 0.09;       // smoothing factor

/* blob field strength */
const minStrength = 0.20;
const maxStrength = 12.00;

/* dot‑size scaling by volume */
const minScale    = 1;        // quiet → 50 % of size
const maxScale    = 3.0;        // loud  → 300 % of size

/* ── grid settings ── */
const spacing = 160;
const marginL = spacing / 2;    // 80 px left gap
const marginT = spacing / 2;    // 80 px top  gap
const dotSize = 50;             // base (wobble) diameter
const dots    = [];

/* helper --------------------------------------------------- */
function mapClamp(v,a1,a2,b1,b2){
  return constrain(map(v,a1,a2,b1,b2), min(b1,b2), max(b1,b2));
}

/* Dot class ------------------------------------------------ */
class Dot {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.curr = random(10, dotSize);          // base diameter
    this.tgt  = random(10, dotSize);
    this.next = millis() + random(1000, 3000);
  }
  update() {
    if (millis() > this.next) {
      this.tgt  = random(10, dotSize);
      this.next = millis() + random(1000, 3000);
    }
    this.curr = lerp(this.curr, this.tgt, 0.05);   // steady wobble
  }
  /* radius scaled by current volume */
  r(scale) { return this.curr * 0.5 * scale; }
}

/* ---------------------------------------------------------- */
function preload(){
  metaballShader = loadShader('shaders/meta.vert', 'shaders/meta.frag');
}

function setup(){
  pixelDensity(1);
  createCanvas(windowWidth, windowHeight, WEBGL);
  noStroke(); rectMode(CENTER);

  mic = new p5.AudioIn();
  amplitude = new p5.Amplitude();
  mic.start(()=> amplitude.setInput(mic));

  buildGrid();
}

function draw(){
  background(0);

  /* mic volume processing --------------------------------- */
  const raw = constrain(amplitude.getLevel() * GAIN, 0, 1);
  smoothedVol = lerp(smoothedVol, raw, smoothK);

  const strength = map(smoothedVol, 0, 1, minStrength, maxStrength);
  const sizeScale = map(smoothedVol, 0, 1, minScale, maxScale);

  /* pack uniforms ----------------------------------------- */
  const buf = new Float32Array(dots.length*3);
  dots.forEach((d,i)=>{
    d.update();
    const j = 3*i;
    buf[j]   = d.x + width / 2;
    buf[j+1] = d.y + height/ 2;
    buf[j+2] = d.r(sizeScale);          // scaled radius
  });

  shader(metaballShader);
  metaballShader.setUniform('iResolution',[width,height]);
  metaballShader.setUniform('dots',       buf);
  metaballShader.setUniform('dotCount',   dots.length);
  metaballShader.setUniform('uStrength',  strength);

  rect(0,0,width,height);
}

/* responsive grid ----------------------------------------- */
function windowResized(){
  resizeCanvas(windowWidth, windowHeight);
  buildGrid();
}
function buildGrid(){
  dots.length=0;
  const startX=-width /2 + marginL;
  const startY=-height/2 + marginT;
  for(let y=startY; y<=height/2; y+=spacing){
    for(let x=startX; x<=width/2; x+=spacing){
      dots.push(new Dot(x,y));
    }
  }
}

/* full‑screen toggle -------------------------------------- */
function keyPressed(){
  if(key==='f'||key==='F') fullscreen(!fullscreen());
  if(keyCode===27) fullscreen(false);
}

/* mobile autoplay unlock ---------------------------------- */
function touchStarted(){
  if(getAudioContext().state!=='running') getAudioContext().resume();
}

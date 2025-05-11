/* Metaball grid — full‐screen toggle, 160 px spacing,
   margin on left & top, mic‑reactive speed, and MAX DOT SIZE
---------------------------------------------------------------- */
let metaballShader;

/* mic */
let mic, amplitude, smoothedVol = 0;
const minStrength = 0.20;
const maxStrength = 2.00;
const smoothK     = 0.08;

/* grid + size limits */
const spacing    = 160;
const marginL    = spacing / 2;
const marginT    = spacing / 2;
const dotSize    = 50;          // target diameter range
const MAX_RADIUS = 100;          // <- HARD CAP (px) on radius
const dots       = [];

/* helper --------------------------------------------------- */
function mapClamp(v,a1,a2,b1,b2){
  return constrain(map(v,a1,a2,b1,b2), min(b1,b2), max(b1,b2));
}

/* Dot class ------------------------------------------------ */
class Dot{
  constructor(x,y){
    this.x=x; this.y=y;
    this.curr=random(10,dotSize);
    this.tgt =random(10,dotSize);
    this.next=millis()+random(1000,3000);
  }
  update(vol){
    if(millis()>this.next){
      this.tgt=random(10,dotSize);
      this.next=millis()+random(1000,3000);
    }
    const lerpF=mapClamp(vol,0,0.7,0.25,0.04);
    this.curr=lerp(this.curr,this.tgt,lerpF);
  }
  r(){ return min(this.curr*0.5, MAX_RADIUS); }   // apply cap
}

/* p5 lifecycle -------------------------------------------- */
function preload(){ metaballShader=loadShader('shaders/meta.vert','shaders/meta.frag'); }

function setup(){
  pixelDensity(1);
  createCanvas(windowWidth,windowHeight,WEBGL);
  noStroke(); rectMode(CENTER);

  mic=new p5.AudioIn();  amplitude=new p5.Amplitude();
  mic.start(()=>amplitude.setInput(mic));

  buildGrid();
}

function draw(){
  background(0);

  const raw=constrain(amplitude.getLevel()*6.0,0,1);
  smoothedVol=lerp(smoothedVol,raw,smoothK);
  const strength=map(smoothedVol,0,1,minStrength,maxStrength);

  const buf=new Float32Array(dots.length*3);
  dots.forEach((d,i)=>{
    d.update(smoothedVol);
    const j=3*i;
    buf[j]   =d.x+width/2;
    buf[j+1] =d.y+height/2;
    buf[j+2] =d.r();                 // already capped
  });

  shader(metaballShader);
  metaballShader.setUniform('iResolution',[width,height]);
  metaballShader.setUniform('dots',buf);
  metaballShader.setUniform('dotCount',dots.length);
  metaballShader.setUniform('uStrength',strength);

  rect(0,0,width,height);
}

/* rebuild grid -------------------------------------------- */
function windowResized(){ resizeCanvas(windowWidth,windowHeight); buildGrid(); }

function buildGrid(){
  dots.length=0;
  const startX=-width/2+marginL;
  const startY=-height/2+marginT;
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

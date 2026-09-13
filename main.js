const app = new PIXI.Application({
  resizeTo: window,
  backgroundColor: 0x0a0a12
});

const link = document.createElement('link');
link.rel = 'icon';
link.type = 'image/svg+xml';
link.href = 'favicon.svg';
document.head.appendChild(link);

document.body.appendChild(app.view);

const mouse = { x: 0, y: 0 };

window.addEventListener('pointermove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  lastMoveTime = performance.now();
});

const eyeL = new PIXI.Graphics();
eyeL.beginFill(0x0a0a12);
eyeL.drawCircle(-18, -5, 4);
eyeL.endFill();

const eyeR = new PIXI.Graphics();
eyeR.beginFill(0x0a0a12);
eyeR.drawCircle(18, -5, 4);
eyeR.endFill();

// party hat
const hat = new PIXI.Graphics();
hat.beginFill(0xffcc33);
hat.moveTo(-22, -48);
hat.lineTo(22, -48);
hat.lineTo(0, -100);
hat.lineTo(-22, -48);
hat.endFill();
hat.beginFill(0xff3399);
hat.drawRect(-22, -50, 44, 6); // brim stripe
hat.endFill();
hat.beginFill(0x8899ff);
hat.drawCircle(0, -100, 7); // pom-pom
hat.endFill();
hat.rotation = -0.15;
hat.visible = false;

const trailParticles = [];
const trailContainer = new PIXI.Container();
app.stage.addChildAt(trailContainer, 0); 

const c = new PIXI.Graphics();
c.beginFill(0xff3399);
c.drawCircle(0, 0, 60);
c.endFill();
c.x = app.screen.width / 2;
c.y = app.screen.height / 2;
app.stage.addChild(c);
c.addChild(eyeL);
c.addChild(eyeR);
c.addChild(hat);
c.eventMode = 'static';
c.cursor = 'pointer';
//drew a hat now lets animate it.

const GRID_SIZE = 20; // more fine-grained grid for pixelation
const CELL_SIZE = 6; // 6 is better ig
const BODY_RADIUS = 60;

const pixelGrid = [];
for (let i = 0; i < GRID_SIZE; i++) {
  for (let j = 0; j < GRID_SIZE; j++) {
    const px = (i - GRID_SIZE / 2 + 0.5) * CELL_SIZE;
    const py = (j - GRID_SIZE / 2 + 0.5) * CELL_SIZE;
    const dist = Math.sqrt(px * px + py * py);
    if (dist <= BODY_RADIUS) {
      pixelGrid.push({ x: px, y: py });
    }
  }
}
// making it pixelated and adding some randomness to the pixels

const zzzTexts = [];
for (let i = 0; i < 3; i++) {
  const z = new PIXI.Text('z', {
    fontFamily: 'monospace',
    fontSize: 14 + i * 4,
    fill: 0x8899ff
  });
  z.anchor.set(0.5);
  app.stage.addChild(z);
  zzzTexts.push(z);
}
// sleep zzzz

const dncButton = new PIXI.Container();
const dncBg = new PIXI.Graphics();
const dncText = new PIXI.Text('don\'t click me', {
  fontFamily: 'monospace',
  fontSize: 14,
  fill: 0xffffff
});
dncText.anchor.set(0.5);

function drawDncBg(hover) {
  dncBg.clear();
  dncBg.beginFill(hover ? 0xff3399 : 0x333344);
  dncBg.drawRoundedRect(-70, -18, 140, 36, 10);
  dncBg.endFill();
}
drawDncBg(false);

dncButton.addChild(dncBg);
dncButton.addChild(dncText);
dncButton.eventMode = 'static';
dncButton.cursor = 'pointer';

dncButton.x = app.screen.width / 2;
dncButton.y = app.screen.height - 100;

dncButton.on('pointerover', () => drawDncBg(true));
dncButton.on('pointerout', () => drawDncBg(false));

app.stage.addChild(dncButton);

dncButton.on('pointerdown', () => {
  if (jumpscareArmed || jumpscareActive) return; 
  jumpscareArmed = true;
  jumpscareTimer = 2000;
  dncText.text = 'i warned you!';
});



// blinking state and a few others
let blinkTimer = 0;
let isBlinking = false;
let blinkInterval = 2000;
let prevX = c.x;
let prevY = c.y;
let lastMoveTime = performance.now();
let clickCount = 0;
let lastClickTime = 0;
let rainbowTimer = 0;
let isRainbow = false;
let rainbowHue = 0;
let audioCtx = null;
let masterGain = null;
let toneFilter = null;
let musicPlaying = false;
let noteTimer = 0;
let stepIndex = 0;
let jumpscareArmed = false;
let jumpscareTimer = 0;
let jumpscareActive = false;
let jumpscareIntensity = 0;
// music notes and scales
const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25]; // C4..E5
const bassScale = [130.81, 146.83, 164.81, 196.00, 220.00]; // one octave down

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 1;
  toneFilter = audioCtx.createBiquadFilter();
  toneFilter.type = 'lowpass';
  toneFilter.frequency.value = 1800;
  toneFilter.connect(masterGain);
  masterGain.connect(audioCtx.destination);
}

function playNote(freq, duration, type, volume) {
  const osc = audioCtx.createOscillator();
  const env = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;

  const now = audioCtx.currentTime;
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(volume, now + 0.015); // quick attack, no clicks
  env.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(env);
  env.connect(toneFilter);
  osc.start(now);
  osc.stop(now + duration + 0.05);
}

function toggleMusic() {
  initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  musicPlaying = !musicPlaying;
  hat.visible = musicPlaying;
  playButton.setPlaying(musicPlaying);
}

// called every frame from the ticker with the blob's current mood
function updateMusic(deltaMS, closeness, loneliness) {
  if (!musicPlaying) return;

  noteTimer += deltaMS;
  const chaseFactor = 1 - closeness; // farther away = more chase energy = faster notes
  const interval = 480 - chaseFactor * 220 + loneliness * 380;
  if (noteTimer < interval) return;
  noteTimer = 0;

  toneFilter.frequency.value = 900 + chaseFactor * 2400 - loneliness * 500;
  masterGain.gain.value = 1 - loneliness * 0.2;

  const pattern = [0, 2, 1, 3, 4, 2, 1, 0];
  stepIndex = (stepIndex + 1) % pattern.length;
  const note = scale[pattern[stepIndex]];
  playNote(note, 0.35, 'square', 0.12);

  if (stepIndex % 4 === 0) {
    const bass = bassScale[pattern[stepIndex] % bassScale.length];
    playNote(bass, 0.5, 'triangle', 0.09);
  }
}

function lerpColor(color1, color2, t) {
  const r1 = (color1 >> 16) & 0xff;
  const g1 = (color1 >> 8) & 0xff;
  const b1 = color1 & 0xff;

  const r2 = (color2 >> 16) & 0xff;
  const g2 = (color2 >> 8) & 0xff;
  const b2 = color2 & 0xff;

  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  return (r << 16) + (g << 8) + b;
}

c.on('pointerdown', () => {
  const now = performance.now();
  
  if (now - lastClickTime < 500) {
    clickCount++;
  } else {
    clickCount = 1;
  }
  lastClickTime = now;

  if (clickCount >= 3) {
    isRainbow = true;
    rainbowTimer = 3000; // 3 seconds of rainbow
    clickCount = 0;
  }
});

// TICKER
app.ticker.add(() => {
  const breathe = Math.sin(performance.now() * 0.002) * 0.03;
  const idleTime = performance.now() - lastMoveTime;
  const isLonely = idleTime > 15000;
  const loneliness = isLonely ? Math.min((idleTime - 15000) / 3000, 1) : 0;

  if (isRainbow) {
    rainbowTimer -= app.ticker.deltaMS;
    if (rainbowTimer <= 0) isRainbow = false;
  }

  if (jumpscareArmed) {
  jumpscareTimer -= app.ticker.deltaMS;
  if (jumpscareTimer <= 0) {
    jumpscareArmed = false;
    jumpscareActive = true;
    jumpscareIntensity = 1;
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    playNote(90, 0.4, 'sawtooth', 0.5);
    playNote(95, 0.4, 'sawtooth', 0.5);
  }
}

  if (jumpscareActive) {
    jumpscareIntensity -= app.ticker.deltaMS / 400;
    if (jumpscareIntensity <= 0) {
      jumpscareActive = false;
      dncText.text = 'don\'t click me';
    }
  }

  const dx = mouse.x - c.x;
  const dy = mouse.y - c.y;

  const speedX = c.x - prevX;
  const speedY = c.y - prevY;
  const speed = Math.sqrt(speedX * speedX + speedY * speedY);
  prevX = c.x;
  prevY = c.y;

  const dist = Math.sqrt(dx * dx + dy * dy);
  const closeness = 1 - Math.min(dist / 400, 1);

  const excitement = closeness * (1 - loneliness);
  let bodyColor = lerpColor(0x333344, lerpColor(0x6633cc, 0xff3399, excitement), 1 - loneliness * 0.7);

  if (isRainbow) {
    rainbowHue = (rainbowHue + 4) % 360;
    bodyColor = hslToHex(rainbowHue, 0.8, 0.6);
  }

  if (jumpscareActive) {
    bodyColor = lerpColor(bodyColor, 0xff0000, jumpscareIntensity);
  }

  if (speed > 1) {
    for (let i = 0; i < 4; i++) {
      const grain = new PIXI.Graphics();
      const size = 1 + Math.random() * 2.5;
      const sandColor = lerpColor(0xc2a878, bodyColor, 0.4 + Math.random() * 0.3);

      grain.beginFill(sandColor, 0.9);
      grain.drawRect(-size / 2, -size / 2, size, size);
      grain.rotation = Math.random() * Math.PI;
      grain.endFill();

      const spread = 12;
      grain.x = c.x + (Math.random() - 0.5) * spread;
      grain.y = c.y + (Math.random() - 0.5) * spread;

      trailContainer.addChild(grain);
      trailParticles.push({ graphic: grain, life: 1, vy: 0.3 + Math.random() * 0.4 });
    }
  }

  for (let i = trailParticles.length - 1; i >= 0; i--) {
    const p = trailParticles[i];
    p.graphic.y += p.vy;
    p.vy += 0.01;
    p.life -= 0.015;
    p.graphic.alpha = p.life;
    if (p.life <= 0) {
      trailContainer.removeChild(p.graphic);
      trailParticles.splice(i, 1);
    }
  }

  c.clear();
c.beginFill(bodyColor);
for (const cell of pixelGrid) {
  c.drawRect(cell.x - CELL_SIZE / 2, cell.y - CELL_SIZE / 2, CELL_SIZE, CELL_SIZE);
}
c.endFill();

  c.x += dx * 0.05;
  c.y += dy * 0.05;

  if (jumpscareActive) {
    c.x += (Math.random() - 0.5) * 20 * jumpscareIntensity;
    c.y += (Math.random() - 0.5) * 20 * jumpscareIntensity;
  }

  const stretch = (1 + Math.min(speed * 0.02, 0.3)) * (1 - loneliness * 0.2) + breathe;
const squash = (1 - Math.min(speed * 0.015, 0.15)) * (1 - loneliness * 0.2) + breathe;

  c.scale.x += (stretch - c.scale.x) * 0.2;
  c.scale.y += (squash - c.scale.y) * 0.2;
if (jumpscareActive) {
  const lurch = 1 + jumpscareIntensity * 0.6;
  c.scale.x *= lurch;
  c.scale.y *= lurch;
}

  blinkTimer += app.ticker.deltaMS;

  if (!isBlinking && blinkTimer > blinkInterval) {
    isBlinking = true;
    blinkTimer = 0;
    blinkInterval = 1500 + Math.random() * 3000;
  }

  if (isBlinking && blinkTimer > 150) {
    isBlinking = false;
    blinkTimer = 0;
  }

  if (loneliness > 0.3) {
  const fadeIn = Math.min((loneliness - 0.3) / 0.3, 1);

  for (let i = 0; i < zzzTexts.length; i++) {
    const z = zzzTexts[i];
    z.visible = true;

    const cycle = ((performance.now() * 0.0006) + i * 0.33) % 1;

    z.x = c.x + 30 + i * 14 - cycle * 10;
    z.y = c.y - 45 - i * 12 - cycle * 25;
    z.alpha = fadeIn * (1 - cycle);
  }
} else {
  for (const z of zzzTexts) z.visible = false;
}


const sleepyFactor = loneliness * 0.85;
let eyeScale = isBlinking ? 0.1 : Math.max(1 - sleepyFactor, 0.15);
let eyeColor = 0x0a0a12;

if (jumpscareActive) {
  eyeScale = 1 + jumpscareIntensity * 2.5;
  eyeColor = 0xffffff;
}

eyeL.clear();
eyeL.beginFill(eyeColor);
eyeL.drawCircle(-18, -5, 4);
eyeL.endFill();
eyeL.scale.y = eyeScale;

eyeR.clear();
eyeR.beginFill(eyeColor);
eyeR.drawCircle(18, -5, 4);
eyeR.endFill();
eyeR.scale.y = eyeScale;

updateMusic(app.ticker.deltaMS, closeness, loneliness);
});
// yesss it works its moving

function hslToHex(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r, g, b;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return (Math.round((r + m) * 255) << 16) + (Math.round((g + m) * 255) << 8) + Math.round((b + m) * 255);
}


const playButton = new PIXI.Container();
const btnBg = new PIXI.Graphics();
const btnIcon = new PIXI.Text('\u25B6', { // ▶
  fontFamily: 'monospace',
  fontSize: 16,
  fill: 0xffffff
});
btnIcon.anchor.set(0.5);
btnIcon.x = 2; // optical centering for the triangle glyph

function drawBtnBg(hover) {
  btnBg.clear();
  btnBg.beginFill(hover ? 0xff3399 : 0x333344);
  btnBg.drawRoundedRect(-30, -18, 60, 36, 10);
  btnBg.endFill();
}
drawBtnBg(false);

playButton.addChild(btnBg);
playButton.addChild(btnIcon);
playButton.eventMode = 'static';
playButton.cursor = 'pointer';

playButton.setPlaying = (playing) => {
  btnIcon.text = playing ? '\u275A\u275A' : '\u25B6'; // ❚❚ or ▶
  btnIcon.x = playing ? 0 : 2;
};

playButton.on('pointerover', () => drawBtnBg(true));
playButton.on('pointerout', () => drawBtnBg(false));
playButton.on('pointerdown', () => {
  toggleMusic();
});

function positionPlayButton() {
  playButton.x = app.screen.width / 2;
  playButton.y = app.screen.height - 50;
}
positionPlayButton();
window.addEventListener('resize', positionPlayButton);

app.stage.addChild(playButton);
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
c.eventMode = 'static';
c.cursor = 'pointer';

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
// drew a circle and added it to the stage, now lets animate it


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
  const idleTime = performance.now() - lastMoveTime;
  const isLonely = idleTime > 4500;
  const loneliness = isLonely ? Math.min((idleTime - 4500) / 3000, 1) : 0;

  if (isRainbow) {
    rainbowTimer -= app.ticker.deltaMS;
    if (rainbowTimer <= 0) isRainbow = false;
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

  const stretch = (1 + Math.min(speed * 0.02, 0.3)) * (1 - loneliness * 0.2);
  const squash = (1 - Math.min(speed * 0.015, 0.15)) * (1 - loneliness * 0.2);

  c.scale.x += (stretch - c.scale.x) * 0.2;
  c.scale.y += (squash - c.scale.y) * 0.2;

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

  const eyeScale = isBlinking ? 0.1 : 1;
  eyeL.scale.y = eyeScale;
  eyeR.scale.y = eyeScale;
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
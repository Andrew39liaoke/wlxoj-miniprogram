// Generate proper TabBar PNG icons with visible colors
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createIconPNG(width, height, drawFn) {
  const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function crc32(buf) {
    let c = 0xffffffff;
    const table = [];
    for (let n = 0; n < 256; n++) {
      let cc = n;
      for (let k = 0; k < 8; k++) cc = cc & 1 ? 0xedb88320 ^ (cc >>> 1) : cc >>> 1;
      table[n] = cc;
    }
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const typeBuf = Buffer.from(type);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crcData = Buffer.concat([typeBuf, data]);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(crcData));
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA

  const pixels = new Uint8Array(width * height * 4);
  // Fill transparent
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 0; pixels[i+1] = 0; pixels[i+2] = 0; pixels[i+3] = 0;
  }
  drawFn(pixels, width, height);

  const rawRows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0; // filter none
    for (let x = 0; x < width; x++) {
      const si = (y * width + x) * 4;
      const di = 1 + x * 4;
      row[di] = pixels[si]; row[di+1] = pixels[si+1]; row[di+2] = pixels[si+2]; row[di+3] = pixels[si+3];
    }
    rawRows.push(row);
  }

  const compressed = zlib.deflateSync(Buffer.concat(rawRows));
  return Buffer.concat([SIGNATURE, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

function setPixel(pixels, w, x, y, r, g, b, a) {
  if (x < 0 || x >= w || y < 0) return;
  const i = (y * w + x) * 4;
  pixels[i] = r; pixels[i+1] = g; pixels[i+2] = b; pixels[i+3] = a;
}

function fillRect(pixels, w, h, x1, y1, x2, y2, r, g, b, a) {
  for (let y = y1; y <= y2 && y < h; y++)
    for (let x = x1; x <= x2 && x < w; x++)
      setPixel(pixels, w, x, y, r, g, b, a);
}

function fillCircle(pixels, w, h, cx, cy, radius, r, g, b, a) {
  for (let y = cy - radius; y <= cy + radius; y++)
    for (let x = cx - radius; x <= cx + radius; x++)
      if ((x-cx)*(x-cx)+(y-cy)*(y-cy) <= radius*radius)
        setPixel(pixels, w, x, y, r, g, b, a);
}

function drawLine(pixels, w, h, x1, y1, x2, y2, thickness, r, g, b, a) {
  const dx = x2-x1, dy = y2-y1;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(x1 + dx*i/steps);
    const y = Math.round(y1 + dy*i/steps);
    for (let t = -thickness; t <= thickness; t++)
      for (let t2 = -thickness; t2 <= thickness; t2++)
        if (t*t+t2*t2 <= thickness*thickness)
          setPixel(pixels, w, x+t, y+t2, r, g, b, a);
  }
}

const tabDir = path.join(__dirname, '..', 'src', 'static', 'tab');
const S = 81; // icon size

// Question icon (book shape)
function drawQuestion(pixels, w, h, r, g, b) {
  // Book body
  fillRect(pixels, w, h, 18, 14, 62, 66, r, g, b, 255);
  // Book spine
  fillRect(pixels, w, h, 14, 14, 20, 66, r, g, b, 255);
  // Pages
  fillRect(pixels, w, h, 24, 20, 58, 22, r, g, b, 200);
  fillRect(pixels, w, h, 24, 28, 58, 30, r, g, b, 200);
  fillRect(pixels, w, h, 24, 36, 58, 38, r, g, b, 200);
  fillRect(pixels, w, h, 24, 44, 48, 46, r, g, b, 200);
}

// Class icon (building/school shape)
function drawClass(pixels, w, h, r, g, b) {
  // Main building
  fillRect(pixels, w, h, 16, 28, 64, 66, r, g, b, 255);
  // Roof
  for (let y = 14; y < 28; y++) {
    const half = Math.round((28-y)*1.8);
    fillRect(pixels, w, h, 40-half, y, 40+half, y, r, g, b, 255);
  }
  // Door
  fillRect(pixels, w, h, 34, 48, 46, 66, r, g, b, 180);
  // Windows
  fillRect(pixels, w, h, 22, 34, 30, 42, r, g, b, 180);
  fillRect(pixels, w, h, 50, 34, 58, 42, r, g, b, 180);
}

// Exam icon (paper with checkmark)
function drawExam(pixels, w, h, r, g, b) {
  // Paper
  fillRect(pixels, w, h, 18, 10, 62, 70, r, g, b, 255);
  // Fold corner
  fillRect(pixels, w, h, 50, 10, 62, 22, r, g, b, 200);
  // Lines
  fillRect(pixels, w, h, 24, 28, 56, 30, r, g, b, 180);
  fillRect(pixels, w, h, 24, 36, 56, 38, r, g, b, 180);
  fillRect(pixels, w, h, 24, 44, 46, 46, r, g, b, 180);
  // Checkmark
  drawLine(pixels, w, h, 30, 54, 38, 62, 2, r, g, b, 255);
  drawLine(pixels, w, h, 38, 62, 54, 48, 2, r, g, b, 255);
}

// Post icon (chat bubble)
function drawPost(pixels, w, h, r, g, b) {
  // Rounded bubble body
  fillRect(pixels, w, h, 14, 16, 66, 52, r, g, b, 255);
  fillCircle(pixels, w, h, 24, 20, 8, r, g, b, 255);
  fillCircle(pixels, w, h, 56, 20, 8, r, g, b, 255);
  fillCircle(pixels, w, h, 24, 48, 8, r, g, b, 255);
  fillCircle(pixels, w, h, 56, 48, 8, r, g, b, 255);
  // Tail
  for (let i = 0; i < 12; i++) {
    fillRect(pixels, w, h, 22+i, 52+i, 26+i, 53+i, r, g, b, 255);
  }
  // Text lines
  fillRect(pixels, w, h, 24, 28, 56, 30, r, g, b, 180);
  fillRect(pixels, w, h, 24, 36, 50, 38, r, g, b, 180);
  fillRect(pixels, w, h, 24, 44, 44, 46, r, g, b, 180);
}

// User icon (person silhouette)
function drawUser(pixels, w, h, r, g, b) {
  // Head
  fillCircle(pixels, w, h, 40, 24, 14, r, g, b, 255);
  // Body
  fillCircle(pixels, w, h, 40, 74, 24, r, g, b, 255);
  fillRect(pixels, w, h, 16, 50, 64, 68, r, g, b, 255);
}

const iconDefs = [
  { name: 'question', draw: drawQuestion },
  { name: 'class', draw: drawClass },
  { name: 'exam', draw: drawExam },
  { name: 'post', draw: drawPost },
  { name: 'user', draw: drawUser },
];

iconDefs.forEach(def => {
  // Inactive (gray)
  const gray = createIconPNG(S, S, (px, w, h) => def.draw(px, w, h, 170, 170, 170));
  fs.writeFileSync(path.join(tabDir, `${def.name}.png`), gray);

  // Active (blue)
  const blue = createIconPNG(S, S, (px, w, h) => def.draw(px, w, h, 24, 144, 255));
  fs.writeFileSync(path.join(tabDir, `${def.name}-active.png`), blue);
});

console.log('Tab icons regenerated with proper visibility!');

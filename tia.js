const [W, H] = [160, 192];

const vb = 228 * (3 + 37);
const hb = 68;

const NUSIZ0 = 0x04;
const NUSIZ1 = 0x05;
const COLUP0 = 0x06;
const COLUP1 = 0x07;
const COLUPF = 0x08;
const COLUBK = 0x09;
const CTRLPF = 0x0a;


const PF0 = 0x0d;
const PF1 = 0x0e;
const PF2 = 0x0f;

const arrayBuffer = new ArrayBuffer(4 * W * H);
let screen = new Uint8ClampedArray(arrayBuffer);

let resp0x = -1;
let resp1x = -1;

function clearScreen() {
 screen = new Uint8ClampedArray(arrayBuffer);
}

function updateScreen(read, tt) {
 const invb = tt <= vb;
 const inover = tt > (228 * (262 - 30));
 const inhblank = ((tt % 228) <= hb);
 
 const inScreen = !invb && !inover && !inhblank;

 const d = tt - vb;

 if (isRESP0) { resp0x = Math.max((d % 228) - hb, 3); isRESP0 = false; }
 if (isRESP1) { resp1x = Math.max((d % 228) - hb, 3); isRESP1 = false; }

 if (!inScreen) { return; }

 const y = Math.floor(d / 228);
 const x = (d % 228) - hb;

 const p = (y * W) + x;

 const o = p * 4;

 // DEFAULT
 let v = read(COLUBK);

 // PLAYFIELD
 const isMirror = (read(CTRLPF) & 0x01);

 const isPfLeft = (x <= 80);
 const isScore = read(CTRLPF) & 0x06 === 0x02;

 const pw = isPfLeft ?
          Math.ceil((80 - x) / 4) :
          Math.ceil((isMirror ? (x - 80) : (80 - (x - 80))) / 4);

 const pfBit = Math.pow(2, pw - 1);
 const pfColor = isScore ? read(isPfLeft ? COLUP0 : COLUP1) : read(COLUPF);

 (pfBit & PF) && (v = pfColor);

 // PLAYERS
 const dp = (grp, rp, colup, nusiz) => {
   const justDiff = x - rp;

   const isCopy = nusiz & 0xa0 === 0x00; // bit 5 and 7 are for wides
   const size = (nusiz & 0x80) ? 4 : 2; // bit 5 = 2x, bit 7 = 4x

   const diff = isCopy ? justDiff : Math.floor(justDiff / size);

   if (diff > 8) { return; }

   v = (grp & Math.pow(2, 9 - diff)) ? read(colup) : v;
 }

 (x >= resp0x) && dp((GRP >> 8) & 0xff, resp0x, COLUP0, NUSIZ0);
 (x >= resp1x) && dp(GRP & 0xff, resp1x, COLUP1, NUSIZ1);

 // VBLANK
 v = (read(VBLANK) & 0x02) ? 0x00 : v;

 const [r, g, b] = colors[v - (v % 2)] ?? [0x00, 0x00, 0x00];

 screen[o + 0] = r;
 screen[o + 1] = g;
 screen[o + 2] = b;
 screen[o + 3] = 0xff;
}

function drawer() {
  const canvas = document.getElementById("tehScreen");
  const ctx = canvas.getContext("2d");
  
  const draw = () => {
	  ctx.putImageData(new ImageData(screen, W, H), 0, 0);
	  document.dispatchEvent(new Event("draw")); }

  return draw;
}

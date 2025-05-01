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
let resm0x = -1;
let resm1x = -1;
let resblx = -1;

let hmp0 = 0;
let hmp1 = 0;
let hmm0 = 0;
let hmm1 = 0;
let hmbl = 0;

function clearScreen() {
 screen = new Uint8ClampedArray(arrayBuffer);
}

function updateScreen(read, tt) {
 const invb = tt <= vb;
 const inover = tt > (228 * (262 - 30));
 const inhblank = ((tt % 228) <= hb);
 
 const inScreen = !invb && !inover && !inhblank;

 const d = tt - vb;

   
 if (isRESP0) { resp0x = Math.max((tt % 228) - hb, 3); isRESP0 = false; }
 if (isRESP1) { resp1x = Math.max((tt % 228) - hb, 3); isRESP1 = false; }
 if (isRESM0) { resm0x = Math.max((tt % 228) - hb, 3); isRESM0 = false; }
 if (isRESM1) { resm1x = Math.max((tt % 228) - hb, 3); isRESM1 = false; }
 if (isRESBL) { resblx = Math.max((tt % 228) - hb, 3); isRESBL = false; }
 if (isHMOVE) { 
	 resp0x = (resp0x + tcd4((hmp0 >> 4) & 0xf) * -1) % 160;
	 resp1x = (resp1x + tcd4((hmp1 >> 4) & 0xf) * -1) % 160;
	 resm0x = (resm0x + tcd4((hmm0 >> 4) & 0xf) * -1) % 160;
	 resm1x = (resm1x + tcd4((hmm1 >> 4) & 0xf) * -1) % 160;
	 resblx = (resblx + tcd4((hmbl >> 4) & 0xf) * -1) % 160;

	 isHMOVE = false; }

 if (isHMCLR) {
	 console.log("HMCLR", resp0x, resp1x, resm0x, resm1x, resblx);
	 // resp0x -= hmp0;
	 // resp1x -= hmp1;
	 // resm0x -= hmm0;
	 // resm1x -= hmm1;
	 // resblx -= hmbl;

	 // hmp0= 0;
	 // hmp1= 0;
	 // hmm0= 0;
	 // hmm1= 0;
	 // hmbl= 0;

	 isHMCLR = false; }

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
 const pfColor = 0xf0; // isScore ? read(isPfLeft ? COLUP0 : COLUP1) : read(COLUPF);

 (pfBit & PF) && (v = pfColor);

 // PLAYERS
 const dp = (grp, rp, colup, nusiz) => {
   const psz = read(nusiz) & 7
   const isCopy = ((psz !== 5) && (psz !== 7)); // 5 and 7 are for wides
   const size = (psz === 7) ? 4 : ((psz === 5) ? 2 : 1); // 5 = 2x, 7 = 4x

   const drawCopy = (ofx) => {
     const q = Math.floor((x - (rp + ofx)) / size);
     if (q < 0) { return; }
     if (q > 8) { return; }

     v = (read(grp) & Math.pow(2, 9 - q)) ? 0xff /* read(colup) */ : v;
   }

   drawCopy(0);
   
   if (!isCopy) {
     return;
   }

   (psz === 1) && drawCopy(16);
   (psz === 2) && drawCopy(32);
   (psz === 3) && (drawCopy(16), drawCopy(32));
   (psz === 4) && drawCopy(56);
   (psz === 6) && (drawCopy(16), drawCopy(32), drawCopy(56));
 }

 (x >= resp0x) && dp(GRP0, resp0x, COLUP0, NUSIZ0);
 // (x >= resp1x) && dp(GRP1, resp1x, COLUP1, NUSIZ1);
 // (x >= resm0x) && dp(1, resm0x, COLUP0, NUSIZ0);
 // (x >= resm1x) && dp(1, resm1x, COLUP1, NUSIZ1);
 // (x >= resblx) && dp(1, resblx, COLUPF, NUSIZ0);

 // VBLANK
 // v = (read(VBLANK) & 0x02) ? 0x00 : v;

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

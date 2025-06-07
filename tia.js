const [W, H] = [161, 192];

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

let dirty = false;

const mod = (n, m) => (n % m + m) % m;

function clearScreen() {
 screen = new Uint8ClampedArray(arrayBuffer);
}

let hmoveWait = false;
function updateScreen(mem, tt) {
 const invb = tt <= vb;
 const inover = tt > (228 * (262 - 30));
 const inhblank = ((tt % 228) <= hb);

 const read = (a) => mem[a];
 const write = (a, v) => { mem[a] = v; }
 
 const enam = (pid) => (read(ENAM0 + pid) & 0x02) === 0x02;
 const resmp = (pid) => (read(RESMP0 + pid) & 0x02) === 0x02;
 const hm = (addr) => tcd4((read(addr) >> 4) & 0xf) * -1;

 const inScreen = !invb && !inover && !inhblank;

 const d = tt - vb;

 // if ((tt % 228) === 0) { hmoveWait = 0; }

 if (isRESP0) { resp0x = Math.max(((tt + (hmoveWait ? 4 : 0)) % 228) - hb, 3); isRESP0 = false; }
 if (isRESP1) { resp1x = Math.max(((tt + (hmoveWait ? 4 : 0)) % 228) - hb, 3); isRESP1 = false; }
 if (isRESM0) { resm0x = Math.max(((tt + (hmoveWait ? 4 : 0)) % 228) - hb, 3); isRESM0 = false; }
 if (isRESM1) { resm1x = Math.max(((tt + (hmoveWait ? 4 : 0)) % 228) - hb, 3); isRESM1 = false; }
 if (isRESBL) { resblx = Math.max(((tt + (hmoveWait ? 3 : 0)) % 228) - hb, 3); isRESBL = false; }

 if (isHMCLR) {
   mem[HMP0] = 0;
   mem[HMP1] = 0;
   mem[HMBL] = 0;
   mem[HMM0] = 0;
   mem[HMM1] = 0;

   isHMCLR = false; }

 if (isHMOVE) { 
  const dresp0x = hm(HMP0);
  resp0x = mod(resp0x + dresp0x, 160);

  const dresp1x = hm(HMP1);
  resp1x = mod(resp1x + dresp1x, 160);

  const dresblx = hm(HMBL);
  resblx = mod(resblx + dresblx, 160);

  const dresm0x = hm(HMM0);
  resm0x = mod(resm0x + dresm0x, 160);

  const dresm1x = hm(HMM1);
  resm1x = mod(resm1x + dresm1x, 160);

  hmoveWait = true;
  isHMOVE = false; }


 const resm0top0 = resmp(0);
 const resm1top1 = resmp(1);
 
 if (resm0top0) { resm0x = resp0x + 3; }
 if (resm1top1) { resm1x = resp1x + 3; }

 if (!inScreen) { return; }

 const y = Math.floor(d / 228);
 const x = (d % 228) - hb;


 // DEFAULT
 let v = read(COLUBK);

 // PLAYFIELD
 const isMirror = (read(CTRLPF) & 0x01) === 0x01;

 const pfPixel = Math.floor(x / 4);
 const isPfLeft = (pfPixel < 20);
 const isScore = (read(CTRLPF) & 0x06) === 0x02;


 const pw = isPfLeft ?
   19 - pfPixel : // pixel value is inverted wrt PF
   isMirror ? pfPixel - 20 : (19 - (pfPixel - 20)); // -20 for to shift to 0 offset

 const pfBit = 1 << pw;
 const pfColor = isScore ? read(isPfLeft ? COLUP0 : COLUP1) : read(COLUPF);

 const pf_ = (pfBit & PF) > 0;

 pf_ && (v = pfColor);

 const px_= [false, false];
 const mx_= [false, false];
 let bl_ = false;

 const grp = (pid) => {
   const v = read(GRP0 + pid);

   return (mem[REFP0 + pid] & 0x08) ? rev8(v) : v;
 }

 // PLAYERS
 const dp = (pid, rp) => {
   const psz = read(NUSIZ0 + pid) & 7
   const isCopy = ((psz !== 5) && (psz !== 7)); // 5 and 7 are for wides
   const size = (psz === 7) ? 4 : ((psz === 5) ? 2 : 1); // 5 = 2x, 7 = 4x

   const drawCopy = (ofx) => {
     const q = Math.floor((x - (rp + ofx)) / size);
     if (q < 0) { return; }
     if (q > 8) { return; }

     const drawMe = ((grp(pid) & Math.pow(2, 8 - q)) > 0);
     if (drawMe) {
       px_[pid] = true;
       v = read(COLUP0 + pid); }
   }

   drawCopy(0);
   
   if (!isCopy) { return; }

   (psz === 1) && drawCopy(16);
   (psz === 2) && drawCopy(32);
   (psz === 3) && (drawCopy(16), drawCopy(32));
   (psz === 4) && drawCopy(56);
   (psz === 6) && (drawCopy(16), drawCopy(32), drawCopy(56));
 }


 // BALL
 const bl = (colup) => {
   if ((x - resblx) > 0) { return; }

   bl_ = (read(ENABL) & 0x02) === 0x02;
   if (bl_) { v = read(colup); }
 }

 // MISSILES
 const mssl = (mid, resm) => {
   const psz = read(NUSIZ0 + mid) & 7;
   const size = Math.pow(2, (read(NUSIZ0 + mid) & 0x30) >> 4);

   const isVisible = enam(mid) && !resmp(mid);
   if (!isVisible) { return; }

   const drawCopy = (ofx) => {
     const p_ = resm + ofx;
     if ((x < p_) || (x >= (p_ + size))) { return; }

     mx_[mid] = isVisible;

     v = read(COLUP0 + mid);
   }

   drawCopy(0);
   (psz === 1) && drawCopy(16);
   (psz === 2) && drawCopy(32);
   (psz === 3) && (drawCopy(16), drawCopy(32));
   (psz === 4) && drawCopy(56);
   (psz === 6) && (drawCopy(16), drawCopy(32), drawCopy(56));
 }

 (x >= resp0x) && dp(0, resp0x);
 (x >= resp1x) && dp(1, resp1x);
 (x >= resm0x) && mssl(0, resm0x);
 (x >= resm1x) && mssl(1, resm1x);
 (x >= resblx) && bl(COLUPF);

 // fl(px_[0] && bl_) && console.log("IIIII", x, y);
 const px0pf = (px_[0] && pf_) ? 0x80 : 0x00;
 const px0bl = (px_[0] && bl_) ? 0x40 : 0x00;
 const cxp0bf_ = px0bl | px0pf;

 cxp0bf_ && write(CXP0FB, cxp0bf_);

 const px1pf = (px_[1] && pf_) ? 0x80 : 0x00;
 const px1bl = (px_[1] && bl_) ? 0x40 : 0x00;
 const cxp1bf_ = px1bl | px1pf;

 cxp1bf_ && write(CXP1FB, cxp1bf_);

 const cxblpf_ = ((bl_ && pf_) ? 0x80 : 0x00);
 cxblpf_ && write(CXBLPF, cxblpf_);

 const px1m0 = ((mx_[0] && px_[1]) ? 0x80 : 0x00);
 const px0m0 = ((mx_[0] && px_[0]) ? 0x40 : 0x00);
 const cxm0p_ = px0m0 | px1m0;

 cxm0p_ && write(CXM0P, cxm0p_);

 const px0m1 = ((mx_[1] && px_[0]) ? 0x80 : 0x00);
 const px1m1 = ((mx_[1] && px_[1]) ? 0x40 : 0x00);
 const cxm1p_ = px0m1 | px1m1;

 cxm1p_ && write(CXM1P, cxm1p_);

 const m0pf = ((mx_[0] && pf_) ? 0x80 : 0x00);
 const m0bl = ((mx_[0] && bl_) ? 0x40 : 0x00);
 const cxm0fb_ = m0pf | m0bl;

 cxm0fb_ && write(CXM0FB, cxm0fb_);

 const m1pf = ((mx_[1] && pf_) ? 0x80 : 0x00);
 const m1bl = ((mx_[1] && bl_) ? 0x40 : 0x00);
 const cxm1fb_ = m1pf | m1bl;

 cxm1fb_ && write(CXM1FB, cxm1fb_);

 // VBLANK
 v = (read(VBLANK) & 0x02) ? 0x00 : v;

 const [r, g, b] = colors[v - (v % 2)] ?? [0x00, 0x00, 0x00];

 const p = (y * W) + x;
 const o = p * 4;

 screen[o + 0] = r;
 screen[o + 1] = g;
 screen[o + 2] = b;
 screen[o + 3] = 0xff;
}

function drawer() {
  const canvas = document.getElementById("tehScreen");
  const ctx = canvas.getContext("2d");
  const HM = 1;
  const WM = 2;


  const stretchedScreen = () => {
     const abStretched = new ArrayBuffer(W * WM * H * HM * 4);
     const screenStretched = new Uint8ClampedArray(abStretched);


     for (let y_ = 0; y_ < H; y_++) {
       const l0_ = y_ * W * 4; // 1 pixel row, 1 pixel columns, 4 byte info
       const l1_ = y_ * HM * W * WM * 4; // 3 pixel rows, 4 pixel columns, 4 byte info

       for (let x_ = 0; x_ < W; x_++) {
	 const o0_ = l0_ + x_ * 4; 

	 const o1_ = l1_ + (x_ * WM * 4);

	 for (let j = 0; j < HM; j++) {
	   for (let i = 0; i < WM; i++) {
	     screenStretched[(i * 4) + (j * W * WM * 4) + o1_ + 0] = screen[o0_ + 0];
	     screenStretched[(i * 4) + (j * W * WM * 4) + o1_ + 1] = screen[o0_ + 1];
	     screenStretched[(i * 4) + (j * W * WM * 4) + o1_ + 2] = screen[o0_ + 2];
	     screenStretched[(i * 4) + (j * W * WM * 4) + o1_ + 3] = screen[o0_ + 3];
	   }

	 }
       }
     }

     return new ImageData(screenStretched, W * WM, H * HM);
  }

  const draw = () => {
    ctx.putImageData(stretchedScreen(), 0, 0);
    document.dispatchEvent(new Event("draw")); }

  const cross = (x, y) => {
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#00ff00";
    
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }


  return [draw, cross];
}

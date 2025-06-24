const tia = (rdy) => {
  const arrayBuffer = new ArrayBuffer(4 * W * H);
  const pfs = new Set([PF0, PF1, PF2]);
  let screen = new Uint8ClampedArray(arrayBuffer);
  
  let isVSync = false;
  let resp0x = -1;
  let resp1x = -1;
  let resm0x = -1;
  let resm1x = -1;
  let resblx = -1;
  let hmoveWait = false;
  let tt = -1;
  
  let isDirt = false;

  let isRESP0 = false;
  let isRESP1 = false;
  let isRESM0 = false;
  let isRESM1 = false;
  let isRESBL = false;

  let isHMOVE = false;
  let isHMCLR = false;

  let ENABL_DELAYED = 0;
  let GRP0_DELAYED = 0;
  let GRP1_DELAYED = 0;

  const HL_SPRITES = false;

  const mem = new Uint8Array(0xff);


  const cxclr = () => { mem[CXM0P]  = 0;
                        mem[CXM1P]  = 0;
                        mem[CXP0FB] = 0;
                        mem[CXP1FB] = 0;
                        mem[CXM0FB] = 0;
                        mem[CXM1FB] = 0;
                        mem[CXBLPF] = 0; }

  const initialize = () => {
    cxclr();

    mem[INPT4]  = 0xff;
    mem[INPT5]  = 0xff;
  }

  initialize();

  const inpt4 = (fn) => { mem[INPT4] = fn(mem[INPT4]) }
  const inpt5 = (fn) => { mem[INPT5] = fn(mem[INPT5]) }

  const write = (naddr, v) => { 
     if ((naddr === CXP0FB)) { return; }
     if ((naddr === CXP1FB)) { return; }

     // STROBES, i.e. won't be actually stored and return early
     if (naddr === CXCLR) { cxclr(); return; }

     if (naddr === INPT4) { return; }
     if (naddr === INPT5) { return; }

     if (naddr === WSYNC) { rdy(0); return; }
     if (naddr === RESP0) { isRESP0 = true; return; }
     if (naddr === RESP1) { isRESP1 = true; return; }
     if (naddr === RESM0) { isRESM0 = true; return; }
     if (naddr === RESM1) { isRESM1 = true; return; }
     if (naddr === RESBL) { isRESBL = true; return; }

     if (naddr === HMOVE) { isHMOVE = true; return; }
     if (naddr === HMCLR) { isHMCLR = true; return; }

     if (naddr === VSYNC) { 
       if (v & 0x02) {
	 tt = 0;
	 rdy(1);
	 isVSync = true;
	 return;
       }
     }

     if (naddr === VBLANK) {
       if ((v & 0x80) === 0x00) {
	 // if ((mem[naddr] & 0x80) === 0x80) { p0wait = p0pot; }
	 // p0wait = p0pot;
       }

     }

     if (naddr === ENABL) {
       if (mem[VDELBL] & 0x01) { ENABL_DELAYED = v; return; }
     }

     if (naddr === GRP0) {
       if (mem[VDELP1] & 0x01) { mem[GRP1] = GRP1_DELAYED; }
       if (mem[VDELP0] & 0x01) { GRP0_DELAYED = v; return; }
     }

     if (naddr === GRP1) {
       if (mem[VDELBL] & 0x01) { mem[ENABL] = ENABL_DELAYED; }
       if (mem[VDELP0] & 0x01) { mem[GRP0] = GRP0_DELAYED; }
       if (mem[VDELP1] & 0x01) { GRP1_DELAYED = v; return; }
     }
	
     mem[naddr] = v & 0xff;

     // POST PROCESSING, i.e. update helper registers and the like
     if (pfs.has(naddr)) {
       const pf0 = mem[PF0] & 0xff;
       const pf1 = mem[PF1] & 0xff;
       const pf2 = mem[PF2] & 0xff;

       const pf0rev = rev8(pf0) & 0xf;
       const pf2rev = rev8(pf2) & 0xff;

       PF = ((pf0rev << 16) | (pf1 << 8) | pf2rev) & 0xffffffff;
     }
  }

  const read = (naddr) => mem[naddr] & 0xff;

  const updateScreen = () => {
   tt = (tt + 1) % BLK;
	  //
   // EOL
   if ((tt % 228) === 0) { rdy(1); } // FIXME Move _after_ CPU action, because now update happens too early and sprites get drawn out of position

   const invb = tt <= VB;
   const inover = tt > OS;
   const inhblank = ((tt % 228) <= HB);
  
   const enam = (pid) => (read(ENAM0 + pid) & 0x02) === 0x02;
   const resmp = (pid) => (read(RESMP0 + pid) & 0x02) === 0x02;
   const hm = (addr) => tcd4((read(addr) >> 4) & 0xf) * -1;
  
   const inScreen = !invb && !inover && !inhblank;
  
   const d = tt - VB;
  
   if (isRESP0) { resp0x = Math.max(((tt + (hmoveWait ? 4 : 0)) % 228) - HB - 1, 3); isRESP0 = false; }
   if (isRESP1) { resp1x = Math.max(((tt + (hmoveWait ? 4 : 0)) % 228) - HB - 1, 3); isRESP1 = false; }
   if (isRESM0) { resm0x = Math.max(((tt + (hmoveWait ? 3 : 0)) % 228) - HB - 1, 2); isRESM0 = false; }
   if (isRESM1) { resm1x = Math.max(((tt + (hmoveWait ? 3 : 0)) % 228) - HB - 1, 2); isRESM1 = false; }
   if (isRESBL) { resblx = Math.max(((tt + (hmoveWait ? 3 : 0)) % 228) - HB - 1, 2); isRESBL = false; }
  
   if (isHMCLR) {
     write(HMP0, 0);
     write(HMP1, 0);
     write(HMBL, 0);
     write(HMM0, 0);
     write(HMM1, 0);
  
     isHMCLR = false; }
  
   if (isHMOVE) {
    isDirt = true;
  
    resp0x = mod(resp0x + hm(HMP0), 160);
  
    resp1x = mod(resp1x + hm(HMP1), 160);
  
    resblx = mod(resblx + hm(HMBL), 160);
  
    resm0x = mod(resm0x + hm(HMM0), 160);
  
    resm1x = mod(resm1x + hm(HMM1), 160);
  
    hmoveWait = true;
    isHMOVE = false; }
  
   // Next line? Forget HMOVE
   if ((tt % 228) === 0) { isDirt = false; /*rdy(1);*/ }
  
   if (resmp(0)) { resm0x = resp0x + 3; }
   if (resmp(1)) { resm1x = resp1x + 3; }
  
   if (!inScreen) { return; }
  
   const y = Math.floor(d / 228);
   const x = (d % 228) - HB;
  
  
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
  
     return (read(REFP0 + pid) & 0x08) ? rev8(v) : v;
   }
  
   // PLAYERS
   const dp = (pid, rp) => {
     const psz = read(NUSIZ0 + pid) & 7
     const isCopy = ((psz !== 5) && (psz !== 7)); // 5 and 7 are for wides
     const size = (psz === 7) ? 4 : ((psz === 5) ? 2 : 1); // 5 = 2x, 7 = 4x
  
     const drawCopy = (ofx) => {
       // if ((psz !== 7) || (pid !== 1)) { return; }
       const w0 = 8 * size;
       const l0 = (rp + ofx); // left
       const r0 = (l0 + w0);  // right
  
       const r0w = (r0 % 160); // left wrapped
       const l0w = (r0w - w0); // right wrapped
  
       // FIXME There must be a better / more concise / elegant way to do this
       //       Need to handle the situation where Player sprite 'wraps'; prettier
       //       would probably to keep and update sprite pixels on every update of
       //       relevant TIA registers, but that would need work that I'm not willing
       //       to put in at this stage.
       let d0 = 0;
       if ((x >= l0) && (x < r0)) { d0 = x - l0; }
       else if ((x >= l0w) && (x < r0w)) { d0 = x - l0w }
       else { return; }
  
       const q = Math.floor(d0 / size);
       if (q < 0) { return; }
       if (q > 8) { return; }
  
       const drawMe = (grp(pid) & Math.pow(2, 7 - q)) > 0;
  
       if (drawMe) {
         px_[pid] = true;
         v = read(COLUP0 + pid);
  
         HL_SPRITES && (((pid === 0) && (v > 0)) && (v = 10))
         HL_SPRITES && (((pid === 1) && (v > 0)) && (v = 50))
       }
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
     const size = Math.pow(2, (read(CTRLPF) & 0x110000) >> 4);
     if ((x - resblx) > size) { return; }
  
     bl_ = (read(ENABL) & 0x02) === 0x02;
     if (bl_) {
       v = read(colup);
       HL_SPRITES && ((v > 0) && (v = 30))
     }
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
       HL_SPRITES && (((mid === 0) && (v > 0)) && (v = 40))
       HL_SPRITES && (((mid === 1) && (v > 0)) && (v = 90))
     }
  
     drawCopy(0);
     (psz === 1) && drawCopy(16);
     (psz === 2) && drawCopy(32);
     (psz === 3) && (drawCopy(16), drawCopy(32));
     (psz === 4) && drawCopy(56);
     (psz === 6) && (drawCopy(16), drawCopy(32), drawCopy(56));
   }
  
   if (isDirt && (x < 8)) {
    v = 0;
   } else {
     if ((read(CTRLPF) & 0x04)) {
       if (!pf_) {
        dp(1, resp1x);
        (x >= resm1x) && mssl(1, resm1x);
        dp(0, resp0x);
        (x >= resm0x) && mssl(0, resm0x);
        (x >= resblx) && bl(COLUPF);
       }
     } else {
       (x >= resblx) && bl(COLUPF);
       dp(1, resp1x);
       (x >= resm1x) && mssl(1, resm1x);
       dp(0, resp0x);
       (x >= resm0x) && mssl(0, resm0x);
     }
   }
  
  
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
  
  const drawer = () => {
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
      if (!isVSync) { return; }

      isVSync = false;

      ctx.putImageData(stretchedScreen(), 0, 0);
      document.dispatchEvent(new Event("draw")); }
  
    const cross = (x, y) => {
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#00ff00";
  
      ctx.beginPath();
      ctx.moveTo(x * WM, 0);
      ctx.lineTo(x * WM, H * HM);
      ctx.stroke();
  
      ctx.beginPath();
      ctx.moveTo(0, y * HM);
      ctx.lineTo(W * WM, y * HM);
      ctx.stroke();
    }
  
  
    return [draw, cross];
  }

  const state = () => ({
      p0: read(GRP0),
      p1: read(GRP1),
      p0x: resp0x,
      p1x: resp1x,
      m0x: resm0x,
      m1x: resm1x,
      pf0: read(PF0),
      pf1: read(PF1),
      pf2: read(PF2),
      pf: PF,
      ctrlpf: read(CTRLPF),
      x: (tt % 228) - VB,
      y: Math.floor((tt - VB) / 228),
      isVSync,
  });

  return [read, write, inpt4, inpt5, updateScreen, drawer, state];
}

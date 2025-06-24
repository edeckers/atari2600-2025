const riot = (input) => {
  var interval = 1;
  var timerCounter = 1;


  const pfs = new Set([PF0, PF1, PF2]);
  const rom = romAsMem(input.length === 2_048 ? input.concat(input) : input);
  const mem = new Uint8Array(0x0fff);

  const nrml = (addr, r) => {
    if (addr & 0x1000) { // ROM
      return addr & 0x1fff;
    } else if ((addr & 0x1080) === 0x00) { // TIA
      const _a = addr & 0x3f;

      // FIXME This is probably not correct:
      //       TIA has read and write addresses, some of them
      //       which overlap, such as 0C (REFP1) and 0c (INPT4).
      //       Only the action differs. We move reads to 0xyz
      //       to mirror 0x3z
      return r ? (_a | 0x30) : _a;
    } else if ((addr & 0x1280) === 0x80) { // PIA
      // console.log("PIA", addr.toString(16));
      return addr & 0xff;
    } else if ((addr & 0x1280) === 0x280) { // IO
      // console.log("IO", addr.toString(16));
      return addr;
    }

    return addr;
  }

  const read = (addr) => {
    const naddr = nrml(addr, true);
    // if (naddr === 0x1ff8 || naddr === 0x1ff9) { console.log("SWITCH"); }

    if (naddr === INTIM) {
      if (mem[INSTAT] & 0x40) { // Restart interval
        mem[INSTAT] &= 0xbf;
      }
    } else if (naddr === INSTAT) {
      mem[INSTAT] &= 0xbf; // Reset bit 6 on read instat
    } else if (naddr & 0x1000) {
      return rom(naddr & 0x1fff);
    }

     // if (naddr === 0x32) { return 0xff; }

    // if (naddr === 0x32) {
    //     (mem[naddr] !== 0) && console.log("WWW", mem[naddr].toString(16));
    // }

    return mem[naddr];
  }

  const cxclr = () => { mem[CXM0P] = 0;
                        mem[CXM1P] = 0;
                        mem[CXP0FB] = 0;
                        mem[CXP1FB] = 0;
                        mem[CXM0FB] = 0;
                        mem[CXM1FB] = 0;
                        mem[CXBLPF] = 0; }
  let p0pot = 60 * 228;
  let p0wait = 0;

  const paddle_ = () => {
    const isDumped = (mem[VBLANK] & 0x80) === 0x80;
    if (isDumped) {
       mem[INPT0] &= 0x7f;
       return
    }

    if (p0wait > 0) {
      p0wait--;
      return;
    }

    mem[INPT0] |= 0x80;
  }


  const write = (addr, v) => {
     const naddr = nrml(addr);
     if (addr === 0x0282) { return; }

     if ((naddr === CXP0FB)) { return; }
     if ((naddr === CXP1FB)) { return; }

     // STROBES, i.e. won't be actually stored and return early
     if (naddr === CXCLR) { cxclr(); return; }

     if (naddr === INPT4) { return; }
     if (naddr === INPT5) { return; }

     if (naddr === WSYNC) { isWSync = true; return; }
     if (naddr === RESP0) { isRESP0 = true; return; }
     if (naddr === RESP1) { isRESP1 = true; return; }
     if (naddr === RESM0) { isRESM0 = true; return; }
     if (naddr === RESM1) { isRESM1 = true; return; }
     if (naddr === RESBL) { isRESBL = true; return; }

     if (naddr === HMOVE) { isHMOVE = true; return; }
     if (naddr === HMCLR) { isHMCLR = true; return; }


     // SPECIAL CASES with extra actions
     if (naddr === TIM1T)  { interval = 1;     timerCounter = interval; mem[INTIM] = Math.max(v, 0) & 0xff; mem[INSTAT] &= 0x7f; return; }
     if (naddr === TIM8T)  { interval = 8;     timerCounter = interval; mem[INTIM] = Math.max(v, 0) & 0xff; mem[INSTAT] &= 0x7f; return; }
     if (naddr === TIM64T) { interval = 64;    timerCounter = interval; mem[INTIM] = Math.max(v, 0) & 0xff; mem[INSTAT] &= 0x7f; return; }
     if (naddr === T1024T) { interval = 1_024; timerCounter = interval; mem[INTIM] = Math.max(v, 0) & 0xff; mem[INSTAT] &= 0x7f; return; }

     if (naddr === SWCHA) { const v0 = v & mem[SWACNT]; mem[SWCHA] |= v0; }
     /* if (naddr === SWCHB) { const v0 = v & mem[SWBCNT]; mem[SWCHB] |= v0; } */

     if (naddr === VSYNC) { isVSync = (v & 0x02) === 0x02; }

     if (naddr === VBLANK) {
       if ((v & 0x80) === 0x00) {
	 if ((mem[naddr] & 0x80) === 0x80) { p0wait = p0pot; }
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

     // UPDATE MEMORY
     mem[naddr] = v;

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


  const tickTimer = () => {
   if (timerCounter > 0) { timerCounter--; return; }

   const t0 = mem[INTIM] - 1;
   if (t0 < 0) { mem[INSTAT] |= 0xc0; mem[INTIM] = 0xff; timerCounter = 1; } else { mem[INTIM] = t0; timerCounter = interval; }
  }

  // const isPaddle = () => true; // mem[SWACNT] === 0x00;
  const isPaddle = () => false;

  const me  = () => { isPaddle() ? (p0pot = Math.max(p0pot - (4 * 228), 60 * 228)) : (mem[SWCHA] &= 0x7f); }
  const mec = () => { !isPaddle() && (mem[SWCHA] |= 0x80); }
  const mw  = () => { isPaddle() ? (p0pot = Math.min(p0pot + (4 * 228), 152 * 228)) : (mem[SWCHA] &= 0xbf); }
  const mwc = () => { !isPaddle() && (mem[SWCHA] |= 0x40); }

  const fire  = () => { isPaddle() ? (mem[SWCHA] &= 0x7f) : (mem[INPT4] &= 0x7f); }
  const firec = () => { isPaddle() ? (mem[SWCHA] |= 0x80) : (mem[INPT4] |= 0x80); }

  const controller = ({
	// P0
        mn:    () => mem[SWCHA] &= 0xef,
	me,
	ms:    () => mem[SWCHA] &= 0xdf,
	mw,
	fire,

	mnc:   () => mem[SWCHA] |= 0x10,
	mec,
	msc:   () => mem[SWCHA] |= 0x20,
	mwc,
	firec,

	// P1
        mn1:    () => mem[SWCHA] &= 0xfe,
	me1:    () => mem[SWCHA] &= 0xf7,
	ms1:    () => mem[SWCHA] &= 0xfd,
	mw1:    () => mem[SWCHA] &= 0xfb,
	fire1:  () => mem[INPT5] &= 0x7f,

	mnc1:   () => mem[SWCHA] |= 0x01,
	mec1:   () => mem[SWCHA] |= 0x08,
	msc1:   () => mem[SWCHA] |= 0x02,
	mwc1:   () => mem[SWCHA] |= 0x04,
	firec1: () => mem[INPT5] |= 0x80,
    });

  const switches = ({
	reset:   () => mem[SWCHB] &= 0xfe,
	resetc:  () => mem[SWCHB] |= 0x01,
	select:  () => mem[SWCHB] &= 0xfd,
	selectc: () => mem[SWCHB] |= 0x02,
  });

  const loadSwitches = () => {
    // SWCHB.0    Reset Button          (0=Pressed)
    // SWCHB.1    Select Button         (0=Pressed)
    // SWCHB.2    Not used
    // SWCHB.3    Color Switch          (0=B/W, 1=Color) (Always 0 for SECAM)
    // SWCHB.4-5  Not used
    // SWCHB.6    P0 Difficulty Switch  (0=Beginner (B), 1=Advanced (A))
    // SWCHB.7    P1 Difficulty Switch  (0=Beginner (B), 1=Advanced (A))

    mem[SWCHB]  = 0b00001011;
    mem[SWBCNT] = 0x00;
    mem[SWCHA]  = 0xff;
    mem[SWACNT] = 0xff;
    mem[INPT4]  = 0xff;
    mem[INPT5]  = 0xff;
  }

  loadSwitches();

  const readRaw = (addr) => mem[addr];
  const writeRaw = (addr, v) => write(addr, v);


  return [read, write, readRaw, writeRaw, controller, switches, tickTimer];
}



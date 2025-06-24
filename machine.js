const machine = (input) => {
  let isKilled = false;

  let cc = 0;
  let isStep = false;
  let t = 0;
  let u = 0;

  document.addEventListener("chrom", () => { isKilled = true; isBreak = false; });
  document.addEventListener("continue", () => { isContinue = true; isStep = false; });
  document.addEventListener("step", () => { isBreakout = true; isStep = true });

  const [read, write, readRaw, writeRaw, controller, switches, tickTimer] = riot(input);

  const [step, piaState] = mos6507(read, write, tickTimer);

  const [draw, cross] = drawer();

  PF = 0;

  // FIXME ED Move dependency from step/breakpoint
  let s = (228 * (3 + 37)) + 68 + (228 / 2); // Middle of screen, first line - pretty random, other emulators seem to work that way

  const break_ = async () => {
      let propagated = false;
      while (!isBreakout && ((breakpoints.has(piaState().pc) && !isContinue) || isStep)) {
	if (isWSync) { isBreakout = false; return; }
	if (isVSync) { isBreakout = false; return; }
        // if (bpConditional.x.lower !== undefined && (x < bpConditional.x.lower)) { break; }
        // if (bpConditional.x.upper !== undefined && (x > bpConditional.x.upper)) { break; }
        // if (bpConditional.y.lower !== undefined && (y < bpConditional.y.lower)) { break; }
        // if (bpConditional.y.upper !== undefined && (y > bpConditional.y.upper)) { break; }
	// if (isStep) { while (action && !action.next().done) { cc = (cc + 1) % 76, s++ } }

        const x = (s % 228) - hb;
        const y = Math.floor((s - vb) / 228);


        if (!propagated) {
          document.dispatchEvent(new Event("break"));
          updateScreen(readRaw, writeRaw, s);
          requestAnimationFrame(draw);
          requestAnimationFrame(() => cross(x, y));
          propagated = true;
        }
        await sleep(100);
      }
      isBreakout = false;
  }

  const tia_ = () => {
      updateScreen(readRaw, writeRaw, s);

      if (!isVSync && !(s === BLK)) { return }

      // requestAnimationFrame(draw);

      fs = new Date();
      s = 0;
      t = 0;
      clearScreen();
      cc = 0;
      isVSync = false;
  }

  const process = async () => {
    // let a = 0;
    while (!isKilled) {
      if (u === BLK) {u = 0; await sleep(DLY);  }
      // const y = Math.floor((s - vb) / 228);
      if (isVSync) { 
	      // FIMXE requestAnimationFrame, renders out-of-sync, most notably visible in "All Sprites"
	      draw(); /* requestAnimationFrame(draw); */ }

      // paddle_();

      // TIA every cycle
      tia_();

      if (t === 3) { t = 0; }

      // PIA once every 3 cycles
      (t === 0) && ( await break_(), step(), cc = (cc + 1) % 76);

      // EOL -> process current operation immediately
      if ((s % 228) === 0) {
	 isWSync = false;
	 cc = 0;
	 // while (!action.next().done) { }
      }


      t++;
      s++;
      u++;
    }
  }

  const info = () => {
    const x = (s % 228) - hb;
    const y = Math.floor((s - vb) / 228);

    return ({
      cc,
      tt: s,
      ...piaState(),
      p0: readRaw(GRP0),
      p1: readRaw(GRP1),
      p0x: resp0x,
      p1x: resp1x,
      m0x: resm0x,
      m1x: resm1x,
      pf0: readRaw(PF0),
      pf1: readRaw(PF1),
      pf2: readRaw(PF2),
      pf: PF,
      ctrlpf: readRaw(CTRLPF),
      swcha:  readRaw(SWCHA),
      swchb:  readRaw(SWCHB),
      swacnt: readRaw(SWACNT),
      swbcnt: readRaw(SWBCNT),
      x,
      y,
      intim: readRaw(INTIM),
      instat: readRaw(INSTAT),
      memory: Array(0x100).fill(1).map((_, k) => readRaw(k)),
      timerCounter,
      interval,
      isVSync,
      isWSync,
    });
  }


  return [process, controller, switches, info];
}

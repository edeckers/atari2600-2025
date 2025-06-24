const machine = (input) => {
  let isKilled = false;

  let cc = 0;
  let isStep = false;
  // FIXME ED Move dependency from step/breakpoint
  let s = (228 * (3 + 37)) + 68 + (228 / 2); // Middle of screen, first line - pretty random, other emulators seem to work that way
  let t = 0;
  let u = 0;

  document.addEventListener("chrom", () => { isKilled = true; isBreak = false; });
  document.addEventListener("continue", () => { isContinue = true; isStep = false; });
  document.addEventListener("step", () => { isBreakout = true; isStep = true });

  const romRead = romAsMem(input.length === 2_048 ? input.concat(input) : input);

  const [riotRead, riotWrite, swcha, switches, tickTimer, riotState] = riot();

  const [rdy, rdyw] = pin(1);

  const [tiaRead, tiaWrite, inpt4, inpt5, updateScreen, drawer, tiaState] = tia(rdyw);

  const ctrl = controller(swcha, inpt4, inpt5);

  const [draw, cross] = drawer();

  const [read, write] = bus(riotRead, riotWrite, romRead, tiaRead, tiaWrite);

  const [step, piaState] = mos6507(read, write, rdy);

  const break_ = async () => {
      let propagated = false;
      while (!isBreakout && ((breakpoints.has(piaState().pc) && !isContinue) || isStep)) {
	// if (isWSync) { isBreakout = false; return; }
        // if (bpConditional.x.lower !== undefined && (x < bpConditional.x.lower)) { break; }
        // if (bpConditional.x.upper !== undefined && (x > bpConditional.x.upper)) { break; }
        // if (bpConditional.y.lower !== undefined && (y < bpConditional.y.lower)) { break; }
        // if (bpConditional.y.upper !== undefined && (y > bpConditional.y.upper)) { break; }
	// if (isStep) { while (action && !action.next().done) { cc = (cc + 1) % 76, s++ } }

        const x = (s % 228) - VB;
        const y = Math.floor((s - VB) / 228);

        if (!propagated) {
          document.dispatchEvent(new Event("break"));
          updateScreen();
          draw;
          cross(x, y);
          propagated = true;
        }
        await sleep(100);
      }
      isBreakout = false;
  }

  const tia_ = () => {
      updateScreen();

      // FIXME requestAnimationFrame, renders out-of-sync, most notably visible in "All Sprites"
      /* requestAnimationFrame(draw); */
//      requestAnimationFrame(draw);
      draw();
  }

  const process = async () => {
    while (!isKilled) {
      if (u === BLK) { u = 0; t = 0; await sleep(DLY);  }

      // paddle_();

      // TIA every cycle
      tia_();

      // PIA once every 3 cycles
      ((t % 3) === 0) && ( await break_(), tickTimer(), step(), cc = (cc + 1) % 76);


      t++;
      s++;
      u++;
    }
  }

  const info = () => ({
      cc,
      tt: s,
      ...piaState(),
      ...riotState(),
      ...tiaState(),
      isWSync: !rdy(),
    });

  return [process, ctrl, switches, info];
}

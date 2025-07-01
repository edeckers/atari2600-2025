import { SWACNT, SWBCNT, SWCHA, SWCHB, INSTAT, INTIM, TIM1T, TIM8T, TIM64T, T1024T } from './consts.js';

export const riot = () => {
  var interval = 1;
  var timerCounter = 1;

  const mem = new Uint8Array(0x0fff);

  const nrml = (addr) => {
    if ((addr & 0x1280) === 0x0080) { // RAM
      // console.log("PIA", addr.toString(16));
      return addr & 0xff;
    } else if ((addr & 0x1280) === 0x0280) { // IO
      // console.log("IO", addr.toString(16));
      return addr;
    }

    throw new Error(`Unknown address: ${addr.toString(16)}`);
  }

  const read = (addr) => {
    const naddr = nrml(addr);
    // if (naddr === 0x1ff8 || naddr === 0x1ff9) { console.log("SWITCH"); }

    if (naddr === INTIM) {
      if (mem[INSTAT] & 0x40) { // Restart interval
        mem[INSTAT] &= 0xbf;
      }
    } else if (naddr === INSTAT) {
      mem[INSTAT] &= 0xbf; // Reset bit 6 on read instat
    }

    return mem[naddr];
  }

  const write = (addr, v) => {
     const naddr = nrml(addr);
     if (addr === 0x0282) { return; }

     // SPECIAL CASES with extra actions
     if (naddr === TIM1T)  { interval = 1;     timerCounter = interval; mem[INTIM] = Math.max(v, 0) & 0xff; mem[INSTAT] &= 0x7f; return; }
     if (naddr === TIM8T)  { interval = 8;     timerCounter = interval; mem[INTIM] = Math.max(v, 0) & 0xff; mem[INSTAT] &= 0x7f; return; }
     if (naddr === TIM64T) { interval = 64;    timerCounter = interval; mem[INTIM] = Math.max(v, 0) & 0xff; mem[INSTAT] &= 0x7f; return; }
     if (naddr === T1024T) { interval = 1_024; timerCounter = interval; mem[INTIM] = Math.max(v, 0) & 0xff; mem[INSTAT] &= 0x7f; return; }

     if (naddr === SWCHA) { const v0 = v & mem[SWACNT]; mem[SWCHA] |= v0; }
     /* if (naddr === SWCHB) { const v0 = v & mem[SWBCNT]; mem[SWCHB] |= v0; } */

     // UPDATE MEMORY
     mem[naddr] = v;
  }


  const tickTimer = () => {
   if (timerCounter > 0) { timerCounter--; return; }

   const t0 = mem[INTIM] - 1;
   if (t0 < 0) { mem[INSTAT] |= 0xc0; mem[INTIM] = 0xff; timerCounter = 1; } else { mem[INTIM] = t0; timerCounter = interval; }
  }

  const swcha = (fn) => { mem[SWCHA] = fn(mem[SWCHA]) }

  const switches = ({
	reset:    () => mem[SWCHB] &= 0xfe,
	resetc:   () => mem[SWCHB] |= 0x01,
	select:   () => mem[SWCHB] &= 0xfd,
	selectc:  () => mem[SWCHB] |= 0x02,
	color:    () => mem[SWCHB] |= 0x08,
	bw:       () => mem[SWCHB] &= 0xf7,
	diff00:   () => mem[SWCHB] &= 0xbf,
	diff01:   () => mem[SWCHB] |= 0x40,
	diff10:   () => mem[SWCHB] &= 0x7f,
	diff11:   () => mem[SWCHB] |= 0x80,
  });

  const initialize = () => {
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
  }

  initialize();

  const state = () => ({
      swcha:  mem[SWCHA],
      swchb:  mem[SWCHB],
      swacnt: mem[SWACNT],
      swbcnt: mem[SWBCNT],
      intim:  mem[INTIM],
      instat: mem[INSTAT],
      memory: mem.slice(0x0000, 0x0100),
      timerCounter,
      interval,
  });

  return [read, write, swcha, switches, tickTimer, state];
}

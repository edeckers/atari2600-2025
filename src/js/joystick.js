  // const isPaddle = () => true; // mem[SWACNT] === 0x00;
  const isPaddle = () => false;

  // const me  = () => { isPaddle() ? (p0pot = Math.max(p0pot - (4 * 228), 60 * 228)) : (mem[SWCHA] &= 0x7f); }
  // const mec = () => { !isPaddle() && (mem[SWCHA] |= 0x80); }
  // const mw  = () => { isPaddle() ? (p0pot = Math.min(p0pot + (4 * 228), 152 * 228)) : (mem[SWCHA] &= 0xbf); }
  // const mwc = () => { !isPaddle() && (mem[SWCHA] |= 0x40); }

  // const fire  = () => { isPaddle() ? (mem[SWCHA] &= 0x7f) : (console.log("FIRE"), mem[INPT4] &= 0x7f); }
  // const firec = () => { isPaddle() ? (mem[SWCHA] |= 0x80) : (mem[INPT4] |= 0x80); }

  export const joystick = (port) => {
    let state = 0xff;

    const signal = (v) => {
      state = v & 0xff;

      port(state);
    }

    return ({
	// P0
        mn:    () => signal(state & 0xfe),
	me:    () => signal(state & 0xf7),
	ms:    () => signal(state & 0xfd),
	mw:    () => signal(state & 0xfb),
	fire:  () => signal(state & 0xef),

	mnc:   () => signal(state | 0x01),
	mec:   () => signal(state | 0x08),
	msc:   () => signal(state | 0x02),
	mwc:   () => signal(state | 0x04),
	firec: () => signal(state | 0x10),
    });
  }


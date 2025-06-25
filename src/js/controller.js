  // const isPaddle = () => true; // mem[SWACNT] === 0x00;
  const isPaddle = () => false;

  // const me  = () => { isPaddle() ? (p0pot = Math.max(p0pot - (4 * 228), 60 * 228)) : (mem[SWCHA] &= 0x7f); }
  // const mec = () => { !isPaddle() && (mem[SWCHA] |= 0x80); }
  // const mw  = () => { isPaddle() ? (p0pot = Math.min(p0pot + (4 * 228), 152 * 228)) : (mem[SWCHA] &= 0xbf); }
  // const mwc = () => { !isPaddle() && (mem[SWCHA] |= 0x40); }

  // const fire  = () => { isPaddle() ? (mem[SWCHA] &= 0x7f) : (console.log("FIRE"), mem[INPT4] &= 0x7f); }
  // const firec = () => { isPaddle() ? (mem[SWCHA] |= 0x80) : (mem[INPT4] |= 0x80); }

  export const controller = (swcha, inpt4, inpt5) => ({
	// P0
        mn:    () => swcha(data => data & 0xef),
	me:    () => swcha(data => data & 0x7f),
	ms:    () => swcha(data => data & 0xdf),
	mw:    () => swcha(data => data & 0xbf),
	fire:  () => inpt4(data => data & 0x7f),

	mnc:   () => swcha(data => data | 0x10),
	mec:   () => swcha(data => data | 0x80),
	msc:   () => swcha(data => data | 0x20),
	mwc:   () => swcha(data => data | 0x40),
	firec: () => inpt4(data => data | 0x80),

	// P1
        mn1:    () => swcha(data => data & 0xfe),
	me1:    () => swcha(data => data & 0xf7),
	ms1:    () => swcha(data => data & 0xfd),
	mw1:    () => swcha(data => data & 0xfb),
	fire1:  () => inpt5(data => data & 0x7f),

	mnc1:   () => swcha(data => data | 0x01),
	mec1:   () => swcha(data => data | 0x08),
	msc1:   () => swcha(data => data | 0x02),
	mwc1:   () => swcha(data => data | 0x04),
	firec1: () => inpt5(data => data | 0x80),
    });


  export const joystick = (port) => {
    let state = 0xff;

    const signal = (v) => {
      state = v & 0xff;

      port(state);
    }

    return ({
        mn:    () => signal(state & 0xfe),
	me:    () => signal(state & 0xf7),
	ms:    () => signal(state & 0xfd),
	mw:    () => signal(state & 0xfb),
	fire:  () => signal(state & 0xdf),

	mnc:   () => signal(state | 0x01),
	mec:   () => signal(state | 0x08),
	msc:   () => signal(state | 0x02),
	mwc:   () => signal(state | 0x04),
	firec: () => signal(state | 0x20),
    });
  }


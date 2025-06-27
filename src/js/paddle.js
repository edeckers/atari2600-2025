import { pot } from "./shared";

// const me  = () => { isPaddle() ? (p0pot = Math.max(p0pot - (4 * 228), 60 * 228)) : (mem[SWCHA] &= 0x7f); }
// const mw  = () => { isPaddle() ? (p0pot = Math.min(p0pot + (4 * 228), 152 * 228)) : (mem[SWCHA] &= 0xbf); }
// const fire  = () => { isPaddle() ? (mem[SWCHA] &= 0x7f) : (console.log("FIRE"), mem[INPT4] &= 0x7f); }
// const firec = () => { isPaddle() ? (mem[SWCHA] |= 0x80) : (mem[INPT4] |= 0x80); }

export const paddle = (port) => {
  let state = 0xff;

  const [pr, pw] = pot(0);

  const signal = (v) => {
    state = v & 0xff;

    port(state, pr);
  }

  return ({
      me:    () => (pw(60 * 228), signal(state)),
      mw:    () => (pw(152 * 228), signal(state)),
      fire:  () => signal(state & 0xf7, pr()),

      mec:   () => (pw(128), signal(state)),
      mwc:   () => (pw(128), signal(state)),
      firec: () => signal(state | 0x08),
  });
}

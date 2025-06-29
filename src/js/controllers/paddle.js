import { pot } from "../shared";

const TICKS_PER_LINE = 228;

// Determined by manual testing, adjust as you see fit
const MIN            = 60;
const MAX            = 152;

const MIN_TICKS    = MIN * TICKS_PER_LINE;
const MAX_TICKS    = MAX * TICKS_PER_LINE;
const MIDDLE_TICKS = 100 * TICKS_PER_LINE;

const STEP_TICKS = 8 * TICKS_PER_LINE;

export const paddle = (port) => {
  let state = 0xff;

  const [pr, pw] = pot(MIDDLE_TICKS);

  const signal = (v) => {
    state = v & 0xff;

    port(state, pr);
  }


  signal(state);

  return ({
      me:    () => (pw(Math.max(pr() - STEP_TICKS,  MIN_TICKS)), signal(state)),
      mw:    () => (pw(Math.min(pr() + STEP_TICKS, MAX_TICKS)), signal(state)),
      fire:  () => signal(state & 0xf7, pr()),

      mec:   () => { },
      mwc:   () => { },
      firec: () => signal(state | 0x08),
  });
}

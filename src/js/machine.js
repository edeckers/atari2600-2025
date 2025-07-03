import { DLY } from './consts';

import { romAsMem } from "./rom";
import { pin, sleep } from "./shared";

import { riot } from "./riot";
import { tia } from "./tia";

import { bus } from "./bus";
import { mos6507 } from "./mos6507";

export const machine = (input) => {
  const romRead = romAsMem(input.length === 2_048 ? input.concat(input) : input);

  const [riotRead, riotWrite, swcha, switches, tickTimer, riotState] = riot();

  const [rdy, rdyw] = pin(1);

  const [tiaRead, tiaWrite, inpt0, inpt2, inpt4, inpt5, updateScreen, drawer, tiaState] = tia(rdyw);
 
  const port0 = (v, i0, i1) => {
   //  0   SWCHA.4
   //  1   SWCHA.5
   //  2   SWCHA.6
   //  3   SWCHA.7
   //  4   INPT4

   //  i0   INPT0
   //  i1   INPT1

   swcha(data => ((v & 0x0f) << 4) | (data & 0x0f));
   inpt0.connect(i0 || (() => 0));
   // inpt1.connect(i1 || (() => 0));
   
   inpt4(data => ((v & 0x10) << 3) | (data & 0x7f));
  }

  const port1 = (v, i2, i3) => {
   //  0   SWCHA.0
   //  1   SWCHA.1
   //  2   SWCHA.2
   //  3   SWCHA.3
   //  4   INPT5

   //  4   INPT2
   //  6   INPT3

   swcha(data => (v & 0x0f) | (data & 0xf0));
   inpt2.connect(i2 || (() => 0));
   // inpt3.connect(i3 || (() => 0));
   inpt5(data => ((v & 0x10) << 3) | (data & 0x7f));
  }

  const [draw, cross] = drawer();

  const [read, write] = bus(riotRead, riotWrite, romRead, tiaRead, tiaWrite);

  const [step, piaState, toggleEvents] = mos6507(read, write, rdy);
  
  let frame = false;

  const tia_ = () => {
      updateScreen();

      // FIXME requestAnimationFrame, renders out-of-sync, most notably visible in "All Sprites"
      /* requestAnimationFrame(draw); */
//      requestAnimationFrame(draw);
      if (draw()) { frame = true; };

  }

  const halt_ = () => {
    const {x, y} = tiaState();
    
    draw(true);
    cross(x, y);
  }

  const run = async (isHalted) => {
    let cc = 0;
    let t = 0;
    let u = 0;
    let isKilled = false;

    document.addEventListener("machine.kill", function killer() {
      isKilled = true;
      document.removeEventListener("machine.kill", killer);
    });

    // document.addEventListener("dbgr.break", () => { 
    //   tia_();
    // });

    let t0 = performance.now();

    while (!isKilled) {
      if (frame) {
        document.dispatchEvent(new Event("draw"));
	const d0 = performance.now() - t0;
	await sleep(Math.max(0, DLY - d0));

	frame = false;
	t0 = performance.now();
	continue;
      }

      if (isHalted()) {
	halt_();
	await sleep(100);
        continue;
      }

      // TIA every cycle
      tia_();

      // PIA once every 3 cycles
      (t === 0) && ( tickTimer(), step(), cc = (cc + 1) % 76);

      t = (t + 1) % 3;

      u++;
    }

    console.log("Machine killed, exiting run loop");
  }

  const info = () => ({
      cc,
      ...piaState(),
      ...riotState(),
      ...tiaState(),
      isWSync: !rdy(),
    });

  return [run, port0, port1, switches, info, toggleEvents];
}

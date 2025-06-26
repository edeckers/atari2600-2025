import { BLK, DLY } from './consts';

import { romAsMem } from "./rom";
import { pin, sleep } from "./shared";

import { riot } from "./riot";
import { tia } from "./tia";
import { controller } from "./controller";
import { bus } from "./bus";
import { mos6507 } from "./mos6507";

export const machine = (input) => {
  const romRead = romAsMem(input.length === 2_048 ? input.concat(input) : input);

  const [riotRead, riotWrite, swcha, switches, tickTimer, riotState] = riot();

  const [rdy, rdyw] = pin(1);

  const [tiaRead, tiaWrite, inpt4, inpt5, updateScreen, drawer, tiaState] = tia(rdyw);

  const ctrl = controller(swcha, inpt4, inpt5);

  const [draw, cross] = drawer();

  const [read, write] = bus(riotRead, riotWrite, romRead, tiaRead, tiaWrite);

  const [step, piaState, toggleEvents] = mos6507(read, write, rdy);

  const tia_ = () => {
      updateScreen();

      // FIXME requestAnimationFrame, renders out-of-sync, most notably visible in "All Sprites"
      /* requestAnimationFrame(draw); */
//      requestAnimationFrame(draw);
      draw();
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

    while (!isKilled) {
      if (isHalted()) {
	halt_();
	await sleep(100);
        continue; }

      if (u === BLK) { u = 0; await sleep(DLY);  }

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

  return [run, ctrl, switches, info, toggleEvents];
}

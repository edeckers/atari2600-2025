import { dbgr } from "./dev/debugger";

import { decode } from "./dev/assembly";
import { romAsMem } from "./rom";

import { joystick } from "./controllers/joystick";
import { paddle } from "./controllers/paddle";

import { machine } from "./machine";
import { romUploader } from "./ui/uploader";
import { listenForDebuggerEvents, updateStatus } from "./ui/debugger";
import { romSelector } from "./ui/selector";
import { fd } from "./shared";

import "./analytics/matomo";
import "./analytics/cookie-bar";

let breakpoints = [];

const isHalted = dbgr();

const { changeRom, updateRomSelector, readRom } = romSelector();

const loadSource = (rbx) => {
  const lines = decode(romAsMem(rbx));

  const asm = [];
  for (const line of lines) {
     const [address, src, ax] = line;
     const srcHtml = src.replaceAll(" ", "&nbsp;");

     if (!ax) {
       if (breakpoints && (breakpoints.indexOf(parseInt(address, 16)) > - 1)) {
         asm.push(`<div id="line-${address}"><span class="address bp">${address}</span> ${srcHtml}</div>`);
       } else {
         asm.push(`<div id="line-${address}"><span class="address">${address}</span> ${srcHtml}</div>`);
       }
     } else {
       asm.push(`<div class="blank">&nbsp;</div>`);
       asm.push(`<div id="line-${src}-data">.data ${src}</div>`);

       const cs = 8;
       const cx = [];
       for (let i = 0; i < ax.length; i += cs) {
         const c = ax.slice(i, i + cs);
         cx.push(c);
       }

       const offset = parseInt(src.substr(0, 4), 16) + 1;
       for (let i = 0; i < cx.length; i++) {
         const c = cx[i];
         const a = (offset + (i * cs)).toString(16).padStart(4, "0");
     	  asm.push(`<div id="line-${a}">${a} ${c.join(" ")}</div>`);
       }

       asm.push(`<div class="blank">&nbsp;</div>`);
     }

  }

  document.getElementById("source").innerHTML = asm.join("\n");
}

const updateControllerTypeSelection = () => {
  const updateForPlayer = (p) => {
    const $sx = document.getElementById(`${p}.settings`);

    $sx.querySelectorAll("label").forEach($e => $e.classList.remove("border-2"));

    document.getElementById(`${p}.controller.joystick`).checked ?
        $sx.querySelector(`label[for='${p}.controller.joystick']`).classList.add("border-2") :
        $sx.querySelector(`label[for='${p}.controller.paddle']`).classList.add("border-2");
  }

  updateForPlayer("p0");
  updateForPlayer("p1");
}


const controller = (port) => {
  let c = joystick(port);

  const connect = (t) => { c = t(port); updateControllerTypeSelection(); }

  document.addEventListener("DOMContentLoaded", () => {
    updateControllerTypeSelection();
  });

  return [connect, () => c];
}

const createMachine = () => {
  const {
    run: process,
    port0,
    port1,
    switches,
    info,
    toggleEvents,
    loadRom
  } = machine(readRom());

  process(isHalted);

  const [connectCtrl0, ctrll] = controller(port0);
  const [connectCtrl1, ctrlr] = controller(port1);

  return {
   switches,
   info,
   toggleEvents,
   connectCtrl0,
   connectCtrl1,
   loadRom,
   ctrll,
   ctrlr
  };
}

const {
   switches,
   info,
   toggleEvents,
   connectCtrl0,
   connectCtrl1,
   loadRom,
   ctrll,
   ctrlr
  } = createMachine();

const startRom = () => {
  // document.dispatchEvent(new Event("machine.kill"));
  const romBytes = readRom();
  if (!romBytes) { return; }

  loadSource(romBytes);

  loadRom(romBytes);
}

const listenForControllerInputs = () => {
  document.addEventListener("keydown", (event) => {
    if (event.key === "w") { ctrll().mn(); return false; }
    if (event.key === "d") { ctrll().me(); return false; }
    if (event.key === "s") { ctrll().ms(); return false; }
    if (event.key === "a") { ctrll().mw(); return false; }

    if (event.code === "Space") { ctrll().fire(); return false; }

    if (event.key === "ArrowUp") { ctrlr().mn(); return false; }
    if (event.key === "ArrowRight") { ctrlr().me(); return false; }
    if (event.key === "ArrowDown") { ctrlr().ms(); return false; }
    if (event.key === "ArrowLeft") { ctrlr().mw(); return false; }

    if (event.code.indexOf("Control") > -1) { ctrlr().fire(); return false; }

    if (event.key === "r") { switches.reset(); return false; }
    if (event.key === "q") { switches.select(); return false; }

    return false;
  });

  document.addEventListener("keyup", (event) => {
    if (event.key === "w") { ctrll().mnc(); return false; }
    if (event.key === "d") { ctrll().mec(); return false; }
    if (event.key === "s") { ctrll().msc(); return false; }
    if (event.key === "a") { ctrll().mwc(); return false; }

    if (event.code === "Space") { ctrll().firec(); return false; }

    if (event.key === "ArrowUp") { ctrlr().mnc(); return false; }
    if (event.key === "ArrowRight") { ctrlr().mec(); return false; }
    if (event.key === "ArrowDown") { ctrlr().msc(); return false; }
    if (event.key === "ArrowLeft") { ctrlr().mwc(); return false; }

    if (event.code.indexOf("Control") > -1) { ctrlr().firec(); return false; }

    if (event.key === "r") { switches.resetc(); return false; }
    if (event.key === "q") { switches.selectc(); return false; }

    return false;
  });
}

const listenForPlayerConfigInputs = () => {
  document.getElementsByName("p0.controller").forEach($e => $e.addEventListener(
	  "click",
	  (e) => { connectCtrl0(e.target.value === "joystick" ? joystick : paddle); }));
  document.getElementsByName("p1.controller").forEach($e => $e.addEventListener(
	  "click",
	  (e) => { connectCtrl1(e.target.value === "joystick" ? joystick : paddle); }));
}

const listenForPlayerDifficultyInputs = () => {
  document.getElementsByName("p0.difficulty").forEach($e => $e.addEventListener(
	  "click",
	  (e) => { e.target.value === "novice" ? switches.diff00() : switches.diff01(); }));
  document.getElementsByName("p1.difficulty").forEach($e => $e.addEventListener(
	  "click",
	  (e) => { e.target.value === "novice" ? switches.diff10() : switches.diff11(); }));
}

const listenForRomSelectorUpdates = () => {
  const $rs = document.getElementById("romSelector");
  const $msg = document.getElementById("norom-message");

  document.addEventListener("rom.selector.updated", (event) => { 
    if (event.detail.numberOfRoms === 0) {
      $rs.disabled = true;
      $rs.innerHTML = "<option value=''>No ROMs available</option>";
      $msg.classList.remove("hidden");
      return;
    }

    $rs.disabled = false;
    $msg.classList.add("hidden");
  });
}

const listenForConsoleColorToggle = () => {
  document.getElementsByName("console.color").forEach($e => $e.addEventListener(
	  "click",
	  (e) => { e.target.value === "color" ? switches.color() : switches.bw(); }));
}

const listenForConsoleButtonEvents = () => {
  document.getElementById("console.reset").addEventListener("click", () => { 
    switches.reset();
    
    setTimeout(() => { switches.resetc(); }, 100);
  });

  document.getElementById("console.select").addEventListener("click", () => { 
    switches.select();
    
    setTimeout(() => { switches.selectc(); }, 100);
  });
}

const startFr = () => {
  let frc = 0;
  
  const updateFr = () => {
    document.getElementById("fr").innerHTML = fd(frc, 2);
  
    frc = 0;
  }

  document.addEventListener("draw", () => { frc++; });

  setInterval(() => updateFr(), 1_000);
}

const attachControlsAndEvents = ($romSelector) => {
    $romSelector.addEventListener("change", (e) => {
      changeRom(e.target.options[e.target.selectedIndex].value)

      $romSelector.blur();
    });
  
    document.addEventListener("chrom", () => {
	   startRom();
	   document.dispatchEvent(new Event("dbgr.breakpoint.clear")); });
  
    document.addEventListener("dbgr.breakpoint.changed", (event) => {
       breakpoints = event.detail.breakpoints;
  
       loadSource(readRom());
    });

    
    startFr();
    listenForDebuggerEvents(startRom, toggleEvents, info);
    listenForControllerInputs();
    listenForPlayerConfigInputs();
    listenForPlayerDifficultyInputs();
    listenForConsoleColorToggle();
    listenForRomSelectorUpdates();
    listenForConsoleButtonEvents();
}

const main = () => {
  document.addEventListener("DOMContentLoaded", () => {
    attachControlsAndEvents(document.getElementById("romSelector"));
    romUploader();
    updateRomSelector();
    startRom();

    const pstatus = Object.fromEntries(Object.entries(info()).map(([k, _]) => [k, 0])); // updateStatus(pstatus);

    updateStatus(pstatus);
  });
}

main();

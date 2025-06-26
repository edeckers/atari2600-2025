import { dbgr } from "./debugger.js";

import { allsprites, bigsprite, bitmap, bowling, combat, complexscene1, decode, demo3_8, diag, frogger, hello, hmove, kernel01, kernel13, kernel15, kernel22, loadFromBase64, logo, moonpatrol, noinmemretrigger, piatimer, pongsports, positioning, retrigger, sethorizpos, superbreakout, tennis, tictactoe3d, timing2 } from "./rom.js";

import { machine } from "./machine.js";

let breakpoints = [];

const isHalted = dbgr();

const roms = {
  "kernel01": kernel01,
  "kernel13": kernel13,
  "kernel15": kernel15,
  "kernel22": kernel22,
  "diag": diag,
  "demo3_8": demo3_8,
  "bitmap": bitmap,
  "complexscene1": complexscene1,
  "sethorizpos": sethorizpos,
  "piatimer": piatimer,
  "timing2": timing2,
  "hello": hello,
  "logo": logo,
  "combat": combat,
  "frogger": frogger,
  "tennis": tennis,
  "positioning": positioning,
  "bowling": bowling,
  "moonpatrol": moonpatrol,
  "superbreakout": superbreakout,
  "tictactoe3d": tictactoe3d,
  "hmove": hmove,
  "allsprites": allsprites,
  "bigsprite": bigsprite,
  "retrigger": retrigger,
  "noinmemretrigger": noinmemretrigger,
  "pongsports": pongsports,
};

// let romName = "pongsports";
// let romName = "tictactoe3d";
// let romName = "tennis";
// let romName = "moonpatrol";
// let romName = "allsprites";
// let romName = "bigsprite";
// let romName = "complexscene2";
// let romName = "retrigger";
let romName = "noinmemretrigger";
// let romName = "superbreakout";
// let romName = "positioning";
// let romName = "frogger";

export const formatPc = (pc) => pc.toString(16).padStart(4, "0");

export const changeRom = (rn) => {
  romName = rn
  document.dispatchEvent(new Event("chrom"));
}

const fs = (f, status) => {
 const c = status ?  f.toUpperCase() : f.toLowerCase();

 const classes = status ? "font-bold text-white" : "";
 
 return `<span class="${classes}">${c}</span>`;
}

const fb = (v) => v.toString(2).padStart(8, "0");
const fd = (v) => v.toString(10).padStart(3, " ").replaceAll(" ", "&nbsp;");
const fh = (v) => v.toString(16).padStart(2, "0");

const fr = (r) => `$${fh(r)} ${fd(r)} ${fb(r)}`;

const loadDebugInfo = (pstatus) => {
  document.getElementById("rx").innerHTML = fr(pstatus.rx);
  document.getElementById("ry").innerHTML = fr(pstatus.ry);
  document.getElementById("ra").innerHTML = fr(pstatus.ra);
  document.getElementById("sp").innerHTML = fr(pstatus.sp);
  document.getElementById("pc").innerHTML = `$${formatPc(pstatus.pc)}`

  document.getElementById("fx").innerHTML = [
    fs("c",pstatus.fc),
    fs("z", pstatus.fz),
    fs("i", pstatus.fi),
    fs("d", pstatus.fd),
    fs("b", pstatus._fb),
    fs("_", 1),
    fs("v", pstatus.fv),
    fs("n", pstatus.fn)].join("");

  document.getElementById("intim").innerHTML        = `$${fh(pstatus.intim)} ${fd(pstatus.intim)}`;
  document.getElementById("instat").innerHTML       = `$${fh(pstatus.instat)} ${fd(pstatus.instat)} ${fb(pstatus.instat)}`;
  document.getElementById("interval").innerHTML     = `$${fh(pstatus.interval)} ${fd(pstatus.interval)}`;
  document.getElementById("timerCounter").innerHTML = `$${fh(pstatus.timerCounter)} ${fd(pstatus.timerCounter)}`;

  document.getElementById("xpos").innerHTML = pstatus.x.toString(10);
  document.getElementById("ypos").innerHTML = pstatus.y.toString(10);
  document.getElementById("p0").innerHTML   = pstatus.p0.toString(2).padStart(8, "0");
  document.getElementById("p1").innerHTML   = pstatus.p1.toString(2).padStart(8, "0");
  document.getElementById("p0x").innerHTML  = pstatus.p0x.toString(10);
  document.getElementById("p1x").innerHTML  = pstatus.p1x.toString(10);
  document.getElementById("m0x").innerHTML  = pstatus.m0x.toString(10);
  document.getElementById("m1x").innerHTML  = pstatus.m1x.toString(10);
  document.getElementById("blx").innerHTML  = pstatus.blx.toString(10);

  // document.getElementById("cc").innerHTML = `${pstatus.cc.toString(10)} (${pstatus.cc % 228} / ${Math.floor((pstatus.cc % 228) / 3)})`;
  // document.getElementById("cc").innerHTML = `${pstatus.cc.toString(10)}`;

  document.getElementById("pf0").innerHTML    = `$${fh(pstatus.pf0)} ${fb(pstatus.pf0)}`;
  document.getElementById("pf1").innerHTML    = `$${fh(pstatus.pf1)} ${fb(pstatus.pf1)}`;
  document.getElementById("pf2").innerHTML    = `$${fh(pstatus.pf2)} ${fb(pstatus.pf2)}`;
  document.getElementById("pf").innerHTML     = pstatus.pf.toString(2).padStart(20, "0");
  document.getElementById("ctrlpf").innerHTML = `$${fh(pstatus.ctrlpf)} ${fb(pstatus.ctrlpf)}`;
  document.getElementById("swcha").innerHTML  = `$${fh(pstatus.swcha)} ${fb(pstatus.swcha)}`;
  document.getElementById("swacnt").innerHTML = `$${fh(pstatus.swacnt)} ${fb(pstatus.swacnt)}`;
  document.getElementById("swchb").innerHTML  = `$${fh(pstatus.swchb)} ${fb(pstatus.swchb)}`;
  document.getElementById("swbcnt").innerHTML = `$${fh(pstatus.swbcnt)} ${fb(pstatus.swbcnt)}`;
}

const loadMemory = (pstatus) => {
  const memoryEl = document.getElementById("memory");

  const columns = []
  for (let i = 0; i < 0x10; i++) {
     columns.push(i.toString(16).padStart(2, "0"));
  }
  
  memoryEl.innerHTML = "<div>&nbsp;&nbsp;&nbsp;" + columns.join(" ") + "</div>";
  for (let y = 0x80; y < 0x100; y+=0x10) {
    const row = [];
    for (let x = 0; x < 0x10; x++) {
      const address = y + x;

      const value = pstatus.memory[address];
      if (value === undefined) {
	row.push("&nbsp;&nbsp;");
	continue;
      }

      row.push(value.toString(16).padStart(2, "0"));
    }

    memoryEl.innerHTML += `<div>${y.toString(16).padStart(2, "0")} ${row.join(" ")}</div>`;
  }
}

const updateHighlights = (pstatus) => {
  const lines = document.querySelectorAll("#source div[id^='line-']");
  for (const line of lines) {
    const address = parseInt(line.id.slice(5), 16);

    if (address === pstatus.pc) {
      if (line.classList.contains("hl")) { continue; }

      line.classList.add("hl");

      document.getElementById(`${line.id}`).scrollIntoView({ /*behavior: "smooth",*/ block: "nearest" });
    } else {
      line.classList.remove("hl");
    }
  }
}

const updateStatus = (pstatus) => {
  loadDebugInfo(pstatus);
  loadMemory(pstatus);
  updateHighlights(pstatus);
}

const loadSource = (rbx) => {
  const lines = decode(rbx);

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

const readRom = () => {
  const rom = roms[romName];

  return loadFromBase64(rom);
}

let ctrlr = undefined;
let switches = undefined;;
let info = undefined;
let toggleEvents = () => {};

const startRom = () => {
  document.dispatchEvent(new Event("machine.kill"));

  const romBytes = readRom();

  loadSource(romBytes);

  const [process, ctrl, swch, nfo, events] = machine(romBytes);

  process(isHalted);

  ctrlr = ctrl;
  switches = swch;
  info = nfo;
  toggleEvents = events || (() => {});
}

const toggleBreakpoint = (address) => {
  document.dispatchEvent(new CustomEvent("dbgr.breakpoint.toggle", { detail: { address } }));
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("source").addEventListener("dblclick", (event) => {
    toggleBreakpoint(parseInt(event.target.innerHTML.slice(0, 4), 16));
  });

  document.getElementById("debugmode").addEventListener("change", (event) => {
    if (event.target.checked) {
      document.getElementById("debugger").classList.remove("hidden");
      toggleEvents(true);
      return;
    }

    document.getElementById("debugger").classList.add("hidden");
    toggleEvents(false);
  });

  document.addEventListener("dbgr.breakpoint.changed", (event) => {
     breakpoints = event.detail.breakpoints;

     loadSource(readRom());
  });

  document.getElementById("continue").addEventListener("click", () => {
    document.dispatchEvent(new Event("dbgr.continue"));
  });
  document.getElementById("step").addEventListener("click", () => {
    document.dispatchEvent(new Event("dbgr.step"));
  });
  document.getElementById("restart").addEventListener("click", () => {
    startRom();
  });

  document.getElementById("romSelector").addEventListener("change", (e) => {
    changeRom(e.target.options[e.target.selectedIndex].value)
  });


  document.addEventListener("draw", () => { frc++; });
  document.addEventListener("chrom", () => { startRom(); document.dispatchEvent(new Event("dbgr.breakpoint.clear")); });

  document.addEventListener("dbgr.break", () => { const pstatus = info(); updateStatus(pstatus); });

  document.addEventListener("keydown", (event) => {
    if (event.key === "w") { ctrlr.mn(); return false; }
    if (event.key === "d") { ctrlr.me(); return false; }
    if (event.key === "s") { ctrlr.ms(); return false; }
    if (event.key === "a") { ctrlr.mw(); return false; }

    if (event.code === "Space") { ctrlr.fire(); return false; }

    if (event.key === "ArrowUp") { ctrlr.mn1(); return false; }
    if (event.key === "ArrowRight") { ctrlr.me1(); return false; }
    if (event.key === "ArrowDown") { ctrlr.ms1(); return false; }
    if (event.key === "ArrowLeft") { ctrlr.mw1(); return false; }

    if (event.code.indexOf("Control") > -1) { ctrlr.fire1(); return false; }

    if (event.key === "r") { switches.reset(); return false; }
    if (event.key === "q") { switches.select(); return false; }

    return false;
  });

  document.addEventListener("keyup", (event) => {
    if (event.key === "w") { ctrlr.mnc(); return false; }
    if (event.key === "d") { ctrlr.mec(); return false; }
    if (event.key === "s") { ctrlr.msc(); return false; }
    if (event.key === "a") { ctrlr.mwc(); return false; }

    if (event.code === "Space") { ctrlr.firec(); return false; }

    if (event.key === "ArrowUp") { ctrlr.mnc1(); return false; }
    if (event.key === "ArrowRight") { ctrlr.mec1(); return false; }
    if (event.key === "ArrowDown") { ctrlr.msc1(); return false; }
    if (event.key === "ArrowLeft") { ctrlr.mwc1(); return false; }

    if (event.code.indexOf("Control") > -1) { ctrlr.firec1(); return false; }

    if (event.key === "r") { switches.resetc(); return false; }
    if (event.key === "q") { switches.selectc(); return false; }

    return false;
  });
 });

let frc = 0; 

const updateFr = () => {
  document.getElementById("fr").value = frc;

  frc = 0;
}


const main = () => {
  setInterval(() => updateFr(), 1_000);

  startRom();

  const pstatus = Object.fromEntries(Object.entries(info()).map(([k, _]) => [k, 0])); // updateStatus(pstatus);
  
  updateStatus(pstatus);
}

main();

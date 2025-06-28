const fs = (f, status) => {
 const c = status ?  f.toUpperCase() : f.toLowerCase();

 const classes = status ? "font-bold text-white" : "";

 return `<span class="${classes}">${c}</span>`;
}

const fb = (v) => v.toString(2).padStart(8, "0");
const fd = (v) => v.toString(10).padStart(3, " ").replaceAll(" ", "&nbsp;");
const fh = (v) => v.toString(16).padStart(2, "0");

const fr = (r) => `$${fh(r)} ${fd(r)} ${fb(r)}`;

export const formatPc = (pc) => pc.toString(16).padStart(4, "0");

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

export const updateStatus = (pstatus) => {
  loadDebugInfo(pstatus);
  loadMemory(pstatus);
  updateHighlights(pstatus);
}

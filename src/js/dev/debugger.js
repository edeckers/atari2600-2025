export const dbgr = () => {
  let isHalted = false;

  const breakpoints = new Set();

  const halt = () => {
    document.dispatchEvent(new Event("dbgr.break"));

    isHalted = true;
  }

  const continue_ = () => { isHalted = false; document.dispatchEvent(new Event("dbgr.continued")); }

  document.addEventListener("dbgr.continue", continue_);

  document.addEventListener("dbgr.step", () => {
    document.addEventListener("mos6507.step.started", function halter() {
        halt();

	document.removeEventListener("mos6507.step.started", halter);
    });

    continue_();
  });


  document.addEventListener("mos6507.step.started", (e) => {
    if (!breakpoints.has(e.detail.pc)) { return; }

    halt();
  });

  document.addEventListener("dbgr.breakpoint.clear", () => { breakpoints.clear(); });

  document.addEventListener("dbgr.breakpoint.toggle", (e) => {
    const address = e.detail.address;

    if (breakpoints.has(address)) {
      breakpoints.delete(address);

      document.dispatchEvent(new Event("dbgr.continue"));
    } else {
      breakpoints.add(address);
    }

    document.dispatchEvent(new CustomEvent("dbgr.breakpoint.changed", { detail: { breakpoints: Array.from(breakpoints) } }));
  });

  return () => isHalted;
}

var pc = 0;
var sp = 0;

var fc = 0;
var fd = 0;
var fi = 0;
var fn = 0;
var fz = 0;

var ra = 0;
var rx = 0;

const pia = new Uint8Array(128);

const ramoffs = (addr) => addr - 0x80;

const printState = () => {
  console.log("pc", pc.toString(16).padStart(4, "0"));
  console.log("f", [fn, fz, fc, fi, fd, 0].join(" "));
  console.log("r", "a", ra.toString(16), "x", rx.toString(16));
}

const rrom = (rom, addr) => rom[offs(addr)]

const sram = (addr, value) => pia[ramoffs(addr)] = value;
const rram = (addr) => {
	// return pia[ramoffs(addr)];
	return pia[addr];
}

const tc = (v) => {
 // has MSB = 0 -> return as is
 // has MSB = 1 -> return 2s complement -> 0x80 = -128, 0x81 = -127, 0x82 = -126, etc.
 return  ((v & 0x80) === 0x80) ? -(0x80 - (v & 0x7f)) : v & 0xff;
}

const processors = {
  /* JSR nnnn    */ 0x20: (rom) => { sram(sp, (pc >> 8) & 0xff); sram(sp + 1, pc & 0xff); sp += 2; pc = (rrom(rom, pc + 2) << 8) + rrom(rom, pc + 1); },
  /* RTS         */ 0x60: () => { sp -= 2; h = rram(sp, 8) << 8; l = sram(sp); pc = h + l; },
  /* SEI         */ 0x78: () => { fi = 1; },
  /* STA nn      */ 0x85: (rom) => { sram(rrom(rom, pc + 1), ra & 0xff); },
  /* STX nn      */ 0x86: (rom) => { sram(rrom(rom, pc + 1), rx & 0xff); },
  /* TXA         */ 0x8a: () => { ra = rx; },
  /* BCC dd      */ 0x90: (rom) => { fc === 0 && (pc += tc(rrom(rom, pc + 1)) + 2); },
  /* STA nn, X   */ 0x95: (rom) => { sram(rrom(rom, pc + 1) + rx, ra & 0xff); },
  /* TXS         */ 0x9a: () => { sp = rx; },
  /* LDX #nn     */ 0xa2: (rom) => { rx = rrom(rom, pc + 1); },
  /* LDA #nn     */ 0xa9: (rom) => { ra = rrom(rom, pc + 1); },
  /* LDY nnnn    */ 0xac: (rom) => { addr = rrom(rom, pc + 2) << 8 + rrom(rom, pc + 1); ry = rram(addr); }, // This 2 byte addressing won't work
  /* DEC nn      */ 0xc6: (rom) => { addr = rrom(rom, pc + 1); v = (rram(addr) - 1) & 0xff; sram(addr, v); fn = tc(v) < 0; fz = tc(v) === 0;},
  /* BNE dd      */ 0xd0: (rom) => { fz === 0 && (pc += tc(rrom(rom, pc + 1)) + 2); },
  /* CLD         */ 0xd8: () => { fd = 0; },
  /* SBC (nn, X) */ 0xe1: (rom) => { addr = rrom(rom, pc + 1) + rx; v = ra + fc - 1 + rram(addr) + rram(addr + 1); ra = v & 0xff; },
  /* INX         */ 0xe8: () => { rx = (rx + 1) && 0xff; fn = tc(rx) < 0; fz = tc(rx) === 0; },
}

const process = (rom) => {
  const entrypoint = read(rom, 0xfffc, 2)

  pc = entrypoint;

  let i = 0;
  while (i < 200) {
    const o = rrom(rom, pc)

    console.log(formatASM(toASM(rom, pc)));

    const [_, l] = operatorLookup[o]
    const p = processors[o];

    p(rom);
    pc += l + 1;

    printState();
    i++;
  }
}

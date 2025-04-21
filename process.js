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
  /* JSR nnnn    */ 0x20: (read, write) => { write(sp, (pc >> 8) & 0xff); write(sp + 1, pc & 0xff); sp += 2; pc = (read(pc + 2) << 8) + read(pc + 1); },
  /* RTS         */ 0x60: (read, write) => { sp -= 2; h = read(sp, 8) << 8; l = write(sp); pc = h + l; },
  /* SEI         */ 0x78: () => { fi = 1; },
  /* STA nn      */ 0x85: (read, write) => { write(read(pc + 1), ra & 0xff); },
  /* STX nn      */ 0x86: (read, write) => { write(read(pc + 1), rx & 0xff); },
  /* TXA         */ 0x8a: () => { ra = rx; },
  /* BCC dd      */ 0x90: (read) => { fc === 0 && (pc += tc(read(pc + 1)) + 2); },
  /* STA nn, X   */ 0x95: (read, write) => { write(read(pc + 1) + rx, ra & 0xff); },
  /* TXS         */ 0x9a: () => { sp = rx; },
  /* LDX #nn     */ 0xa2: (read) => { rx = read(pc + 1); },
  /* LDA #nn     */ 0xa9: (read) => { ra = read(pc + 1); },
  /* LDY nnnn    */ 0xac: (read) => { addr = read(pc + 2) << 8 + read(pc + 1); ry = read(addr); }, // This 2 byte addressing won't work
  /* DEC nn      */ 0xc6: (read, write) => { addr = read(pc + 1); v = (read(addr) - 1) & 0xff; write(addr, v); fn = tc(v) < 0; fz = v === 0; },
  /* BNE dd      */ 0xd0: (read) => { fz === 0 && (pc += tc(read(pc + 1)) + 2); },
  /* CLD         */ 0xd8: () => { fd = 0; },
  /* SBC (nn, X) */ 0xe1: (read) => { addr = read(pc + 1) + rx; v = ra + fc - 1 + read(addr) + read(addr + 1); ra = v & 0xff; },
  /* INX         */ 0xe8: () => { rx = (rx + 1) && 0xff; fn = tc(rx) < 0; fz = rx === 0; },
}

const process = (rom) => {
  const entrypoint = romread(rom, 0xfffc, 2)

  const read = (addr) => {
    if ((addr & 0xf000) === 0xf000) { return rrom(rom, addr); };

    if ((addr >= 0x0080)  && (addr <= 0x00FF)) { return rram(addr); }
    if ((addr >= 0x0180)  && (addr <= 0x01FF)) { return rram(addr); }
    if ((addr >= 0x0480)  && (addr <= 0x04FF)) { return rram(addr); }
    if ((addr >= 0x0580)  && (addr <= 0x05FF)) { return rram(addr); }
  }

  const write = (addr, v) => {
     sram(addr, v)
  }

  pc = entrypoint;

  let i = 0;
  while (i < 200) {
    const o = read(pc)
  
    console.log(formatASM(toASM(rom, pc)));

    const [_, l] = operatorLookup[o]
    const p = processors[o];

    p(read, write);
    pc += l + 1;

    printState();
    i++;
  }
}

var pc = 0;
var sp = 0;

//  Bit  Name  Expl.
//  0    C     Carry         (0=No Carry, 1=Carry)
//  1    Z     Zero          (0=Nonzero, 1=Zero)
//  2    I     IRQ Disable   (0=IRQ Enable, 1=IRQ Disable)
//  3    D     Decimal Mode  (0=Normal, 1=BCD Mode for ADC/SBC opcodes)
//  4    B     Break Flag    (0=IRQ/NMI, 1=RESET or BRK/PHP opcode)
//  5    -     Not used      (Always 1)
//  6    V     Overflow      (0=No Overflow, 1=Overflow)
//  7    N     Negative/Sign (0=Positive, 1=Negative)

var fc = 0;
var fn = 0;
var fi = 0;
var fd = 0;
var fb = 0;
var fv = 0;
var fz = 0;

var ra = 0;
var rx = 0;

var cc = 0;

const pia = new Uint8Array(128);

const lines = 262;
const vs = 3;
const ovr = 30;
const cpl = 76;

const fl = (v) => v ? 1 : 0;

const fzu = (v) => fz = fl(v === 0);
const fnu = (v) => fn = fl(v & 0x80 === 0x80);

const ramoffs = (addr) => (addr - 0x80) & 0xff;

const printStates = () => {
  console.log("pc", pc.toString(16).padStart(4, "0"));
  console.log("f", [fc, fz, fi, fd, fb, 1, fv, fn].join(" "));
  console.log("r",
	  "a", ra.toString(16),
	  "x", rx.toString(16));
}

const rrom = (rom, addr) => rom[offs(addr)]

const sram = (addr, value) => pia[ramoffs(addr)] = value;
const rram = (addr) => {
	return pia[ramoffs(addr)];
	// return pia[addr];
}

const pshsp = (write, value) => { write((sp & 0xff), value & 0xff); sp += 1; }
const popsp = (read) => { sp -= 1; return read((sp & 0xff)) & 0xff; }

const tcd = (v) => {
 // has MSB = 0 -> return as is
 // has MSB = 1 -> return 2s complement -> 0x80 = -128, 0x81 = -127, 0x82 = -126, etc.
 return  ((v & 0x80) === 0x80) ? -(0x80 - (v & 0x7f)) : v & 0xff;
}

const processors = {
  /* ORA nnnn, X */ 0x1d: (read) => {
	  const l = read(pc + 1);
	  const h = read(pc + 2);

	  const nnnn = ((h << 8) + l) & 0xffff;

	  ra |= ((read(nnnn + rx + 1) << 8) + read(nnnn + rx));

	  fn = fnu(ra);
	  fz = fzu(ra);
          cc += 4; },
  /* JSR nnnn    */ 0x20: (read, write) => {
	  const l = read(pc + 1) & 0xff;
	  const h = read(pc + 2) & 0xff;

	  const ret = pc + 3; // JSR operator + 2 operand bytes

	  pshsp(write, (ret >> 8) & 0xff);
	  pshsp(write, ret & 0xff);

	  pc = (h << 8) + l;
          cc += 6; },
  /* JMP nnnn    */ 0x4c: (read) => { 
	  const l = read(pc + 1) & 0xff;
	  const h = read(pc + 2) & 0xff;

	  pc = ((h << 8) + l) & 0xffff;
	  cc += 3; },
  /* RTS         */ 0x60: (read) => { l = popsp(read); h = popsp(read); pc = ((h << 8) + l) & 0xffff; cc += 6; },
  /* ROR A       */ 0x6a: () => { const ra0 = ((ra >> 1) | (fc << 7)) & 0xff; fc = ra & 0x01; ra = ra0; fnu(ra); fzu(ra); pc += 1; cc += 2;},
  /* SEI         */ 0x78: () => { fi = 1; pc++; cc += 2;},
  /* STA nn      */ 0x85: (read, write) => { write(read(pc + 1), ra & 0xff); pc += 2; cc += 3; },
  /* STX nn      */ 0x86: (read, write) => { write(read(pc + 1), rx & 0xff);  pc += 2; cc += 3; },
  /* TXA         */ 0x8a: () => { ra = rx; fnu(ra); fzu(ra); pc += 1; cc += 2; },
  /* BCC dd      */ 0x90: (read) => { fc === 0 && (pc += tcd(read(pc + 1)) + 2, cc += 1); cc += 2;  },
  /* STA nn, X   */ 0x95: (read, write) => { write(read(pc + 1) + rx, ra & 0xff); pc += 2; cc += 4; },
  /* TXS         */ 0x9a: () => { sp = rx; pc += 1; cc += 2; },
  /* LDX #nn     */ 0xa2: (read) => { rx = read(pc + 1); fnu(rx); fzu(rx); pc += 2; cc += 2; },
  /* LDX nn      */ 0xa6: (read) => { const nn = read(pc + 1); rx = read(nn & 0xff); fnu(rx); fzu(rx); pc += 2; cc += 3; },
  /* TAY         */ 0xa8: () => { ry = ra; fnu(ry); fzu(ry); pc += 1; cc += 2; },
  /* LDA #nn     */ 0xa9: (read) => { ra = read(pc + 1); fnu(ra); fzu(ra); pc += 2; cc += 2; },
  /* LDY nnnn    */ 0xac: (read) => {
	  const nnnn = (read(pc + 2) << 8) + read(pc + 1);
	  ry = read(nnnn);

	  fnu(ry);
	  fzu(ry);
	  pc += 3;
          cc += 4; },
  /* LDA nn, X   */ 0xb5: (read) => {
	  const nn = read(pc + 1);
	  const r = nn + rx;

	  ra = read(r);

	  fnu(ra);
	  fzu(ra);
	  pc += 2;
          cc += 4; },
  /* LDA nnnn, Y */ 0xb9: (read) => {
	  const nnnn = (read(pc + 2) << 8) + read(pc + 1);
	  ra = read(nnnn + ry);

	  fnu(ra);
	  fzu(ra);
	  pc += 3;
          cc += 4; },
  /* LDX nnnn, Y */ 0xbe: (read) => {
	  const nnnn = (read(pc + 2) << 8) + read(pc + 1);
	  rx = read(nnnn + ry);

	  fnu(rx);
	  fzu(rx);
	  pc += 3;
          cc += 4; },
  /* DEC nn      */ 0xc6: (read, write) => {
	  addr = read(pc + 1);
	  v = (read(addr) - 1) & 0xff;
	  write(addr, v);

	  fnu(v);
	  fzu(v);
	  pc += 2;
          cc += 5; },
  /* CMP #nn     */ 0xc9: (read) => { const nn = read(pc + 1); const r = ra + nn; fc = fl(r > 0xff); fnu(r); fzu(r); pc += 2; cc += 2; },
  /* BNE dd      */ 0xd0: (read) => { fz === 0 && (pc += tcd(read(pc + 1)) + 2, cc += 1); cc += 2; },
  /* CLD         */ 0xd8: () => { fd = 0; pc += 1; cc += 2; },
  /* SBC (nn, X) */ 0xe1: (read) => {
	  const addr = read(pc + 1) + rx;
	  const v = ra + fc - 1 - read(addr);
	  ra = v & 0xff;

	  fnu(ra);
	  fzu(ra);

	  pc += 2;
          cc += 6; },
  /* INX         */ 0xe8: () => { rx = (rx + 1) & 0xff; fnu(rx); fzu(rx); pc += 1; cc += 2; },
}



//  0000-002C  TIA Write
//  0000-000D  TIA Read (sometimes mirrored at 0030-003D)
//  0080-00FF  PIA RAM (128 bytes)
//  0280-0297  PIA Ports and Timer
//  F000-FFFF  Cartridge Memory (4 Kbytes area)

const process = (rom, numberOfSteps = undefined) => {
  const entrypoint = romread(rom, 0xfffc, 2)

  const mem = new Uint8Array(0x10000);

  for (const [i, b] of rom.entries()) {
    mem[0xf000 + i] = b; 
  }
  
  const read = (addr) => {
    return mem[addr];
    // if ((addr & 0xf000) === 0xf000) { return mem[addr]; };

    // if ((addr >= 0x0000) && (addr <= 0x007f)) { return 0x38; }

    // if ((addr >= 0x0080)  && (addr <= 0x00ff)) { return mem[addr]; }
    // if ((addr >= 0x0180)  && (addr <= 0x01ff)) { return mem[addr]; }
    // if ((addr >= 0x0480)  && (addr <= 0x04ff)) { return mem[addr]; }
    // if ((addr >= 0x0580)  && (addr <= 0x05ff)) { return mem[addr]; }

    // console.error("access", addr.toString(16), "not implemented");
  }

  const write = (addr, v) => {
     dbg("write", addr.toString(16), v);
     // sram(addr, v)

     mem[addr] = v;
  }

  const draw = drawer();

  pc = entrypoint;

  dbg("entrypoint", pc.toString(16));

  let i = 0;
  let s = 0;
  let w = 0;
  while (numberOfSteps ? i < numberOfSteps : true) {
    const isWsync = read(WSYNC) !== 0;
    const isWaiting = w !== 0;

    if (!isWsync && !isWaiting) {
      const o = read(pc)
      dbg("pc", pc.toString(16), "o", o.toString(16));

      // printAsm && info(formatASM(toASM(rom, pc)));

      const cc0 = cc;
      const p = processors[o];
      p(read, write);

      w = cc - cc0; // FIXME overflow

      printState && printStates();
    }

    for (let a = 0; a < 3; a++) {
      updateScreen(read, s);
      s++;

      if (s % 228 === 0) { write(WSYNC, 0); }

      if (s === (228 * 262)) {
        draw();
        s = 0;
      }
    }

    w = Math.max(w - 1, 0);
    i++;
  }
}

var pc = 0;
var sp = 0xff;

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


var isWSync = false;
var isVSync = false;

const pia = new Uint8Array(128);

const fl = (v) => v ? 1 : 0;

const fzu = (v) => fz = fl(v === 0);
const fnu = (v) => fn = fl(v & 0x80 === 0x80);

// const ramoffs = (addr) => (addr - 0x80) & 0xff;

const printStates = () => {
  console.log("pc", pc.toString(16).padStart(4, "0"));
  console.log("f", [fc, fz, fi, fd, fb, 1, fv, fn].join(" "));
  console.log("r",
	  "a", ra.toString(16),
	  "x", rx.toString(16));
}

// const rrom = (rom, addr) => rom[offs(addr)]

// const sram = (addr, value) => pia[ramoffs(addr)] = value;
// const rram = (addr) => {
// 	return pia[ramoffs(addr)];
// 	// return pia[addr];
// }

const pshsp = (write, value) => { write((sp & 0xff), value & 0xff); sp = (sp - 1) & 0xff; }
const popsp = (read) => { sp = (sp + 1) & 0xff; return read(sp & 0xff) & 0xff; }

 // (v & 0x80) ? ((~v & 0x7f) + 1) & 0xff : v & 0xff;
const tcd = (v) => {
 // has MSB = 0 -> return as is
 // has MSB = 1 -> return 2s complement -> 0x80 = -128, 0x81 = -127, 0x82 = -126, etc.
 // return  (v & 0x80) ? -(0x80 - (v & 0x7f)) : v & 0xff;
 return (v & 0x80) ? -(((~v & 0x7f) + 1) & 0xff) : v & 0xff;
}

const word = (read, addr) => {
  const l = read(addr) & 0xff;
  const h = read(addr + 1) & 0xff;
  
  return ((h << 8) + l) & 0xffff;
}

const processors = {
  /* ORA nn      */ 0x05: (read) => { const nn = read(pc + 1); ra |= read(nn); fnu(ra); fzu(ra); pc += 2; cc += 3; },
  /* ASL A       */ 0x0a: () => { const ra0 = (ra << 1) & 0xff; fc = ((ra & 0x80) >> 7); ra = ra0; fnu(ra); fzu(ra); pc += 1; cc += 2;}, // Correct?
  /* BPL dd      */ 0x10: (read) => { fn === 0 && (pc += tcd(read(pc + 1)), cc += 1); pc += 2; cc += 2; },
  /* CLC         */ 0x18: () => { fc = 0; pc += 1; cc += 2; },
  /* ORA nnnn, X */ 0x1d: (read) => {
	  const nnnn = word(read, pc + 1);

	  ra |= read(nnnn + rx);

	  fn = fnu(ra);
	  fz = fzu(ra);

	  pc += 3;
          cc += 4; },
  /* JSR nnnn    */ 0x20: (read, write) => {
	  const nnnn = word(read, pc + 1);

	  const ret = pc + 3; // JSR operator + 2 operand bytes

	  pshsp(write, (ret >> 8) & 0xff);
	  pshsp(write, ret & 0xff);

	  pc = nnnn;
          cc += 6; },
  /* AND nn      */ 0x25: (read) => { const nn = read(pc + 1); ra = ra & read(nn); fnu(ra); fzu(ra); pc += 2; cc += 3; },
  /* AND #nn     */ 0x29: (read) => { const nn = read(pc + 1); ra = ra & nn; fnu(ra); fzu(ra); pc += 2; cc += 2; },
  /* ROL A       */ 0x2a: () => { const ra0 = ((ra << 1) | fc) & 0xff; fc = ((ra & 0x80) >> 7); ra = ra0; fnu(ra); fzu(ra); pc += 1; cc += 2; },
  /* BMI dd      */ 0x30: (read) => { fn === 1 && (pc += tcd(read(pc + 1)), cc += 1); pc += 2; cc += 2; },
  /* SEC         */ 0x38: () => { fc = 1; pc++; cc += 2;},
  /* EOR #nn     */ 0x49: (read) => { const nn = read(pc + 1); ra ^= nn; fnu(ra); fzu(ra); pc += 2; cc += 2; },
  /* LSR A       */ 0x4a: () => { const ra0 = (ra >> 1) & 0xff; fc = 0; ra = ra0; fnu(ra); fzu(ra); pc += 1; cc += 2; },
  /* JMP nnnn    */ 0x4c: (read) => { 
	  const nnnn = word(read, pc + 1);

	  pc = nnnn;
	  cc += 3; },
  /* RTS         */ 0x60: (read) => { l = popsp(read); h = popsp(read); /*console.log("RTS", h.toString(16), l.toString(16));*/ pc = ((h << 8) + l) & 0xffff; cc += 6; },
  /* ADC nn      */ 0x65: (read) => { // FIXME Carry
	  const nn = read(pc + 1);
	  const r = ra + fc + read(nn);
	  ra = r & 0xff;

	  fnu(ra);
	  fzu(ra);
	  fv = fl(r !== ra);

	  pc += 2;
          cc += 3; },
   /* ADC #nn     */ 0x69: (read) => { // FIXME Carry
	  const nn = read(pc + 1);
	  const r = ra + fc + nn;
	  ra = r & 0xff;

	  fnu(ra);
	  fzu(ra);
	  fv = fl(r !== ra);

	  pc += 2;
          cc += 2; },
  /* ROR A       */ 0x6a: () => { const ra0 = ((ra >> 1) | (fc << 7)) & 0xff; fc = ra & 0x01; ra = ra0; fnu(ra); fzu(ra); pc += 1; cc += 2;},
  /* SEI         */ 0x78: () => { fi = 1; pc++; cc += 2;},
  /* STY nn      */ 0x84: (read, write) => { const nn = read(pc + 1); write(nn, ry & 0xff); pc += 2; cc += 3; },
  /* STA nn      */ 0x85: (read, write) => { const nn = read(pc + 1); write(nn, ra & 0xff); pc += 2; cc += 3; },
  /* DEY         */ 0x88: () => { ry = (ry - 1) & 0xff; fnu(ry); fzu(ry); pc += 1; cc += 2; },
  /* STY nnnn    */ 0x8c: (read, write) => {
	  const nnnn = word(read, pc + 1);

	  write(nnnn, ry & 0xff);

	  pc += 3; cc += 4; },
  /* STA nnnn    */ 0x8d: (read, write) => {
	  const nnnn = word(read, pc + 1);

	  write(nnnn, ra & 0xff);

	  pc += 3; cc += 4; },
  /* STX nn      */ 0x86: (read, write) => { const nn = read(pc + 1); write(nn, rx & 0xff); pc += 2; cc += 3; },
  /* TXA         */ 0x8a: () => { ra = rx; fnu(ra); fzu(ra); pc += 1; cc += 2; },
  /* BCC dd      */ 0x90: (read) => { fc === 0 && (pc += tcd(read(pc + 1)), cc += 1); pc += 2; cc += 2; },
  /* STA nn, X   */ 0x95: (read, write) => { const nn = read(pc + 1); write((nn + rx) & 0xff, ra & 0xff); pc += 2; cc += 4; },
  /* STX nn, Y   */ 0x96: (read, write) => { const nn = read(pc + 1); write((nn + ry) & 0xff, rx & 0xff); pc += 2; cc += 4; },
  /* STA nnnn, Y */ 0x99: (read, write) => {
	  const nnnn = word(read, pc + 1);

	  write(nnnn + ry, ra & 0xff);

	  pc += 3; cc += 5; },
  /* TXS         */ 0x9a: () => { sp = rx; pc += 1; cc += 2; },
  /* LDY #nn     */ 0xa0: (read) => { ry = read(pc + 1); fnu(ry); fzu(ry); pc += 2; cc += 2; },
  /* LDX #nn     */ 0xa2: (read) => { rx = read(pc + 1); fnu(rx); fzu(rx); pc += 2; cc += 2; },
  /* LDY nn      */ 0xa4: (read) => { const nn = read(pc + 1); ry = read(nn); fnu(ry); fzu(ry); pc += 2; cc += 3; },
  /* LDA nn      */ 0xa5: (read) => { const nn = read(pc + 1); ra = read(nn & 0xff); fnu(ra); fzu(ra); pc += 2; cc += 3; },
  /* LDX nn      */ 0xa6: (read) => { const nn = read(pc + 1); rx = read(nn & 0xff); fnu(rx); fzu(rx); pc += 2; cc += 3; },
  /* TAY         */ 0xa8: () => { ry = ra; fnu(ry); fzu(ry); pc += 1; cc += 2; },
  /* LDA #nn     */ 0xa9: (read) => { ra = read(pc + 1); fnu(ra); fzu(ra); pc += 2; cc += 2; },
  /* TAX         */ 0xaa: () => { rx = ra; fnu(rx); fzu(rx); pc += 1; cc += 2; },
  /* LDY nnnn    */ 0xac: (read) => {
	  const nnnn = word(read, pc + 1);
	  ry = read(nnnn);

	  fnu(ry);
	  fzu(ry);
	  pc += 3;
          cc += 4; },
  /* LDA nnnn     */ 0xad: (read) => {
	  const nnnn = word(read, pc + 1);
	  ra = read(nnnn);

	  fnu(ra);
	  fzu(ra);
	  pc += 3;
          cc += 4; },
  /* BCS dd      */ 0xb0: (read) => { fc === 1 && (pc += tcd(read(pc + 1)), cc += 1); pc += 2; cc += 2; },
  /* LDA (nn), Y */ 0xb1: (read) => {
	  const nn = read(pc + 1)
	  const addr = word(read, nn + ry);

	  const r = read(addr);

	  ra = read(r);

	  fnu(ra);
	  fzu(ra);
	  pc += 2;
          cc += 5; },
  /* LDA nn, X   */ 0xb5: (read) => {
	  const nn = read(pc + 1);
	  const r = nn + rx;

	  ra = read(r);

	  fnu(ra);
	  fzu(ra);
	  pc += 2;
          cc += 4; },
  /* LDX nn, X   */ 0xb6: (read) => {
	  const nn = read(pc + 1);
	  const r = nn + rx;

	  rx = read(r);

	  fnu(rx);
	  fzu(rx);
	  pc += 2;
          cc += 4; },
  /* LDA nnnn, Y */ 0xb9: (read) => {
	  const nnnn = word(read, pc + 1);
	  ra = read(nnnn + ry);

	  fnu(ra);
	  fzu(ra);
	  pc += 3;
          cc += 4; },
  /* TSX         */ 0xba: () => { rx = sp; fnu(rx); fzu(rx); pc += 1; cc += 2; },
  /* LDA nnnn, X */ 0xbd: (read) => {
	  const nnnn = word(read, pc + 1);
	  ra = read(nnnn + rx);

	  fnu(rx);
	  fzu(rx);
	  pc += 3;
          cc += 4; },
  /* LDX nnnn, Y */ 0xbe: (read) => {
	  const nnnn = word(read, pc + 1);
	  rx = read(nnnn + ry);

	  fnu(rx);
	  fzu(rx);
	  pc += 3;
          cc += 4; },
  /* CPY #nn     */ 0xc0: (read) => { const nn = read(pc + 1); const r = (ry - nn) & 0xff; fc = fl(nn > ry); fnu(r); fzu(r); pc += 2; cc += 2; },
  /* CPY nn      */ 0xc4: (read) => { const nn = read(pc + 1); const v = read(nn); const r = (ry - v) & 0xff; fc = fl(v > ry); fnu(r); fzu(r); pc += 2; cc += 3; },
  /* CMP nn      */ 0xc5: (read) => { const nn = read(pc + 1); const v = read(nn); const r = (ra - v) & 0xff; fc = fl(v > ra); fnu(r); fzu(r); pc += 2; cc += 4; },
  /* DEC nn      */ 0xc6: (read, write) => {
	  addr = read(pc + 1);
	  v = (read(addr) - 1) & 0xff;
	  write(addr, v);

	  fnu(v);
	  fzu(v);
	  pc += 2;
          cc += 5; },
  /* INY         */ 0xc8: () => { ry = (ry + 1) & 0xff; fnu(ry); fzu(ry); pc += 1; cc += 2; },
  /* CMP #nn     */ 0xc9: (read) => { const nn = read(pc + 1); const r = (ra - nn) & 0xff; fc = fl(nn > ra); fnu(r); fzu(r); pc += 2; cc += 2; },
  /* DEX         */ 0xca: () => { rx = (rx - 1) & 0xff; fnu(rx); fzu(rx); pc += 1; cc += 2; },
  /* BNE dd      */ 0xd0: (read) => { fz === 0 && (pc += tcd(read(pc + 1)), cc += 1); pc += 2; cc += 2; },
  /* CMP nn,X    */ 0xd5: (read) => { const nn = read(pc + 1); const v = read(nn + rx); const r = (ra - v) & 0xff; fc = fl(v > ra); fnu(r); fzu(r); pc += 2; cc += 4; },
  /* CLD         */ 0xd8: () => { fd = 0; pc += 1; cc += 2; },
  /* CPX #nn     */ 0xe0: (read) => { const nn = read(pc + 1); const r = (rx - nn); fc = fl(nn > rx); fnu(r); fzu(r); pc += 2; cc += 2; },
  /* SBC (nn, X) */ 0xe1: (read) => { // FIXME Carry
	  const nn = read(pc + 1)
	  const addr = word(read, nn + rx);

	  const r = ra + fc - 1 - read(addr);
	  ra = r & 0xff;

	  fnu(ra);
	  fzu(ra);
	  fv = fl(r !== ra);

	  pc += 2;
          cc += 6; },
   /* SBC #nn    */ 0xe9: (read) => { // FIXME Carry
	  const nn = read(pc + 1);
	  const r = ra + fc - 1 - nn;
	  ra = r & 0xff;

	  fnu(ra);
	  fzu(ra);
	  fv = fl(r !== ra);

	  pc += 2;
          cc += 6; },
  /* INC         */ 0xe6: (read, write) => { const nn = read(pc + 1) & 0xff; const r = read(nn) + 1;  write(nn, r); fnu(r); fzu(r); pc += 2; cc += 5; },
  /* INX         */ 0xe8: () => { rx = (rx + 1) & 0xff; fnu(rx); fzu(rx); pc += 1; cc += 2; },
  /* BEQ dd      */ 0xf0: (read) => { fz === 1 && (pc += tcd(read(pc + 1)), cc += 1); pc += 2; cc += 2; },
}



//  0000-002C  TIA Write
//  0000-000D  TIA Read (sometimes mirrored at 0030-003D)
//  0080-00FF  PIA RAM (128 bytes)
//  0280-0297  PIA Ports and Timer
//  F000-FFFF  Cartridge Memory (4 Kbytes area)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const pfs = new Set([PF0, PF1, PF2]);

const rev8 = (xs) => {
    let x0 = 0;

    x0 |= (xs & 0x80) >> 7; 
    x0 |= (xs & 0x40) >> 5; 
    x0 |= (xs & 0x20) >> 3; 
    x0 |= (xs & 0x10) >> 1; 
    x0 |= (xs & 0x08) << 1; 
    x0 |= (xs & 0x04) << 3; 
    x0 |= (xs & 0x02) << 5; 
    x0 |= (xs & 0x01) << 7; 

    return x0 & 0xff;
}
const process = async (rom, numberOfSteps = undefined) => {
  let isKilled = false;

  document.addEventListener("chrom", () => { isKilled = true; });
  const entrypoint = romread(rom, 0xfffc, 2)

  const mem = new Uint8Array(0x10000);

  for (const [i, b] of rom.entries()) {
    mem[0xf000 + i] = b; 
  }
  
  const read = (addr) => {
    return mem[addr];
  }

  const write = (addr, v) => {
     dbg("write", addr.toString(16), v);
     // sram(addr, v)
     if (addr === VSYNC) { isVSync = v !== 0; return; }
     if (addr === WSYNC) { isWSync = true; return; }
     if (addr === RESP0) { isRESP0 = true; return; }
     if (addr === RESP1) { isRESP1 = true; return; }

     mem[addr] = v;

     if (pfs.has(addr)) {
       const pf0 = read(PF0) & 0xff;
       const pf1 = read(PF1) & 0xff;
       const pf2 = read(PF2) & 0xff;
       
       const pf0rev = rev8(pf0) & 0xf;
       const pf2rev = rev8(pf2);
       
       PF = ((pf0rev << 16) | (pf1 << 8) | pf2rev) & 0xffffffff;
     }
  }

  const draw = drawer();

  pc = entrypoint;
  PF = 0;

  dbg("entrypoint", pc.toString(16));

  let i = 0;
  let s = 0;
  let w = 0;

  let fs = new Date();

  while (numberOfSteps ? i < numberOfSteps : !isKilled) {
    w = Math.max(w - 1, 0);
    w = isWSync ? 0 : w;

    const isWaiting = (w > 0);

    if (!isWSync && !isWaiting) {
      const o = read(pc)
      dbg("pc", pc.toString(16), "o", o.toString(16));

      // printAsm && info(formatASM(toASM(rom, pc)));

      const cc0 = cc;
      const p = processors[o];

      // try {
      p(read, write);
      // } catch (e) {
       // console.log("o", o.toString(16))
      // }

      w = cc - cc0; // FIXME overflow

      printState && printStates();
    }


    for (let a = 0; a < 3; a++) {
      updateScreen(read, s);

      if (s % 228 === 0) { 
	isWSync = false;
	w = 0;
      }

      if (isVSync || (s === (228 * 262))) {
        requestAnimationFrame(draw);

	const diff = new Date() - fs;
	const delay = Math.max((1_000 / FPS) - diff, 0);
	if (delay > 0) { await sleep(delay); }

	fs = new Date();
        s = 0;
	clearScreen();
	cc = 0;
	isVSync = false;
      }

      s++;
      i++;
    }
  }
}

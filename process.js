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
var _fb = 0;
var fv = 0;
var fz = 0;

var ra = 0;
var rx = 0;
var ry = 0;

var cc = 0;

var isWSync = false;
var isVSync = false;
var isVSyncHi = false;

var interval = 1;
var timerCounter = 1;


const pia = new Uint8Array(128);

const fl = (v) => v ? 1 : 0;

const fzu = (v) => fz = fl(v === 0);
const fnu = (v) => fn = fl((v & 0x80) === 0x80);

const prstatus = () =>{
  let st = 0;

  st |= (fc & 0x01) << 0;
  st |= (fz & 0x01) << 1;
  st |= (fi & 0x01) << 2;
  st |= (fd & 0x01) << 3;
  st |= (_fb & 0x01) << 4;
  st |= 1 << 5; // Unused / always one
  st |= (fv & 0x01) << 6;
  st |= (fn & 0x01) << 7;

  return st;
}

const restatus = (st) => {
  fc = (st & 0x01) >> 0;
  fz = (st & 0x02) >> 1;
  fi = (st & 0x04) >> 2;
  fd = (st & 0x08) >> 3;
  //_fb cannot be updated
  // Unused bit cannot be updated
  fv = (st & 0x40) >> 6;
  fn = (st & 0x80) >> 7;
 }

const pshsp = (write, value) => { write((sp & 0xff), value & 0xff); sp = (sp - 1) & 0xff; }
const popsp = (read) => { sp = (sp + 1) & 0xff; return read(sp & 0xff) & 0xff; }

const word = (read, addr) => {
  const l = read(addr) & 0xff;
  const h = read(addr + 1) & 0xff;

  return ((h << 8) + l) & 0xffff;
}

const b2d = (b) => {
 const h = Math.floor(b / 10);
 const l = (b % 10) & 0xf;

 return (h << 4) + l;
}

const d2b = (d) => {
 const h = (d >> 4) & 0xf;
 const l = d & 0xf;

 return h * 10 + l;
}

// https://www.pagetable.com/c64ref/6502/?tab=3#(a8),Y
const indiry = (read, nn) => {

  const o = read(nn) + ry;
  const l = o % 0xff;
  const c = fl(l < o);

  const h = (read(nn + 1) + c) & 0xff;

  return ((h << 8) + l) & 0xffff;
}

const rindiry = (read, nn) => {
  const addr = indiry(read, nn);

  return read(addr) & 0xffff;
}

// https://www.pagetable.com/c64ref/6502/?tab=3#(a8,X)
const indirx = (read, nn) => {
  const l = (nn + rx) % 0xff;
  const h = read(nn + 1) & 0xff;

  return ((h << 8) + l) & 0xffff;
}

const rindirx = (read, nn) => {
  const addr = indirx(read, nn);

  return read(addr) & 0xffff;
}

const pzx = (nn) => {
  return (nn + rx) & 0xff;
}

const rpzx = (read, nn) => {
  const addr = pzx(nn);

  return read(addr);
}

const pzy = (nn) => {
  return (nn + ry) & 0xff;
}

const rpzy = (read, nn) => {
  const addr = pzy(nn);

  return read(addr);
}

const sbc = (nn) => {
  const v = fd ? b2d(nn) : tcd(nn);

  const r0 = fd ? b2d(ra) + fc - 1 - b2d(v) : tcd(ra) + fc - 1 - v;

  const r = fd ? d2b(r0) : r0;

  ra = r & 0xff;

  fnu(ra);
  fzu(ra);
  fv = fl(r !== ra);
  fc = fl(r >= 0);
}

const adc = (nn) => {
  const r = fd ? b2d(ra) + fc + b2d(nn) : tcd(ra) + fc + tcd(nn);

  ra = r & 0xff;

  fnu(ra);
  fzu(ra);
  fv = fl(r !== ra);
  fc = fl(fd ? r > 99 : r > 0xff);
}


const inc = (read, write, nn) => {
  const r = (read(nn) + 1) & 0xff;

  write(nn, r)

  fnu(r);
  fzu(r);
}

const dec = (read, write, nn) => {
  const m = read(nn)
  const r = (m - 1) & 0xff;
  // (pc === 0xfc52)  && console.log("dec", nn.toString(16), "m", m.toString(16), "r", r.toString(16));

  write(nn, r);

  fnu(r);
  fzu(r);
}

const cim  = (fn) => (read, write) => { const nn   = read(pc + 1); fn(read, write, nn, nn, -1); }
const czp  = (fn) => (read, write) => { const nn   = read(pc + 1); fn(read, write, nn, read(nn), nn); }
const czpx = (fn) => (read, write) => { const nn   = read(pc + 1); const a = pzx(nn); fn(read, write, nn, read(a), a); }
const czpy = (fn) => (read, write) => { const nn   = read(pc + 1); const a = pzy(nn); fn(read, write, nn, read(a), a); }
const cabs = (fn) => (read, write) => { const nnnn = word(read, pc + 1); fn(read, write, nnnn, read(nnnn), nnnn); }

const processors = {
  /* BRK         */ 0x00: (read, write) => {
	  // console.log("BRK", "PC", pc.toString(16));
	  _fb = 1;

	  pshsp(write, (pc >> 8) & 0xff);
	  pshsp(write, pc & 0xff);
	  pshsp(write, prstatus());

	  fi = 1;

	  p = word(read, 0xfffe);

	  // console.log("BRK", "PC", pc.toString(16), "P", p.toString(16), read(0xffff) << 8, read(0xfffe));

	  pc = p;

	  cc += 7; },
  /* ORA nn      */ 0x05: czp((_r, _w, _nn, m) => { ra |= m; fnu(ra); fzu(ra); pc += 2; cc += 3; }),
  /* ASL nn      */ 0x06: czp((_r, write, _nn, m, a) => { const r = (m << 1) & 0xff; write(a, r); fc = ((m & 0x80) >> 7); fnu(r); fzu(r); pc += 2; cc += 5;}),
  /* PHP         */ 0x08: (_, write) => { pshsp(write, prstatus()); pc += 1; cc += 3; },
  /* ORA #nn     */ 0x09: cim((_r, _w, _nn, m) => { ra |= m; fnu(ra); fzu(ra); pc += 2; cc += 2; }),
  /* ASL A       */ 0x0a: () => { const ra0 = (ra << 1) & 0xff; fc = ((ra & 0x80) >> 7); ra = ra0; fnu(ra); fzu(ra); pc += 1; cc += 2;},
  /* ORA nnnn    */ 0x0d: cabs((_r, _w, _nnnn, m) => { ra |= m; fn = fnu(ra); fz = fzu(ra); pc += 3; cc += 4; }),
  /* BPL dd      */ 0x10: cim((_r, _w, _dd, m) => { fn === 0 && (pc += tcd(m), cc += 1); pc += 2; cc += 2; }),
  /* CLC         */ 0x18: () => { fc = 0; pc += 1; cc += 2; },
  /* ORA nnnn, X */ 0x1d: (read) => {
	  const nnnn = word(read, pc + 1);

	  ra |= read((nnnn + rx) & 0xffff);

	  fn = fnu(ra);
	  fz = fzu(ra);

	  pc += 3;
          cc += 4; },
  /* JSR nnnn    */ 0x20: cabs((_r, write, _nnnn, _m, a) => { const ret = pc + 3; pshsp(write, (ret >> 8) & 0xff); pshsp(write, ret & 0xff); pc = a; cc += 6; }),
  /* BIT nn      */ 0x24: czp((_r, _w, _nn, m) => { const r = ra & m; fnu(m); fzu(r); fv = fl(m & 0x40); pc += 2; cc += 3; }),
  /* BIT nnnn    */ 0x2c: cabs((_r, _w, _nn, m) => { const r = ra & m; fnu(m); fzu(r); fv = fl(m & 0x40); pc += 3; cc += 3; }),
  /* AND nn      */ 0x25: czp((_r, _w, _nn, m) => { ra = ra & m; fnu(ra); fzu(ra); pc += 2; cc += 3; }),
  /* AND #nn     */ 0x29: cim((_r, _w, _nn, m) => { ra = ra & m; fnu(ra); fzu(ra); pc += 2; cc += 2; }),
  /* ROL A       */ 0x2a: () => { const ra0 = ((ra << 1) | fc) & 0xff; fc = ((ra & 0x80) >> 7); ra = ra0; fnu(ra); fzu(ra); pc += 1; cc += 2; },
  /* BMI dd      */ 0x30: cim((_r, _w, _dd, m) => { fn === 1 && (pc += tcd(m), cc += 1); pc += 2; cc += 2; }),
  /* AND nn, X   */ 0x35: czpx((_r, _w, _nn, m) => { ra = ra & m; fnu(ra); fzu(ra); pc += 2; cc += 4; }),
  /* SEC         */ 0x38: () => { fc = 1; pc++; cc += 2;},
  /* RTI         */ 0x40: (read) => {
	  const st = popsp(read);
	  const l = popsp(read);
	  const h = popsp(read);

	  restatus(st);

	  p = (h << 8) + l;

	  // console.log("RTI", "PC", pc.toString(16), "P", p.toString(16), read(0xffff) << 8, read(0xfffe));

	  pc = p;

	  cc += 6; },
  /* EOR (nn, X) */ 0x41: (read) => { const nn = read(pc + 1); ra ^= rindirx(read, nn); fnu(ra); fzu(ra); pc += 2; cc += 6; },
  /* EOR nn      */ 0x45: czp((_r, _w, _nn, m) => {  ra ^= m; fnu(ra); fzu(ra); pc += 2; cc += 3; }),
  /* PHA         */ 0x48: (_, write) => { pshsp(write, ra); pc += 1; cc += 3; },
  /* EOR #nn     */ 0x49: cim((_r, _w, _nn,m ) => { ra ^= m; fnu(ra); fzu(ra); pc += 2; cc += 2; }),
  /* LSR A       */ 0x4a: () => { const ra0 = (ra >> 1) & 0xff; fc = ra & 0x01; ra = ra0; fnu(ra); fzu(ra); pc += 1; cc += 2; },
  /* JMP nnnn    */ 0x4c: cabs((_r, _w, _nnnn, _m, a) => { pc = a; cc += 3; }),
  /* LSR nnnn    */ 0x4e: cabs((_r, _w, _nnnn, m) => { const r = m >> 1; fc = m & 0x01; ra = r; fnu(ra); fzu(ra); pc += 3; cc += 6; }),
  /* BVC dd      */ 0x50: cim((_r, _w, _dd, m) => { fv === 0 && (pc += tcd(m), cc += 1); pc += 2; cc += 2; }),
  /* RTS         */ 0x60: (read) => { l = popsp(read); h = popsp(read); pc = ((h << 8) + l) & 0xffff; cc += 6; },
  /* ADC nn      */ 0x65: czp((_r, _w, _nn, m) => { const v = m & 0xff;  adc(v);  pc += 2; cc += 3; }),
  /* PLA         */ 0x68: (read) => { ra = popsp(read); fnu(ra); fzu(ra); pc += 1; cc += 4; },
  /* ADC #nn     */ 0x69: cim((_r, _w, _nn, m) => { adc(m); pc += 2; cc += 2; }),
  /* ROR A       */ 0x6a: () => { const ra0 = ((ra >> 1) | (fc << 7)) & 0xff; fc = ra & 0x01; ra = ra0; fnu(ra); fzu(ra); pc += 1; cc += 2;},
  /* BVS dd      */ 0x70: cim((_r, _w, _dd, m) => { fv === 1 && (pc += tcd(m), cc += 1); pc += 2; cc += 2; }),
  /* ADC nn, X   */ 0x75: czpx((_r, _w, _nn, m) => { adc(m); pc += 2; cc += 4; }),
  /* ADC nnnn, Y */ 0x79: (read) => {
	  const nnnn = word(read, pc + 1);

	  const v = read((nnnn + ry) & 0xffff) & 0xff;

	  adc(v)

	  pc += 3;
          cc += 4; },
  /* SEI         */ 0x78: () => { fi = 1; pc++; cc += 2;},
  /* STY nn      */ 0x84: czp((_r, write, _nn, _m, a) => { write(a, ry & 0xff); pc += 2; cc += 3; }),
  /* STA nn      */ 0x85: czp((_r, write, _nn, _m, a) => { write(a, ra & 0xff); pc += 2; cc += 3; }),
  /* DEY         */ 0x88: () => { ry = (ry - 1) & 0xff; fnu(ry); fzu(ry); pc += 1; cc += 2; },
  /* STY nnnn    */ 0x8c: cabs((_r, write, _nnnn, _m, a) => { write(a, ry & 0xff); pc += 3; cc += 4; }),
  /* STA nnnn    */ 0x8d: cabs((_r, write, _nnnn, _m, a) => { write(a, ra & 0xff); pc += 3; cc += 4; }),
  /* STX nnnn    */ 0x8e: cabs((_r, write, _nnnn, _m, a) => { write(a, rx & 0xff); pc += 3; cc += 4; }),
  /* STX nn      */ 0x86: czp((_r, write, _nn, _m, a) => { write(a, rx & 0xff); pc += 2; cc += 3; }),
  /* TXA         */ 0x8a: () => { ra = rx; fnu(ra); fzu(ra); pc += 1; cc += 2; },
  /* BCC dd      */ 0x90: cim((_r, _w, _dd, m) => { fc === 0 && (pc += tcd(m), cc += 1); pc += 2; cc += 2; }),
  /* STY nn, X   */ 0x94: czpx((_r, write, _nn, _m, a) => { write(a, ry & 0xff); pc += 2; cc += 4; }),
  /* STA nn, X   */ 0x95: czpx((_r, write, _nn, _m, a) => { write(a, ra & 0xff); pc += 2; cc += 4; }),
  /* STX nn, Y   */ 0x96: czpy((_r, write, _nn, _m, a) => { write(a, rx & 0xff); pc += 2; cc += 4; }),
  /* TYA         */ 0x98: () => { ra = ry; fnu(ra); fzu(ra); pc += 1; cc += 2; },
  /* STA nnnn, Y */ 0x99: (read, write) => {
	  const nnnn = word(read, pc + 1);

	  write(nnnn + ry, ra & 0xff);

	  pc += 3; cc += 5; },
  /* TXS         */ 0x9a: () => { sp = rx; pc += 1; cc += 2; },
  /* LDY #nn     */ 0xa0: cim((_r, _w, _nn, m) => { ry = m; fnu(ry); fzu(ry); pc += 2; cc += 2; }),
  /* LDX #nn     */ 0xa2: cim((_r, _w, _nn, m) => { rx = m; fnu(rx); fzu(rx); pc += 2; cc += 2; }),
  /* LDY nn      */ 0xa4: czp((_r, _w, _nn, m) => { ry = m; fnu(ry); fzu(ry); pc += 2; cc += 3; }),
  /* LDA nn      */ 0xa5: czp((_r, _w, _nn, m) => { ra = m; fnu(ra); fzu(ra); pc += 2; cc += 3; }),
  /* LDX nn      */ 0xa6: czp((_r, _w, _nn, m) => { rx = m; fnu(rx); fzu(rx); pc += 2; cc += 3; }),
  /* TAY         */ 0xa8: () => { ry = ra; fnu(ry); fzu(ry); pc += 1; cc += 2; },
  /* LDA #nn     */ 0xa9: cim((_r, _w, _nn, m) => { ra = m; fnu(ra); fzu(ra); pc += 2; cc += 2; }),
  /* TAX         */ 0xaa: () => { rx = ra; fnu(rx); fzu(rx); pc += 1; cc += 2; },
  /* LDY nnnn    */ 0xac: cabs((_r, _w, _nnnn, m) => { ry = m; fnu(ry); fzu(ry); pc += 3; cc += 4; }),
  /* LDA nnnn    */ 0xad: cabs((_r, _w, _nnnn, m) => { ra = m; fnu(ra); fzu(ra); pc += 3; cc += 4; }),
  /* BCS dd      */ 0xb0: cim((_r, _w, _dd, m) => { fc === 1 && (pc += tcd(m), cc += 1); pc += 2; cc += 2; }),
  /* LDA (nn), Y */ 0xb1: (read) => {
	  const nn = read(pc + 1)

	  ra = rindiry(read, nn);
          // if (pc === 0xf910) { debugger; }
	  // if (nn === 0x87) {
	  //   console.log(
	  //           "indiry",
	  //           indiry(read, nn).toString(16),
	  //           "ry", ry.toString(16),
	  //           "ra", ra.toString(16),
	  //           read(nn).toString(16),
	  //           (read(nn + 1)).toString(16));
	  // }

	  fnu(ra);
	  fzu(ra);
	  pc += 2;
          cc += 5; },
  /* LDY nn, X   */ 0xb4: czpx((_r, _w, _nn, m) => { ry = m; fnu(ry); fzu(ry); pc += 2; cc += 4; }),
  /* LDA nn, X   */ 0xb5: czpx((_r, _w, _nn, m) => { ra = m; fnu(ra); fzu(ra); pc += 2; cc += 4; }),
  /* LDX nn, Y   */ 0xb6: czpy((_r, _w, _nn, m) => { rx = m; fnu(rx); fzu(rx); pc += 2; cc += 4; }),
  /* LDA nnnn, Y */ 0xb9: (read) => {
	  const nnnn = word(read, pc + 1);
	  ra = read(nnnn + ry);

	  // FIXME ED Test page boundary -> add everywhere applicable
	  if (((nnnn & 0xff) + (ry & 0xff)) > 0xff) { cc += 1; }

	  fnu(ra);
	  fzu(ra);
	  pc += 3;
          cc += 4; },
  /* TSX         */ 0xba: () => { rx = sp; fnu(rx); fzu(rx); pc += 1; cc += 2; },
  /* LDA nnnn, X */ 0xbd: (read) => {
	  const nnnn = word(read, pc + 1);
	  ra = read((nnnn + rx) & 0xffff);

	  fnu(ra);
	  fzu(ra);
	  pc += 3;
          cc += 4; },
  /* LDX nnnn, Y */ 0xbe: (read) => {
	  const nnnn = word(read, pc + 1);
	  rx = read(nnnn + ry);

	  fnu(rx);
	  fzu(rx);
	  pc += 3;
          cc += 4; },
  /* CPY #nn     */ 0xc0: cim((_r, _w, _nn, m) => { const r = (ry - m) & 0xff; fc = fl(ry >= m); fnu(r); fzu(r); pc += 2; cc += 2; }),
  /* CPY nn      */ 0xc4: czp((_r, _w, _nn, m) => { const r = (ry - m) & 0xff; fc = fl(ry >= m); fnu(r); fzu(r); pc += 2; cc += 3; }),
  /* CMP nn      */ 0xc5: czp((_r, _w, _nn, m) => { const r = (ra - m) & 0xff; fc = fl(m <= ra); fnu(r); fzu(r); pc += 2; cc += 4; }),
  /* DEC nn      */ 0xc6: czp((read, write, _nn, _m, a) => { dec(read, write, a); pc += 2; cc += 5; }),
  /* DEC nn, X   */ 0xd6: czpx((read, write, _nn, _m, a) => { dec(read, write, a); pc += 2; cc += 6; }),
  /* INY         */ 0xc8: () => { ry = (ry + 1) & 0xff; fnu(ry); fzu(ry); pc += 1; cc += 2; },
  /* CMP #nn     */ 0xc9: cim((_r, _w, _nn, m) => { const r = (ra - m) & 0xff; fc = fl(m <= ra); fnu(r); fzu(r); pc += 2; cc += 2; }),
  /* DEX         */ 0xca: () => { rx = (rx - 1) & 0xff; fnu(rx); fzu(rx); pc += 1; cc += 2; },
  /* BNE dd      */ 0xd0: cim((_r, _w, _dd, m) => { fz === 0 && (pc += tcd(m), cc += 1); pc += 2; cc += 2; }),
  /* CMP nn, X   */ 0xd5: czpx((_r, _w, _nn, m) => { const r = (ra - m) & 0xff; fc = fl(m <= ra); fnu(r); fzu(r); pc += 2; cc += 4; }),
  /* CLD         */ 0xd8: () => { fd = 0; pc += 1; cc += 2; },
  /* CPX #nn     */ 0xe0: cim((_r, _w, _nn, m) => { const r = (rx - m) & 0xff; fc = fl(rx >= m); fnu(r); fzu(r); pc += 2; cc += 2; }),
  /* SBC (nn, X) */ 0xe1: (read) => {
	  const nn = read(pc + 1)

	  const m = rindirx(read, nn)

          sbc(m);

	  pc += 2;
          cc += 6; },
  /* CPX nn      */ 0xe4: czp((_r, _w, _nn, m) => { const r = (rx - m) & 0xff; fc = fl(rx >= m); fnu(r); fzu(r); pc += 2; cc += 3; }),
  /* SBC nn      */ 0xe5: czp((_r, _w, _nn, m) => { sbc(m); pc += 2; cc += 3; }),
  /* INC nn      */ 0xe6: czp((read, write, _nn, _m, a) => { inc(read, write, a); pc += 2; cc += 5; }),
  /* INX         */ 0xe8: () => { rx = (rx + 1) & 0xff; fnu(rx); fzu(rx); pc += 1; cc += 2; },
  /* ISC nn      */ 0xe7: czp((read, write, _nn, _m, a) => {  // UNDOCUMENTED
	  // https://www.masswerk.at/nowgobang/2021/6502-illegal-opcodes
	  inc(read, write, a);

	  const v = read(a);

          sbc(v);

	  pc += 2;
          cc += 5; }),
  /* SBC #nn     */ 0xe9: cim((_r, _w, _nn, m) => { sbc(m); pc += 2; cc += 2; }),
  /* NOP         */ 0xea: () => { pc += 1; cc += 2; },
  /* BEQ dd      */ 0xf0: cim((_r, _w, _dd, m) => { fz === 1 && (pc += tcd(m), cc += 1); pc += 2; cc += 2; }),
  /* INC nn, X   */ 0xf6: czpx((read, write, _nn, _m, a) => { inc(read, write, a); pc += 2; cc += 5; }),
  /* CLD         */ 0xf8: () => { fd = 0; pc += 1; cc += 2; },
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

const flip8 = (xs) => {
    return ~xs & 0xff;
}
let vSyncCount = 0;
const machine = (input) => {
  let isKilled = false;

  document.addEventListener("chrom", () => { isKilled = true; isBreak = false; });
  document.addEventListener("continue", () => { isContinue = true; isStep = false; });
  document.addEventListener("step", () => { isBreakout = true; isStep = true });

  const mem = romAsMem(input.length === 4_096 ? input : input.concat(input));

  const nrml = (addr) => {
    if (addr & 0x1000) { // ROM
      // console.log("ROM", addr.toString(16));
      return addr & 0x1fff; 
    } else if ((addr & 0x1080) === 0x00) { // TIA
      // console.log("TIA", addr.toString(16));
      return addr & 0x7f;
    } else if ((addr & 0x1280) === 0x80) { // PIA
      // console.log("PIA", addr.toString(16));
      return addr & 0xff;
    } else if ((addr & 0x1280) === 0x280) { // IO
      // console.log("IO", addr.toString(16));
      return addr;
    }

    return addr;
  }
  const read = (addr) => {
    const naddr = nrml(addr);

    if (naddr === INTIM) {
      if (mem[INSTAT] & 0x40) { // Restart interval
	mem[INSTAT] &= 0xbf;
      }
    } else if (naddr === INSTAT) {
      mem[INSTAT] &= 0xbf; // Reset bit 6 on read instat
    }

    return mem[naddr];
  }

  // FIXME I Don't think this is correct: REFPx can change after writing GRPx
  const setGrp0 = (v0) => { mem[GRP0] = (mem[REFP0] & 0x08) ? rev8(v0) : v0; }
  const setGrp1 = (v0) => { mem[GRP1] = (mem[REFP1] & 0x08) ? rev8(v0) : v0; }

  const write = (addr, v) => {
     const naddr = nrml(addr);
     dbg("write", naddr.toString(16), v);

     // STROBES, i.e. won't be actually stored and return early
     if (naddr === WSYNC) { isWSync = true; return; }
     if (naddr === RESP0) { isRESP0 = true;
	     const y = Math.floor(s / 228);
	     // if ([
	     //         132, 146, 159, 172, 185, 30, 51, 68, 81, 94, 107, 120].indexOf(y) > -1) {
	     //    console.log("resp0", y, s % 228);
	     // }

	     return; }
     if (naddr === RESP1) { isRESP1 = true; return; }
     if (naddr === RESM0) { isRESM0 = true; return; }
     if (naddr === RESM1) { isRESM1 = true; return; }
     if (naddr === RESBL) { isRESBL = true; return; }

     if (naddr === HMOVE) { isHMOVE = true; return; }
     if (naddr === HMCLR) { isHMCLR = true; return; }

     if (naddr === TIM1T)  { interval = 1;     timerCounter = interval; mem[INTIM] = Math.max(v, 0) & 0xff; mem[INSTAT] &= 0x7f; return; }
     if (naddr === TIM8T)  { interval = 8;     timerCounter = interval; mem[INTIM] = Math.max(v, 0) & 0xff; mem[INSTAT] &= 0x7f; return; }
     if (naddr === TIM64T) { interval = 64;    timerCounter = interval; mem[INTIM] = Math.max(v, 0) & 0xff; mem[INSTAT] &= 0x7f; return; }
     if (naddr === T1024T) { interval = 1_024; timerCounter = interval; mem[INTIM] = Math.max(v, 0) & 0xff; mem[INSTAT] &= 0x7f; return; }

     // SPECIAL CASES with extra actions
     if (naddr === VSYNC) {
	 newIsVsync = (v & 0x02) === 0x02;

	 isVSyncHi = (isVSync && !newIsVsync);

	 isVSync = newIsVsync;
     }

     if (naddr === GRP0) {
       if (mem[VDELP1] & 0x01) { setGrp1(GRP1_DELAYED); }
       if (mem[VDELP0] & 0x01) { GRP0_DELAYED = v; return; }

       setGrp0(v);
       return; // Do not store bc delayed write, reversing, etc
     }

     if (naddr === GRP1) {
       if (mem[VDELP0] & 0x01) { setGrp0(GRP0_DELAYED); }
       if (mem[VDELP1] & 0x01) { GRP1_DELAYED = v; return; }

       setGrp1(v);
       return; // Do not store bc delayed write, reversing, etc
     }

     // UPDATE MEMORY
     mem[naddr] = v;

     // POST PROCESSING, i.e. update helper registers and the like
     if (pfs.has(naddr)) {
       const pf0 = read(PF0) & 0xff;
       const pf1 = read(PF1) & 0xff;
       const pf2 = read(PF2) & 0xff;

       const pf0rev = rev8(pf0) & 0xf;
       const pf2rev = rev8(pf2) & 0xff;

       PF = ((pf0rev << 16) | (pf1 << 8) | pf2rev) & 0xffffffff;
     }

  }

  const controller = ({
        mn:    () => mem[SWCHA] &= 0xef,
	me:    () => mem[SWCHA] &= 0x7f,
	ms:    () => mem[SWCHA] &= 0xdf,
	mw:    () => mem[SWCHA] &= 0xbf,
	fire:  () => mem[INTP4] &= 0x7f,
	mnc:   () => mem[SWCHA] |= 0x10,
	mec:   () => mem[SWCHA] |= 0x80,
	msc:   () => mem[SWCHA] |= 0x20,
	mwc:   () => mem[SWCHA] |= 0x40,
	firec: () => mem[INTP4] |= 0x80,
    });

  const switches = ({
	reset:   () => mem[SWCHB] &= 0xfe,
	resetc:  () => mem[SWCHB] |= 0x01,
	select:  () => mem[SWCHB] &= 0xfd,
	selectc: () => mem[SWCHB] |= 0x02,
  });

  const loadSwitches = () => {
    // SWCHB.0    Reset Button          (0=Pressed)
    // SWCHB.1    Select Button         (0=Pressed)
    // SWCHB.2    Not used
    // SWCHB.3    Color Switch          (0=B/W, 1=Color) (Always 0 for SECAM)
    // SWCHB.4-5  Not used
    // SWCHB.6    P0 Difficulty Switch  (0=Beginner (B), 1=Advanced (A))
    // SWCHB.7    P1 Difficulty Switch  (0=Beginner (B), 1=Advanced (A))

    write(SWCHB, 0b00001011);
    write(SWBCNT, 0x00);
    write(SWCHA, 0xff);
    write(SWACNT, 0xff);
  }

  loadSwitches();

  const entrypoint = word(read, 0xfffc)

  const [draw, cross] = drawer();

  pc = entrypoint; // || 0xf000;
  PF = 0;

  dbg("entrypoint", pc.toString(16));

  let i = 0;
  let s = (228 * (3 + 37)) + 68 + (228 / 2); // Middle of screen, first line - pretty random, other emulators seem to work that way
  let w = 0;


  let fs = new Date();

  const tickTimer = () => {
   // if (mem[INSTAT] & 0x40) { // Don't read() -> side-effect
   //   const t0 = mem[INTIM] - 1;
   //   if (t0 < 0) {
   //     mem[INSTAT] |= 0xc0; // Set timer underflow
   //     mem[INTIM] = 0xff;
   //   } else { mem[INTIM] = t0 & 0xff; }
   //   return;
   // }

   if (timerCounter > 0) { timerCounter--; return; }

   const t0 = mem[INTIM] - 1;
   if (t0 < 0) { mem[INSTAT] |= 0xc0; mem[INTIM] = 0xff; timerCounter = 1; } else { mem[INTIM] = t0; timerCounter = interval; }
  }

  const process = async () => {
    while (!isKilled) {
      w = Math.max(w - 1, 0);
      w = isWSync ? 0 : w;

      const isWaiting = (w > 0);

      if (!isWSync && !isWaiting) {
        isContinue = false;

        let propagated = false;
        while (!isBreakout && ((breakpoints.has(pc) && !isContinue) || isStep)) {
                const x = (s % 228) - hb;
                const y = Math.floor((s - vb) / 228);

                if (bpConditional.x.lower !== undefined && (x < bpConditional.x.lower)) { break; }
                if (bpConditional.x.upper !== undefined && (x > bpConditional.x.upper)) { break; }
                if (bpConditional.y.lower !== undefined && (y < bpConditional.y.lower)) { break; }
                if (bpConditional.y.upper !== undefined && (y > bpConditional.y.upper)) { break; }

                if (!propagated) {
                  pstatus = {
		    cc,
                    pc,
                    rx,
                    ry,
                    ra,
                    sp,
                    fc,
                    fz,
                    fv,
                    fn,
                    fd,
                    fi,
          	    p0: mem[GRP0],
          	    p1: mem[GRP1],
          	    p0x: resp0x,
          	    p1x: resp1x,
		    pf0: mem[PF0],
		    pf1: mem[PF1],
	            pf2: mem[PF2],
		    pf: PF,
		    ctrlpf: mem[CTRLPF],
          	    x,
          	    y,
                    intim: mem[INTIM],
                    instat: mem[INSTAT],
                    memory: mem,
                    timerCounter,
                    interval,
                    isVSync,
                    isWSync,
                  }
                  document.dispatchEvent(new Event("break"));
                  updateScreen(read, s);
                  requestAnimationFrame(draw);
                  requestAnimationFrame(() => cross(x, y));
                  propagated = true;
                }
                await sleep(100);
        }
        isBreakout = false;

        const o = read(pc)
        dbg("pc", pc.toString(16), "o", o.toString(16));

        const cc0 = cc;
        const p = processors[o];
        // const pc0 = pc;

        try {
         p(read, write);
        } catch (e) {
          if (o === 0xff) { return; } // Forced exit for debugging purposes
          console.log(e, pc.toString(16), "o", o.toString(16))
          debugger;
          return;
        }

        // printAsm && tr(formatASM(toASM(mem, pc0)))

        w = cc - cc0;
      }

      if (isWSync) {
	cc = 2;
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
          // isVsyncHi = false;
          isVSync = false;
          break;
        }

        s++;
        i++;
      }

      tickTimer();
    }
  }

  return [process, controller, switches];
}

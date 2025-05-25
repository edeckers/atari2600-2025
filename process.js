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


var isWSync = false;
var isVSync = false;
var isVSyncHi = false;

var interval = 1;
var timerCounter = 1;


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
 const h = (b & 0xf0) >> 4;
 const l = (b & 0x0f);

 return (h * 10) + l;
}

const d2b = (d) => {
 const h = (Math.floor(d / 10)) & 0xf;
 const l = (d % 10) & 0xf;

 return ((h << 4) + l) & 0xff;
}

// https://www.pagetable.com/c64ref/6502/?tab=3#(a8),Y
const indiry = (read, nn) => {

  const o = read(nn) + ry;
  const l = o % 0xff;
  const c = fl(l < o);

  const h = (read(nn + 1) + c) & 0xff;

  return ((h << 8) + l) & 0xffff;
}

// https://www.pagetable.com/c64ref/6502/?tab=3#(a8,X)
const indirx = (read, nn) => {
  const l = (nn + rx) % 0xff;
  const h = read(nn + 1) & 0xff;

  return ((h << 8) + l) & 0xffff;
}

const pzx = (nn) => { return (nn + rx) & 0xff; }
const pzy = (nn) => { return (nn + ry) & 0xff; }
const absx = (nnnn) => { return (nnnn + rx) & 0xffff; }
const absy = (nnnn) => { return (nnnn + ry) & 0xffff; }

const pb1y  = (read) => { const nn = read(pc + 1); return fl(((nn & 0xff) + (ry & 0xff) > 0xff)); }
const pb2x  = (read) => { const nnnn = word(read, pc + 1); return fl((((nnnn & 0xff) + (rx & 0xff)) > 0xff)); }
const pb2y  = (read) => { const nnnn = word(read, pc + 1); return fl((((nnnn & 0xff) + (ry & 0xff)) > 0xff)); }
const cjt   = (read, c) => { const r0 = fl(c); const dd = read(pc + 1); const r1 = ((pc & 0xff) + tcd(dd)); return fl((r1 < 0) || (r1 > 0xff)) + r0; }

const cjim  = (f) => (read, write) => { const nn   = read(pc + 1);                                    return () => f(read, write, nn);  }
const cim   = (f) => (read, write) => { const nn   = read(pc + 1);                                    return () => f(read, write, nn);  }
const czp   = (f) => (read, write) => { const nn   = read(pc + 1);                                    return () => f(read, write, read(nn),         nn);   }
const czpx  = (f) => (read, write) => { const nn   = read(pc + 1);        const a = pzx(nn);          return () => f(read, write, read(a),          a);    }
const czpy  = (f) => (read, write) => { const nn   = read(pc + 1);        const a = pzy(nn);          return () => f(read, write, read(a),          a);    }
const cabs  = (f) => (read, write) => { const nnnn = word(read, pc + 1);                              return () => f(read, write, read(nnnn),       nnnn); }
const cabsx = (f) => (read, write) => { const nnnn = word(read, pc + 1);  const a = absx(nnnn);       return () => f(read, write, read(a),          a);    }
const cabsy = (f) => (read, write) => { const nnnn = word(read, pc + 1);  const a = absy(nnnn);       return () => f(read, write, read(a),          a);    }
const cin   = (f) => (read, write) => { const nnnn = word(read, pc + 1);                              return () => f(read, write, word(read, nnnn), nnnn); }
const cinx  = (f) => (read, write) => { const nn   = read(pc + 1);        const a = indirx(read, nn); return () => f(read, write, read(a),          a);    }
const ciny  = (f) => (read, write) => { const nn   = read(pc + 1);        const a = indiry(read, nn); return () => f(read, write, read(a),          a);    }
const no    = (f) => (read, write) => () => f(read, write);

const adc = (m) => {
  const ra0 = ra & 0xff;

  if (fd) {
    const r = b2d(ra) + fc + b2d(m);

    ra = d2b(r % 100);

    // In decimal mode, the N, V and Z flags are not consistent with the decimal result.
    // https://www.pagetable.com/c64ref/6502/?tab=2#ADC
    fnu(ra);
    fzu(ra);
    fv = fl((ra0 & 0x80) !== (ra & 0x80));
    fc = fl(r > 99);
    return
  }

  const r = ra + fc + m;

  ra = r & 0xff;

  fnu(ra);
  fzu(ra);
  fv = fl((ra0 & 0x80) !== (ra & 0x80));
  fc = fl(r > 0xff);
}

const sbc = (m) => {
  adc(~m & 0xff);
}
const and = (m) =>           { ra = ra & m; fnu(ra); fzu(ra); }
const cmp = (m) =>           { const r = (ra - m) & 0xff; fc = fl(ra >= m); fnu(r); fzu(r); }
const cpy = (m) =>           { const r = (ry - m) & 0xff; fc = fl(ry >= m); fnu(r); fzu(r); }
const cpx = (m) =>           { const r = (rx - m) & 0xff; fc = fl(rx >= m); fnu(r); fzu(r); }
const dec = (write, m, a) => { const r = (m - 1) & 0xff; write(a, r); fnu(r); fzu(r); }
const eor = (m) =>           { ra ^= m; fnu(ra); fzu(ra); }
const inc = (write, m, a) => { const r = (m + 1) & 0xff; write(a, r); fnu(r); fzu(r); }
const lda = (m) =>           { ra = m; fnu(ra); fzu(ra); }
const ldx = (m) =>           { rx = m; fnu(rx); fzu(rx); }
const ldy = (m) =>           { ry = m; fnu(ry); fzu(ry); }
const ora = (m) =>           { ra |= m; fnu(ra); fzu(ra); }
const sta = (write, a) =>    { write(a, ra & 0xff); }
const stx = (write, a) =>    { write(a, rx & 0xff); }
const sty = (write, a) =>    { write(a, ry & 0xff); }

const cj  = (condition, m) => { condition && (pc += tcd(m)); }

let w = 0;

function go(b_, cc_, f, ccx) {
  if (!ccx) { ccx = () => 0; }

  return function* (read, write) {
    const f2 = f(read, write);

    // const a = Math.max(0, cc_ - b_);

    // for (let i = 0; i < b_ - 1; i++) { yield; }
    // READ OP + OPER
    // for (let i = 0; i < b_; i++) { yield; }
    for (let i = 0; i < cc_ - 2; i++) { yield; }
    for (let i = 0; i < ccx(read); i++) { yield; }
    f2();
    yield;



    // PAGE JUMPS, ETC
    // reading param might take an extra cc bc page bounds -> BEFORE?
    // if jump might take extra cc -> AFTER?

    // APPLY CHANGES
    // for (let i = 0; i < a; i++) { yield; }
    // for (let i = 0; i < a; i++) { yield; }
  }
}

const processors = {
  /* BRK         */ 0x00: go(2, 7, no((read, write)               => {
	  _fb = 1;

	  pshsp(write, (pc >> 8) & 0xff);
	  pshsp(write, pc & 0xff);
	  pshsp(write, prstatus());

	  fi = 1;

	  p = word(read, 0xfffe);

	  pc = p; })),
  /* ORA nn      */ 0x05: go(2, 3, czp((_r, _w, m)                => { ora(m); pc += 2; })),
  /* ASL nn      */ 0x06: go(2, 5, czp((_r, write, m, a)          => { const r = (m << 1) & 0xff; write(a, r); fc = ((m & 0x80) >> 7); fnu(r); fzu(r); pc += 2; })),
  /* PHP         */ 0x08: go(1, 3, no((_r, write)                 => { pshsp(write, prstatus()); pc += 1; })),
  /* ORA #nn     */ 0x09: go(2, 2, cim((_r, _w, m)                => { ora(m); pc += 2; })),
  /* ASL A       */ 0x0a: go(1, 2, no(()                          => { const ra0 = (ra << 1) & 0xff; fc = ((ra & 0x80) >> 7); ra = ra0; fnu(ra); fzu(ra); pc += 1; })),
  /* ORA nnnn    */ 0x0d: go(3, 4, cabs((_r, _w, m)               => { ora(m); pc += 3; })),
  /* BPL dd      */ 0x10: go(2, 2, cjim((_r, _w, m, _a)           => { cj(fn === 0, m); pc += 2; }), (read) => cjt(read, fn === 0)),
  /* ORA nn, X   */ 0x15: go(2, 4, czpx((_r, _w, m)               => { ora(m); pc += 2; })),
  /* CLC         */ 0x18: go(1, 2, no(()                          => { fc = 0; pc += 1; })),
  /* ORA nnnn, X */ 0x1d: go(3, 4, cabsx((_r, _w, m)              => { ora(m); pc += 3; }), pb2x),
  /* JSR nnnn    */ 0x20: go(3, 6, cabs((_r, write, _m, a)        => { const ret = pc + 3; pshsp(write, (ret >> 8) & 0xff); pshsp(write, ret & 0xff); pc = a; })),
  /* BIT nn      */ 0x24: go(2, 3, czp((_r, _w, m)                => { const r = ra & m; fnu(m); fzu(r); fv = fl(m & 0x40); pc += 2; })),
  /* BIT nnnn    */ 0x2c: go(3, 3, cabs((_r, _w, m)               => { const r = ra & m; fnu(m); fzu(r); fv = fl(m & 0x40); pc += 3; })),
  /* AND nn      */ 0x25: go(2, 3, czp((_r, _w, m)                => { and(m); pc += 2; })),
  /* AND #nn     */ 0x29: go(2, 2, cim((_r, _w, m)                => { and(m); pc += 2; })),
  /* ROL A       */ 0x2a: go(1, 2, no(()                          => { const ra0 = ((ra << 1) | fc) & 0xff; fc = ((ra & 0x80) >> 7); ra = ra0; fnu(ra); fzu(ra); pc += 1; })),
  /* BMI dd      */ 0x30: go(2, 2, cjim((_r, _w, m)               => { cj(fn === 1, m); pc += 2; }), (read) => cjt(read, fn === 1)),
  /* AND nn, X   */ 0x35: go(2, 4, czpx((_r, _w, m)               => { and(m); pc += 2; })),
  /* SEC         */ 0x38: go(1, 2, no(()                          => { fc = 1; pc++; })),
  /* AND nnnn, X */ 0x3d: go(3, 4, cabsx((_r, _w, m)              => { and(m); pc += 3; }), pb2x),
  /* RTI         */ 0x40: go(1, 6, no((read)                      => {
	  const st = popsp(read);
	  const l = popsp(read);
	  const h = popsp(read);

	  restatus(st);

	  p = (h << 8) + l;

	  pc = p + 2; })),
  /* EOR (nn, X) */ 0x41: go(2, 6, cinx((_r, _w, m)               => { eor(m); pc += 2; })),
  /* EOR nn      */ 0x45: go(2, 3, czp((_r, _w, m)                => { eor(m); pc += 2; })),
  /* LSR nn      */ 0x46: go(2, 5, cabs((_r, _w, m)               => { const r = m >> 1; fc = m & 0x01; ra = r; fnu(ra); fzu(ra); pc += 2; })),
  /* PHA         */ 0x48: go(1, 3, no((_r, write)                 => { pshsp(write, ra); pc += 1; })),
  /* EOR #nn     */ 0x49: go(2, 2, cim((_r, _w, m )               => { eor(m); pc += 2; })),
  /* LSR A       */ 0x4a: go(1, 2, no(()                          => { const ra0 = (ra >> 1) & 0xff; fc = ra & 0x01; ra = ra0; fnu(ra); fzu(ra); pc += 1; })),
  /* JMP nnnn    */ 0x4c: go(3, 3, cabs((_r, _w, _m, a)           => { pc = a; })),
  /* JMP (nnnn)  */ 0x6c: go(3, 5, cin((_r, _w, m)                => { pc = m; })),
  /* LSR nnnn    */ 0x4e: go(3, 6, cabs((_r, _w, m)               => { const r = m >> 1; fc = m & 0x01; ra = r; fnu(ra); fzu(ra); pc += 3; })),
  /* BVC dd      */ 0x50: go(2, 2, cjim((_r, _w, m)               => { cj(fv === 0, m); pc += 2; }), (read) => cjt(read, fv === 0)),
  /* RTS         */ 0x60: go(1, 6, no((read)                      => { l = popsp(read); h = popsp(read); pc = ((h << 8) + l) & 0xffff; })),
  /* ADC nn      */ 0x65: go(2, 3, czp((_r, _w, m)                => { adc(m); pc += 2; })),
  /* PLA         */ 0x68: go(1, 4, no((read)                      => { ra = popsp(read); fnu(ra); fzu(ra); pc += 1; })),
  /* ADC #nn     */ 0x69: go(2, 2, cim((_r, _w, m)                => { adc(m); pc += 2; })),
  /* ROR A       */ 0x6a: go(1, 2, no(()                          => { const ra0 = ((ra >> 1) | (fc << 7)) & 0xff; fc = ra & 0x01; ra = ra0; fnu(ra); fzu(ra); pc += 1; })),
  /* BVS dd      */ 0x70: go(2, 2, cjim((_r, _w, m)               => { cj(fv === 1, m); pc += 2; }), (read) => cjt(read, fv === 1)),
  /* ADC nn, X   */ 0x75: go(2, 4, czpx((_r, _w, m)               => { adc(m); pc += 2; })),
  /* ADC nnnn, Y */ 0x79: go(3, 4, cabsy((_r, _w, m)              => { adc(m); pc += 3; }), pb2y),
  /* SEI         */ 0x78: go(1, 2, no(()                          => { fi = 1; pc++; })),
  /* STY nn      */ 0x84: go(2, 3, czp((_r, write, _m, a)         => { sty(write, a); pc += 2; })),
  /* STA nn      */ 0x85: go(2, 3, czp((_r, write, _m, a)         => { sta(write, a); pc += 2; })),
  /* DEY         */ 0x88: go(1, 2, no(()                          => { ry = (ry - 1) & 0xff; fnu(ry); fzu(ry); pc += 1; })),
  /* STY nnnn    */ 0x8c: go(3, 4, cabs((_r, write, _m, a)        => { sty(write, a); pc += 3; })),
  /* STA nnnn    */ 0x8d: go(3, 4, cabs((_r, write, _m, a)        => { sta(write, a); pc += 3; })),
  /* STX nnnn    */ 0x8e: go(3, 4, cabs((_r, write, _m, a)        => { stx(write, a); pc += 3; })),
  /* STX nn      */ 0x86: go(2, 3, czp((_r, write, _m, a)         => { stx(write, a); pc += 2; })),
  /* TXA         */ 0x8a: go(1, 2, no(()                          => { ra = rx; fnu(ra); fzu(ra); pc += 1; })),
  /* BCC dd      */ 0x90: go(2, 2, cjim((_r, _w, m)               => { cj(fc === 0, m); pc += 2; }), (read) => cjt(read, fc === 0)),
  /* STY nn, X   */ 0x94: go(2, 4, czpx((_r, write, _m, a)        => { sty(write, a); pc += 2; })),
  /* STA nn, X   */ 0x95: go(2, 4, czpx((_r, write, _m, a)        => { sta(write, a); pc += 2; })),
  /* STX nn, Y   */ 0x96: go(2, 4, czpy((_r, write, _m, a)        => { stx(write, a); pc += 2; })),
  /* TYA         */ 0x98: go(1, 2, no(()                          => { ra = ry; fnu(ra); fzu(ra); pc += 1; })),
  /* STA nnnn, Y */ 0x99: go(3, 5, cabsy((_r, write, _m, a)       => { sta(write, a); pc += 3; })),
  /* TXS         */ 0x9a: go(1, 2, no(()                          => { sp = rx; pc += 1; })),
  /* LDY #nn     */ 0xa0: go(2, 2, cim((_r, _w, m)                => { ldy(m); pc += 2; })),
  /* LDX #nn     */ 0xa2: go(2, 2, cim((_r, _w, m)                => { ldx(m); pc += 2; })),
  /* LDY nn      */ 0xa4: go(2, 3, czp((_r, _w, m)                => { ldy(m); pc += 2; })),
  /* LDA nn      */ 0xa5: go(2, 3, czp((_r, _w, m)                => { lda(m); pc += 2; })),
  /* LDX nn      */ 0xa6: go(2, 3, czp((_r, _w, m)                => { ldx(m); pc += 2; })),
  /* TAY         */ 0xa8: go(1, 2, no(()                          => { ry = ra; fnu(ry); fzu(ry); pc += 1; })),
  /* LDA #nn     */ 0xa9: go(2, 2, cim((_r, _w, m)                => { lda(m); pc += 2; })),
  /* TAX         */ 0xaa: go(1, 2, no(()                          => { rx = ra; fnu(rx); fzu(rx); pc += 1; })),
  /* LDY nnnn    */ 0xac: go(3, 4, cabs((_r, _w, m)               => { ldy(m); pc += 3; })),
  /* LDA nnnn    */ 0xad: go(3, 4, cabs((_r, _w, m)               => { lda(m); pc += 3; })),
  /* LDX nnnn    */ 0xae: go(3, 4, cabs((_r, _w, m)               => { ldx(m); pc += 3; })),
  /* BCS dd      */ 0xb0: go(2, 2, cjim((_r, _w, m)               => { cj(fc === 1, m); pc += 2; }), (read) => cjt(read, fc === 1)),
  /* LDA (nn), Y */ 0xb1: go(2, 5, ciny((_r, _w, m)               => { lda(m); pc += 2; }), pb1y),
  /* LDY nn, X   */ 0xb4: go(2, 4, czpx((_r, _w, m)               => { ldy(m); pc += 2; })),
  /* LDA nn, X   */ 0xb5: go(2, 4, czpx((_r, _w, m)               => { lda(m); pc += 2; })),
  /* LDX nn, Y   */ 0xb6: go(2, 4, czpy((_r, _w, m)               => { ldx(m); pc += 2; })),
  /* LDA nnnn, Y */ 0xb9: go(3, 4, cabsy((_r, _w, m)              => { lda(m); pc += 3; }), pb2y),
  /* TSX         */ 0xba: go(1, 2, no(()                          => { rx = sp; fnu(rx); fzu(rx); pc += 1; })),
  /* LDA nnnn, X */ 0xbd: go(3, 4, cabsx((_r, _w, m)              => { lda(m); pc += 3; }), pb2x),
  /* LDX nnnn, Y */ 0xbe: go(3, 4, cabsy((_r, _w, m)              => { ldx(m); pc += 3; }), pb2y),
  /* CPY #nn     */ 0xc0: go(2, 2, cim((_r, _w, m)                => { cpy(m); pc += 2; })),
  /* CPY nn      */ 0xc4: go(2, 3, czp((_r, _w, m)                => { cpy(m); pc += 2; })),
  /* CMP nn      */ 0xc5: go(2, 4, czp((_r, _w, m)                => { cmp(m); pc += 2; })),
  /* DEC nn      */ 0xc6: go(2, 5, czp((_r, write, m, a)          => { dec(write, m, a); pc += 2; })),
  /* DEC nn, X   */ 0xd6: go(2, 6, czpx((_r, write, m, a)         => { dec(write, m, a); pc += 2; })),
  /* INY         */ 0xc8: go(1, 2, no(()                          => { ry = (ry + 1) & 0xff; fnu(ry); fzu(ry); pc += 1; })),
  /* CMP #nn     */ 0xc9: go(2, 2, cim((_r, _w, m)                => { cmp(m); pc += 2; })),
  /* DEX         */ 0xca: go(1, 2, no(()                          => { rx = (rx - 1) & 0xff; fnu(rx); fzu(rx); pc += 1; })),
  /* BNE dd      */ 0xd0: go(2, 2, cjim((_r, _w, m)               => { cj(fz === 0, m); pc += 2; }), (read) => cjt(read, fz === 0)),
  /* CMP nn, X   */ 0xd5: go(2, 4, czpx((_r, _w, m)               => { cmp(m); pc += 2; })),
  /* CLD         */ 0xd8: go(1, 2, no(()                          => { fd = 0; pc += 1; })),
  /* CMP nnnn, Y */ 0xd9: go(3, 4, cabsy((_r, _w, m)              => { cmp(m); pc += 3; }), pb2y),
  /* CPX #nn     */ 0xe0: go(2, 2, cim((_r, _w, m)                => { cpx(m); pc += 2; })),
  /* SBC (nn, X) */ 0xe1: go(2, 6, cinx((_r, _w, m)               => { sbc(m); pc += 2; })),
  /* CPX nn      */ 0xe4: go(2, 3, czp((_r, _w, m)                => { cpx(m); pc += 2; })),
  /* SBC nn      */ 0xe5: go(2, 3, czp((_r, _w, m)                => { sbc(m); pc += 2; })),
  /* INC nn      */ 0xe6: go(2, 5, czp((_r, write, m, a)          => { inc(write, m, a); pc += 2; })),
  /* INX         */ 0xe8: go(1, 2, no(()                          => { rx = (rx + 1) & 0xff; fnu(rx); fzu(rx); pc += 1; })),
  /* ISC nn      */ 0xe7: go(2, 5, czp((read, write, m, a)        => {  // UNDOCUMENTED
	  // https://www.masswerk.at/nowgobang/2021/6502-illegal-opcodes
	  inc(write, m, a);

	  const v = read(a);

          sbc(v);

	  pc += 2; })),
  /* SBC #nn     */ 0xe9: go(2, 2, cim((_r, _w, m)                => { sbc(m); pc += 2; })),
  /* NOP         */ 0xea: go(1, 2, no(()                          => { pc += 1; })),
  /* BEQ dd      */ 0xf0: go(2, 2, cjim((_r, _w, m)               => { cj(fz === 1, m); pc += 2; }), (read) => cjt(read, fz === 1)),
  /* SBC nn, X   */ 0xf5: go(2, 4, czpx((_r, _w, m)               => { sbc(m); pc += 2; })),
  /* INC nn, X   */ 0xf6: go(2, 5, czpx((_r, write, m, a)         => { inc(write, m, a); pc += 2; })),
  /* SED         */ 0xf8: go(1, 2, no(()                          => { fd = 1; pc += 1; })),
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

  let cc = 0;

  document.addEventListener("chrom", () => { isKilled = true; isBreak = false; });
  document.addEventListener("continue", () => { isContinue = true; isStep = false; });
  document.addEventListener("step", () => { isBreakout = true; isStep = true });

  const mem = romAsMem(input.length === 4_096 ? input : input.concat(input));

  const nrml = (addr, r) => {
    if (addr & 0x1000) { // ROM
      return addr & 0x1fff;
    } else if ((addr & 0x1080) === 0x00) { // TIA
      const _a = addr & 0x3f;

      // FIXME This is probably not correct:
      //       TIA has read and write addresses, some of them
      //       which overlap, such as 0C (REFP1) and 0c (INPT4).
      //       Only the action differs. We move reads to 0xyz
      //       to mirror 0x3z
      return r ? (_a | 0x30) : _a;
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
    const naddr = nrml(addr, true);

    if (naddr === INTIM) {
      if (mem[INSTAT] & 0x40) { // Restart interval
        mem[INSTAT] &= 0xbf;
      }
    } else if (naddr === INSTAT) {
      mem[INSTAT] &= 0xbf; // Reset bit 6 on read instat
    }

     // if (naddr === 0x32) { return 0xff; }

    // if (naddr === 0x32) {
    //     (mem[naddr] !== 0) && console.log("WWW", mem[naddr].toString(16));
    // }

    return mem[naddr];
  }

  const cxclr = () => { mem[CXM0P] = 0;
                        mem[CXM1P] = 0;
                        mem[CXP0FB] = 0;
                        mem[CXP1FB] = 0;
                        mem[CXM0FB] = 0;
                        mem[CXM1FB] = 0;
                        mem[CXBLPF] = 0; }

  const write = (addr, v) => {
     const naddr = nrml(addr);

     if ((naddr === CXP0FB)) { return; }
     if ((naddr === CXP1FB)) { return; }

     // STROBES, i.e. won't be actually stored and return early
     if (naddr === CXCLR) { cxclr(); return; }

     if (naddr === INPT4) { return; }
     if (naddr === INPT5) { return; }

     if (naddr === WSYNC) { isWSync = true; return; }
     if (naddr === RESP0) { isRESP0 = true; return; }
     if (naddr === RESP1) { isRESP1 = true; return; }
     if (naddr === RESM0) { isRESM0 = true; return; }
     if (naddr === RESM1) { isRESM1 = true; return; }
     if (naddr === RESBL) { isRESBL = true; return; }

     if (naddr === RESMP0) { isRESMP0 = true; return; }
     if (naddr === RESMP1) { isRESMP1 = true; return; }

     if (naddr === HMOVE) { isHMOVE = true; return; }
     if (naddr === HMCLR) { isHMCLR = true; return; }

     if (naddr === TIM1T)  { interval = 1;     timerCounter = interval; mem[INTIM] = Math.max(v, 0) & 0xff; mem[INSTAT] &= 0x7f; return; }
     if (naddr === TIM8T)  { interval = 8;     timerCounter = interval; mem[INTIM] = Math.max(v, 0) & 0xff; mem[INSTAT] &= 0x7f; return; }
     if (naddr === TIM64T) { interval = 64;    timerCounter = interval; mem[INTIM] = Math.max(v, 0) & 0xff; mem[INSTAT] &= 0x7f; return; }
     if (naddr === T1024T) { interval = 1_024; timerCounter = interval; mem[INTIM] = Math.max(v, 0) & 0xff; mem[INSTAT] &= 0x7f; return; }

     // SPECIAL CASES with extra actions
     if (naddr === VSYNC) { isVSync = (v & 0x02) === 0x02; }

     if (naddr === GRP0) {
       // if (mem[VDELP1] & 0x01) { mem[GRP1] = GRP1_DELAYED; }
       if (mem[VDELP0] & 0x01) { GRP0_DELAYED = v; return; }

       mem[GRP0] = v;
       return; // Do not store bc delayed write, reversing, etc
     }

     if (naddr === GRP1) {
       if (mem[VDELP0] & 0x01) { mem[GRP0] = GRP0_DELAYED; }
       if (mem[VDELP1] & 0x01) { GRP1_DELAYED = v; return; }

       mem[GRP1] = v;
       return; // Do not store bc delayed write, reversing, etc
     }

     // UPDATE MEMORY
     mem[naddr] = v;

     // POST PROCESSING, i.e. update helper registers and the like
     if (pfs.has(naddr)) {
       const pf0 = mem[PF0] & 0xff;
       const pf1 = mem[PF1] & 0xff;
       const pf2 = mem[PF2] & 0xff;

       const pf0rev = rev8(pf0) & 0xf;
       const pf2rev = rev8(pf2) & 0xff;

       PF = ((pf0rev << 16) | (pf1 << 8) | pf2rev) & 0xffffffff;
     }
  }

  const controller = ({
	// P0
        mn:    () => mem[SWCHA] &= 0xef,
	me:    () => mem[SWCHA] &= 0x7f,
	ms:    () => mem[SWCHA] &= 0xdf,
	mw:    () => mem[SWCHA] &= 0xbf,
	fire:  () => mem[INPT4] &= 0x7f,

	mnc:   () => mem[SWCHA] |= 0x10,
	mec:   () => mem[SWCHA] |= 0x80,
	msc:   () => mem[SWCHA] |= 0x20,
	mwc:   () => mem[SWCHA] |= 0x40,
	firec: () => mem[INPT4] |= 0x80,

	// P1
        mn1:    () => mem[SWCHA] &= 0xfe,
	me1:    () => mem[SWCHA] &= 0xf7,
	ms1:    () => mem[SWCHA] &= 0xfd,
	mw1:    () => mem[SWCHA] &= 0xfb,
	fire1:  () => mem[INPT5] &= 0x7f,

	mnc1:   () => mem[SWCHA] |= 0x01,
	mec1:   () => mem[SWCHA] |= 0x08,
	msc1:   () => mem[SWCHA] |= 0x02,
	mwc1:   () => mem[SWCHA] |= 0x04,
	firec1: () => mem[INPT5] |= 0x80,
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

    mem[SWCHB]  = 0b00001011;
    mem[SWBCNT] = 0x00;
    mem[SWCHA]  = 0xff;
    mem[SWACNT] = 0xff;
    mem[INPT4]  = 0xff;
    mem[INPT5]  = 0xff;
  }

  loadSwitches();

  const entrypoint = word(read, 0xfffc)

  const [draw, cross] = drawer();

  pc = entrypoint; // || 0xf000;
  PF = 0;

  dbg("entrypoint", pc.toString(16));


  // FIXME ED Move dependency from step/breakpoint
  let s = (228 * (3 + 37)) + 68 + (228 / 2); // Middle of screen, first line - pretty random, other emulators seem to work that way

  const tickTimer = () => {
   if (timerCounter > 0) { timerCounter--; return; }

   const t0 = mem[INTIM] - 1;
   if (t0 < 0) { mem[INSTAT] |= 0xc0; mem[INTIM] = 0xff; timerCounter = 1; } else { mem[INTIM] = t0; timerCounter = interval; }
  }

  const break_ = async () => {
      let propagated = false;
      while (!isBreakout && ((breakpoints.has(pc) && !isContinue) || isStep)) {
	if (isWSync) { isBreakout = false; return; }
	if (isVSync) { isBreakout = false; return; }
        const x = (s % 228) - hb;
        const y = Math.floor((s - vb) / 228);

        if (bpConditional.x.lower !== undefined && (x < bpConditional.x.lower)) { break; }
        if (bpConditional.x.upper !== undefined && (x > bpConditional.x.upper)) { break; }
        if (bpConditional.y.lower !== undefined && (y < bpConditional.y.lower)) { break; }
        if (bpConditional.y.upper !== undefined && (y > bpConditional.y.upper)) { break; }
	if (isStep) { while (action && !action.next().done) { } }

        if (!propagated) {
          document.dispatchEvent(new Event("break"));
          updateScreen(mem, s, pc);
          requestAnimationFrame(draw);
          requestAnimationFrame(() => cross(x, y));
          propagated = true;
        }
        await sleep(100);
      }
      isBreakout = false;
  }

  const step = () => {
    tickTimer();

    const isWaiting = action && !action.next().done;

    if (isWSync || isWaiting) { return; }

    isContinue = false;

    const o = read(pc)

    const p = processors[o];

    try {
     action = p(read, write);
    } catch (e) {
      if (o === 0xff) { return; } // Forced exit for debugging purposes
      console.log(e, pc.toString(16), "o", o.toString(16))
      debugger;
      throw e;
    }
  }

  const tia_ = () => {
      updateScreen(mem, s, pc);

      if (!isVSync && !(s === (228 * 262))) { return }

      requestAnimationFrame(draw);

      fs = new Date();
      s = 0;
      t = 0;
      clearScreen();
      cc = 0;
      isVSync = false;
  }


  let t = 0;
  let u = 0;
  let action = undefined;
  const process = async () => {
    // let a = 0;
    while (!isKilled) {
      if (u === BLK) { await sleep(DLY);requestAnimationFrame(draw); u = 0; }

      // TIA every cycle
      tia_();

      if (t === 3) { t = 0; }

      // PIA once every 3 cycles
      (t === 0) && ( await break_(), step(), cc = (cc + 1) % 76);

      // EOL -> process current operation immediately
      if ((s % 228) === 0) {
	 isWSync = false;
	 // while (!action.next().done) { }
      }


      t++;
      s++;
      u++;
    }
  }

  const info = () => {
    const x = (s % 228) - hb;
    const y = Math.floor((s - vb) / 228);

    return ({
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
      m0x: resm0x,
      m1x: resm1x,
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
    });
  }

  return [process, controller, switches, info];
}

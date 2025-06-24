const mos6507 = (read, write, rdy) => {
  let pc = 0;
  let sp = 0xff;
  
  //  Bit  Name  Expl.
  //  0    C     Carry         (0=No Carry, 1=Carry)
  //  1    Z     Zero          (0=Nonzero, 1=Zero)
  //  2    I     IRQ Disable   (0=IRQ Enable, 1=IRQ Disable)
  //  3    D     Decimal Mode  (0=Normal, 1=BCD Mode for ADC/SBC opcodes)
  //  4    B     Break Flag    (0=IRQ/NMI, 1=RESET or BRK/PHP opcode)
  //  5    -     Not used      (Always 1)
  //  6    V     Overflow      (0=No Overflow, 1=Overflow)
  //  7    N     Negative/Sign (0=Positive, 1=Negative)
  
  let fc = 0;
  let fn = 0;
  let fi = 0;
  let fd = 0;
  let _fb = 0;
  let fv = 0;
  let fz = 0;
  
  let ra = 0;
  let rx = 0;
  let ry = 0;

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
  const popsp = (read) => { sp = (sp + 1) & 0xff; return read(sp & 0xff, true) & 0xff; }
  
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
  
  const pzx  = (nn)   => { return (nn + rx) & 0xff; }
  const pzy  = (nn)   => { return (nn + ry) & 0xff; }
  const absx = (nnnn) => { return (nnnn + rx) & 0xffff; }
  const absy = (nnnn) => { return (nnnn + ry) & 0xffff; }
  
  const pb1y  = (read)    => { const nn = read(pc + 1); return fl(((nn & 0xff) + (ry & 0xff) > 0xff)); }
  const pb2x  = (read)    => { const nnnn = word(read, pc + 1); return fl((((nnnn & 0xff) + (rx & 0xff)) > 0xff)); }
  const pb2y  = (read)    => { const nnnn = word(read, pc + 1); return fl((((nnnn & 0xff) + (ry & 0xff)) > 0xff)); }
  const cjt   = (read, c) => { if (!c) { return 0; } const r0 = fl(c); const dd = read(pc + 1); const r1 = ((pc & 0xff) + tcd(dd)); return fl((r1 < 0) || (r1 > 0xff)) + r0; }
  
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
  
  const writea = (v) => ra = v & 0xff;
  
  const adc = (m) => {
    const m0 = m & 0xff;
    const ra0 = ra & 0xff;
  
    if (fd) {
      const r = b2d(ra) + fc + b2d(m);
  
      ra = d2b(r % 100);
  
      // In decimal mode, the N, V and Z flags are not consistent with the decimal result.
      // https://www.pagetable.com/c64ref/6502/?tab=2#ADC
      fnu(ra);
      fzu(ra);
      fv = fl((r ^ ra0) & (r ^ m0) & 0x80);
      fc = fl(r > 99);
      return
    }
  
    const r = ra0 + m0 + fc;
  
    fv = fl((r ^ ra0) & (r ^ m0) & 0x80);
    fc = fl(r > 0xff);
  
    ra = r & 0xff;
  
    fnu(ra);
    fzu(ra);
  }
  const and = (m)           => { ra = ra & m; fnu(ra); fzu(ra); }
  const asl = (m, write)    => { const r = (m << 1) & 0xff; write(r); fc = ((m & 0x80) >> 7); fnu(r); fzu(r); }
  const bit = (m)           => { const r = ra & m; fnu(m); fzu(r); fv = fl(m & 0x40); }
  const cmp = (m)           => { const r = (ra - m) & 0xff; fc = fl(m <= ra); fnu(r); fzu(r); }
  const cpx = (m)           => { const r = (rx - m) & 0xff; fc = fl(m <= rx); fnu(r); fzu(r); }
  const cpy = (m)           => { const r = (ry - m) & 0xff; fc = fl(m <= ry); fnu(r); fzu(r); }
  const dec = (write, m, a) => { const r = (m - 1) & 0xff; write(a, r); fnu(r); fzu(r); }
  const eor = (m)           => { ra ^= m; fnu(ra); fzu(ra); }
  const inc = (write, m, a) => { const r = (m + 1) & 0xff; write(a, r); fnu(r); fzu(r); }
  const lda = (m)           => { ra = m; fnu(ra); fzu(ra); }
  const ldx = (m)           => { rx = m; fnu(rx); fzu(rx); }
  const ldy = (m)           => { ry = m; fnu(ry); fzu(ry); }
  const lsr = (m, write)    => { const r = (m >> 1) & 0xff; write(r); fc = m & 0x01; fnu(r); fzu(r); }
  const ora = (m)           => { ra |= m; fnu(ra); fzu(ra); }
  const rol = (m, write)    => { const r = ((m << 1) | fc) & 0xff; write(r); fc = ((m & 0x80) >> 7); fnu(r); fzu(r); }
  const ror = (m, write)    => { const r = ((m >> 1) | (fc << 7)) & 0xff; fc = m & 0x01; write(r); fnu(r); fzu(r); }
  const sbc = (m)           => { adc(~m); }
  const sta = (write, a)    => { write(a, ra & 0xff); }
  const stx = (write, a)    => { write(a, rx & 0xff); }
  const sty = (write, a)    => { write(a, ry & 0xff); }
  
  const cj  = (condition, m) => { condition && (pc += tcd(m)); }
  
  const cmd = (cc_, f, ccx) => {
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
    /* BRK         */ 0x00: cmd(7, no((read, write)               => {
  	  _fb = 1;
  
  	  pshsp(write, (pc >> 8) & 0xff);
  	  pshsp(write, pc & 0xff);
  	  pshsp(write, prstatus());
  
  	  fi = 1;
  
  	  p = word(read, 0xfffe);
  
  	  pc = p; })),
    /* NOP         */ 0x04: cmd(3, czp(()                         => { pc += 2; })),  // UNDOCUMENTED
    /* ORA nn      */ 0x05: cmd(3, czp((_r, _w, m)                => { ora(m); pc += 2; })),
    /* ASL nn      */ 0x06: cmd(5, czp((_r, write, m, a)          => { asl(m, (v) => write(a, v)); pc += 2; })),
    /* PHP         */ 0x08: cmd(3, no((_r, write)                 => { pshsp(write, prstatus()); pc += 1; })),
    /* ORA #nn     */ 0x09: cmd(2, cim((_r, _w, m)                => { ora(m); pc += 2; })),
    /* ASL A       */ 0x0a: cmd(2, no(()                          => { asl(ra, writea); pc += 1; })),
    /* ORA nnnn    */ 0x0d: cmd(4, cabs((_r, _w, m)               => { ora(m); pc += 3; })),
    /* SLO nnnn    */ 0x0f: cmd(6, cabs((read, write, m, a)       => {  // UNDOCUMENTED
  	  // https://www.masswerk.at/nowgobang/2021/6502-illegal-opcodes
  	  asl(write, m, a);
  
  	  const v = read(a);
  
            ora(v);
  
  	  pc += 3; })),
    /* BPL dd      */ 0x10: cmd(2, cjim((_r, _w, m, _a)           => { cj(fn === 0, m); pc += 2; }), (read) => cjt(read, fn === 0)),
    /* ORA (nn), Y */ 0x11: cmd(5, ciny((_r, _w, m)               => { ora(m); pc += 2; }), pb1y),
    /* ORA nn, X   */ 0x15: cmd(4, czpx((_r, _w, m)               => { ora(m); pc += 2; })),
    /* ASL nn, X   */ 0x16: cmd(6, czpx((_r, write, m, a)         => { asl(m, (v) => write(a, v)); pc += 2; })),
    /* CLC         */ 0x18: cmd(2, no(()                          => { fc = 0; pc += 1; })),
    /* ORA nnnn, X */ 0x1d: cmd(4, cabsx((_r, _w, m)              => { ora(m); pc += 3; }), pb2x),
    /* ORA nnnn, Y */ 0x19: cmd(4, cabsy((_r, _w, m)              => { ora(m); pc += 3; }), pb2y),
    /* JSR nnnn    */ 0x20: cmd(6, cabs((_r, write, _m, a)        => { const ret = pc + 3; pshsp(write, (ret >> 8) & 0xff); pshsp(write, ret & 0xff); pc = a; })),
    /* BIT nn      */ 0x24: cmd(3, czp((_r, _w, m)                => { bit(m); pc += 2; })),
    /* BIT nnnn    */ 0x2c: cmd(3, cabs((_r, _w, m)               => { bit(m); pc += 3; })),
    /* AND nn      */ 0x25: cmd(3, czp((_r, _w, m)                => { and(m); pc += 2; })),
    /* AND #nn     */ 0x29: cmd(2, cim((_r, _w, m)                => { and(m); pc += 2; })),
    /* ROL A       */ 0x2a: cmd(2, no(()                          => { rol(ra, writea); pc += 1; })),
    /* ROL nn      */ 0x26: cmd(5, czp((_r, write, m, a)          => { rol(m, (v) => write(a, v)); pc += 2; })),
    /* AND nnnn    */ 0x2d: cmd(4, cabs((_r, _w, m)               => { and(m); pc += 3; })),
    /* BMI dd      */ 0x30: cmd(2, cjim((_r, _w, m)               => { cj(fn === 1, m); pc += 2; }), (read) => cjt(read, fn === 1)),
    /* AND nn, X   */ 0x35: cmd(4, czpx((_r, _w, m)               => { and(m); pc += 2; })),
    /* ROL nn, X   */ 0x36: cmd(6, czpx((_r, write, m, a)         => { rol(m, (v) => write(a, v)); pc += 2; })),
    /* SEC         */ 0x38: cmd(2, no(()                          => { fc = 1; pc += 1; })),
    /* AND nnnn, Y */ 0x39: cmd(4, cabsy((_r, _w, m)              => { and(m); pc += 3; }), pb2y),
    /* AND nnnn, X */ 0x3d: cmd(4, cabsx((_r, _w, m)              => { and(m); pc += 3; }), pb2x),
    /* RTI         */ 0x40: cmd(6, no((read)                      => {
  	  const st = popsp(read);
  	  const l = popsp(read);
  	  const h = popsp(read);
  
  	  restatus(st);
  
  	  p = (h << 8) + l;
  
  	  pc = p + 2; })),
    /* EOR (nn, X) */ 0x41: cmd(6, cinx((_r, _w, m)               => { eor(m); pc += 2; })),
    /* EOR nn      */ 0x45: cmd(3, czp((_r, _w, m)                => { eor(m); pc += 2; })),
    /* LSR nn      */ 0x46: cmd(5, czp((_r, write, m, a)          => { lsr(m, (v) => write(a, v)); pc += 2; })),
    /* LSR nn, X   */ 0x56: cmd(6, czpx((_r, write, m, a)         => { lsr(m, (v) => write(a, v)); pc += 2; })),
    /* PHA         */ 0x48: cmd(3, no((_r, write)                 => { pshsp(write, ra); pc += 1; })),
    /* EOR #nn     */ 0x49: cmd(2, cim((_r, _w, m )               => { eor(m); pc += 2; })),
    /* LSR A       */ 0x4a: cmd(2, no(()                          => { lsr(ra, writea); pc += 1; })),
    /* ALR #nn     */ 0x4b: cmd(2, cim((_r, write, m, a)          => { and(m); lsr(m, (v) => write(a, v)); pc += 2; })), // Illegal
    /* JMP nnnn    */ 0x4c: cmd(3, cabs((_r, _w, _m, a)           => { pc = a; })),
    /* LSR nnnn    */ 0x4e: cmd(6, cabs((_r, write, m, a)         => { lsr(m, (v) => write(a, v)); pc += 3; })),
    /* BVC dd      */ 0x50: cmd(2, cjim((_r, _w, m)               => { cj(fv === 0, m); pc += 2; }), (read) => cjt(read, fv === 0)),
    /* EOR nnnn, X */ 0x5d: cmd(4, cabsx((_r, _w, m)              => { eor(m); pc += 3; }), pb2x),
    /* RTS         */ 0x60: cmd(6, no((read)                      => { const l = popsp(read); const h = popsp(read); pc = ((h << 8) + l) & 0xffff; })),
    /* ADC nn      */ 0x65: cmd(3, czp((_r, _w, m)                => { adc(m); pc += 2; })),
    /* ROR nn      */ 0x66: cmd(5, czp((_r, write, m, a)          => { ror(m, (v) => write(a, v)); pc += 2; })),
    /* PLA         */ 0x68: cmd(4, no((read)                      => { ra = popsp(read); fnu(ra); fzu(ra); pc += 1; })),
    /* ADC #nn     */ 0x69: cmd(2, cim((_r, _w, m)                => { adc(m); pc += 2; })),
    /* ROR A       */ 0x6a: cmd(2, no(()                          => { ror(ra, writea); pc += 1; })),
    /* JMP (nnnn)  */ 0x6c: cmd(5, cin((_r, _w, m)                => { pc = m; })),
    /* BVS dd      */ 0x70: cmd(2, cjim((_r, _w, m)               => { cj(fv === 1, m); pc += 2; }), (read) => cjt(read, fv === 1)),
    /* ADC nn, X   */ 0x75: cmd(4, czpx((_r, _w, m)               => { adc(m); pc += 2; })),
    /* ROR nn, X   */ 0x76: cmd(6, czpx((_r, write, m, a)         => { ror(m, (v) => write(a, v)); pc += 2; })),
    /* ADC nnnn, Y */ 0x79: cmd(4, cabsy((_r, _w, m)              => { adc(m); pc += 3; }), pb2y),
    /* SEI         */ 0x78: cmd(2, no(()                          => { fi = 1; pc += 1; })),
    /* ADC nnnn, X */ 0x7d: cmd(4, cabsx((_r, _w, m)              => { adc(m); pc += 3; }), pb2x),
    /* STY nn      */ 0x84: cmd(3, czp((_r, write, _m, a)         => { sty(write, a); pc += 2; })),
    /* STA nn      */ 0x85: cmd(3, czp((_r, write, _m, a)         => { sta(write, a); pc += 2; })),
    /* DEY         */ 0x88: cmd(2, no(()                          => { ry = (ry - 1) & 0xff; fnu(ry); fzu(ry); pc += 1; })),
    /* STY nnnn    */ 0x8c: cmd(4, cabs((_r, write, _m, a)        => { sty(write, a); pc += 3; })),
    /* STA nnnn    */ 0x8d: cmd(4, cabs((_r, write, _m, a)        => { sta(write, a); pc += 3; })),
    /* STX nnnn    */ 0x8e: cmd(4, cabs((_r, write, _m, a)        => { stx(write, a); pc += 3; })),
    /* STX nn      */ 0x86: cmd(3, czp((_r, write, _m, a)         => { stx(write, a); pc += 2; })),
    /* TXA         */ 0x8a: cmd(2, no(()                          => { ra = rx; fnu(ra); fzu(ra); pc += 1; })),
    /* BCC dd      */ 0x90: cmd(2, cjim((_r, _w, m)               => { cj(fc === 0, m); pc += 2; }), (read) => cjt(read, fc === 0)),
    /* STY nn, X   */ 0x94: cmd(4, czpx((_r, write, _m, a)        => { sty(write, a); pc += 2; })),
    /* STA nn, X   */ 0x95: cmd(4, czpx((_r, write, _m, a)        => { sta(write, a); pc += 2; })),
    /* STX nn, Y   */ 0x96: cmd(4, czpy((_r, write, _m, a)        => { stx(write, a); pc += 2; })),
    /* TYA         */ 0x98: cmd(2, no(()                          => { ra = ry; fnu(ra); fzu(ra); pc += 1; })),
    /* STA nnnn, Y */ 0x99: cmd(5, cabsy((_r, write, _m, a)       => { sta(write, a); pc += 3; })),
    /* TXS         */ 0x9a: cmd(2, no(()                          => { sp = rx; pc += 1; })),
    /* LDY #nn     */ 0xa0: cmd(2, cim((_r, _w, m)                => { ldy(m); pc += 2; })),
    /* LDX #nn     */ 0xa2: cmd(2, cim((_r, _w, m)                => { ldx(m); pc += 2; })),
    /* LDY nn      */ 0xa4: cmd(3, czp((_r, _w, m)                => { ldy(m); pc += 2; })),
    /* LDA nn      */ 0xa5: cmd(3, czp((_r, _w, m)                => { lda(m); pc += 2; })),
    /* LDX nn      */ 0xa6: cmd(3, czp((_r, _w, m)                => { ldx(m); pc += 2; })),
    /* TAY         */ 0xa8: cmd(2, no(()                          => { ry = ra; fnu(ry); fzu(ry); pc += 1; })),
    /* LDA #nn     */ 0xa9: cmd(2, cim((_r, _w, m)                => { lda(m); pc += 2; })),
    /* TAX         */ 0xaa: cmd(2, no(()                          => { rx = ra; fnu(rx); fzu(rx); pc += 1; })),
    /* LDY nnnn    */ 0xac: cmd(4, cabs((_r, _w, m)               => { ldy(m); pc += 3; })),
    /* LDA nnnn    */ 0xad: cmd(4, cabs((_r, _w, m)               => { lda(m); pc += 3; })),
    /* LDX nnnn    */ 0xae: cmd(4, cabs((_r, _w, m)               => { ldx(m); pc += 3; })),
    /* BCS dd      */ 0xb0: cmd(2, cjim((_r, _w, m)               => { cj(fc === 1, m); pc += 2; }), (read) => cjt(read, fc === 1)),
    /* LDA (nn), Y */ 0xb1: cmd(5, ciny((_r, _w, m)               => { lda(m); pc += 2; }), pb1y),
    /* LDY nn, X   */ 0xb4: cmd(4, czpx((_r, _w, m)               => { ldy(m); pc += 2; })),
    /* LDA nn, X   */ 0xb5: cmd(4, czpx((_r, _w, m)               => { lda(m); pc += 2; })),
    /* LDX nn, Y   */ 0xb6: cmd(4, czpy((_r, _w, m)               => { ldx(m); pc += 2; })),
    /* LDA nnnn, Y */ 0xb9: cmd(4, cabsy((_r, _w, m)              => { lda(m); pc += 3; }), pb2y),
    /* TSX         */ 0xba: cmd(2, no(()                          => { rx = sp; fnu(rx); fzu(rx); pc += 1; })),
    /* LDA nnnn, X */ 0xbd: cmd(4, cabsx((_r, _w, m)              => { lda(m); pc += 3; }), pb2x),
    /* LDX nnnn, Y */ 0xbe: cmd(4, cabsy((_r, _w, m)              => { ldx(m); pc += 3; }), pb2y),
    /* CPY #nn     */ 0xc0: cmd(2, cim((_r, _w, m)                => { cpy(m); pc += 2; })),
    /* CPY nn      */ 0xc4: cmd(3, czp((_r, _w, m)                => { cpy(m); pc += 2; })),
    /* CMP nn      */ 0xc5: cmd(3, czp((_r, _w, m)                => { cmp(m); pc += 2; })),
    /* DEC nn      */ 0xc6: cmd(5, czp((_r, write, m, a)          => { dec(write, m, a); pc += 2; })),
    /* DEC nn, X   */ 0xd6: cmd(6, czpx((_r, write, m, a)         => { dec(write, m, a); pc += 2; })),
    /* INY         */ 0xc8: cmd(2, no(()                          => { ry = (ry + 1) & 0xff; fnu(ry); fzu(ry); pc += 1; })),
    /* CMP #nn     */ 0xc9: cmd(2, cim((_r, _w, m)                => { cmp(m); pc += 2; })),
    /* DEX         */ 0xca: cmd(2, no(()                          => { rx = (rx - 1) & 0xff; fnu(rx); fzu(rx); pc += 1; })),
    /* CMP nnnn    */ 0xcd: cmd(4, cabs((_r, _w, m)               => { cmp(m); pc += 3; })),
    /* BNE dd      */ 0xd0: cmd(2, cjim((_r, _w, m)               => { cj(fz === 0, m); pc += 2; }), (read) => cjt(read, fz === 0)),
    /* CMP nn, X   */ 0xd5: cmd(4, czpx((_r, _w, m)               => { cmp(m); pc += 2; })),
    /* CLD         */ 0xd8: cmd(2, no(()                          => { fd = 0; pc += 1; })),
    /* CMP nnnn, Y */ 0xd9: cmd(4, cabsy((_r, _w, m)              => { cmp(m); pc += 3; }), pb2y),
    /* CMP nnnn, X */ 0xdd: cmd(4, cabsx((_r, _w, m)              => { cmp(m); pc += 3; }), pb2x),
    /* CPX #nn     */ 0xe0: cmd(2, cim((_r, _w, m)                => { cpx(m); pc += 2; })),
    /* SBC (nn, X) */ 0xe1: cmd(6, cinx((_r, _w, m)               => { sbc(m); pc += 2; })),
    /* CPX nn      */ 0xe4: cmd(3, czp((_r, _w, m)                => { cpx(m); pc += 2; })),
    /* SBC nn      */ 0xe5: cmd(3, czp((_r, _w, m)                => { sbc(m); pc += 2; })),
    /* INC nn      */ 0xe6: cmd(5, czp((_r, write, m, a)          => { inc(write, m, a); pc += 2; })),
    /* INX         */ 0xe8: cmd(2, no(()                          => { rx = (rx + 1) & 0xff; fnu(rx); fzu(rx); pc += 1; })),
    /* ISC nn      */ 0xe7: cmd(5, czp((read, write, m, a)        => {  // UNDOCUMENTED
  	  // https://www.masswerk.at/nowgobang/2021/6502-illegal-opcodes
  	  inc(write, m, a);
  
  	  const v = read(a);
  
            sbc(v);
  
  	  pc += 2; })),
    /* SBC #nn     */ 0xe9: cmd(2, cim((_r, _w, m)                => { sbc(m); pc += 2; })),
    /* SBC nnnn    */ 0xed: cmd(4, cabs((_r, _w, m)               => { sbc(m); pc += 3; })),
    /* NOP         */ 0xea: cmd(2, no(()                          => { pc += 1; })),
    /* BEQ dd      */ 0xf0: cmd(2, cjim((_r, _w, m)               => { cj(fz === 1, m); pc += 2; }), (read) => cjt(read, fz === 1)),
    /* SBC nn, X   */ 0xf5: cmd(4, czpx((_r, _w, m)               => { sbc(m); pc += 2; })),
    /* INC nn, X   */ 0xf6: cmd(5, czpx((_r, write, m, a)         => { inc(write, m, a); pc += 2; })),
    /* SED         */ 0xf8: cmd(2, no(()                          => { fd = 1; pc += 1; })),
    /* SBC nnnn, Y */ 0xf9: cmd(4, cabsy((_r, _w, m)              => { sbc(m); pc += 3; })),
    /* ISC nnnn, X */ 0xff: cmd(7, cabsx((read, write, m, a)      => {  // UNDOCUMENTED
  	  // https://www.masswerk.at/nowgobang/2021/6502-illegal-opcodes
  	  inc(write, m, a);
  
  	  const v = read(a);
  
            sbc(v);
  
  	  pc += 3; })),
  }

  pc = word(read, 0xfffc);

  let action = undefined;

  const step = () => {
    if (!rdy()) { return; }

    const isWaiting = action && !action.next().done;

    if (isWaiting) { return; } // allow complete computation


    const o = read(pc)

    const p = processors[o];

    try {
     action = p(read, write);
    } catch (e) {
      console.log(e, pc.toString(16), "o", o.toString(16))
      if (o === 0xff) { return; } // Forced exit for debugging purposes
      debugger;
      throw e;
    }
  }

  const state = () => ({
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
  });

  return [step, state];
}

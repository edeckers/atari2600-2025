

// const testJsr = () => {
//   const l = 0x42;
//   const h = 0xf3;
//
//   testRom[offs(0xf000)] = 0x20; // JSR
//   testRom[offs(0xf001)] = l;
//   testRom[offs(0xf002)] = h;
//
//
//   process(testRom);
//
//   console.log("updates pc", pc.toString(16), pc === ((h << 8) + l));
// }
//
// const testRts = () => {
//   const l = 0x42;
//   const h = 0xf3;
//
//   testRom[offs(0xf000)] = 0x20; // JSR
//   testRom[offs(0xf001)] = l;
//   testRom[offs(0xf002)] = h;
//
//   testRom[offs((h << 8) + l)] = 0x60; // RTS
//
//   process(testRom);
//
//   console.log("updates pc", pc.toString(16), pc === 0xf000 + 3);
// }

const createRom = (isx) => {
  const testRom = new Uint8Array(0x1000);

  for (const [i, ix] of isx.entries()) { testRom[i] = ix; }
  testRom[isx.length] = 0xff; // BREAK

  testRom[0x0ffc] = 0x00;
  testRom[0x0ffd] = 0xf0;
  testRom[0x0ffe] = 0x00;
  testRom[0x0fff] = 0xf0;

  return testRom;
}

const pparams = (params) => ({
  ra: params.ra_.toString(16).padStart(2, '0'),
  rx: params.rx_.toString(16).padStart(2, '0'),
  ry: params.ry_.toString(16).padStart(2, '0'),
  fc: params.fc_.toString(2).padStart(2, '0'),
  fz: params.fz_.toString(2).padStart(2, '0'),
  fn: params.fn_.toString(2).padStart(2, '0'),
})

const test = async (name, isx, params) => {
  const testRom = createRom(isx);

  const { ra_, rx_, ry_, fc_, fz_, fn_ } = params;

  ra = ra_;
  rx = rx_;
  ry = ry_;
  fc = fc_;
  fz = fz_;
  fn = fn_;

  console.log(name);
  console.log(JSON.stringify(pparams({ra_, rx_, ry_, fc_, fc_, fz_, fn_})));

  await process(testRom);

  console.log(JSON.stringify(pparams({ra_: ra, rx_: rx, ry_: ry, fc_: fc, fz_: fz, fn_: fn})));
}

const testAdc = () => test("ADC #nn", [
    0x69, 0x01, // ADC #nn
  ], {
    ra_: 0xff,
    rx_: 0x00,
    ry_: 0x00,
    rc_: 0x00,
    fc_: 0x00,
    fz_: 0x00,
    fn_: 0x00,
  });

const testSbc = () => test("SBC #nn", [
    0xe9, 0x01, // SBC #nn
  ], {
    ra_: 0x00,
    rx_: 0x00,
    ry_: 0x00,
    rc_: 0x00,
    fc_: 0x00,
    fz_: 0x00,
    fn_: 0x00,
  });

const testRom = new Uint8Array(0x1000);

testRom[offs(0xfffc)] = 0x00;
testRom[offs(0xfffd)] = 0xf0;


const testJsr = () => {
  const l = 0x42;
  const h = 0xf3;

  testRom[offs(0xf000)] = 0x20; // JSR
  testRom[offs(0xf001)] = l;
  testRom[offs(0xf002)] = h;


  process(testRom, 1);

  console.log("updates pc", pc.toString(16), pc === ((h << 8) + l));
}

const testRts = () => {
  const l = 0x42;
  const h = 0xf3;

  testRom[offs(0xf000)] = 0x20; // JSR
  testRom[offs(0xf001)] = l;
  testRom[offs(0xf002)] = h;

  testRom[offs((h << 8) + l)] = 0x60; // RTS

  process(testRom, 2);

  console.log("updates pc", pc.toString(16), pc === 0xf000 + 3);
}

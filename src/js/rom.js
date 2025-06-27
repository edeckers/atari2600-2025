const noinmemretrigger = "REMOVECOPYRIGHTEDDATA"
const retrigger = "REMOVECOPYRIGHTEDDATA"
const bigsprite = "REMOVECOPYRIGHTEDDATA"
const allsprites = "REMOVECOPYRIGHTEDDATA"
const moonpatrol = "REMOVECOPYRIGHTEDDATA"
const positioning = "REMOVECOPYRIGHTEDDATA"
const kernel01 = "REMOVECOPYRIGHTEDDATA"
const kernel13 = "REMOVECOPYRIGHTEDDATA"
const kernel15 = "REMOVECOPYRIGHTEDDATA"
const kernel22 = "REMOVECOPYRIGHTEDDATA"
const bowling = "REMOVECOPYRIGHTEDDATA"
const hmove = "REMOVECOPYRIGHTEDDATA"
const timing2 = "REMOVECOPYRIGHTEDDATA"
const piatimer = "REMOVECOPYRIGHTEDDATA"
const bitmap = "REMOVECOPYRIGHTEDDATA"
const complexscene1 = "REMOVECOPYRIGHTEDDATA"
const sethorizpos = "REMOVECOPYRIGHTEDDATA"
const demo3_8 = "REMOVECOPYRIGHTEDDATA"
// https://raw.githubusercontent.com/nanochess/book-Atari/3195f4b71990ec0faac1c4a1f56333b37875b58a/demo3_2.asm
const hello = "REMOVECOPYRIGHTEDDATA"
const frogger = "REMOVECOPYRIGHTEDDATA"
const diag = "REMOVECOPYRIGHTEDDATA"
const logo = "REMOVECOPYRIGHTEDDATA"
const combat = "REMOVECOPYRIGHTEDDATA"
const pongsports = "REMOVECOPYRIGHTEDDATA"
const tictactoe3d = "REMOVECOPYRIGHTEDDATA"
const tennis = "REMOVECOPYRIGHTEDDATA"
const superbreakout = "REMOVECOPYRIGHTEDDATA";

export const romAsMem = (input) => {
  // Mirror memory for small cartridges
  const r = input.length === 2_048 ? input.concat(input) : input;

  let b = 0;

  const rom = new Uint8Array(0x20000); // 0x10000, bc 0x0000 - 0xFFFF

  for (const [i, b0] of r.entries()) {
    rom[0x1000 + i] = b0;
    rom[0x3000 + i] = b0; // Prly do something smarter in reading
    rom[0x5000 + i] = b0; // Prly do something smarter in reading
    rom[0x7000 + i] = b0; // Prly do something smarter in reading
    rom[0x9000 + i] = b0; // Prly do something smarter in reading
    rom[0xb000 + i] = b0; // Prly do something smarter in reading
    rom[0xd000 + i] = b0; // Prly do something smarter in reading
    rom[0xf000 + i] = b0; // Prly do something smarter in reading
  }

  return (addr) => {
    if (r.length > 0x1000) { // Bank switching
      if (addr === 0x1ff8) { b = 0; return 0; }
      if (addr === 0x1ff9) { b = 1; return 1; }
    }

    return rom[addr + (0x1000 * b)];
  }
}

export const loadFromBase64 = (input) => atob(input).split("").map(c => c.charCodeAt(0));

export const listRoms = () => [
  ["All Sprites",          allsprites],
  ["Big Sprite",           bigsprite],
  ["Bitmap",               bitmap],
  ["Bowling",              bowling],
  ["Combat",               combat],
  ["Complex Scene 1",      complexscene1],
  ["Demo 3.8",             demo3_8],
  ["Diag",                 diag],
  ["Frogger",              frogger],
  ["Hello",                hello],
  ["HMOVE",                hmove],
  ["Kernel 0.1",           kernel01],
  ["Kernel 1.3",           kernel13],
  ["Kernel 1.5",           kernel15],
  ["Kernel 2.2",           kernel22],
  ["Logo",                 logo],
  ["Moon Patrol",          moonpatrol],
  ["Pia Timer",            piatimer],
  ["Pong Sports",          pongsports],
  ["Positioning",          positioning],
  ["Retrigger",            retrigger],
  ["Retrigger - no inmem", noinmemretrigger],
  ["Set Horiz Pos",        sethorizpos],
  ["Super Breakout",       superbreakout],
  ["Tennis",               tennis],
  ["Tic Tac Toe 3D",       tictactoe3d],
  ["Timing 2",             timing2],
];

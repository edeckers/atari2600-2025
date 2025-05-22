noinmemretrigger = "REMOVECOPYRIGHTEDDATA"
retrigger = "REMOVECOPYRIGHTEDDATA"
complexscene2 = "REMOVECOPYRIGHTEDDATA"
bigsprite = "REMOVECOPYRIGHTEDDATA"
allsprites = "REMOVECOPYRIGHTEDDATA"
moonpatrol = "REMOVECOPYRIGHTEDDATA"
positioning = "REMOVECOPYRIGHTEDDATA"
kernel01 = "REMOVECOPYRIGHTEDDATA"
kernel13 = "REMOVECOPYRIGHTEDDATA"
kernel15 = "REMOVECOPYRIGHTEDDATA"
kernel22 = "REMOVECOPYRIGHTEDDATA"
galaxian = "REMOVECOPYRIGHTEDDATA"
spaceinvaders = "REMOVECOPYRIGHTEDDATA"
bowling = "REMOVECOPYRIGHTEDDATA"
hmove = "REMOVECOPYRIGHTEDDATA"
timing2 = "REMOVECOPYRIGHTEDDATA"
piatimer = "REMOVECOPYRIGHTEDDATA"
bitmap = "REMOVECOPYRIGHTEDDATA"
complexscene1 = "REMOVECOPYRIGHTEDDATA"
sethorizpos = "REMOVECOPYRIGHTEDDATA"
demo3_8 = "REMOVECOPYRIGHTEDDATA"
// https://raw.githubusercontent.com/nanochess/book-Atari/3195f4b71990ec0faac1c4a1f56333b37875b58a/demo3_2.asm
hello = "REMOVECOPYRIGHTEDDATA"
frogger = "REMOVECOPYRIGHTEDDATA"
diag = "REMOVECOPYRIGHTEDDATA"
logo = "REMOVECOPYRIGHTEDDATA"
combat = "REMOVECOPYRIGHTEDDATA"
pongsports = "REMOVECOPYRIGHTEDDATA"
tictactoe3d = "REMOVECOPYRIGHTEDDATA"
tennis = "REMOVECOPYRIGHTEDDATA"
superbreakout = "REMOVECOPYRIGHTEDDATA";

const printAsm = true;

const operators = {
  "ADC #nn": [0x69, 1],
  "ADC nn": [0x65, 1],
  "ADC nn, X": [0x75, 1],
  "ADC nnnn, Y": [0x79, 2],
  "ADC nnnn, X": [0x7d, 2],
  "AND #nn": [0x29, 1],
  "AND nn": [0x25, 1],
  "AND nn, X": [0x35, 1],
  "AND nnnn, X": [0x3d, 2],
  "AND nnnn, Y": [0x39, 2],
  "ASL A": [0x0a, 0],
  "ASL nn": [0x06, 1],
  "BCC dd": [0x90, 1],
  "BCS dd": [0xb0, 1],
  "BEQ dd": [0xf0, 1],
  "BIT nn": [0x24, 1],
  "BIT nnnn": [0x2c, 2],
  "BMI dd": [0x30, 1],
  "BNE dd": [0xd0, 1],
  "BPL dd": [0x10, 1],
  "BVC dd": [0x50, 1],
  "BVS dd": [0x70, 1],
  "BRK": [0x00, 1], // Dummy byte https://github.com/spacerace/6502/blob/master/doc/6502-asm-doc/the%20B%20flag%20and%20BRK%20instruction.txt
  "CLC": [0x18, 0],
  "CLD": [0xd8, 0],
  "CMP nn": [0xc5, 1],
  "CMP #nn": [0xc9, 1],
  "CPX #nn": [0xe0, 1],
  "CPX nn": [0xe4, 1],
  "CPY #nn": [0xc0, 1],
  "CPY nn": [0xc4, 1],
  "DEC nn": [0xc6, 1],
  "DEC nn, X": [0xd6, 1],
  "DEX": [0xca, 0],
  "CMP nn, X": [0xd5, 1],
  "DEY": [0x88, 0],
  "EOR nn": [0x45, 1],
  "EOR #nn": [0x49, 1],
  "INC nn": [0xe6, 1],
  "INC nn, X": [0xf6, 1],
  "INX": [0xe8, 0],
  "INY": [0xc8, 0],
  "ISC nn": [0xe7, 1], // Illegal
  "JMP nnnn": [0x4c, 2],
  "JMP (nnnn)": [0x6c, 2],
  "JSR nnnn": [0x20, 2],
  "LDA (nn), X": [0xa1, 1],
  "LAX nn": [0xa7, 1],
  "LDA #nn": [0xa9, 1],
  "LDA (nn), Y": [0xb1, 1],
  "LDA nn": [0xa5, 1],
  "LDA nn, X": [0xb5, 1],
  "LDA nnnn": [0xad, 2],
  "LDA nnnn, X": [0xbd, 2],
  "LDA nnnn, Y": [0xb9, 2],
  "LDY #nn": [0xa0, 1],
  "LDY nn, X": [0xb4, 1],
  "LDY nn": [0xa4, 1],
  "LDY nnnn": [0xac, 2],
  "LDX #nn": [0xa2, 1],
  "LDX nn": [0xa6, 1],
  "LDX nn, Y": [0xb6, 1],
  "LDX nnnn": [0xae, 2],
  "LDX nnnn, Y": [0xbe, 2],
  "LSR A": [0x4a, 0],
  "LSR nn": [0x46, 1],
  "LSR nnnn": [0x4e, 2],
  "NOP": [0xea, 0],
  "ORA #nn": [0x09, 1],
  "ORA (nn, X)": [0x01, 1],
  "ORA nn": [0x05, 1],
  "ORA nn, X": [0x15, 1],
  "ORA nnnn": [0x0d, 2],
  "ORA nnnn, X": [0x1d, 2],
  "PHA": [0x48, 0],
  "PHP": [0x08, 0],
  "PLA": [0x68, 0],
  "ROL A": [0x2a, 0],
  "ROR A": [0x6a, 0],
  "RTI": [0x40, 0],
  "RTS": [0x60, 0],
  "SBC #nn": [0xe9, 1],
  "SBC (nn, X)": [0xe1, 1],
  "SBC nn": [0xe5, 1],
  "SEC": [0x38, 0],
  "SED": [0xf8, 0],
  "SEI": [0x78, 0],
  "STA nn": [0x85, 1],
  "STA nn, X": [0x95, 1],
  "STA nnnn": [0x8d, 2],
  "STA nnnn, Y": [0x99, 2],
  "STX nn": [0x86, 1],
  "STX nn, Y": [0x96, 1],
  "STX nnnn": [0x8e, 2],
  "STY nn": [0x84, 1],
  "STY nn, X": [0x94, 1],
  "STY nnnn": [0x8c, 2],
  "TAX": [0xaa, 0],
  "TAY": [0xa8, 0],
  "TSX": [0xba, 0],
  "TXA": [0x8a, 0],
  "TXS": [0x9a, 0],
  "TYA": [0x98, 0],
};

const operatorLookup = Object.fromEntries(Object.entries(operators).map(([k, v]) => [v[0], [k, v[1]]]));

const branches = new Set([
  0x90,
  0xb0,
  0xf0,
  0x30,
  0x50,
  0xd0,
  0x10,
  // 0x20, // JSR
]);

const jumps = new Set([
  0x4c, // JMP
]);

const stops = new Set([
 0x60, // RTS
]);

const code = (v)  => v.toString(16).padStart(2, "0");

const offs = (a) => a - 0xf000;

const romread = (input, a, bc) => {
  const zs = [];

  for (var b=0; b<bc; b++) {
    // zs.push(input[offs(a + b)]);
    zs.push(input[a + b]);
  }

  zs.reverse();

  return zs.reduce((p, c) => (p << 8) + c, 0);
}

const ep = (input) => (romread(input, 0xfffc, 2) & 0xffff) | 0xf000;

const scan = (input) => {
  const entrypoint = ep(input);
  console.log("EP", entrypoint);

  const reachable = new Set([]);

  const follow = (ix, pc) => {
    while (pc <= 0xffff) {
      if (reachable.has(pc)) {
        return;
      }

      const operator = romread(ix, pc, 1);

      if (operator === undefined) {
	console.log("Unknown", pc.toString(16));
	return;
      } else if (!(operator in operatorLookup)) {
	console.log(pc.toString(16));
	console.log("Unknown", "o", operator, "pc", pc.toString(16));
	return;
      }

      reachable.add(pc);

      const [_, l] = operatorLookup[operator];
      const next = pc + l + 1

      if (jumps.has(operator)) {
	const target = romread(ix, pc + 1, l);

        follow(ix, target);
        break;
      } else if (branches.has(operator)) {
	const target = (pc + tcd(romread(ix, pc + 1, 1)) + 2) & 0xffff;
	
        follow(ix, target);
      } else if (operator === 0x00) { // BRK
	const target = romread(ix, 0xfffe, 2);

	follow(ix, target);
      } else if (operator === 0x20) {
	const target = romread(ix, pc + 1, l)

        follow(ix, target);
      } else if (stops.has(operator)) {
	return;
      }

      pc = next;
    }
  }

  follow(input, entrypoint);

  return reachable;
}


function toASM(input, addr) {
  const pc = addr
  const operator = input[pc]

  if (!(operator in operatorLookup)) {
    return [[operator], "Unkown"]
  }

  const [name, operandCount] = operatorLookup[parseInt(operator, 10)];

  const operandBytes = [];
  for (i = 0; i < operandCount; i++) {
    operandBytes.push(input[pc + i + 1]);
  }

  return [[operator].concat(operandBytes), name];
}

const romAsMem = (rom) => {
  const mem = new Uint8Array(0x10000); // 0x10000, bc 0x0000 - 0xFFFF

  for (const [i, b] of rom.entries()) {
    mem[0x1000 + i] = b;
    mem[0x3000 + i] = b; // Prly do something smarter in reading
    mem[0x5000 + i] = b; // Prly do something smarter in reading
    mem[0x7000 + i] = b; // Prly do something smarter in reading
    mem[0x9000 + i] = b; // Prly do something smarter in reading
    mem[0xb000 + i] = b; // Prly do something smarter in reading
    mem[0xd000 + i] = b; // Prly do something smarter in reading
    mem[0xf000 + i] = b; // Prly do something smarter in reading
  }

  return mem;
}

const decode = (input) => {
  // Mirror memory for small cartridges
  const rom = romAsMem(input.length === 4_096 ? input : input.concat(input));

  const reachable = scan(rom);

  const lines = [];
  var data = [];

  const printData = (pc) => {
      return [
	".data",
	[(pc - data.length).toString(16), "...", pc.toString(16)].join(""),
	data.map(c => c.toString(16).padStart(2, "0"))
      ]
  }

  let pc = ep(rom)

  while (pc <= 0xffff) {
    if (!(reachable.has(pc))) {
       data.push(romread(rom, pc, 1));
       pc++;
       continue;
    }

    if (data.length > 0) {
      lines.push(printData(pc));
      data = [];
    }

    const operator = romread(rom, pc, 1);
    const [_, l] = operatorLookup[operator];

    const comment = branches.has(operator) ? `       ; ${(pc + 2 + tcd(romread(rom, pc + 1, 1))).toString(16)}` : "";

    lines.push([
      pc.toString(16),
      formatASM(toASM(rom, pc)) + comment]);

    pc += l + 1;
  }

  lines.push(printData(0xffff));

  return lines;
}

function loadFromBase64(input) {
  const romInBytes = atob(input).split("").map(c => c.charCodeAt(0));

  if (printHex) {
    console.log(formatHex(romInBytes.map(b => b.toString(16))));
  }

  const lines = decode(romInBytes);

  if (printAsm) {
    console.log (lines.join("\n"));
  }

  return romInBytes;
}

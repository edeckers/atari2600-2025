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
  "AND #nn": [0x29, 1],
  "AND nn": [0x25, 1],
  "ASL A": [0x0a, 0],
  "BCC dd": [0x90, 1],
  "BCS dd": [0xb0, 1],
  "BEQ dd": [0xf0, 1],
  "BMI dd": [0x30, 1],
  "BNE dd": [0xd0, 1],
  "BPL dd": [0x10, 1],
  "BRK": [0x00, 0],
  "CLC": [0x18, 0],
  "CLD": [0xd8, 0],
  "CMP nn": [0xc5, 1],
  "CMP #nn": [0xc9, 1],
  "CPX #nn": [0xe0, 1],
  "CPY #nn": [0xc0, 1],
  "CPY nn": [0xc4, 1],
  "DEC nn": [0xc6, 1],
  "DEX": [0xca, 0],
  "DEY": [0x88, 0],
  "EOR nn": [0x49, 1],
  "INC nn": [0xe6, 1],
  "INC nn, X": [0xf6, 1],
  "INX": [0xe8, 0],
  "INY": [0xc8, 0],
  "JMP nnnn": [0x4c, 2],
  "JSR nnnn": [0x20, 2],
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
  "LSR A": [0x4a, 0],
  "ORA (nn, X)": [0x01, 1],
  "ORA nn": [0x05, 1],
  "ORA nnnn, X": [0x1d, 2],
  "PHP": [0x08, 0],
  "ROL A": [0x2a, 0],
  "ROR A": [0x6a, 0],
  "RTS": [0x60, 0],
  "SBC #nn": [0xe9, 1],
  "SBC (nn, X)": [0xe1, 1],
  "SEC": [0x38, 0],
  "SED": [0xf8, 0],
  "SEI": [0x78, 0],
  "STA nn": [0x85, 1],
  "STA nn, X": [0x95, 1],
  "STA nnnn": [0x8d, 2],
  "STA nnnn, Y": [0x99, 2],
  "STX nn": [0x86, 1],
  "STY nn": [0x84, 1],
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
  0xd0,
  0x10,
  0x20, // JSR
]);

const jumps = new Set([
  0x00, // BRK
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
    zs.push(input[offs(a + b)]);
  }

  zs.reverse();

  return zs.reduce((p, c) => (p << 8) + c, 0);
}

function scan(input) {
  const entrypoint = romread(input, 0xfffc, 2)

  const reachable = new Set([]);

  const follow = (ix, pc) => {
    while (pc <= 0xffff) {
      if (reachable.has(pc)) {
        return;
      }

      reachable.add(pc);
      

      const operator = romread(ix, pc, 1);
      const [_, l] = operatorLookup[operator];
      const next = pc + l + 1

      if (jumps.has(operator)) {
	// console.log("JMP");
	const target = romread(ix, pc + 1, l);
        follow(ix, target);
        break;
      } else if (branches.has(operator)) {
	const relative = next + romread(ix, pc + 1, l)

	const target = pc + relative;

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


function formatHex(input, columns = 10) {
  const operations = [];

  for (i = 0; i < input.length; i += columns) {
    operations.push(input.slice(i, i + columns).map(v => v.padStart(2, "0")).join(" "));
  }

  return operations.join("\n");
}

function formatASM(line) {
  const [ops, name] = line;

  const codeAsHex = ops.map(c => c.toString(16).padStart(2, "0"));

  const operand = ops.slice(1);

  return [
    codeAsHex.join(" ").padEnd(8, " "),
    name
	  .replace("nnnn", "nn")
	  .replace("dd", "nn")
	  .replace("nn", operand.reverse().map(o => o.toString(16).padStart(2, "0")).join(""))
  ].join(" ");
}

function toASM(input, addr) {
  const pc = offs(addr)
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


const decode = (input) => {
  const reachable = scan(input);

  const lines = [];
  var data = [];

  const printData = (pc) => {
      return [
	".data",
	[(pc - data.length).toString(16), "...", pc.toString(16)].join(""),
	data.map(c => c.toString(16).padStart(2, "0")).join(" ")
      ].join(" ")
  }

  let pc = 0xf000;
  while (pc <= 0xffff) {
    if (!(reachable.has(pc))) {
       data.push(romread(input, pc, 1));
       pc++;
       continue;
    }

    if (data.length > 0) {
      lines.push(printData(pc));
      data = [];
    }

    const operator = romread(input, pc, 1);
    const [_, l] = operatorLookup[operator];

    lines.push([
      pc.toString(16),
      formatASM(toASM(input, pc))].join(" "));

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

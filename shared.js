const printHex = true;
const printAsm = true;
const printState = false;

const logLevel = 1;

const error = (data) => { logLevel <= 3 && console.error(data); }
const warn = (data) => { logLevel <= 2 && console.warn(data); }
// const info = (data) => { logLevel <= 1 && console.info(data); }
const dbg = (data) => { logLevel === 0 && console.debug(data); }

 // (v & 0x80) ? ((~v & 0x7f) + 1) & 0xff : v & 0xff;
const tcd = (v) => {
 // has MSB = 0 -> return as is
 // has MSB = 1 -> return 2s complement -> 0x80 = -128, 0x81 = -127, 0x82 = -126, etc.
 // return  (v & 0x80) ? -(0x80 - (v & 0x7f)) : v & 0xff;
 return (v & 0x80) ? -(((~v & 0x7f) + 1) & 0xff) : v & 0xff;
}

const tcd4 = (v) => {
 // has MSB = 0 -> return as is
 // has MSB = 1 -> return 2s complement -> 0x80 = -128, 0x81 = -127, 0x82 = -126, etc.
 // return  (v & 0x80) ? -(0x80 - (v & 0x7f)) : v & 0xff;
 return (v & 0x08) ? -(((~v & 0x07) + 1) & 0x0f) : v & 0x0f;
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
const fl = (v) => v ? 1 : 0;
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



const formatPc = (pc) => pc.toString(16).padStart(4, "0");

const breakpoints = new Set();
let isContinue = false;
let isStep = false;
let isBreakout = false;

// helpers

PF = 0;
RP0 = -1;
RP1 = -1;

GRP = 0;
ENABL_DELAYED = 0;
GRP0_DELAYED = 0;
GRP1_DELAYED = 0;

isRESP0 = false;
isRESP1 = false;
isRESM0 = false;
isRESM1 = false;
isRESBL = false;

isRESMP0 = false;
isRESMP1 = false;

isHMOVE = false;
isHMCLR = false;

let bpConditional = {
  x: { lower: undefined, upper: undefined },
  y: { lower: undefined, upper: undefined },
}

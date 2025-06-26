export const logLevel = 1;

export const error = (data) => { logLevel <= 3 && console.error(data); }
export const warn = (data) => { logLevel <= 2 && console.warn(data); }
// const info = (data) => { logLevel <= 1 && console.info(data); }
export const dbg = (data) => { logLevel === 0 && console.debug(data); }

 // (v & 0x80) ? ((~v & 0x7f) + 1) & 0xff : v & 0xff;
export const tcd = (v) => {
 // has MSB = 0 -> return as is
 // has MSB = 1 -> return 2s complement -> 0x80 = -128, 0x81 = -127, 0x82 = -126, etc.
 // return  (v & 0x80) ? -(0x80 - (v & 0x7f)) : v & 0xff;
 return (v & 0x80) ? -(((~v & 0x7f) + 1) & 0xff) : v & 0xff;
}

export const tcd4 = (v) => {
 // has MSB = 0 -> return as is
 // has MSB = 1 -> return 2s complement -> 0x80 = -128, 0x81 = -127, 0x82 = -126, etc.
 // return  (v & 0x80) ? -(0x80 - (v & 0x7f)) : v & 0xff;
 return (v & 0x08) ? -(((~v & 0x07) + 1) & 0x0f) : v & 0x0f;
}

export const mod = (n, m) => (n % m + m) % m;

export const pin = (v) => { let rdy = v; return [() => rdy, (a) => rdy = a]; };

export const formatASM = (line) => {
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

export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const rev8 = (xs) => {
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
export const flip8 = (xs) => ~xs & 0xff;

export const fl = (v) => v ? 1 : 0;
export const word = (read, addr) => {
  const l = read(addr) & 0xff;
  const h = read(addr + 1) & 0xff;

  return ((h << 8) + l) & 0xffff;
}

export const b2d = (b) => {
 const h = (b & 0xf0) >> 4;
 const l = (b & 0x0f);

 return (h * 10) + l;
}

export const d2b = (d) => {
 const h = (Math.floor(d / 10)) & 0xf;
 const l = (d % 10) & 0xf;

 return ((h << 4) + l) & 0xff;
}

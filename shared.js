const printHex = true;
const printAsm = true;
const printState = false;

const logLevel = 1;

const error = (data) => { logLevel <= 3 && console.error(data); }
const warn = (data) => { logLevel <= 2 && console.warn(data); }
const info = (data) => { logLevel <= 1 && console.info(data); }
const dbg = (data) => { logLevel === 0 && console.debug(data); }



const [W, H] = [160, 192];

const vb = 228 * (3 + 37);
const hb = 68;

const COLUBK = 0x09;
WSYNC = 0x02;
VBLANK = 0x01;

const arrayBuffer = new ArrayBuffer(4 * W * H);
let screen = new Uint8ClampedArray(arrayBuffer);



function clearScreen() {
 screen = new Uint8ClampedArray(arrayBuffer);
}

function updateScreen(read, tt) {
 const invb = tt <= vb;
 const inover = tt > (228 * (262 - 30));
 const inhblank = ((tt % 228) <= hb);
 
 const inScreen = !invb && !inover && !inhblank;

 if (!inScreen) { return; }


 const d = tt - vb;
 const y = Math.floor(d / 228);
 const x = (d % 228) - hb;

// if (x > 160) { console.error("X>160", x); debugger; }
// if (x < 0) { console.error("X<0", x); debugger; }
// if (y > 192) { console.error("Y>192", y);  debugger;}
// if (y > 0) { console.error("Y<0", y);  debugger;}

 const p = (y * 160) + x;

 const o = p * 4;

 const v = read(VBLANK) !== 0 ? 0x00 : read(COLUBK);

 const [r, g, b] = colors[v - (v % 2)] ?? [0x00, 0x00, 0x00];

 screen[o + 0] = r;
 screen[o + 1] = g;
 screen[o + 2] = b;
 screen[o + 3] = 0xff;
}

function drawer() {
  const canvas = document.getElementById("tehScreen");
  const ctx = canvas.getContext("2d");
  
  const draw = () => {
	  ctx.putImageData(new ImageData(screen, W, H), 0, 0);
	  document.dispatchEvent(new Event("draw")); }

  return draw;
}

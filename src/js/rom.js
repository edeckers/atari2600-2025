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

export const listRoms = () =>
  Object.keys(localStorage)
    .filter((k) => k.startsWith("rom:"))
    .map((k) => {
      const { name, data } = JSON.parse(localStorage.getItem(k));

      return [name, data];
    })
    .sort((a, b) => a[0].localeCompare(b[0]));

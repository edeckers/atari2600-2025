import { listRoms, loadFromBase64 } from "../rom";

export const romSelector = () => {
  let roms = Object.fromEntries(listRoms());
  
  let romName = Object.keys(roms)[0]; // default to first rom
  
  const changeRom = (rn) => {
    romName = rn
    document.dispatchEvent(new Event("chrom"));
  }

  const readRom = () => {
    if (!roms || !roms[romName]) {
      console.warn("No ROM selected or ROM not found in storage.");
      const blueScreenRom = new Array(2_048).fill(0);

      blueScreenRom[2_048 - 4] = 0x00;
      blueScreenRom[2_048 - 3] = 0xf0;
      blueScreenRom[2_048 - 2] = 0x00;
      blueScreenRom[2_048 - 1] = 0xf0;

      const blueScreen = [
	      0x78,       // SEI
	      0xd8,       // CLD
	      0xa2, 0xff, // LDX #$ff
	      0x9a,       // TXS

	      0xa9, 0x02, // LDA #$02
	      0x85, 0x00, // STA VSYNC
	      0xa9, 0x00, // LDA #$02
	      0x85, 0x00, // STA VSYNC

	      0xa2, 0xff, // LDX #$ff
// loop:
	      0xa9, 0x02, // LDA #$02
	      0x85, 0x02, // STA WSYNC
	      0xca,       // DEX
	      0xd0, 0xf9, // BNE loop
	     

	      0xa9, 0x70, // LDA #$70
	      0x85, 0x09, // STA COLUBK

	      0x4c, 0x00, 0xf0 // JMP $f000
      ];

      for (let i = 0; i < blueScreen.length; i++) { blueScreenRom[i] = blueScreen[i]; }
	
      return blueScreenRom;
    }

    const rom = roms[romName];

    return loadFromBase64(rom);
  }
 
  const updateRomSelector = () => {
    const $rs = document.getElementById("romSelector");
    $rs.innerHTML = "";
  
    for (const [name, _] of Object.entries(roms)) {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
  
      if (name === romName) {
        option.selected = true;
      }
  
      $rs.appendChild(option);
    }

    document.dispatchEvent(
	    new CustomEvent("rom.selector.updated", { detail: { numberOfRoms: Object.keys(roms).length } }));
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.addEventListener("rom.uploaded", () => {
      roms = Object.fromEntries(listRoms());

      updateRomSelector();

      if (Object.entries(roms).length === 1) { changeRom(Object.keys(roms)[0]); }
    });
  });

  return {
    changeRom,
    updateRomSelector,
    readRom
  }
}

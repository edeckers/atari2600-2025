import { listRoms, loadFromBase64 } from "../rom";

export const romSelector = () => {
  let roms = Object.fromEntries(listRoms());
  
  let romName = Object.keys(roms)[0]; // default to first rom
  
  const changeRom = (rn) => {
    romName = rn
    document.dispatchEvent(new Event("chrom"));
  }

  const readRom = () => {
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
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.addEventListener("rom.uploaded", () => {
      roms = Object.fromEntries(listRoms());

      updateRomSelector();
    });
  });

  return {
    changeRom,
    updateRomSelector,
    readRom
  }
}

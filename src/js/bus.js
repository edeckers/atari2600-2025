export const bus = (riotRead, riotWrite, romRead, tiaRead, tiaWrite) => {
  const nrml = (addr, r) => {
    if (addr & 0x1000) { // ROM
      return addr & 0x1fff;
    } else if ((addr & 0x1080) === 0x00) { // TIA
      const _a = addr & 0x3f;

      // FIXME This is probably not correct:
      //       TIA has read and write addresses, some of them
      //       which overlap, such as 0c (REFP1) and 0c (INPT4).
      //       Only the action differs. We move reads to 0xyz
      //       to mirror 0x3z
      return r ? (_a | 0x30) : _a;
    } else if ((addr & 0x1280) === 0x80) { // RAM
      // console.log("PIA", addr.toString(16));
      return addr & 0xff;
    } else if ((addr & 0x1280) === 0x280) { // IO
      // console.log("IO", addr.toString(16));
      return addr;
    }

    return addr;
  }

  const read = (addr) => {
    const naddr = nrml(addr, true);

    if (addr & 0x1000) { // ROM
	return romRead(naddr);
    } else if ((addr & 0x1080) === 0x0000) { // TIA
	return tiaRead(naddr);
    } else if ((addr & 0x1280) === 0x0080) { // RAM
	return riotRead(naddr);
    } else if ((addr & 0x1280) === 0x0280) { // IO
	return riotRead(naddr);
    }

    throw new Error(`Unknown address: ${addr.toString(16)}`);
  }


  const write = (addr, v) => {
    const naddr = nrml(addr);

    if (addr & 0x1000) { // ROM
	/* noop */
	return; // TODO Somehow Moon Patrol needs this, find out why
    } else if ((addr & 0x1080) === 0x0000) { // TIA
	return tiaWrite(naddr, v);
    } else if ((addr & 0x1280) === 0x0080) { // RAM
	return riotWrite(naddr, v);
    } else if ((addr & 0x1280) === 0x0280) { // IO
	return riotWrite(naddr, v);
    }

    throw new Error(`Unknown address: ${addr.toString(16)}`);
  }

  return [read, write];
}


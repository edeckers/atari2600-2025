# Atari 2600 Emulator

[![License: MPL 2.0](https://img.shields.io/badge/License-MPL%202.0-brightgreen.svg)](https://opensource.org/licenses/MPL-2.0)
[![Build](https://github.com/edeckers/atari2600-2025/actions/workflows/deploy.yml/badge.svg?branch=develop)](https://github.com/edeckers/atari2600-2025/actions/workflows/deploy.yml)

My first interaction with a computer was way back in the 80s on an [Atari 2600](https://en.wikipedia.org/wiki/Atari_2600), so when I decided to write an emulator in JavaScript, it seemed only natural to start with this magnificent piece of hardware.

That's how I learned the hard way that it's a _terrible idea_ to start with the Atari 2600 if you just want to learn about emulation, because a lot of effort will go into getting timing, and interpeting documentation _just right_, which - to me - is not particularly fun or useful.

So if you're thinking of dabbling with emulation, [I recommend you consider CHIP-8 instead](https://en.wikipedia.org/wiki/CHIP-8), since it is way more concise and straightforward.

## Rationale

This emulator is a pet project that I wrote to gain a deeper understanding of how emulators work, not to compete with the already existing and excellent implementations out there, such as [Stella](https://stella-emu.github.io/) and [Javatari](https://javatari.org/).

I don't plan on ironing out the many bugs, although I will probably circle back to the project every once and again to fix a thing or two when I feel the urge.

## Blogpost

You can [read more about the journey of writing this emulator here](https://medium.com/@edeckers/recreating-my-first-computer-an-atari-2600-emulator-7b72279a4afd)

## Requirements

- A modern browser that supports JavaScript - Chrome and Firefox have been tested

## Demo

You can [try out the emulator here](https://atari2600.lgtm.it).

## Acknowledgements

Couldn't have done it without the help of the following resources:

- [Atari 2600 Specifications](https://problemkaputt.de/2k6specs.htm)
- [6502 Family CPU Reference](https://www.pagetable.com/c64ref/6502/)
- [6502 "Illegal" Opcodes Demystified](https://www.masswerk.at/nowgobang/2021/6502-illegal-opcodes)
- [8-Bit Workshop IDE](https://8bitworkshop.com/v3.12.0/)
- [2600 Programming For Newbies](https://forums.atariage.com/topic/33233-sorted-table-of-contents/)

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## Code of Conduct

[Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## License

MPL-2.0

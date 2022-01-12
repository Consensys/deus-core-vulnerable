# DEUS core smart contracts  [![license: LGPL3.0](https://img.shields.io/badge/license-LGPL3.0-yellow.svg)](https://opensource.org/licenses/lgpl-3.0) [![npm version](https://img.shields.io/npm/v/@uniswap/v3-core/latest.svg)](https://www.npmjs.com/package/@uniswap/v3-core/v/latest) 

<p align="center">
  <img width="200" height="200" src="https://app.deus.finance/tokens/deus.svg">
  <img width="200" height="200" src="https://app.deus.finance/tokens/dei.svg">
</p>

DEUS Finance Evolution is a marketplace of decentralized financial services. We provide the infrastructure for others to build financial instruments, such as synthetic stock trading platforms, options and futures trading, and more.

### Pre Requisites

You will need the following software on your machine:

- [Git](https://git-scm.com/downloads)
- [Node.Js](https://nodejs.org/en/download/)

In addition, familiarity with [Solidity](https://soliditylang.org/) and [Hardhat](https://hardhat.org) is requisite.

### Set Up

Install the dependencies:

```bash
$ npm install
```

Create a `.env` file and follow the `sample.env` file to add the requisite environment variables, then run the:

```bash
$ npx hardhat compile
```

Now you can start making changes.

## Contributing

Feel free to dive in! [Open](https://github.com/deusfinance/deus-core/issues/new) an issue,
[start](https://github.com/deusfinance/deus-core/discussions/new) a discussion or submit a PR. For any concerns or
feedback, join us on [Discord](https://discord.gg/NWfzTqeV).

## Security

For security concerns, please email [admin@deus.finance](mailto:admin@deus.finance).

## Licensing

The primary license is the [LGPL v3](./LICENSE.md) © Mainframe Group Inc.

### Exceptions

- `contracts/Staking` is licensed under `MIT` (as indicated in its SPDX header), see [`MIT`](./LICENSE_MIT)

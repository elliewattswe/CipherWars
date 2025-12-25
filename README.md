# CipherWars

CipherWars is an encrypted city-building strategy game built on the FHEVM protocol. Players receive encrypted gold,
choose a building type privately, and see only their own decrypted results. The contract enforces costs and balances
without ever exposing the underlying values on-chain.

## Overview

CipherWars is a compact, privacy-first on-chain game. It uses Fully Homomorphic Encryption (FHE) to keep player
balances and building choices confidential while preserving deterministic gameplay rules. The result is a simple
economy that is auditable yet strategically opaque.

## Game Rules

- Each player joins once and receives 10,000 encrypted gold.
- Players choose one of four building types, submitted as encrypted input.
- Building costs (in gold): type 1 = 100, type 2 = 200, type 3 = 400, type 4 = 1,000.
- The contract computes the cost and balance changes over encrypted values only.
- Building type is stored encrypted and can be decrypted by the player.
- If the encrypted input is invalid, the system defaults to the most expensive cost.

## Problems Solved

- Protects player strategy by hiding building choices on-chain.
- Keeps in-game balances private while still enforcing spending rules.
- Removes information leakage that typically fuels copycat strategies and price manipulation.
- Enables verifiable gameplay without centralized servers or trusted intermediaries.

## Advantages

- Privacy by default: no plaintext balances or choices are stored on-chain.
- Deterministic economics: fixed costs and deterministic selection logic, even with encrypted inputs.
- Player-controlled visibility: only the player can decrypt their data.
- Minimal trust: all core rules live in the contract and are enforced by FHE.
- Simple integration: a small surface area with clear tasks for join, build, and decrypt.

## Tech Stack

- Smart contracts: Solidity 0.8.27 with Zama FHEVM libraries
- Contract framework: Hardhat with hardhat-deploy and @fhevm/hardhat-plugin
- Frontend: React + Vite
- Wallet and chain: RainbowKit + wagmi
- Reads: viem
- Writes: ethers v6
- Encrypted client flows: @zama-fhe/relayer-sdk

## Architecture

- `contracts/`: core game logic, encrypted balance and building state
- `deploy/`: deployment scripts for local node and Sepolia
- `tasks/`: CLI helpers for join, build, and decryption
- `test/`: unit and network tests (local and Sepolia)
- `deployments/`: network artifacts and ABI outputs
- `src/`: React frontend application (kept separate from root)

## Smart Contract Details

Contract: `CipherWars`

Key functions:
- `joinGame()`: mints 10,000 encrypted gold for the caller.
- `constructBuilding(externalEuint32, bytes)`: submits an encrypted building type and updates state.
- `getBalance(address)`: returns the encrypted balance for a player address.
- `getBuilding(address)`: returns the encrypted building type for a player address.
- `hasJoined(address)`: returns whether the player has joined.

Events:
- `GameJoined(address player)`
- `BuildingConstructed(address player, euint32 buildingType, euint64 cost, euint64 remainingBalance)`

Encryption and access control:
- Balances and buildings are stored as encrypted values (`euint64`, `euint32`).
- The contract allows access to itself and the player so the player can decrypt.
- View functions accept an explicit player address and never depend on `msg.sender`.

## Frontend Details

- The frontend targets Sepolia and avoids localhost networks.
- Reads use viem; writes use ethers to match encryption input flows.
- Encryption and decryption are handled via the Zama relayer SDK.
- Contract ABI and address are defined in `src/src/config/contracts.ts`.

## ABI and Frontend Sync

The frontend ABI must match the deployed contract ABI. After deploying to Sepolia:
- Copy the ABI from `deployments/sepolia` into `src/src/config/contracts.ts`.
- Update the contract address in the same file.

## Developer Workflow

### Prerequisites

- Node.js 20+
- npm

### Install

```bash
npm install
```

### Compile and Test (Local)

```bash
npm run compile
npm run test
```

### Run a Local Node and Deploy

Start a local node (Hardhat or Anvil) on `127.0.0.1:8545`, then deploy:

```bash
npx hardhat deploy --network anvil
```

### Deploy to Sepolia

The Hardhat config reads `PRIVATE_KEY`, `INFURA_API_KEY`, and `ETHERSCAN_API_KEY` from `.env`. The deployer uses
`PRIVATE_KEY` and Infura for Sepolia access.

```bash
npx hardhat deploy --network sepolia
```

### Run Sepolia Tests

```bash
npx hardhat test --network sepolia
```

## Useful Tasks

```bash
npx hardhat task:address
npx hardhat task:join
npx hardhat task:construct --type 1
npx hardhat task:decrypt-balance
npx hardhat task:decrypt-building
```

## Frontend Workflow

From `src/`:

```bash
npm install
npm run dev
```

Ensure the contract address and ABI are up to date before running the frontend.

## Future Plans

- Add multiple building slots and per-player city layouts.
- Introduce encrypted resource production and upkeep.
- Enable encrypted leaderboards with proof of ranking without disclosing values.
- Add multiplayer events with private bidding and rewards.
- Expand UI to visualize encrypted history and transaction receipts.
- Add gas and latency profiling for larger encrypted state updates.

## License

This project is licensed under the BSD-3-Clause-Clear License. See `LICENSE` for details.

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, ebool, euint32, euint64, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title CipherWars - Encrypted city-building game
/// @notice Players join to receive encrypted gold and spend it to construct encrypted buildings.
contract CipherWars is ZamaEthereumConfig {
    uint64 public constant INITIAL_GOLD = 10_000;
    uint64 public constant BUILDING_ONE_COST = 100;
    uint64 public constant BUILDING_TWO_COST = 200;
    uint64 public constant BUILDING_THREE_COST = 400;
    uint64 public constant BUILDING_FOUR_COST = 1_000;

    struct PlayerState {
        euint64 balance;
        euint32 building;
        bool joined;
    }

    mapping(address => PlayerState) private _players;

    event GameJoined(address indexed player);
    event BuildingConstructed(address indexed player, euint32 buildingType, euint64 cost, euint64 remainingBalance);

    /// @notice Join the game and receive encrypted starting gold.
    function joinGame() external {
        PlayerState storage player = _players[msg.sender];
        require(!player.joined, "Already joined");

        player.joined = true;
        player.balance = FHE.asEuint64(INITIAL_GOLD);
        player.building = FHE.asEuint32(0);

        _allowPlayerAccess(player.balance, player.building, msg.sender);

        emit GameJoined(msg.sender);
    }

    /// @notice Build a structure with an encrypted building type.
    /// @param buildingChoice The encrypted building type handle.
    /// @param inputProof The input proof for the encrypted value.
    function constructBuilding(externalEuint32 buildingChoice, bytes calldata inputProof) external {
        PlayerState storage player = _players[msg.sender];
        require(player.joined, "Join first");

        euint32 encryptedChoice = FHE.fromExternal(buildingChoice, inputProof);
        euint64 cost = _buildingCost(encryptedChoice);

        player.balance = _deductCost(player.balance, cost);
        player.building = encryptedChoice;

        _allowPlayerAccess(player.balance, player.building, msg.sender);

        emit BuildingConstructed(msg.sender, encryptedChoice, cost, player.balance);
    }

    /// @notice Return the encrypted balance of a player.
    /// @param player The address of the player to query.
    function getBalance(address player) external view returns (euint64) {
        return _players[player].balance;
    }

    /// @notice Return the encrypted building type for a player.
    /// @param player The address of the player to query.
    function getBuilding(address player) external view returns (euint32) {
        return _players[player].building;
    }

    /// @notice Check if a player has joined the game.
    /// @param player The address of the player to query.
    function hasJoined(address player) external view returns (bool) {
        return _players[player].joined;
    }

    function _buildingCost(euint32 encryptedChoice) internal returns (euint64) {
        euint64 typeOne = FHE.asEuint64(BUILDING_ONE_COST);
        euint64 typeTwo = FHE.asEuint64(BUILDING_TWO_COST);
        euint64 typeThree = FHE.asEuint64(BUILDING_THREE_COST);
        euint64 typeFour = FHE.asEuint64(BUILDING_FOUR_COST);

        ebool isOne = FHE.eq(encryptedChoice, FHE.asEuint32(1));
        ebool isTwo = FHE.eq(encryptedChoice, FHE.asEuint32(2));
        ebool isThree = FHE.eq(encryptedChoice, FHE.asEuint32(3));
        ebool isFour = FHE.eq(encryptedChoice, FHE.asEuint32(4));

        // Default to the most expensive build to discourage invalid inputs.
        euint64 defaultCost = typeFour;
        euint64 chosenCost = FHE.select(isOne, typeOne, defaultCost);
        chosenCost = FHE.select(isTwo, typeTwo, chosenCost);
        chosenCost = FHE.select(isThree, typeThree, chosenCost);
        chosenCost = FHE.select(isFour, typeFour, chosenCost);

        return chosenCost;
    }

    function _deductCost(euint64 balance, euint64 cost) internal returns (euint64) {
        ebool hasEnough = FHE.ge(balance, cost);
        euint64 remaining = FHE.select(hasEnough, FHE.sub(balance, cost), balance);
        return remaining;
    }

    function _allowPlayerAccess(euint64 balance, euint32 building, address player) internal {
        FHE.allowThis(balance);
        FHE.allow(balance, player);

        FHE.allowThis(building);
        FHE.allow(building, player);
    }
}

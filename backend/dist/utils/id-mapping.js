"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.polymarketToOnchainMarketId = polymarketToOnchainMarketId;
const ethers_1 = require("ethers");
/** 将 Polymarket conditionId 映射到链上 bytes32 marketId */
function polymarketToOnchainMarketId(conditionId) {
    return ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes(conditionId));
}
//# sourceMappingURL=id-mapping.js.map
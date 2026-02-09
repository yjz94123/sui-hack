import { ethers } from 'ethers';

/** 将 Polymarket conditionId 映射到链上 bytes32 marketId */
export function polymarketToOnchainMarketId(conditionId: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(conditionId));
}


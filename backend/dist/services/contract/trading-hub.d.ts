import { ethers } from 'ethers';
/**
 * TradingHub 合约交互客户端（镜像交易模式）
 * 负责与链上 TradingHub 合约交互：openPosition / closePosition / resolve / redeem
 */
export declare class TradingHubClient {
    private provider;
    constructor();
    getProvider(): ethers.JsonRpcProvider;
    getContract(signer?: ethers.Signer): ethers.Contract;
    getUsdcContract(signer?: ethers.Signer): ethers.Contract;
    getOracleSigner(): ethers.Wallet;
    getUserBalance(userAddress: string): Promise<bigint>;
    getPosition(positionId: number): Promise<{
        id: bigint;
        user: string;
        marketId: string;
        outcome: number;
        tokenAmount: bigint;
        costUsdc: bigint;
        priceAtOpen: bigint;
        openedAt: bigint;
        isOpen: boolean;
    }>;
    getUserPositionIds(userAddress: string): Promise<bigint[]>;
    getUserOpenPositions(userAddress: string): Promise<unknown[]>;
    getMarketStatus(marketId: string): Promise<{
        status: number;
        winner: number;
        resolvedAt: bigint;
    }>;
    openPosition(user: string, marketId: string, outcome: number, usdcAmount: bigint, tokenAmount: bigint, price: number): Promise<{
        receipt: ethers.ContractTransactionReceipt;
        positionId: bigint | null;
    }>;
    closePosition(positionId: number, returnUsdc: bigint, priceAtClose: number): Promise<ethers.ContractTransactionReceipt>;
    fundReserve(amount: bigint): Promise<ethers.ContractTransactionReceipt>;
    resolveMarket(marketId: string, outcome: number): Promise<string>;
    deposit(amount: bigint, signer: ethers.Signer): Promise<ethers.ContractTransactionReceipt>;
    withdraw(amount: bigint, signer: ethers.Signer): Promise<ethers.ContractTransactionReceipt>;
    redeem(marketId: string, signer: ethers.Signer): Promise<ethers.ContractTransactionReceipt>;
    mintUsdc(to: string, amount: bigint, signer: ethers.Signer): Promise<ethers.ContractTransactionReceipt>;
    approveUsdc(spender: string, amount: bigint, signer: ethers.Signer): Promise<ethers.ContractTransactionReceipt>;
    getUsdcBalance(account: string): Promise<bigint>;
    getUsdcAllowance(owner: string, spender: string): Promise<bigint>;
    /** 从 openPosition receipt 中解析 PositionOpened 事件，提取 positionId */
    extractPositionId(receipt: ethers.ContractTransactionReceipt): bigint | null;
}
export declare const tradingHubClient: TradingHubClient;
//# sourceMappingURL=trading-hub.d.ts.map
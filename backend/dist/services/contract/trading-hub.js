"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tradingHubClient = exports.TradingHubClient = void 0;
const ethers_1 = require("ethers");
const logger_1 = require("../../utils/logger");
const config_1 = require("../../config");
const TRADING_HUB_ABI = [
    // Write functions
    'function deposit(uint256 amount) external',
    'function withdraw(uint256 amount) external',
    'function openPosition(address user, bytes32 marketId, uint8 outcome, uint256 usdcAmount, uint256 tokenAmount, uint256 price) external returns (uint256)',
    'function closePosition(uint256 positionId, uint256 returnUsdc, uint256 priceAtClose) external',
    'function fundReserve(uint256 amount) external',
    'function resolveMarket(bytes32 marketId, uint8 winningOutcome) external',
    'function redeem(bytes32 marketId) external',
    // Read functions
    'function userBalances(address) external view returns (uint256)',
    'function positions(uint256) external view returns (uint256 id, address user, bytes32 marketId, uint8 outcome, uint256 tokenAmount, uint256 costUsdc, uint256 priceAtOpen, uint256 openedAt, bool isOpen)',
    'function getTokenId(bytes32 marketId, uint8 outcome) external pure returns (uint256)',
    'function balanceOf(address account, uint256 id) external view returns (uint256)',
    'function getUserPositionIds(address user) external view returns (uint256[])',
    'function getUserOpenPositions(address user) external view returns (tuple(uint256 id, address user, bytes32 marketId, uint8 outcome, uint256 tokenAmount, uint256 costUsdc, uint256 priceAtOpen, uint256 openedAt, bool isOpen)[])',
    'function getMarketStatus(bytes32 marketId) external view returns (uint8, uint8, uint256)',
    'function marketTotalLocked(bytes32) external view returns (uint256)',
    'function nextPositionId() external view returns (uint256)',
    // Events
    'event Deposit(address indexed user, uint256 amount)',
    'event Withdraw(address indexed user, uint256 amount)',
    'event PositionOpened(uint256 indexed positionId, address indexed user, bytes32 indexed marketId, uint8 outcome, uint256 tokenAmount, uint256 costUsdc, uint256 priceAtOpen)',
    'event PositionClosed(uint256 indexed positionId, address indexed user, bytes32 indexed marketId, uint8 outcome, uint256 tokenAmount, uint256 returnUsdc, uint256 priceAtClose)',
    'event MarketResolved(bytes32 indexed marketId, uint8 winningOutcome, uint256 timestamp)',
    'event Redemption(address indexed user, bytes32 indexed marketId, uint256 tokenAmount, uint256 usdcAmount)',
    'event ReserveFunded(address indexed funder, uint256 amount)',
];
const DEMO_USDC_ABI = [
    'function mint(address to, uint256 amount) external',
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function balanceOf(address account) external view returns (uint256)',
    'function allowance(address owner, address spender) external view returns (uint256)',
];
/**
 * TradingHub 合约交互客户端（镜像交易模式）
 * 负责与链上 TradingHub 合约交互：openPosition / closePosition / resolve / redeem
 */
class TradingHubClient {
    provider = null;
    constructor() {
        if (config_1.config.og.rpcUrl) {
            this.provider = new ethers_1.ethers.JsonRpcProvider(config_1.config.og.rpcUrl);
        }
    }
    getProvider() {
        if (!this.provider)
            throw new Error('Provider not configured');
        return this.provider;
    }
    getContract(signer) {
        const signerOrProvider = signer || this.getProvider();
        return new ethers_1.ethers.Contract(config_1.config.contracts.tradingHubAddress, TRADING_HUB_ABI, signerOrProvider);
    }
    getUsdcContract(signer) {
        const signerOrProvider = signer || this.getProvider();
        return new ethers_1.ethers.Contract(config_1.config.contracts.demoUsdcAddress, DEMO_USDC_ABI, signerOrProvider);
    }
    getOracleSigner() {
        if (!config_1.config.oracle.privateKey)
            throw new Error('Oracle private key not configured');
        return new ethers_1.ethers.Wallet(config_1.config.oracle.privateKey, this.getProvider());
    }
    // ============================================================
    //                    Read Methods
    // ============================================================
    async getUserBalance(userAddress) {
        const contract = this.getContract();
        return contract.userBalances(userAddress);
    }
    async getPosition(positionId) {
        const contract = this.getContract();
        const [id, user, marketId, outcome, tokenAmount, costUsdc, priceAtOpen, openedAt, isOpen] = await contract.positions(positionId);
        return { id, user, marketId, outcome, tokenAmount, costUsdc, priceAtOpen, openedAt, isOpen };
    }
    async getUserPositionIds(userAddress) {
        const contract = this.getContract();
        return contract.getUserPositionIds(userAddress);
    }
    async getUserOpenPositions(userAddress) {
        const contract = this.getContract();
        return contract.getUserOpenPositions(userAddress);
    }
    async getMarketStatus(marketId) {
        const contract = this.getContract();
        const [status, winner, resolvedAt] = await contract.getMarketStatus(marketId);
        return { status, winner, resolvedAt };
    }
    // ============================================================
    //                    Write Methods (Oracle/Owner)
    // ============================================================
    async openPosition(user, marketId, outcome, usdcAmount, tokenAmount, price) {
        const signer = this.getOracleSigner();
        const contract = this.getContract(signer);
        logger_1.logger.info({ user, marketId, outcome, usdcAmount: usdcAmount.toString(), price }, 'Opening position on-chain');
        const tx = await contract.openPosition(user, marketId, outcome, usdcAmount, tokenAmount, price);
        const receipt = await tx.wait();
        const positionId = this.extractPositionId(receipt);
        return { receipt, positionId };
    }
    async closePosition(positionId, returnUsdc, priceAtClose) {
        const signer = this.getOracleSigner();
        const contract = this.getContract(signer);
        logger_1.logger.info({ positionId, returnUsdc: returnUsdc.toString(), priceAtClose }, 'Closing position on-chain');
        const tx = await contract.closePosition(positionId, returnUsdc, priceAtClose);
        return tx.wait();
    }
    async fundReserve(amount) {
        const signer = this.getOracleSigner();
        const contract = this.getContract(signer);
        const tx = await contract.fundReserve(amount);
        return tx.wait();
    }
    async resolveMarket(marketId, outcome) {
        const signer = this.getOracleSigner();
        const contract = this.getContract(signer);
        logger_1.logger.info({ marketId, outcome }, 'Resolving market on-chain');
        const tx = await contract.resolveMarket(marketId, outcome);
        const receipt = await tx.wait();
        return receipt.hash;
    }
    // ============================================================
    //                    Write Methods (User-signed)
    // ============================================================
    async deposit(amount, signer) {
        const contract = this.getContract(signer);
        const tx = await contract.deposit(amount);
        return tx.wait();
    }
    async withdraw(amount, signer) {
        const contract = this.getContract(signer);
        const tx = await contract.withdraw(amount);
        return tx.wait();
    }
    async redeem(marketId, signer) {
        const contract = this.getContract(signer);
        const tx = await contract.redeem(marketId);
        return tx.wait();
    }
    // ============================================================
    //                     DemoUSDC Methods
    // ============================================================
    async mintUsdc(to, amount, signer) {
        const usdc = this.getUsdcContract(signer);
        const tx = await usdc.mint(to, amount);
        return tx.wait();
    }
    async approveUsdc(spender, amount, signer) {
        const usdc = this.getUsdcContract(signer);
        const tx = await usdc.approve(spender, amount);
        return tx.wait();
    }
    async getUsdcBalance(account) {
        const usdc = this.getUsdcContract();
        return usdc.balanceOf(account);
    }
    async getUsdcAllowance(owner, spender) {
        const usdc = this.getUsdcContract();
        return usdc.allowance(owner, spender);
    }
    // ============================================================
    //                     Event Parsing Helpers
    // ============================================================
    /** 从 openPosition receipt 中解析 PositionOpened 事件，提取 positionId */
    extractPositionId(receipt) {
        const iface = new ethers_1.ethers.Interface(TRADING_HUB_ABI);
        for (const log of receipt.logs) {
            try {
                const parsed = iface.parseLog({ topics: log.topics, data: log.data });
                if (parsed && parsed.name === 'PositionOpened') {
                    return parsed.args[0]; // positionId
                }
            }
            catch {
                // not our event, skip
            }
        }
        return null;
    }
}
exports.TradingHubClient = TradingHubClient;
exports.tradingHubClient = new TradingHubClient();
//# sourceMappingURL=trading-hub.js.map
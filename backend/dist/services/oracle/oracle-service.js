"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.oracleService = exports.OracleService = void 0;
const ethers_1 = require("ethers");
const polymarket_1 = require("../polymarket");
const logger_1 = require("../../utils/logger");
const config_1 = require("../../config");
/**
 * Oracle 服务
 * 监控 Polymarket 市场结算状态，调用 TradingHub.resolveMarket()
 */
class OracleService {
    provider = null;
    wallet = null;
    constructor() {
        if (config_1.config.og.rpcUrl && config_1.config.oracle.privateKey) {
            this.provider = new ethers_1.ethers.JsonRpcProvider(config_1.config.og.rpcUrl);
            this.wallet = new ethers_1.ethers.Wallet(config_1.config.oracle.privateKey, this.provider);
        }
    }
    /** 检查并结算已解决的市场 */
    async checkAndResolve() {
        logger_1.logger.info('Checking for resolved markets...');
        // TODO: 1. 从 DB 获取所有 active、在链上未结算的市场
        // TODO: 2. 对每个市场，查询 Polymarket 是否已 closed 且有 winner
        // TODO: 3. 如果有 winner，调用 TradingHub.resolveMarket(marketId, outcome)
        // TODO: 4. 更新 DB 状态
    }
    /** 将 Polymarket conditionId 映射到链上 marketId */
    mapToOnChainMarketId(conditionId) {
        return ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes(conditionId));
    }
    /** 查询市场是否已在 Polymarket 结算 */
    async isMarketResolved(conditionId) {
        try {
            const market = await polymarket_1.gammaClient.getMarket(conditionId);
            if (market?.closed) {
                const prices = JSON.parse(market.outcomePrices || '[]');
                const outcomes = JSON.parse(market.outcomes || '[]');
                const winnerIdx = prices.findIndex((p) => parseFloat(p) === 1);
                return {
                    resolved: true,
                    outcome: winnerIdx >= 0 ? outcomes[winnerIdx] : undefined,
                };
            }
            return { resolved: false };
        }
        catch (err) {
            logger_1.logger.error({ err, conditionId }, 'Failed to check market resolution');
            return { resolved: false };
        }
    }
}
exports.OracleService = OracleService;
exports.oracleService = new OracleService();
//# sourceMappingURL=oracle-service.js.map
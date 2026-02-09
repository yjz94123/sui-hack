"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.proxyOrderService = exports.ProxyOrderService = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../../utils/logger");
const trading_hub_1 = require("../contract/trading-hub");
const polymarket_1 = require("../polymarket");
const id_mapping_1 = require("../../utils/id-mapping");
const USDC_DECIMALS = 6;
const USDC_UNIT = BigInt(10 ** USDC_DECIMALS);
const OUTCOME_YES = 1;
const OUTCOME_NO = 0;
const prisma = new client_1.PrismaClient();
/**
 * 代理下单服务（Proxy Order Service）
 *
 * 读取 Polymarket 实时价格，通过 TradingHub 合约的 owner 权限
 * 为用户执行 openPosition / closePosition 操作。
 *
 * 定价公式:
 *   price (Polymarket) = 0.65 → priceBps = 6500
 *   tokenAmount = usdcAmount * 10000 / priceBps
 *   例: 65 USDC @ 65% → 100 tokens → 赢了赎回 100 USDC
 */
class ProxyOrderService {
    /**
     * 执行买入：获取价格 → 计算 tokens → 调用 openPosition
     */
    async executeBuy(params) {
        const { userAddress, marketId, outcome, usdcAmount } = params;
        try {
            // 1. 从 DB 查市场信息
            const market = await prisma.market.findUnique({
                where: { id: marketId },
                select: {
                    conditionId: true,
                    clobTokenIds: true,
                    onchainMarketId: true,
                    outcomePrices: true,
                    active: true,
                    closed: true,
                },
            });
            if (!market)
                throw new Error(`Market not found: ${marketId}`);
            if (!market.active || market.closed)
                throw new Error('Market is not active');
            // 2. 获取 Polymarket 价格
            const outcomeIndex = outcome === 'YES' ? 0 : 1;
            const yesTokenId = market.clobTokenIds[0];
            let price;
            try {
                if (yesTokenId) {
                    const midData = await polymarket_1.clobClient.getMidpoint(yesTokenId);
                    const mid = parseFloat(midData?.mid ?? midData?.price ?? '0');
                    if (mid > 0 && mid < 1) {
                        price = outcome === 'YES' ? mid : 1 - mid;
                    }
                    else {
                        price = parseFloat(market.outcomePrices[outcomeIndex] || '0');
                    }
                }
                else {
                    price = parseFloat(market.outcomePrices[outcomeIndex] || '0');
                }
            }
            catch {
                price = parseFloat(market.outcomePrices[outcomeIndex] || '0');
            }
            if (price <= 0 || price >= 1) {
                throw new Error(`Invalid price for ${outcome}: ${price}`);
            }
            // 3. 计算 tokenAmount
            const priceBps = Math.round(price * 10000);
            const usdcAmountRaw = BigInt(usdcAmount) * USDC_UNIT;
            // tokenAmount = usdcAmount * 10000 / priceBps
            const tokenAmount = (usdcAmountRaw * 10000n) / BigInt(priceBps);
            // 4. 链上 marketId
            if (!market.conditionId && !market.onchainMarketId) {
                throw new Error('Market has no conditionId or onchainMarketId');
            }
            const onchainMarketId = market.onchainMarketId || (0, id_mapping_1.polymarketToOnchainMarketId)(market.conditionId);
            // 5. 调用合约 openPosition
            const outcomeNum = outcome === 'YES' ? OUTCOME_YES : OUTCOME_NO;
            const { receipt, positionId } = await trading_hub_1.tradingHubClient.openPosition(userAddress, onchainMarketId, outcomeNum, usdcAmountRaw, tokenAmount, priceBps);
            // 6. 记录到 DB
            const posId = positionId !== null ? Number(positionId) : 0;
            await prisma.tradeRecord.create({
                data: {
                    userAddress,
                    marketId,
                    positionId: String(posId),
                    side: 'buy',
                    outcome,
                    amount: Number(tokenAmount) / Number(USDC_UNIT),
                    price,
                    usdcCost: usdcAmount,
                    txHash: receipt.hash,
                    status: 'confirmed',
                },
            });
            logger_1.logger.info({ userAddress, marketId, outcome, usdcAmount, tokenAmount: tokenAmount.toString(), positionId: posId }, 'Buy order executed');
            return {
                success: true,
                positionId: posId,
                txHash: receipt.hash,
                tokenAmount: Number(tokenAmount) / Number(USDC_UNIT),
                price,
            };
        }
        catch (err) {
            logger_1.logger.error({ err, ...params }, 'Failed to execute buy');
            return { success: false, error: err.message };
        }
    }
    /**
     * 执行卖出：获取当前价格 → 计算 returnUsdc → 调用 closePosition
     */
    async executeSell(params) {
        const { userAddress, positionId } = params;
        try {
            // 1. 从合约查 position 详情
            const pos = await trading_hub_1.tradingHubClient.getPosition(positionId);
            if (pos.id === 0n)
                throw new Error(`Position not found: ${positionId}`);
            if (!pos.isOpen)
                throw new Error('Position is already closed');
            if (pos.user.toLowerCase() !== userAddress.toLowerCase()) {
                throw new Error('Position does not belong to this user');
            }
            // 2. 从 DB 查市场信息以获取价格
            const market = await prisma.market.findFirst({
                where: { onchainMarketId: pos.marketId },
                select: {
                    id: true,
                    conditionId: true,
                    clobTokenIds: true,
                    outcomePrices: true,
                },
            });
            // 3. 获取当前价格
            const outcomeStr = pos.outcome === OUTCOME_YES ? 'YES' : 'NO';
            const outcomeIndex = pos.outcome === OUTCOME_YES ? 0 : 1;
            let currentPrice;
            try {
                const yesTokenId = market?.clobTokenIds[0];
                if (yesTokenId) {
                    const midData = await polymarket_1.clobClient.getMidpoint(yesTokenId);
                    const mid = parseFloat(midData?.mid ?? midData?.price ?? '0');
                    if (mid > 0 && mid < 1) {
                        currentPrice = pos.outcome === OUTCOME_YES ? mid : 1 - mid;
                    }
                    else {
                        currentPrice = parseFloat(market?.outcomePrices[outcomeIndex] || '0.5');
                    }
                }
                else {
                    currentPrice = parseFloat(market?.outcomePrices[outcomeIndex] || '0.5');
                }
            }
            catch {
                currentPrice = parseFloat(market?.outcomePrices[outcomeIndex] || '0.5');
            }
            if (currentPrice <= 0)
                currentPrice = 0.01;
            if (currentPrice >= 1)
                currentPrice = 0.99;
            // 4. 计算 returnUsdc = tokenAmount * currentPriceBps / 10000
            const currentPriceBps = Math.round(currentPrice * 10000);
            const returnUsdc = (pos.tokenAmount * BigInt(currentPriceBps)) / 10000n;
            // 5. 调用合约 closePosition
            const receipt = await trading_hub_1.tradingHubClient.closePosition(positionId, returnUsdc, currentPriceBps);
            // 6. 记录到 DB
            await prisma.tradeRecord.create({
                data: {
                    userAddress,
                    marketId: market?.id || '',
                    positionId: String(positionId),
                    side: 'sell',
                    outcome: outcomeStr,
                    amount: Number(pos.tokenAmount) / Number(USDC_UNIT),
                    price: currentPrice,
                    usdcCost: Number(returnUsdc) / Number(USDC_UNIT),
                    txHash: receipt.hash,
                    status: 'confirmed',
                },
            });
            logger_1.logger.info({ userAddress, positionId, returnUsdc: returnUsdc.toString(), currentPrice }, 'Sell order executed');
            return {
                success: true,
                positionId,
                txHash: receipt.hash,
                tokenAmount: Number(pos.tokenAmount) / Number(USDC_UNIT),
                price: currentPrice,
            };
        }
        catch (err) {
            logger_1.logger.error({ err, ...params }, 'Failed to execute sell');
            return { success: false, error: err.message };
        }
    }
    /**
     * 获取某个市场的当前价格
     */
    async getMarketPrice(marketId, outcome) {
        const market = await prisma.market.findUnique({
            where: { id: marketId },
            select: { clobTokenIds: true, outcomePrices: true },
        });
        if (!market)
            throw new Error(`Market not found: ${marketId}`);
        const outcomeIndex = outcome === 'YES' ? 0 : 1;
        const yesTokenId = market.clobTokenIds[0];
        try {
            if (yesTokenId) {
                const midData = await polymarket_1.clobClient.getMidpoint(yesTokenId);
                const mid = parseFloat(midData?.mid ?? midData?.price ?? '0');
                if (mid > 0 && mid < 1) {
                    return outcome === 'YES' ? mid : 1 - mid;
                }
            }
        }
        catch {
            // fallback to DB
        }
        return parseFloat(market.outcomePrices[outcomeIndex] || '0.5');
    }
}
exports.ProxyOrderService = ProxyOrderService;
exports.proxyOrderService = new ProxyOrderService();
//# sourceMappingURL=proxy-order-service.js.map
import { Router } from 'express';
import { proxyOrderService } from '../services/proxy-order';
import { tradingHubClient } from '../services/contract/trading-hub';
import { logger } from '../utils/logger';

export const tradesRouter = Router();

/**
 * POST /api/v1/trades/buy
 * 代理买入：后端读取 Polymarket 价格，调用合约 openPosition
 *
 * Body: { userAddress, marketId, outcome: "YES"|"NO", usdcAmount }
 */
tradesRouter.post('/buy', async (req, res, next) => {
  try {
    const { userAddress, marketId, outcome, usdcAmount } = req.body;

    if (!userAddress || !marketId || !outcome || !usdcAmount) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    if (outcome !== 'YES' && outcome !== 'NO') {
      return res.status(400).json({ success: false, error: 'Outcome must be YES or NO' });
    }

    if (typeof usdcAmount !== 'number' || usdcAmount <= 0) {
      return res.status(400).json({ success: false, error: 'usdcAmount must be a positive number' });
    }

    const result = await proxyOrderService.executeBuy({
      userAddress,
      marketId,
      outcome,
      usdcAmount,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/trades/sell
 * 代理卖出：后端获取当前价格，调用合约 closePosition
 *
 * Body: { userAddress, positionId }
 */
tradesRouter.post('/sell', async (req, res, next) => {
  try {
    const { userAddress, positionId } = req.body;

    if (!userAddress || positionId === undefined) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const result = await proxyOrderService.executeSell({
      userAddress,
      positionId: Number(positionId),
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/trades/positions/:userAddress
 * 查询用户仓位（链上数据）
 *
 * Query: ?status=open|closed|all (default: open)
 */
tradesRouter.get('/positions/:userAddress', async (req, res, next) => {
  try {
    const { userAddress } = req.params;
    const status = (req.query.status as string) || 'open';

    if (status === 'open') {
      const positions = await tradingHubClient.getUserOpenPositions(userAddress);
      return res.json({ success: true, data: { positions } });
    }

    // all / closed: 获取全部 position IDs 然后逐个查
    const ids = await tradingHubClient.getUserPositionIds(userAddress);
    const positions = [];

    for (const id of ids) {
      try {
        const pos = await tradingHubClient.getPosition(Number(id));
        if (status === 'all' || (status === 'closed' && !pos.isOpen)) {
          positions.push({
            id: Number(pos.id),
            user: pos.user,
            marketId: pos.marketId,
            outcome: pos.outcome,
            tokenAmount: pos.tokenAmount.toString(),
            costUsdc: pos.costUsdc.toString(),
            priceAtOpen: Number(pos.priceAtOpen),
            openedAt: Number(pos.openedAt),
            isOpen: pos.isOpen,
          });
        }
      } catch (err) {
        logger.error({ err, positionId: id.toString() }, 'Failed to fetch position');
      }
    }

    res.json({ success: true, data: { positions } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/trades/price/:marketId
 * 获取市场当前价格
 *
 * Query: ?outcome=YES|NO (default: YES)
 */
tradesRouter.get('/price/:marketId', async (req, res, next) => {
  try {
    const { marketId } = req.params;
    const outcome = ((req.query.outcome as string) || 'YES').toUpperCase() as 'YES' | 'NO';

    if (outcome !== 'YES' && outcome !== 'NO') {
      return res.status(400).json({ success: false, error: 'Outcome must be YES or NO' });
    }

    const price = await proxyOrderService.getMarketPrice(marketId, outcome);
    res.json({ success: true, data: { marketId, outcome, price } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/trades/balance/:userAddress
 * 查询用户合约内余额
 */
tradesRouter.get('/balance/:userAddress', async (req, res, next) => {
  try {
    const { userAddress } = req.params;
    const balance = await tradingHubClient.getUserBalance(userAddress);
    res.json({
      success: true,
      data: {
        userAddress,
        balance: balance.toString(),
        balanceUsdc: Number(balance) / 1e6,
      },
    });
  } catch (err) {
    next(err);
  }
});

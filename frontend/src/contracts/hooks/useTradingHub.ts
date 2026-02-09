import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useQuery } from '@tanstack/react-query';
import { CONTRACTS, MODULES, USDC_DECIMALS, OUTCOME } from '../config';
import { Transaction } from '@mysten/sui/transactions';
import { useEffect, useState } from 'react';

export interface Order {
  orderId: string;
  user: string;
  marketId: string; // UTF-8 decoded string
  outcome: number;
  amount: string;
  amountRaw: bigint;
  timestamp: number;
  settled: boolean;
  outcomeName: 'YES' | 'NO';
}

/**
 * Hook to get order details by ID
 */
export function useOrder(orderId?: string | number) {
  const client = useSuiClient();
  const account = useCurrentAccount();

  return useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      if (!account || !orderId) return null;

      // 调用 view function
      const result = await client.devInspectTransactionBlock({
        sender: account.address,
        transactionBlock: (() => {
          const tx = new Transaction();
          tx.moveCall({
            target: `${CONTRACTS.PACKAGE_ID}::${MODULES.TRADING_HUB}::get_order`,
            arguments: [
              tx.object(CONTRACTS.TRADING_HUB),
              tx.pure.u64(BigInt(orderId)),
            ],
          });
          return tx;
        })(),
      });

      if (result.results && result.results[0]?.returnValues) {
        const orderData = result.results[0].returnValues;

        // 解析订单数据 (根据 Order 结构体字段顺序)
        const orderIdValue = BigInt(`0x${Buffer.from(orderData[0][0]).toString('hex')}`);
        const userValue = Buffer.from(orderData[1][0]).toString('hex');
        const marketIdBytes = orderData[2][0];
        const outcomeValue = Number(orderData[3][0][0]);
        const amountValue = BigInt(`0x${Buffer.from(orderData[4][0]).toString('hex')}`);
        const timestampValue = Number(BigInt(`0x${Buffer.from(orderData[5][0]).toString('hex')}`));
        const settledValue = orderData[6][0][0] === 1;

        const order: Order = {
          orderId: orderIdValue.toString(),
          user: `0x${userValue}`,
          marketId: Buffer.from(marketIdBytes).toString('utf-8'),
          outcome: outcomeValue,
          outcomeName: outcomeValue === OUTCOME.YES ? 'YES' : 'NO',
          amount: (Number(amountValue) / 10 ** USDC_DECIMALS).toString(),
          amountRaw: amountValue,
          timestamp: timestampValue,
          settled: settledValue,
        };

        return order;
      }

      return null;
    },
    enabled: !!account && orderId !== undefined,
  });
}

/**
 * Hook to get all order IDs for a user
 */
export function useUserOrders(userAddress?: string) {
  const client = useSuiClient();
  const account = useCurrentAccount();

  return useQuery({
    queryKey: ['user-orders', userAddress],
    queryFn: async () => {
      if (!account || !userAddress) return [];

      const result = await client.devInspectTransactionBlock({
        sender: account.address,
        transactionBlock: (() => {
          const tx = new Transaction();
          tx.moveCall({
            target: `${CONTRACTS.PACKAGE_ID}::${MODULES.TRADING_HUB}::get_user_orders`,
            arguments: [
              tx.object(CONTRACTS.TRADING_HUB),
              tx.pure.address(userAddress),
            ],
          });
          return tx;
        })(),
      });

      if (result.results && result.results[0]?.returnValues) {
        const orderIdsData = result.results[0].returnValues[0][0];
        // 解析 vector<u64>
        const orderIds: bigint[] = [];
        // TODO: 解析 BCS 编码的 vector
        return orderIds;
      }

      return [];
    },
    enabled: !!account && !!userAddress,
  });
}

/**
 * Hook to get all order IDs for a market
 */
export function useMarketOrders(marketId?: string) {
  const client = useSuiClient();
  const account = useCurrentAccount();

  return useQuery({
    queryKey: ['market-orders', marketId],
    queryFn: async () => {
      if (!account || !marketId) return [];

      const marketIdBytes = Array.from(Buffer.from(marketId, 'utf-8'));

      const result = await client.devInspectTransactionBlock({
        sender: account.address,
        transactionBlock: (() => {
          const tx = new Transaction();
          tx.moveCall({
            target: `${CONTRACTS.PACKAGE_ID}::${MODULES.TRADING_HUB}::get_market_orders`,
            arguments: [
              tx.object(CONTRACTS.TRADING_HUB),
              tx.pure(marketIdBytes, 'vector<u8>'),
            ],
          });
          return tx;
        })(),
      });

      if (result.results && result.results[0]?.returnValues) {
        const orderIdsData = result.results[0].returnValues[0][0];
        // TODO: 解析 BCS 编码的 vector
        const orderIds: bigint[] = [];
        return orderIds;
      }

      return [];
    },
    enabled: !!account && !!marketId,
  });
}

/**
 * Hook to get user's orders for a specific market
 */
export function useUserMarketOrders(userAddress?: string, marketId?: string) {
  const client = useSuiClient();
  const account = useCurrentAccount();

  return useQuery({
    queryKey: ['user-market-orders', userAddress, marketId],
    queryFn: async () => {
      if (!account || !userAddress || !marketId) return [];

      const marketIdBytes = Array.from(Buffer.from(marketId, 'utf-8'));

      const result = await client.devInspectTransactionBlock({
        sender: account.address,
        transactionBlock: (() => {
          const tx = new Transaction();
          tx.moveCall({
            target: `${CONTRACTS.PACKAGE_ID}::${MODULES.TRADING_HUB}::get_user_market_orders`,
            arguments: [
              tx.object(CONTRACTS.TRADING_HUB),
              tx.pure.address(userAddress),
              tx.pure(marketIdBytes, 'vector<u8>'),
            ],
          });
          return tx;
        })(),
      });

      if (result.results && result.results[0]?.returnValues) {
        // TODO: 解析返回值
        const orderIds: bigint[] = [];
        return orderIds;
      }

      return [];
    },
    enabled: !!account && !!userAddress && !!marketId,
  });
}

/**
 * Hook to get total number of orders
 */
export function useTotalOrders() {
  const client = useSuiClient();
  const account = useCurrentAccount();

  return useQuery({
    queryKey: ['total-orders'],
    queryFn: async () => {
      if (!account) return 0;

      const result = await client.devInspectTransactionBlock({
        sender: account.address,
        transactionBlock: (() => {
          const tx = new Transaction();
          tx.moveCall({
            target: `${CONTRACTS.PACKAGE_ID}::${MODULES.TRADING_HUB}::total_orders`,
            arguments: [tx.object(CONTRACTS.TRADING_HUB)],
          });
          return tx;
        })(),
      });

      if (result.results && result.results[0]?.returnValues) {
        const value = result.results[0].returnValues[0][0];
        const totalOrders = Number(BigInt(`0x${Buffer.from(value).toString('hex')}`));
        return totalOrders;
      }

      return 0;
    },
    enabled: !!account,
  });
}

/**
 * Hook to watch OrderPlaced events
 * 使用 Sui 的事件查询 API
 */
export function useWatchOrderPlaced(
  onOrderPlaced?: (data: {
    orderId: string;
    user: string;
    marketId: string;
    outcome: number;
    amount: string;
  }) => void
) {
  const client = useSuiClient();
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!onOrderPlaced) return;

    const eventType = `${CONTRACTS.PACKAGE_ID}::${MODULES.TRADING_HUB}::OrderPlaced`;

    // 使用轮询获取最新事件
    const pollEvents = async () => {
      try {
        const events = await client.queryEvents({
          query: { MoveEventType: eventType },
          order: 'descending',
          limit: 10,
        });

        events.data.forEach((event) => {
          const parsedJson = event.parsedJson as any;
          if (parsedJson) {
            onOrderPlaced({
              orderId: parsedJson.order_id?.toString() || '0',
              user: parsedJson.user || '',
              marketId: Buffer.from(parsedJson.market_id || []).toString('utf-8'),
              outcome: Number(parsedJson.outcome || 0),
              amount: (Number(parsedJson.amount || 0) / 10 ** USDC_DECIMALS).toString(),
            });
          }
        });
      } catch (error) {
        console.error('Error polling events:', error);
      }
    };

    const interval = setInterval(pollEvents, 5000); // 每 5 秒轮询一次
    setIsSubscribed(true);

    return () => {
      clearInterval(interval);
      setIsSubscribed(false);
    };
  }, [client, onOrderPlaced]);

  return { isSubscribed };
}

/**
 * Hook to watch OrderSettled events
 */
export function useWatchOrderSettled(
  onOrderSettled?: (data: {
    orderId: string;
    user: string;
    marketId: string;
    won: boolean;
    payout: string;
  }) => void
) {
  const client = useSuiClient();
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!onOrderSettled) return;

    const eventType = `${CONTRACTS.PACKAGE_ID}::${MODULES.TRADING_HUB}::OrderSettled`;

    const pollEvents = async () => {
      try {
        const events = await client.queryEvents({
          query: { MoveEventType: eventType },
          order: 'descending',
          limit: 10,
        });

        events.data.forEach((event) => {
          const parsedJson = event.parsedJson as any;
          if (parsedJson) {
            onOrderSettled({
              orderId: parsedJson.order_id?.toString() || '0',
              user: parsedJson.user || '',
              marketId: Buffer.from(parsedJson.market_id || []).toString('utf-8'),
              won: Boolean(parsedJson.won),
              payout: (Number(parsedJson.payout || 0) / 10 ** USDC_DECIMALS).toString(),
            });
          }
        });
      } catch (error) {
        console.error('Error polling events:', error);
      }
    };

    const interval = setInterval(pollEvents, 5000);
    setIsSubscribed(true);

    return () => {
      clearInterval(interval);
      setIsSubscribed(false);
    };
  }, [client, onOrderSettled]);

  return { isSubscribed };
}

/**
 * Hook to watch MarketSettled events
 */
export function useWatchMarketSettled(
  onMarketSettled?: (data: {
    marketId: string;
    winningOutcome: number;
    totalOrders: string;
  }) => void
) {
  const client = useSuiClient();
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!onMarketSettled) return;

    const eventType = `${CONTRACTS.PACKAGE_ID}::${MODULES.TRADING_HUB}::MarketSettled`;

    const pollEvents = async () => {
      try {
        const events = await client.queryEvents({
          query: { MoveEventType: eventType },
          order: 'descending',
          limit: 10,
        });

        events.data.forEach((event) => {
          const parsedJson = event.parsedJson as any;
          if (parsedJson) {
            onMarketSettled({
              marketId: Buffer.from(parsedJson.market_id || []).toString('utf-8'),
              winningOutcome: Number(parsedJson.winning_outcome || 0),
              totalOrders: parsedJson.total_orders?.toString() || '0',
            });
          }
        });
      } catch (error) {
        console.error('Error polling events:', error);
      }
    };

    const interval = setInterval(pollEvents, 5000);
    setIsSubscribed(true);

    return () => {
      clearInterval(interval);
      setIsSubscribed(false);
    };
  }, [client, onMarketSettled]);

  return { isSubscribed };
}

/**
 * Combined hook to watch all TradingHub events
 */
export function useTradingHubEvents(callbacks?: {
  onOrderPlaced?: (data: any) => void;
  onOrderSettled?: (data: any) => void;
  onMarketSettled?: (data: any) => void;
}) {
  const [events, setEvents] = useState<any[]>([]);

  useWatchOrderPlaced((data) => {
    callbacks?.onOrderPlaced?.(data);
    setEvents((prev) => [...prev, { type: 'OrderPlaced', data, timestamp: Date.now() }]);
  });

  useWatchOrderSettled((data) => {
    callbacks?.onOrderSettled?.(data);
    setEvents((prev) => [...prev, { type: 'OrderSettled', data, timestamp: Date.now() }]);
  });

  useWatchMarketSettled((data) => {
    callbacks?.onMarketSettled?.(data);
    setEvents((prev) => [...prev, { type: 'MarketSettled', data, timestamp: Date.now() }]);
  });

  return { events };
}

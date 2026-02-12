import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { useQuery } from '@tanstack/react-query';
import { CONTRACTS, MODULES, USDC_DECIMALS, OUTCOME, USDC_COIN_TYPE } from '../config';
import { Transaction } from '@mysten/sui/transactions';
import { useEffect, useRef, useState } from 'react';
import { parseUSDC } from '../utils';

// ============ Browser-compatible helpers (no Buffer) ============

function bytesToHex(bytes: number[] | Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function bytesToUtf8(bytes: number[] | Uint8Array): string {
  return new TextDecoder().decode(new Uint8Array(bytes));
}

function hexToU64LE(bytes: number[] | Uint8Array): bigint {
  const hex = bytesToHex(Array.from(bytes).reverse());
  return hex ? BigInt(`0x${hex}`) : 0n;
}

/**
 * Parse BCS-encoded vector<u64> from devInspect returnValues.
 * BCS format: ULEB128 length prefix, then each u64 as 8 little-endian bytes.
 */
function parseBcsVectorU64(raw: number[]): bigint[] {
  if (!raw || raw.length === 0) return [];

  let offset = 0;

  // Read ULEB128 length prefix
  let length = 0;
  let shift = 0;
  while (offset < raw.length) {
    const byte = raw[offset++];
    length |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) break;
    shift += 7;
  }

  const result: bigint[] = [];
  for (let i = 0; i < length && offset + 8 <= raw.length; i++) {
    let value = 0n;
    for (let j = 0; j < 8; j++) {
      value |= BigInt(raw[offset + j]) << BigInt(j * 8);
    }
    result.push(value);
    offset += 8;
  }

  return result;
}

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

        const orderIdValue = hexToU64LE(orderData[0][0] as number[]);
        const userValue = bytesToHex(orderData[1][0] as number[]);
        const marketIdBytes = orderData[2][0] as number[];
        const outcomeValue = Number((orderData[3][0] as number[])[0]);
        const amountValue = hexToU64LE(orderData[4][0] as number[]);
        const timestampValue = Number(hexToU64LE(orderData[5][0] as number[]));
        const settledValue = (orderData[6][0] as number[])[0] === 1;

        const order: Order = {
          orderId: orderIdValue.toString(),
          user: `0x${userValue}`,
          marketId: bytesToUtf8(marketIdBytes),
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

function marketIdToBytes(marketId: string): number[] {
  return Array.from(new TextEncoder().encode(marketId));
}

/**
 * Hook to place order (user self-service, no AdminCap required)
 */
export function usePlaceOrder() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutateAsync: signAndExecute, isPending } = useSignAndExecuteTransaction();

  const placeOrder = async (params: {
    marketId: string;
    outcome: 'YES' | 'NO';
    amount: string;
    /** Entry price in basis points (e.g. 6500 = 65%). Used for payout calculation. */
    priceBps: number;
  }) => {
    if (!account) throw new Error('Wallet not connected');
    if (!CONTRACTS.PACKAGE_ID || CONTRACTS.PACKAGE_ID === '0x0') {
      throw new Error('Package ID not configured');
    }
    if (!CONTRACTS.TRADING_HUB || CONTRACTS.TRADING_HUB === '0x0') {
      throw new Error('TradingHub ID not configured');
    }

    const amountInSmallestUnit = parseUSDC(params.amount);
    if (amountInSmallestUnit <= 0n) throw new Error('Invalid amount');

    const coins = await client.getCoins({
      owner: account.address,
      coinType: USDC_COIN_TYPE,
    });

    if (!coins.data.length) {
      throw new Error('No USDC coins found');
    }

    let selected = [] as typeof coins.data;
    let total = 0n;
    for (const coin of coins.data) {
      selected.push(coin);
      total += BigInt(coin.balance);
      if (total >= amountInSmallestUnit) break;
    }
    if (total < amountInSmallestUnit) {
      throw new Error('Insufficient USDC balance');
    }

    const tx = new Transaction();
    const primary = tx.object(selected[0].coinObjectId);
    if (selected.length > 1) {
      tx.mergeCoins(
        primary,
        selected.slice(1).map((coin) => tx.object(coin.coinObjectId))
      );
    }

    const priceBps = Math.max(1, Math.min(9999, Math.round(params.priceBps)));

    const [paymentCoin] = tx.splitCoins(primary, [tx.pure.u64(amountInSmallestUnit)]);
    tx.moveCall({
      target: `${CONTRACTS.PACKAGE_ID}::${MODULES.TRADING_HUB}::public_place_order`,
      arguments: [
        tx.object(CONTRACTS.TRADING_HUB),
        tx.pure.vector('u8', marketIdToBytes(params.marketId)),
        tx.pure.u8(params.outcome === 'YES' ? OUTCOME.YES : OUTCOME.NO),
        paymentCoin,
        tx.pure.u64(BigInt(priceBps)),
      ],
    });

    const result = await signAndExecute({ transaction: tx });
    await client.waitForTransaction({ digest: result.digest });
    return result;
  };

  return { placeOrder, isPending };
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
        const raw = result.results[0].returnValues[0][0] as number[];
        return parseBcsVectorU64(raw);
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

      const marketIdBytes = marketIdToBytes(marketId);

      const result = await client.devInspectTransactionBlock({
        sender: account.address,
        transactionBlock: (() => {
          const tx = new Transaction();
          tx.moveCall({
            target: `${CONTRACTS.PACKAGE_ID}::${MODULES.TRADING_HUB}::get_market_orders`,
            arguments: [
              tx.object(CONTRACTS.TRADING_HUB),
              tx.pure.vector('u8', marketIdBytes),
            ],
          });
          return tx;
        })(),
      });

      if (result.results && result.results[0]?.returnValues) {
        const raw = result.results[0].returnValues[0][0] as number[];
        return parseBcsVectorU64(raw);
      }

      return [];
    },
    enabled: !!account && !!marketId,
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
        const value = result.results[0].returnValues[0][0] as number[];
        return Number(hexToU64LE(value));
      }

      return 0;
    },
    enabled: !!account,
  });
}

/**
 * Hook to watch OrderPlaced events
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
  const seenRef = useRef(new Set<string>());

  useEffect(() => {
    if (!onOrderPlaced) return;

    const eventType = `${CONTRACTS.PACKAGE_ID}::${MODULES.TRADING_HUB}::OrderPlaced`;

    const pollEvents = async () => {
      try {
        const events = await client.queryEvents({
          query: { MoveEventType: eventType },
          order: 'descending',
          limit: 10,
        });

        events.data.forEach((event) => {
          const eventKey = `${event.id.txDigest}:${event.id.eventSeq}`;
          if (seenRef.current.has(eventKey)) return;
          seenRef.current.add(eventKey);

          const parsedJson = event.parsedJson as any;
          if (parsedJson) {
            const marketIdRaw = parsedJson.market_id || [];
            onOrderPlaced({
              orderId: parsedJson.order_id?.toString() || '0',
              user: parsedJson.user || '',
              marketId: bytesToUtf8(marketIdRaw),
              outcome: Number(parsedJson.outcome || 0),
              amount: (Number(parsedJson.amount || 0) / 10 ** USDC_DECIMALS).toString(),
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
  const seenRef = useRef(new Set<string>());

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
          const eventKey = `${event.id.txDigest}:${event.id.eventSeq}`;
          if (seenRef.current.has(eventKey)) return;
          seenRef.current.add(eventKey);

          const parsedJson = event.parsedJson as any;
          if (parsedJson) {
            const marketIdRaw = parsedJson.market_id || [];
            onOrderSettled({
              orderId: parsedJson.order_id?.toString() || '0',
              user: parsedJson.user || '',
              marketId: bytesToUtf8(marketIdRaw),
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
  const seenRef = useRef(new Set<string>());

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
          const eventKey = `${event.id.txDigest}:${event.id.eventSeq}`;
          if (seenRef.current.has(eventKey)) return;
          seenRef.current.add(eventKey);

          const parsedJson = event.parsedJson as any;
          if (parsedJson) {
            const marketIdRaw = parsedJson.market_id || [];
            onMarketSettled({
              marketId: bytesToUtf8(marketIdRaw),
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

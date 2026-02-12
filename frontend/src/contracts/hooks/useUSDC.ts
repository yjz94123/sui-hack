import { useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CONTRACTS, MODULES, USDC_DECIMALS, USDC_COIN_TYPE } from '../config';
import { defaultChain } from '../../config/sui';

// Browser-compatible helper: convert BCS little-endian byte array to bigint
function hexToU64LE(bytes: number[] | Uint8Array): bigint {
  const hex = Array.from(bytes).reverse().map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex ? BigInt(`0x${hex}`) : 0n;
}

/**
 * Hook to get USDC balance of current account
 */
export function useUSDCBalance() {
  const account = useCurrentAccount();
  const client = useSuiClient();

  return useQuery({
    queryKey: ['usdc-balance', account?.address],
    queryFn: async () => {
      if (!account) return null;

      const coins = await client.getCoins({
        owner: account.address,
        coinType: USDC_COIN_TYPE,
      });

      const totalBalance = coins.data.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);

      return {
        balance: (Number(totalBalance) / 10 ** USDC_DECIMALS).toString(),
        balanceRaw: totalBalance,
        coins: coins.data,
      };
    },
    enabled: !!account,
    refetchInterval: 5000,
  });
}

/**
 * Hook to mint USDC (test faucet)
 */
export function useMintUSDC() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const queryClient = useQueryClient();
  const { mutateAsync: signAndExecute, isPending } = useSignAndExecuteTransaction();

  const mint = async (amount: string) => {
    if (!account) throw new Error('Wallet not connected');
    if (!CONTRACTS.PACKAGE_ID || CONTRACTS.PACKAGE_ID === '0x0') {
      throw new Error('Package ID not configured');
    }
    if (!CONTRACTS.USDC_MINT_CONTROLLER || CONTRACTS.USDC_MINT_CONTROLLER === '0x0') {
      throw new Error('MintController ID not configured');
    }
    if (!account.chains.includes(defaultChain)) {
      throw new Error(`Wallet network mismatch. Please switch to ${defaultChain}.`);
    }

    const amountInSmallestUnit = BigInt(Math.floor(parseFloat(amount) * 10 ** USDC_DECIMALS));

    const tx = new Transaction();
    tx.moveCall({
      target: `${CONTRACTS.PACKAGE_ID}::${MODULES.USDC_COIN}::mint`,
      arguments: [
        tx.object(CONTRACTS.USDC_MINT_CONTROLLER),
        tx.pure.u64(amountInSmallestUnit),
      ],
    });
    tx.setGasBudget(50_000_000);

    const result = await signAndExecute({
      transaction: tx,
      chain: defaultChain,
    });

    // 等待交易确认
    await client.waitForTransaction({
      digest: result.digest,
    });

    // 刷新余额
    queryClient.invalidateQueries({ queryKey: ['usdc-balance'] });

    return result;
  };

  return {
    mint,
    isPending,
  };
}

/**
 * Hook to get last mint timestamp
 */
export function useLastMintTime() {
  const account = useCurrentAccount();
  const client = useSuiClient();

  return useQuery({
    queryKey: ['last-mint-time', account?.address],
    queryFn: async () => {
      if (!account) return null;

      const result = await client.devInspectTransactionBlock({
        sender: account.address,
        transactionBlock: (() => {
          const tx = new Transaction();
          tx.moveCall({
            target: `${CONTRACTS.PACKAGE_ID}::${MODULES.USDC_COIN}::get_last_mint_time`,
            arguments: [
              tx.object(CONTRACTS.USDC_MINT_CONTROLLER),
              tx.pure.address(account.address),
            ],
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
 * Hook to get MAX_MINT_AMOUNT constant
 */
export function useMaxMintAmount() {
  const client = useSuiClient();
  const account = useCurrentAccount();

  return useQuery({
    queryKey: ['max-mint-amount'],
    queryFn: async () => {
      if (!account) return null;

      const result = await client.devInspectTransactionBlock({
        sender: account.address,
        transactionBlock: (() => {
          const tx = new Transaction();
          tx.moveCall({
            target: `${CONTRACTS.PACKAGE_ID}::${MODULES.USDC_COIN}::max_mint_amount`,
            arguments: [],
          });
          return tx;
        })(),
      });

      if (result.results && result.results[0]?.returnValues) {
        const value = result.results[0].returnValues[0][0] as number[];
        const maxAmount = Number(hexToU64LE(value));
        return {
          maxMintAmount: (maxAmount / 10 ** USDC_DECIMALS).toString(),
          maxMintAmountRaw: BigInt(maxAmount),
        };
      }

      return null;
    },
    enabled: !!account,
  });
}

/**
 * Hook to get MINT_COOLDOWN constant
 */
export function useMintCooldown() {
  const client = useSuiClient();
  const account = useCurrentAccount();

  return useQuery({
    queryKey: ['mint-cooldown'],
    queryFn: async () => {
      if (!account) return null;

      const result = await client.devInspectTransactionBlock({
        sender: account.address,
        transactionBlock: (() => {
          const tx = new Transaction();
          tx.moveCall({
            target: `${CONTRACTS.PACKAGE_ID}::${MODULES.USDC_COIN}::mint_cooldown`,
            arguments: [],
          });
          return tx;
        })(),
      });

      if (result.results && result.results[0]?.returnValues) {
        const value = result.results[0].returnValues[0][0] as number[];
        return Number(hexToU64LE(value)) / 1000; // 转换为秒
      }

      return 0;
    },
    enabled: !!account,
  });
}

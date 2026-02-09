import { useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CONTRACTS, MODULES, USDC_DECIMALS, USDC_COIN_TYPE } from '../config';

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
    refetchInterval: 5000, // 每 5 秒刷新一次
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

    const amountInSmallestUnit = BigInt(Math.floor(parseFloat(amount) * 10 ** USDC_DECIMALS));

    const tx = new Transaction();
    tx.moveCall({
      target: `${CONTRACTS.PACKAGE_ID}::${MODULES.USDC_COIN}::mint`,
      arguments: [
        tx.object(CONTRACTS.USDC_MINT_CONTROLLER),
        tx.pure.u64(amountInSmallestUnit),
      ],
    });

    const result = await signAndExecute({
      transaction: tx,
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

      // 调用 view function
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
        const value = result.results[0].returnValues[0][0];
        const lastMintTime = Number(BigInt(`0x${Buffer.from(value).toString('hex')}`));
        return lastMintTime;
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
        const value = result.results[0].returnValues[0][0];
        const maxAmount = Number(BigInt(`0x${Buffer.from(value).toString('hex')}`));
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
        const value = result.results[0].returnValues[0][0];
        const cooldown = Number(BigInt(`0x${Buffer.from(value).toString('hex')}`));
        return cooldown / 1000; // 转换为秒
      }

      return 0;
    },
    enabled: !!account,
  });
}

// Note: Sui 不需要 approve，因为使用 Coin 对象直接转移
// 所以移除了 useUSDCAllowance 和 useApproveUSDC

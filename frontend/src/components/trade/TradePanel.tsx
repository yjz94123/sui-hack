import { useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { placeBuyOrder } from '../../api';
import {
  CONTRACTS,
  MAX_MINT_AMOUNT,
  useApproveUSDC,
  useMintUSDC,
  useUSDCAllowance,
  useUSDCBalance,
} from '../../contracts';
import { parseUSDC } from '../../contracts/utils';

interface TradePanelProps {
  marketId: string;
  yesPrice: number;
  noPrice: number;
}

export function TradePanel({ marketId: _marketId, yesPrice, noPrice }: TradePanelProps) {
  const { address, isConnected } = useAccount();
  const [side, setSide] = useState<'yes' | 'no'>('yes');
  const [amount, setAmount] = useState('');
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [tradeSuccess, setTradeSuccess] = useState<string | null>(null);

  const { balance, balanceRaw, refetch: refetchBalance } = useUSDCBalance(address);
  const {
    allowance,
    allowanceRaw,
    refetch: refetchAllowance,
  } = useUSDCAllowance(address, CONTRACTS.TradingHub.address);

  const {
    mint,
    isPending: isMinting,
    isSuccess: mintSuccess,
    error: mintError,
  } = useMintUSDC();
  const {
    approve,
    isPending: isApproving,
    isSuccess: approveSuccess,
    error: approveError,
  } = useApproveUSDC();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentPrice = side === 'yes' ? yesPrice : noPrice;
  const shares = amount ? parseFloat(amount) / currentPrice : 0;

  const amountRaw = useMemo(() => {
    if (!amount || Number(amount) <= 0) return 0n;
    try {
      return parseUSDC(amount);
    } catch {
      return 0n;
    }
  }, [amount]);

  const hasAllowance = amountRaw > 0n && allowanceRaw ? allowanceRaw >= amountRaw : false;
  const hasBalance = amountRaw > 0n && balanceRaw ? balanceRaw >= amountRaw : false;
  const mintTarget = amount && Number(amount) > 0
    ? Math.min(Number(amount), MAX_MINT_AMOUNT)
    : Math.min(1000, MAX_MINT_AMOUNT);
  const approveTarget = amount && Number(amount) > 0 ? Number(amount) : MAX_MINT_AMOUNT;

  useEffect(() => {
    if (mintSuccess) {
      refetchBalance();
    }
  }, [mintSuccess, refetchBalance]);

  useEffect(() => {
    if (approveSuccess) {
      refetchAllowance();
    }
  }, [approveSuccess, refetchAllowance]);

  const handleTrade = async () => {
    if (!isConnected || !address || !amount) return;
    const amountNumber = Number(amount);
    if (!amountNumber || amountNumber <= 0) return;

    setTradeError(null);
    setTradeSuccess(null);
    setIsSubmitting(true);
    try {
      const result = await placeBuyOrder({
        userAddress: address,
        marketId: _marketId,
        outcome: side === 'yes' ? 'YES' : 'NO',
        usdcAmount: amountNumber,
      });
      const txHash = result.data?.txHash;
      setTradeSuccess(txHash ? `Order submitted: ${txHash}` : 'Order submitted');
    } catch (err: any) {
      setTradeError(err?.message || 'Trade failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <h3 className="text-sm font-medium text-fg-primary mb-3">Trade</h3>

      {/* Side selector */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => setSide('yes')}
          className={`py-2 rounded-lg text-sm font-medium transition ${
            side === 'yes'
              ? 'bg-green-600 text-white'
              : 'bg-elevated text-fg-secondary hover:text-fg-primary'
          }`}
        >
          Yes {(yesPrice * 100).toFixed(0)}c
        </button>
        <button
          onClick={() => setSide('no')}
          className={`py-2 rounded-lg text-sm font-medium transition ${
            side === 'no'
              ? 'bg-red-600 text-white'
              : 'bg-elevated text-fg-secondary hover:text-fg-primary'
          }`}
        >
          No {(noPrice * 100).toFixed(0)}c
        </button>
      </div>

      {/* Amount input */}
      <div className="mb-3">
        <label className="text-xs text-fg-muted mb-1 block">Amount (USDC)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full bg-elevated border border-border-strong rounded-lg px-3 py-2 text-fg-primary text-sm focus:outline-none focus:border-primary-500"
        />
      </div>

      {/* Balance & Allowance */}
      {isConnected && (
        <div className="mb-3 space-y-1 text-xs text-fg-secondary">
          <div className="flex items-center justify-between">
            <span>USDC Balance</span>
            <span>{balance} USDC</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Allowance</span>
            <span>{allowance} USDC</span>
          </div>
        </div>
      )}

      {/* Mint & Approve */}
      {isConnected && (
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => address && mint(address, mintTarget.toString())}
            disabled={!address || isMinting || mintTarget <= 0}
            className="flex-1 py-2 rounded-lg bg-elevated text-fg-primary text-sm hover:bg-elevated/80 disabled:opacity-50 transition border border-border-strong"
          >
            {isMinting ? 'Minting...' : `Mint ${mintTarget} USDC`}
          </button>
          <button
            type="button"
            onClick={() => approve(CONTRACTS.TradingHub.address, approveTarget.toString())}
            disabled={isApproving || approveTarget <= 0}
            className="flex-1 py-2 rounded-lg bg-elevated text-fg-primary text-sm hover:bg-elevated/80 disabled:opacity-50 transition border border-border-strong"
          >
            {isApproving ? 'Approving...' : `Approve ${approveTarget} USDC`}
          </button>
        </div>
      )}

      {/* Estimated shares */}
      {shares > 0 && (
        <div className="mb-4 text-xs text-fg-secondary">
          Est. shares: {shares.toFixed(2)} @ {(currentPrice * 100).toFixed(0)}c
        </div>
      )}

      {/* Trade button */}
      {isConnected ? (
        <button
          onClick={handleTrade}
          disabled={
            !amount ||
            parseFloat(amount) <= 0 ||
            !hasAllowance ||
            !hasBalance ||
            isSubmitting
          }
          className="w-full py-2.5 rounded-lg bg-primary-600 text-white font-medium text-sm hover:bg-primary-500 disabled:opacity-50 transition"
        >
          {isSubmitting ? 'Submitting...' : `Buy ${side === 'yes' ? 'Yes' : 'No'}`}
        </button>
      ) : (
        <p className="text-center text-sm text-fg-muted">Connect wallet to trade</p>
      )}

      {(mintError || approveError || tradeError) && (
        <p className="mt-3 text-xs text-red-400">
          {tradeError || approveError?.message || mintError?.message}
        </p>
      )}
      {isConnected && amount && Number(amount) > 0 && (!hasBalance || !hasAllowance) && (
        <p className="mt-3 text-xs text-amber-400">
          {!hasBalance && 'Insufficient USDC balance.'}{' '}
          {!hasAllowance && 'Approve TradingHub to spend USDC.'}
        </p>
      )}
      {tradeSuccess && (
        <p className="mt-3 text-xs text-green-400">{tradeSuccess}</p>
      )}
    </div>
  );
}

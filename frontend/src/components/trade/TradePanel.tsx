import { useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { MAX_MINT_AMOUNT, useMintUSDC, usePlaceOrder, useUSDCBalance } from '../../contracts';
import { parseUSDC } from '../../contracts/utils';

interface BasResult {
  bas: number;
  posterior: number;
  fairLow: number;
  fairHigh: number;
}

interface TradePanelProps {
  marketId: string;
  yesPrice: number;
  noPrice: number;
  basResult?: BasResult | null;
}

export function TradePanel({ marketId, yesPrice, noPrice, basResult }: TradePanelProps) {
  const account = useCurrentAccount();
  const address = account?.address;
  const isConnected = Boolean(account);

  const [side, setSide] = useState<'yes' | 'no'>('yes');
  const [amount, setAmount] = useState('');
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [tradeSuccess, setTradeSuccess] = useState<string | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);

  const { data: balanceData, refetch: refetchBalance } = useUSDCBalance();
  const balance = balanceData?.balance ?? '0';
  const balanceRaw = balanceData?.balanceRaw ?? 0n;

  const { mint, isPending: isMinting } = useMintUSDC();
  const { placeOrder, isPending: isPlacing } = usePlaceOrder();

  const numericAmount = Number(amount);
  const currentPrice = side === 'yes' ? yesPrice : noPrice;
  const shares = numericAmount > 0 && currentPrice > 0 ? numericAmount / currentPrice : 0;

  const amountRaw = useMemo(() => {
    if (!amount || Number(amount) <= 0) return 0n;
    try {
      return parseUSDC(amount);
    } catch {
      return 0n;
    }
  }, [amount]);

  const hasBalance = amountRaw > 0n && balanceRaw >= amountRaw;
  const mintTarget =
    amount && Number(amount) > 0
      ? Math.min(Number(amount), MAX_MINT_AMOUNT)
      : Math.min(1000, MAX_MINT_AMOUNT);

  const quickAmounts = [25, 100, 250, 500];

  const handleMint = async () => {
    if (!isConnected) return;

    setMintError(null);
    try {
      await mint(mintTarget.toString());
      await refetchBalance();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Mint failed';
      setMintError(message);
    }
  };

  const handleTrade = async () => {
    if (!isConnected || !address || !amount) return;
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return;

    setTradeError(null);
    setTradeSuccess(null);

    try {
      const priceBps = Math.round(currentPrice * 10000);
      const result = await placeOrder({
        marketId,
        outcome: side === 'yes' ? 'YES' : 'NO',
        amount: amount,
        priceBps,
      });

      setTradeSuccess(`Order submitted: ${result.digest}`);
      setAmount('');
      await refetchBalance();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Trade failed';
      setTradeError(message);
    }
  };

  return (
    <div className="app-panel p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold tracking-tight text-fg-primary">Trade Ticket</h3>
        <span className="rounded-full border border-border bg-elevated px-2.5 py-1 text-xs text-fg-secondary">
          Market: {marketId.slice(0, 8)}
        </span>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-elevated/55 p-1">
          <button
            type="button"
            onClick={() => setSide('yes')}
            className={clsx(
              'rounded-lg px-3 py-2 text-sm font-medium transition',
              side === 'yes'
                ? 'bg-success text-white shadow-sm shadow-success/35'
                : 'text-fg-secondary hover:text-fg-primary'
            )}
          >
            Yes {(yesPrice * 100).toFixed(1)}¢
          </button>
          <button
            type="button"
            onClick={() => setSide('no')}
            className={clsx(
              'rounded-lg px-3 py-2 text-sm font-medium transition',
              side === 'no'
                ? 'bg-danger text-white shadow-sm shadow-danger/35'
                : 'text-fg-secondary hover:text-fg-primary'
            )}
          >
            No {(noPrice * 100).toFixed(1)}¢
          </button>
        </div>

        {basResult && basResult.bas >= 40 && (() => {
          const impliedYes = yesPrice;
          const suggestYes = impliedYes < basResult.fairLow;
          const suggestNo = impliedYes > basResult.fairHigh;
          if (!suggestYes && !suggestNo) return null;

          const direction = suggestYes ? 'YES' : 'NO';
          const isHighEdge = basResult.bas >= 70;
          const borderClass = isHighEdge
            ? 'border-success/40 bg-success/10'
            : 'border-accent/35 bg-accent-soft/70';
          const textClass = isHighEdge ? 'text-success' : 'text-accent';

          return (
            <div className={clsx('rounded-xl border px-3 py-2.5', borderClass)}>
              <div className="flex items-center justify-between">
                <span className={clsx('text-xs font-semibold', textClass)}>
                  BAS {basResult.bas.toFixed(0)} — AI suggests {direction}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-fg-secondary">
                Fair range: {(basResult.fairLow * 100).toFixed(1)}% – {(basResult.fairHigh * 100).toFixed(1)}% | Market: {(impliedYes * 100).toFixed(1)}%
              </p>
            </div>
          );
        })()}

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fg-muted">Amount (USDC)</label>
          <input
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="app-input"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {quickAmounts.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setAmount(value.toString())}
              className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-fg-secondary transition hover:text-fg-primary"
            >
              ${value}
            </button>
          ))}
        </div>

        {isConnected && (
          <div className="app-muted-panel space-y-2 p-3 text-xs">
            <div className="flex items-center justify-between text-fg-secondary">
              <span>USDC Balance</span>
              <span className="font-medium text-fg-primary">{balance} USDC</span>
            </div>
            <div className="flex items-center justify-between text-fg-secondary">
              <span>Estimated shares</span>
              <span className="font-medium text-fg-primary">{shares > 0 ? shares.toFixed(2) : '--'}</span>
            </div>
            <div className="flex items-center justify-between text-fg-secondary">
              <span>Entry price</span>
              <span className="font-medium text-fg-primary">{(currentPrice * 100).toFixed(1)}¢</span>
            </div>
          </div>
        )}

        {isConnected && (
          <button
            type="button"
            onClick={handleMint}
            disabled={!address || isMinting || mintTarget <= 0}
            className="app-btn-secondary h-10 w-full"
          >
            {isMinting ? 'Minting...' : `Mint ${mintTarget} USDC`}
          </button>
        )}

        {isConnected ? (
          <button
            type="button"
            onClick={handleTrade}
            disabled={!amount || Number(amount) <= 0 || !hasBalance || isPlacing}
            className="app-btn-primary h-11 w-full text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isPlacing ? 'Submitting...' : `Buy ${side === 'yes' ? 'Yes' : 'No'}`}
          </button>
        ) : (
          <div className="app-muted-panel px-4 py-3 text-center text-sm text-fg-muted">
            Connect wallet to place orders.
          </div>
        )}

        {(mintError || tradeError) && (
          <div className="rounded-lg border border-danger/35 bg-danger/10 px-3 py-2 text-xs text-danger">
            {tradeError || mintError}
          </div>
        )}

        {isConnected && amount && Number(amount) > 0 && !hasBalance && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            Insufficient USDC balance. Mint more test USDC before submitting.
          </div>
        )}

        {tradeSuccess && (
          <div className="rounded-lg border border-success/35 bg-success/10 px-3 py-2 text-xs text-success">
            {tradeSuccess}
          </div>
        )}
      </div>
    </div>
  );
}

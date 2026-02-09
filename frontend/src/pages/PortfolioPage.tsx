import { useWalletStore } from '../stores';
import { TradeHistory } from '../components/trade';
import { PositionList } from '../components/portfolio';

export function PortfolioPage() {
  const { isConnected, address } = useWalletStore();

  if (!isConnected || !address) {
    return (
      <div className="text-center py-16">
        <h2 className="text-lg text-fg-primary mb-2">Connect Wallet</h2>
        <p className="text-fg-secondary text-sm">
          Please connect your wallet to view portfolio.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-fg-primary mb-6">Portfolio</h1>

      {/* Positions */}
      <section className="mb-8">
        <h2 className="text-lg font-medium text-fg-primary mb-4">Open Positions</h2>
        <PositionList positions={[]} isLoading={false} />
      </section>

      {/* Trade History */}
      <section>
        <h2 className="text-lg font-medium text-fg-primary mb-4">Trade History</h2>
        <div className="bg-surface rounded-xl border border-border p-4">
          <TradeHistory trades={[]} isLoading={false} />
        </div>
        <p className="text-xs text-fg-muted mt-2">
          Trade records are persisted on 0G Storage for immutable access.
        </p>
      </section>
    </div>
  );
}

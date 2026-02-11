import React from 'react';
import { Wallet2, BarChart3 } from 'lucide-react';
import { useCurrentAccount } from '@mysten/dapp-kit';

const Portfolio: React.FC = () => {
  const account = useCurrentAccount();

  return (
    <div className="space-y-6">
      <section className="app-panel px-5 py-6 sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.19em] text-fg-muted">Portfolio</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-fg-primary sm:text-[2rem]">Positions, PnL, and fills</h1>
        <p className="mt-2 max-w-2xl text-sm text-fg-secondary">
          This section will track your open prediction positions and execution history.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="app-panel p-5">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Wallet2 className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-fg-primary">Wallet status</h2>
          <p className="mt-2 text-sm text-fg-secondary">
            {account
              ? `Connected: ${account.address.slice(0, 6)}...${account.address.slice(-4)}`
              : 'Connect your wallet from the top bar to view balances and positions.'}
          </p>
        </div>

        <div className="app-panel p-5">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <BarChart3 className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-fg-primary">Performance panel</h2>
          <p className="mt-2 text-sm text-fg-secondary">
            Advanced analytics and order history UI will be added in a follow-up iteration.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Portfolio;

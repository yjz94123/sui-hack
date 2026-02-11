import { ConnectButton as SuiConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { useTranslation } from 'react-i18next';

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function ConnectButton() {
  const { t } = useTranslation();
  const account = useCurrentAccount();

  return (
    <div className="flex items-center gap-2">
      {account && (
        <div className="hidden items-center gap-2 rounded-xl border border-border bg-surface/90 px-3 py-2.5 text-xs text-fg-secondary sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          <span className="font-medium text-fg-primary">{shortenAddress(account.address)}</span>
        </div>
      )}

      <SuiConnectButton
        connectText={t('common.connectWallet')}
        className="app-btn-wallet h-10 whitespace-nowrap rounded-2xl px-4 text-sm font-semibold tracking-[0.01em]"
      />
    </div>
  );
}

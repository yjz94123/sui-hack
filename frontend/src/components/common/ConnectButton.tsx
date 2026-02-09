import { ConnectButton as SuiConnectButton, useCurrentAccount } from '@mysten/dapp-kit';

export function ConnectButton() {
  const account = useCurrentAccount();

  return (
    <div className="flex items-center gap-3">
      {account && (
        <div className="text-sm text-fg-secondary">
          {account.address.slice(0, 6)}...{account.address.slice(-4)}
        </div>
      )}
      <SuiConnectButton />
    </div>
  );
}

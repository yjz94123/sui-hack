import { Link } from 'react-router-dom';
import { useWalletStore } from '../../stores';
import { ConnectButton } from '../common/ConnectButton';

export function Header() {
  const { isConnected, address } = useWalletStore();

  return (
    <header className="border-b border-border bg-base/80 backdrop-blur sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary-500">OG Predict</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-6">
          <Link to="/" className="text-fg-secondary hover:text-fg-primary transition">
            Markets
          </Link>
          {isConnected && (
            <Link to="/portfolio" className="text-fg-secondary hover:text-fg-primary transition">
              Portfolio
            </Link>
          )}
        </nav>

        {/* Wallet */}
        <div className="flex items-center gap-3">
          {isConnected && address ? (
            <span className="text-sm text-fg-secondary">
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
          ) : null}
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}

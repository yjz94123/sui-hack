// Contract configuration
export { CONTRACTS, MODULES, OUTCOME, USDC_DECIMALS, MAX_MINT_AMOUNT, MINT_COOLDOWN, USDC_COIN_TYPE } from './config';

// USDC hooks
export {
  useUSDCBalance,
  useMintUSDC,
  useLastMintTime,
  useMaxMintAmount,
  useMintCooldown,
} from './hooks/useUSDC';

// TradingHub hooks
export {
  useOrder,
  useUserOrders,
  useMarketOrders,
  useUserMarketOrders,
  useTotalOrders,
  useWatchOrderPlaced,
  useWatchOrderSettled,
  useWatchMarketSettled,
  useTradingHubEvents,
} from './hooks/useTradingHub';

// Types
export type { Order } from './hooks/useTradingHub';

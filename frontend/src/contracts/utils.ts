import { parseUnits, formatUnits } from 'viem';
import { USDC_DECIMALS, MINT_COOLDOWN } from './config';

function isHexString(value: string): boolean {
  return /^[0-9a-fA-F]+$/.test(value);
}

/**
 * Format USDC amount from wei to human-readable string
 */
export function formatUSDC(amount: bigint | string, decimals = 2): string {
  const value = typeof amount === 'string' ? amount : formatUnits(amount, USDC_DECIMALS);
  return Number(value).toFixed(decimals);
}

/**
 * Parse USDC amount from human-readable string to wei
 */
export function parseUSDC(amount: string): bigint {
  return parseUnits(amount, USDC_DECIMALS);
}

/**
 * Check if user can mint USDC based on last mint time
 */
export function canMint(lastMintTime: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now - lastMintTime >= MINT_COOLDOWN;
}

/**
 * Get remaining cooldown time in seconds
 */
export function getRemainingCooldown(lastMintTime: number): number {
  const now = Math.floor(Date.now() / 1000);
  const elapsed = now - lastMintTime;
  const remaining = MINT_COOLDOWN - elapsed;
  return Math.max(0, remaining);
}

/**
 * Format cooldown time to human-readable string
 */
export function formatCooldown(seconds: number): string {
  if (seconds <= 0) return 'Ready';

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

/**
 * Convert market ID to bytes32 format
 */
export function normalizeMarketIdBytes32(marketId?: string): `0x${string}` | undefined {
  if (!marketId) return undefined;
  const cleanId = marketId.replace(/^0x/, '');
  if (!isHexString(cleanId)) return undefined;
  if (cleanId.length > 64) return undefined;
  const paddedId = cleanId.padStart(64, '0');
  return `0x${paddedId}`;
}

export function marketIdToBytes32(marketId: string): `0x${string}` {
  const normalized = normalizeMarketIdBytes32(marketId);
  if (!normalized) {
    throw new Error('Invalid marketId hex string');
  }
  return normalized;
}

/**
 * Convert bytes32 to market ID string
 */
export function bytes32ToMarketId(bytes32: `0x${string}`): string {
  return bytes32.replace(/^0x/, '');
}

/**
 * Format order outcome to human-readable string
 */
export function formatOutcome(outcome: number): 'YES' | 'NO' {
  return outcome === 1 ? 'YES' : 'NO';
}

/**
 * Format timestamp to readable date string
 */
export function formatOrderDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

/**
 * Calculate potential payout for an order
 */
export function calculatePayout(amount: string | bigint): string {
  const amountNum = typeof amount === 'string' ? parseFloat(amount) : parseFloat(formatUSDC(amount));
  return (amountNum * 2).toFixed(2);
}

/**
 * Shorten address for display
 */
export function shortenAddress(address: string, chars = 4): string {
  return `${address.substring(0, chars + 2)}...${address.substring(42 - chars)}`;
}

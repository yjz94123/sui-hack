export const SUPPORTED_SUI_NETWORKS = ['testnet', 'mainnet', 'devnet'] as const;

export type SupportedSuiNetwork = (typeof SUPPORTED_SUI_NETWORKS)[number];
export type SupportedSuiChain = `sui:${SupportedSuiNetwork}`;

export function parseSuiNetwork(value: string | undefined | null): SupportedSuiNetwork {
  if (!value) return 'testnet';
  const normalized = value.trim().toLowerCase();
  if (SUPPORTED_SUI_NETWORKS.includes(normalized as SupportedSuiNetwork)) {
    return normalized as SupportedSuiNetwork;
  }
  return 'testnet';
}

export function toSuiChain(network: SupportedSuiNetwork): SupportedSuiChain {
  return `sui:${network}`;
}

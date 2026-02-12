import { getFullnodeUrl } from '@mysten/sui/client';
import { createNetworkConfig } from '@mysten/dapp-kit';
import { parseSuiNetwork, toSuiChain } from './network';

const { networkConfig, useNetworkVariable, useNetworkVariables } = createNetworkConfig({
  testnet: {
    url: getFullnodeUrl('testnet'),
  },
  mainnet: {
    url: getFullnodeUrl('mainnet'),
  },
  devnet: {
    url: getFullnodeUrl('devnet'),
  },
});

export { networkConfig, useNetworkVariable, useNetworkVariables };

const env = (import.meta as { env?: Record<string, string | undefined> }).env;
export const defaultNetwork = parseSuiNetwork(env?.VITE_SUI_NETWORK);
export const defaultChain = toSuiChain(defaultNetwork);

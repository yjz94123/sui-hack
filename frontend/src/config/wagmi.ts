import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { defineChain, fallback, http } from 'viem';

const rpcUrls = (import.meta.env.VITE_OG_RPC_URLS as string | undefined)
  ?.split(',')
  .map((url) => url.trim())
  .filter(Boolean) ?? ['https://rpc.ankr.com/0g_galileo_testnet_evm'];

export const zeroGTestnet = defineChain({
  id: 16602, // 0G Newton Testnet Chain ID
  name: '0G Testnet',
  network: '0g-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'A0GI',
    symbol: 'A0GI',
  },
  rpcUrls: {
    default: { http: rpcUrls },
    public: { http: rpcUrls },
  },
  blockExplorers: {
    default: { name: '0G Explorer', url: 'https://scan-testnet.0g.ai' },
  },
  testnet: true,
});

export const config = getDefaultConfig({
  appName: '0G Prediction Market',
  projectId: 'YOUR_PROJECT_ID', // Replaced with a placeholder, user should update
  chains: [zeroGTestnet],
  transports: {
    [zeroGTestnet.id]: fallback(
      rpcUrls.map((url) =>
        http(url, {
          retryCount: 2,
          retryDelay: 1000,
          timeout: 15_000,
        })
      )
    ),
  },
});

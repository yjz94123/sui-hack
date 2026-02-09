import dotenv from 'dotenv';
dotenv.config();

export const config = {
  host: process.env.HOST || '0.0.0.0',
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL!,
  },

  polymarket: {
    gammaBaseUrl: process.env.POLYMARKET_GAMMA_BASE_URL || 'https://gamma-api.polymarket.com',
    clobBaseUrl: process.env.POLYMARKET_CLOB_BASE_URL || 'https://clob.polymarket.com',
  },

  og: {
    rpcUrl: process.env.OG_RPC_URL || 'https://evmrpc-testnet.0g.ai/',
    storage: {
      indexerRpc: process.env.OG_STORAGE_INDEXER_RPC || 'https://indexer-storage-testnet-turbo.0g.ai',
      privateKey: process.env.STORAGE_PRIVATE_KEY!,
      kvStreamId: process.env.OG_KV_STREAM_ID!,
      kvNodeRpc: process.env.OG_KV_NODE_RPC!,
    },
    compute: {
      privateKey: process.env.COMPUTE_PRIVATE_KEY!,
      apiKey: process.env.OG_COMPUTE_API_KEY || '',
      baseUrl: process.env.OG_COMPUTE_BASE_URL || 'https://compute-network-6.integratenetwork.work/v1/proxy',
      model: process.env.OG_COMPUTE_MODEL || 'qwen/qwen-2.5-7b-instruct',
      maxTokens: parseInt(process.env.OG_COMPUTE_MAX_TOKENS || '4096', 10),
    },
  },

  contracts: {
    demoUsdcAddress: process.env.DEMO_USDC_ADDRESS!,
    tradingHubAddress: process.env.TRADING_HUB_ADDRESS!,
  },

  oracle: {
    privateKey: process.env.ORACLE_PRIVATE_KEY!,
  },

  sync: {
    eventsIntervalMs: parseInt(process.env.SYNC_EVENTS_INTERVAL_MS || '300000', 10),
    orderbookHotIntervalMs: parseInt(process.env.SYNC_ORDERBOOK_HOT_INTERVAL_MS || '30000', 10),
    orderbookColdIntervalMs: parseInt(process.env.SYNC_ORDERBOOK_COLD_INTERVAL_MS || '120000', 10),
    priceIntervalMs: parseInt(process.env.SYNC_PRICE_INTERVAL_MS || '30000', 10),
    oracleCheckIntervalMs: parseInt(process.env.ORACLE_CHECK_INTERVAL_MS || '300000', 10),
    snapshotIntervalMs: parseInt(process.env.SNAPSHOT_INTERVAL_MS || '1800000', 10),
  },

} as const;

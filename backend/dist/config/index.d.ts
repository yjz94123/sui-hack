export declare const config: {
    readonly host: string;
    readonly port: number;
    readonly nodeEnv: string;
    readonly database: {
        readonly url: string;
    };
    readonly polymarket: {
        readonly gammaBaseUrl: string;
        readonly clobBaseUrl: string;
    };
    readonly og: {
        readonly rpcUrl: string;
        readonly storage: {
            readonly indexerRpc: string;
            readonly privateKey: string;
            readonly kvStreamId: string;
            readonly kvNodeRpc: string;
        };
        readonly compute: {
            readonly privateKey: string;
            readonly apiKey: string;
            readonly baseUrl: string;
            readonly model: string;
            readonly maxTokens: number;
        };
    };
    readonly contracts: {
        readonly demoUsdcAddress: string;
        readonly tradingHubAddress: string;
    };
    readonly oracle: {
        readonly privateKey: string;
    };
    readonly sync: {
        readonly eventsIntervalMs: number;
        readonly orderbookHotIntervalMs: number;
        readonly orderbookColdIntervalMs: number;
        readonly priceIntervalMs: number;
        readonly oracleCheckIntervalMs: number;
        readonly snapshotIntervalMs: number;
    };
};
//# sourceMappingURL=index.d.ts.map
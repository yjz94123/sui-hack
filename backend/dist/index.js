"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
const sync_1 = require("./services/sync");
async function main() {
    // Start Express server
    app_1.app.listen(config_1.config.port, config_1.config.host, () => {
        logger_1.logger.info(`Server running on http://${config_1.config.host}:${config_1.config.port}`);
        logger_1.logger.info(`Environment: ${config_1.config.nodeEnv}`);
    });
    // Scheduled tasks (sync/caching)
    sync_1.dataSyncer.start();
    setInterval(() => {
        sync_1.orderBookCache.refreshHotMarkets().catch((err) => logger_1.logger.error({ err }, 'OrderBook refresh failed'));
    }, config_1.config.sync.orderbookHotIntervalMs);
    setInterval(() => {
        sync_1.orderBookCache.cleanup();
    }, Math.max(config_1.config.sync.orderbookColdIntervalMs, 60_000));
    logger_1.logger.info('All services initialized');
}
main().catch((err) => {
    logger_1.logger.error(err, 'Failed to start server');
    process.exit(1);
});
//# sourceMappingURL=index.js.map
import { app } from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { dataSyncer, orderBookCache } from './services/sync';

async function main() {
  // Start Express server
  app.listen(config.port, config.host, () => {
    logger.info(`Server running on http://${config.host}:${config.port}`);
    logger.info(`Environment: ${config.nodeEnv}`);
  });

  // Scheduled tasks (sync/caching)
  dataSyncer.start();

  setInterval(() => {
    orderBookCache.refreshHotMarkets().catch((err) => logger.error({ err }, 'OrderBook refresh failed'));
  }, config.sync.orderbookHotIntervalMs);

  setInterval(() => {
    orderBookCache.cleanup();
  }, Math.max(config.sync.orderbookColdIntervalMs, 60_000));

  logger.info('All services initialized');
}

main().catch((err) => {
  logger.error(err, 'Failed to start server');
  process.exit(1);
});

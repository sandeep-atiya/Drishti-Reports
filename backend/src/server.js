import env from './config/env.config.js';
import app from './app.js';
import { connectMSSQL, connectPostgres, closeMSSQL, closePG } from './connections/index.js';
import { closeRedis } from './config/redis.js';
import { closeSQLite } from './config/sqlite.js';
import { startSyncSchedule, stopSyncSchedule } from './jobs/syncJob.js';
import { warmCache } from './jobs/cacheWarmer.js';
import logger from './utils/logger.js';

const startServer = async () => {
  try {
    await connectMSSQL();
    await connectPostgres();

    // Start SQLite sync (runs immediately in background, then every SYNC_INTERVAL_MINUTES)
    // After each sync, re-warm Redis cache with all common date ranges
    startSyncSchedule(env.SYNC_INTERVAL_MS, () => {
      warmCache().catch((err) => logger.error(`[CacheWarmer] ${err.message}`));
    });

    const server = app.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
      logger.info(`Health check → http://localhost:${env.PORT}/api/v1/health`);
    });

    const shutdown = async (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        stopSyncSchedule();
        await closeMSSQL();
        await closePG();
        await closeRedis();
        closeSQLite();
        logger.info('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      logger.error(`Unhandled Rejection: ${String(reason)}`);
    });

    process.on('uncaughtException', (err) => {
      logger.error(`Uncaught Exception: ${err.message}`);
      process.exit(1);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();

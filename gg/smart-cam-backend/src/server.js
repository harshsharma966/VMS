// Load and validate environment first
const config = require('./config/env');
const logger = require('./config/logger');
const { sequelize } = require('./models');
const app = require('./app');
const recordingSync = require('./services/recordingSync.service');

const PORT = config.port;

async function startServer() {
  try {
    // Verify database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');

    // Sync models — only create tables that don't exist (no alter, avoids MySQL 64-key limit)
    if (config.env === 'development') {
      await sequelize.sync();
      logger.info('Database models synchronized.');
    }

    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${config.env} mode`);
      logger.info(`API available at http://localhost:${PORT}/api`);
      logger.info(`Health check at http://localhost:${PORT}/api/health`);

      // Start recording sync job (Shinobi → S3) after server is ready
      recordingSync.start();
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);

      server.close(async () => {
        logger.info('HTTP server closed.');
        recordingSync.stop();
        await sequelize.close();
        logger.info('Database connection closed.');
        process.exit(0);
      });

      // Force shutdown after 10s
      setTimeout(() => {
        logger.error('Forced shutdown after timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer();

const http = require('http');
const { Server } = require('socket.io');

const app = require('./app');
const connectDB = require('./config/db');
const { port, clientUrl } = require('./config/env');
const logger = require('./utils/logger');
const registerLiveScoringHandlers = require('./sockets/liveScoring');

async function start() {
  await connectDB();

  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: clientUrl,
      credentials: true,
    },
  });

  registerLiveScoringHandlers(io);

  // Make io available to REST controllers (e.g. scoringController emits via req.app.get('io'))
  app.set('io', io);

  server.listen(port, () => {
    logger.info(`Cricket backend listening on port ${port}`);
  });

  const shutdown = (signal) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error(`Unhandled Rejection: ${reason}`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err);
  process.exit(1);
});

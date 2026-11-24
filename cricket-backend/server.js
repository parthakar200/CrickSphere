const http = require('http');
const { Server } = require('socket.io');

const app = require('./app');
const connectDB = require('./config/db');
const { port, clientUrl } = require('./config/env');
const logger = require('./utils/logger');
const registerLiveScoringHandlers = require('./sockets/liveScoring');
const { startAutoSync } = require('./services/playerSyncService');
const { ensureDefaultLocalities } = require('./services/localityService');

async function start() {
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const cleanOrigin = origin.replace(/\/$/, '');
        const configured = (clientUrl || '')
          .split(',')
          .map((u) => u.trim().replace(/\/$/, ''))
          .filter(Boolean);
        if (
          configured.length === 0 ||
          configured.includes('*') ||
          configured.includes(cleanOrigin) ||
          cleanOrigin.endsWith('.vercel.app') ||
          cleanOrigin.includes('localhost')
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
    },
  });

  registerLiveScoringHandlers(io);

  // Make io available to REST controllers (e.g. scoringController emits via req.app.get('io'))
  app.set('io', io);

  // Bind to 0.0.0.0 immediately so Render detects the open port right away
  server.listen(port, '0.0.0.0', () => {
    logger.info(`Cricket backend listening on port ${port}`);
  });

  await connectDB();
  await ensureDefaultLocalities();
  startAutoSync(); // schedules kpl-auction sync at most 4 times a day (every 6 hours)

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

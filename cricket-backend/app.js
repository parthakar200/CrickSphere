const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');
const rateLimit = require('express-rate-limit');

const { clientUrl, rateLimit: rateLimitConfig, env } = require('./config/env');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { resolveLocality } = require('./middleware/locality');
const logger = require('./utils/logger');

const authRoutes = require('./routes/authRoutes');
const localityRoutes = require('./routes/localityRoutes');
const teamRoutes = require('./routes/teamRoutes');
const playerRoutes = require('./routes/playerRoutes');
const tournamentRoutes = require('./routes/tournamentRoutes');
const matchRoutes = require('./routes/matchRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const statisticsRoutes = require('./routes/statisticsRoutes');
const searchRoutes = require('./routes/searchRoutes');

const app = express();

// ---- Security & infra middleware ----
app.use(helmet());
app.use(
  cors({
    origin: clientUrl,
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(xssClean());

app.use(
  morgan(env === 'production' ? 'combined' : 'dev', {
    stream: { write: (msg) => logger.info(msg.trim()) },
  })
);

const limiter = rateLimit({
  windowMs: rateLimitConfig.windowMs,
  max: rateLimitConfig.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' },
});
app.use('/api', limiter);

// ---- Health check ----
app.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// ---- API routes ----
app.use(resolveLocality);
app.use('/api/localities', localityRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/leaderboards', leaderboardRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/search', searchRoutes);

// ---- 404 + error handling (must be last) ----
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

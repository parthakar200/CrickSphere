/**
 * Real-Time Scoring Architecture (Socket.IO)
 * -----------------------------------------------------------------------
 * Room convention: clients join `match:<matchId>` to receive live updates
 * for that match. Scorers emit `ball:record` / `ball:undo` (auth-checked
 * via JWT passed in the socket handshake); viewers only ever listen.
 *
 * Events emitted to the room:
 *   - ball:scored        { matchId, inningsId, ball, innings }
 *   - ball:undone         { matchId, inningsId, undoneBall, innings }
 *   - strike:rotated      { inningsId, innings }
 *   - innings:completed   { matchId, innings }
 *   - match:completed     { matchId, match }
 *   - commentary:new      { matchId, commentary }
 *   - match:statusChanged { matchId, status }
 * -----------------------------------------------------------------------
 */

const { verifyAccessToken } = require('../utils/jwt');
const { User } = require('../models');
const { recordBall, rotateStrike, undoLastBall, isInningsLocked } = require('../services/scoringService');
const logger = require('../utils/logger');

function registerLiveScoringHandlers(io) {
  // Authenticate the socket handshake using the same JWT access tokens as REST.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        socket.user = null; // allow anonymous viewers (read-only)
        return next();
      }
      const payload = verifyAccessToken(token);
      const user = await User.findById(payload.sub);
      socket.user = user && user.isActive ? user : null;
      next();
    } catch (err) {
      socket.user = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} (user: ${socket.user?.email || 'anonymous'})`);

    socket.on('match:join', ({ matchId }) => {
      if (!matchId) return;
      socket.join(`match:${matchId}`);
      socket.emit('match:joined', { matchId });
    });

    socket.on('match:leave', ({ matchId }) => {
      if (!matchId) return;
      socket.leave(`match:${matchId}`);
    });

    // Scorer/Admin only: record a ball over the socket for lowest-latency live scoring.
    socket.on('ball:record', async ({ matchId, inningsId, payload }, ack) => {
      try {
        if (!socket.user || !['admin', 'scorer'].includes(socket.user.role)) {
          return ack?.({ success: false, message: 'Not authorized to score' });
        }
        if (isInningsLocked(inningsId)) {
          return ack?.({ success: false, message: 'An undo is in progress for this innings — try again in a moment' });
        }

        const result = await recordBall({
          matchId,
          inningsId,
          payload,
          scoredByUserId: socket.user._id,
        });

        io.to(`match:${matchId}`).emit('ball:scored', {
          matchId,
          inningsId,
          ball: result.ball,
          innings: result.innings,
        });
        if (result.inningsJustCompleted) {
          io.to(`match:${matchId}`).emit('innings:completed', { matchId, innings: result.innings });
        }

        ack?.({ success: true });
      } catch (err) {
        logger.error(`ball:record failed: ${err.message}`);
        ack?.({ success: false, message: err.message });
      }
    });

    // Scorer/Admin only: undo the single most recently recorded ball for an innings.
    socket.on('ball:undo', async ({ matchId, inningsId }, ack) => {
      try {
        if (!socket.user || !['admin', 'scorer'].includes(socket.user.role)) {
          return ack?.({ success: false, message: 'Not authorized to undo' });
        }

        const result = await undoLastBall({ matchId, inningsId, scoredByUserId: socket.user._id });

        io.to(`match:${matchId}`).emit('ball:undone', {
          matchId,
          inningsId,
          undoneBall: result.undoneBall,
          innings: result.innings,
        });

        ack?.({ success: true });
      } catch (err) {
        logger.error(`ball:undo failed: ${err.message}`);
        ack?.({ success: false, message: err.message });
      }
    });

    socket.on('strike:rotate', async ({ matchId, inningsId }, ack) => {
      try {
        if (!socket.user || !['admin', 'scorer'].includes(socket.user.role)) {
          return ack?.({ success: false, message: 'Not authorized' });
        }
        if (isInningsLocked(inningsId)) {
          return ack?.({ success: false, message: 'An undo is in progress for this innings — try again in a moment' });
        }
        const innings = await rotateStrike(inningsId);
        io.to(`match:${matchId}`).emit('strike:rotated', { inningsId, innings });
        ack?.({ success: true });
      } catch (err) {
        ack?.({ success: false, message: err.message });
      }
    });

    // Free-text commentary feed, separate from auto-generated ball commentary.
    socket.on('commentary:post', ({ matchId, text }) => {
      if (!socket.user || !['admin', 'scorer'].includes(socket.user.role)) return;
      io.to(`match:${matchId}`).emit('commentary:new', {
        matchId,
        commentary: { text, author: socket.user.name, timestamp: new Date() },
      });
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });
}

module.exports = registerLiveScoringHandlers;

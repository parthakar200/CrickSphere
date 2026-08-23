const { recordBall, rotateStrike, undoLastBall, isInningsLocked } = require('../services/scoringService');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// POST /api/matches/:matchId/innings/:inningsId/ball
const postBall = asyncHandler(async (req, res) => {
  const { matchId, inningsId } = req.params;

  if (isInningsLocked(inningsId)) {
    throw ApiError.badRequest('An undo is in progress for this innings — try again in a moment');
  }

  const result = await recordBall({
    matchId,
    inningsId,
    payload: req.body,
    scoredByUserId: req.user._id,
  });

  // Emit to any connected Socket.IO clients watching this match (see sockets/liveScoring.js)
  const io = req.app.get('io');
  if (io) {
    io.to(`match:${matchId}`).emit('ball:scored', {
      matchId,
      inningsId,
      ball: result.ball,
      innings: result.innings,
    });
    if (result.inningsJustCompleted) {
      io.to(`match:${matchId}`).emit('innings:completed', { matchId, innings: result.innings });
    }
  }

  res.status(201).json({ success: true, data: result });
});

// POST /api/matches/:matchId/innings/:inningsId/undo-last-ball
const postUndoLastBall = asyncHandler(async (req, res) => {
  const { matchId, inningsId } = req.params;

  const result = await undoLastBall({
    matchId,
    inningsId,
    scoredByUserId: req.user._id,
  });

  const io = req.app.get('io');
  if (io) {
    io.to(`match:${matchId}`).emit('ball:undone', {
      matchId,
      inningsId,
      undoneBall: result.undoneBall,
      innings: result.innings,
    });
  }

  res.json({ success: true, data: result });
});

// POST /api/matches/:matchId/innings/:inningsId/rotate-strike
const postRotateStrike = asyncHandler(async (req, res) => {
  if (isInningsLocked(req.params.inningsId)) {
    throw ApiError.badRequest('An undo is in progress for this innings — try again in a moment');
  }

  const innings = await rotateStrike(req.params.inningsId);

  const io = req.app.get('io');
  if (io) {
    io.to(`match:${req.params.matchId}`).emit('strike:rotated', { inningsId: innings._id, innings });
  }

  res.json({ success: true, data: innings });
});

module.exports = { postBall, postUndoLastBall, postRotateStrike };

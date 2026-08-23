const { PointsTable } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/tournaments/:id/points-table
const getPointsTable = asyncHandler(async (req, res) => {
  const rows = await PointsTable.find({ tournament: req.params.id })
    .populate('team', 'name shortName logo')
    .sort({ points: -1, netRunRate: -1 });

  // Assign live position based on current sort order (points, then NRR).
  const ranked = rows.map((row, idx) => ({ ...row.toObject(), position: idx + 1 }));

  res.json({ success: true, data: ranked });
});

module.exports = { getPointsTable };

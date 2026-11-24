const { Locality, Team, Player, Match, Tournament, User } = require('../models');
const { invalidateLocalityCache } = require('../middleware/locality');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/localities
const getLocalities = asyncHandler(async (req, res) => {
  let localities = await Locality.find({ isActive: { $ne: false } }).sort({ isDefault: -1, name: 1 }).lean();

  // Self-healing: if no localities exist yet, create the defaults now.
  if (localities.length === 0) {
    const kudei = await Locality.create({
      name: 'Kudei Village',
      slug: 'kudei',
      description: 'Tournaments, matches, and players of Kudei Village',
      isDefault: true,
      isActive: true,
    });

    // Link any existing unassigned records to Kudei
    const filter = { locality: { $in: [null, undefined] } };
    await Promise.all([
      Tournament.updateMany(filter, { locality: kudei._id }),
      Match.updateMany(filter, { locality: kudei._id }),
      Team.updateMany(filter, { locality: kudei._id }),
      Player.updateMany(filter, { locality: kudei._id }),
      User.updateMany(filter, { locality: kudei._id }),
    ]);

    localities = [kudei];
  }

  res.json({
    success: true,
    data: localities,
  });
});

// GET /api/localities/:idOrSlug
const getLocalityByIdOrSlug = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(idOrSlug);
  const query = isObjectId ? { _id: idOrSlug } : { slug: idOrSlug.toLowerCase() };

  const locality = await Locality.findOne(query);
  if (!locality) throw ApiError.notFound('Locality / Village not found');

  // Also include summary counts
  const [matchCount, tournamentCount, teamCount, playerCount] = await Promise.all([
    Match.countDocuments({ locality: locality._id }),
    Tournament.countDocuments({ locality: locality._id }),
    Team.countDocuments({ locality: locality._id }),
    Player.countDocuments({ locality: locality._id }),
  ]);

  res.json({
    success: true,
    data: {
      ...locality.toObject(),
      stats: { matchCount, tournamentCount, teamCount, playerCount },
    },
  });
});

// POST /api/localities  — public: anyone can register a new village
const createLocality = asyncHandler(async (req, res) => {
  const { name, description, district, state, adminEmail, scorerEmail, password, adminPassword } = req.body;
  const authPassword = password || adminPassword;

  if (!name || !name.trim()) {
    throw ApiError.badRequest('Village / Locality name is required');
  }

  const cleanName = name.trim();
  const slug = (req.body.slug || cleanName)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const existing = await Locality.findOne({
    $or: [{ name: { $regex: new RegExp(`^${cleanName}$`, 'i') } }, { slug }],
  });
  if (existing) {
    throw ApiError.conflict(
      `A village named "${existing.name}" already exists. Please choose it from the dropdown.`
    );
  }

  const cleanAdminEmail = adminEmail ? adminEmail.trim().toLowerCase() : null;
  const cleanScorerEmail = scorerEmail ? scorerEmail.trim().toLowerCase() : null;

  if (cleanAdminEmail && cleanScorerEmail && cleanAdminEmail === cleanScorerEmail) {
    throw ApiError.badRequest('Admin Email and Scorer Email must be different');
  }

  // Pre-check email collisions before creating locality
  if (cleanAdminEmail) {
    const existingAdmin = await User.findOne({ email: cleanAdminEmail });
    if (existingAdmin) {
      throw ApiError.conflict(
        `An account with the email "${cleanAdminEmail}" already exists. Please use a different admin email.`
      );
    }
  }

  if (cleanScorerEmail) {
    const existingScorer = await User.findOne({ email: cleanScorerEmail });
    if (existingScorer) {
      throw ApiError.conflict(
        `An account with the email "${cleanScorerEmail}" already exists. Please use a different scorer email.`
      );
    }
  }

  const locality = await Locality.create({
    name: cleanName,
    slug,
    description: description || `Cricket community of ${cleanName}`,
    district: district ? district.trim() : null,
    state: state ? state.trim() : null,
    isActive: true,
    isDefault: false,
  });

  invalidateLocalityCache();

  let createdAdmin = null;
  let createdScorer = null;

  if (cleanAdminEmail && authPassword) {
    const newAdmin = await User.create({
      name: `${cleanName} Admin`,
      email: cleanAdminEmail,
      password: authPassword,
      role: 'admin',
      locality: locality._id,
    });
    createdAdmin = newAdmin.toSafeObject();
  }

  if (cleanScorerEmail && authPassword) {
    const newScorer = await User.create({
      name: `${cleanName} Scorer`,
      email: cleanScorerEmail,
      password: authPassword,
      role: 'scorer',
      locality: locality._id,
    });
    createdScorer = newScorer.toSafeObject();
  }

  res.status(201).json({
    success: true,
    data: {
      ...locality.toObject(),
      admin: createdAdmin,
      scorer: createdScorer,
    },
  });
});

module.exports = {
  getLocalities,
  getLocalityByIdOrSlug,
  createLocality,
};

// Parses standard query params (page, limit, sort) into Mongoose-ready options.
// Usage: const { skip, limit, sort } = parseQueryOptions(req.query, { defaultSort: '-createdAt' });
function parseQueryOptions(query, { defaultSort = '-createdAt', maxLimit = 100 } = {}) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), maxLimit);
  const skip = (page - 1) * limit;

  let sort = defaultSort;
  if (query.sort) {
    // Accept comma-separated fields, "-field" for descending, e.g. "-runs,player"
    sort = query.sort
      .split(',')
      .map((s) => s.trim())
      .join(' ');
  }

  return { page, limit, skip, sort };
}

// Builds a paginated response envelope.
function buildPaginatedResponse(data, total, page, limit) {
  return {
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  };
}

module.exports = { parseQueryOptions, buildPaginatedResponse };

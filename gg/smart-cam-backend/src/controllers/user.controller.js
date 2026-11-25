const asyncHandler = require('../middleware/asyncHandler');
const { User } = require('../models');
const AppError = require('../utils/AppError');

const getGroupKey = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id, {
    attributes: ['id', 'groupKey', 'apiKey'],
  });

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  if (!user.groupKey) {
    throw new AppError('No active subscription. Please subscribe to a plan first.', 403);
  }

  res.json({ groupKey: user.groupKey, apiKey: user.apiKey });
});

module.exports = { getGroupKey };

const jwt = require('jsonwebtoken');
const config = require('../config/env');
const AppError = require('../utils/AppError');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Allow token as query param for endpoints that browsers load directly
  // (e.g. <video src="/stream?token=..."> cannot send custom headers)
  const token = (authHeader && authHeader.startsWith('Bearer '))
    ? authHeader.split(' ')[1]
    : req.query.token || null;

  if (!token) {
    throw new AppError('Access denied. No token provided.', 401);
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded; // { id, email, role }
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Token expired. Please refresh your token.', 401);
    }
    throw new AppError('Invalid token.', 401);
  }
};

module.exports = authenticate;

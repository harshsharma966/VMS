const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const asyncHandler = require('../middleware/asyncHandler');
const { User, Subscription, Plan, PasswordReset } = require('../models');
const authService = require('../services/auth.service');
const emailService = require('../services/email.service');
const AppError = require('../utils/AppError');
const config = require('../config/env');

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new AppError('An account with this email already exists.', 409);
  }

  // Use the system Shinobi account credentials for all users
  // (single-tenant VMS setup — all cameras managed under one Shinobi account)
  const apiKey  = config.shinobi.apiKey;
  const groupKey = config.shinobi.groupKey;

  // Create user with Shinobi credentials
  const user = await User.create({ name, email, password, groupKey, apiKey });

  // Auto-assign Free plan
  const freePlan = await Plan.findOne({ where: { name: 'Free' } });
  if (freePlan) {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setFullYear(periodEnd.getFullYear() + 100); // Free plan never expires
    await Subscription.create({
      userId: user.id,
      planId: freePlan.id,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    });
  }

  // Generate tokens
  const { accessToken, refreshToken } = await authService.generateTokenPair(user);

  res.status(201).json({
    success: true,
    user: user.toSafeJSON(),
    token: accessToken,
    refreshToken,
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new AppError('Invalid email or password.', 401);
  }

  // Check if active
  if (!user.isActive) {
    throw new AppError('Your account has been deactivated. Please contact support.', 403);
  }

  // Validate password
  const isValid = await user.validatePassword(password);
  if (!isValid) {
    throw new AppError('Invalid email or password.', 401);
  }

  // Generate tokens
  const { accessToken, refreshToken } = await authService.generateTokenPair(user);

  res.json({
    success: true,
    user: user.toSafeJSON(),
    token: accessToken,
    refreshToken,
  });
});

const me = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id, {
    attributes: { exclude: ['password'] },
    include: [
      {
        model: Subscription,
        as: 'subscriptions',
        where: { status: 'active' },
        required: false,
        limit: 1,
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: Plan,
            as: 'plan',
            attributes: ['id', 'name', 'maxCameras', 'maxStorage', 'price', 'billingCycle'],
          },
        ],
      },
    ],
  });

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  const userData = user.toJSON();
  const activeSubscription = userData.subscriptions?.[0] || null;

  res.json({
    success: true,
    user: {
      ...userData,
      subscription: activeSubscription,
      subscriptions: undefined, // remove array
    },
  });
});

const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;

  // Verify old refresh token
  const decoded = await authService.verifyRefreshToken(token);

  // Revoke old token (single-use rotation)
  await authService.revokeRefreshToken(token);

  // Find user
  const user = await User.findByPk(decoded.id);
  if (!user || !user.isActive) {
    throw new AppError('User not found or deactivated.', 401);
  }

  // Generate new pair
  const { accessToken, refreshToken: newRefreshToken } = await authService.generateTokenPair(user);

  res.json({
    success: true,
    token: accessToken,
    refreshToken: newRefreshToken,
  });
});

const logout = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;

  if (token) {
    await authService.revokeRefreshToken(token);
  }

  res.json({ success: true, message: 'Logged out successfully.' });
});

/**
 * POST /auth/forgot-password
 * Sends a password reset email with a secure token
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Always respond with success to prevent email enumeration
  const user = await User.findOne({ where: { email } });
  if (!user || !user.isActive) {
    return res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  }

  // Invalidate any existing unused reset tokens for this user
  await PasswordReset.update(
    { usedAt: new Date() },
    { where: { userId: user.id, usedAt: null } }
  );

  // Generate token (96 hex chars = 48 bytes)
  const token = PasswordReset.generateToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await PasswordReset.create({ userId: user.id, token, expiresAt });

  // Send email (errors are logged but don't fail the request)
  try {
    await emailService.sendPasswordResetEmail(user.email, user.name, token);
  } catch (err) {
    // Token was created - user can retry. Don't expose email errors.
  }

  res.json({
    success: true,
    message: 'If an account with that email exists, a password reset link has been sent.',
  });
});

/**
 * POST /auth/reset-password
 * Validates token and sets new password
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  // Find valid, unused, non-expired token
  const resetRecord = await PasswordReset.findOne({
    where: {
      token,
      usedAt: null,
      expiresAt: { [Op.gt]: new Date() },
    },
    include: [{ model: User, as: 'user' }],
  });

  if (!resetRecord || !resetRecord.user || !resetRecord.user.isActive) {
    throw new AppError('This password reset link is invalid or has expired.', 400);
  }

  const user = resetRecord.user;

  // Update password (the User model hook will hash it)
  await user.update({ password });

  // Mark token as used
  await resetRecord.update({ usedAt: new Date() });

  // Revoke all existing sessions for security
  await authService.revokeAllUserTokens(user.id);

  res.json({
    success: true,
    message: 'Password reset successfully. Please log in with your new password.',
  });
});

/**
 * PUT /auth/profile
 * Update name and/or email of the authenticated user
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  const user = await User.findByPk(req.user.id);

  if (!user) throw new AppError('User not found.', 404);

  // Check email uniqueness if changing
  if (email && email !== user.email) {
    const existing = await User.findOne({ where: { email } });
    if (existing) throw new AppError('This email is already in use.', 409);
  }

  const updates = {};
  if (name) updates.name = name;
  if (email) updates.email = email;

  await user.update(updates);

  res.json({
    success: true,
    user: user.toSafeJSON(),
    message: 'Profile updated successfully.',
  });
});

/**
 * PUT /auth/change-password
 * Change password while authenticated (requires current password)
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findByPk(req.user.id);

  if (!user) throw new AppError('User not found.', 404);

  const isValid = await user.validatePassword(currentPassword);
  if (!isValid) throw new AppError('Current password is incorrect.', 401);

  if (currentPassword === newPassword) {
    throw new AppError('New password must be different from your current password.', 400);
  }

  // Update password (model hook will re-hash)
  await user.update({ password: newPassword });

  // Revoke all refresh tokens to force re-login on other devices
  await authService.revokeAllUserTokens(user.id);

  res.json({
    success: true,
    message: 'Password changed successfully. Please log in again.',
  });
});

module.exports = { register, login, me, refreshToken, logout, forgotPassword, resetPassword, updateProfile, changePassword };

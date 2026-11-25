const ROLES = Object.freeze({
  ADMIN: 'admin',
  USER: 'user',
});

const SUBSCRIPTION_STATUS = Object.freeze({
  ACTIVE: 'active',
  TRIALING: 'trialing',
  PAST_DUE: 'past_due',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
});

const PAYMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
});

const GATEWAY = Object.freeze({
  STRIPE: 'stripe',
  RAZORPAY: 'razorpay',
});

const BILLING_CYCLE = Object.freeze({
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
});

module.exports = {
  ROLES,
  SUBSCRIPTION_STATUS,
  PAYMENT_STATUS,
  GATEWAY,
  BILLING_CYCLE,
};

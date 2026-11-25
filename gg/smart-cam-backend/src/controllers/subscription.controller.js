const asyncHandler = require('../middleware/asyncHandler');
const { Subscription, Plan } = require('../models');

const getStatus = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findOne({
    where: { userId: req.user.id, status: 'active' },
    order: [['createdAt', 'DESC']],
    include: [
      {
        model: Plan,
        as: 'plan',
        attributes: ['id', 'name', 'maxCameras', 'maxStorage', 'price', 'billingCycle'],
      },
    ],
  });

  res.json({
    success: true,
    subscription: subscription
      ? {
          id: subscription.id,
          plan: subscription.plan,
          status: subscription.status,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
        }
      : null,
  });
});

module.exports = { getStatus };

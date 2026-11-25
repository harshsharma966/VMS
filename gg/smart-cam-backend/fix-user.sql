USE drishyamvms;

-- Assign group key to test user
UPDATE users SET group_key = REPLACE(UUID(), '-', ''), api_key = REPLACE(UUID(), '-', '') WHERE email = 'test@drishyam.com';

-- Auto-assign Free plan subscription
INSERT INTO subscriptions (id, user_id, plan_id, status, current_period_start, current_period_end)
SELECT UUID(), u.id, p.id, 'active', NOW(), '2126-01-01 00:00:00'
FROM users u, plans p
WHERE u.email = 'test@drishyam.com' AND p.name = 'Free'
AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = u.id AND s.status = 'active');

-- Verify
SELECT u.email, u.group_key, p.name as plan_name, s.status
FROM users u
LEFT JOIN subscriptions s ON s.user_id = u.id
LEFT JOIN plans p ON p.id = s.plan_id
WHERE u.email = 'test@drishyam.com';

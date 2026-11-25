-- DrishyamVMS Database Setup
-- Run this file: mysql -u root -p < database.sql

CREATE DATABASE IF NOT EXISTS drishyamvms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE drishyamvms;

-- ==========================================
-- 1. Users Table
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
  group_key VARCHAR(255) DEFAULT NULL,
  api_key VARCHAR(255) DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  email_verified TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL,

  UNIQUE INDEX idx_users_email (email),
  INDEX idx_users_role (role),
  INDEX idx_users_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 2. Plans Table
-- ==========================================
CREATE TABLE IF NOT EXISTS plans (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  max_cameras INT NOT NULL,
  max_storage BIGINT NOT NULL COMMENT 'Max storage in bytes',
  price DECIMAL(10, 2) NOT NULL,
  billing_cycle ENUM('monthly', 'yearly') NOT NULL,
  stripe_product_id VARCHAR(255) DEFAULT NULL,
  stripe_price_id VARCHAR(255) DEFAULT NULL,
  razorpay_plan_id VARCHAR(255) DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE INDEX idx_plans_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 3. Subscriptions Table
-- ==========================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  plan_id CHAR(36) NOT NULL,
  stripe_subscription_id VARCHAR(255) DEFAULT NULL,
  razorpay_subscription_id VARCHAR(255) DEFAULT NULL,
  status ENUM('active', 'trialing', 'past_due', 'cancelled', 'expired') NOT NULL DEFAULT 'active',
  current_period_start DATETIME NOT NULL,
  current_period_end DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_subscriptions_user_id (user_id),
  INDEX idx_subscriptions_status (status),
  INDEX idx_subscriptions_plan_id (plan_id),

  CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_subscriptions_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 4. Payments Table
-- ==========================================
CREATE TABLE IF NOT EXISTS payments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  subscription_id CHAR(36) DEFAULT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  gateway ENUM('stripe', 'razorpay') NOT NULL,
  gateway_payment_id VARCHAR(255) DEFAULT NULL,
  status ENUM('pending', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_payments_user_id (user_id),
  INDEX idx_payments_gateway_payment_id (gateway_payment_id),
  INDEX idx_payments_status (status),

  CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_payments_subscription FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 5. Cameras Table
-- ==========================================
CREATE TABLE IF NOT EXISTS cameras (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  monitor_id VARCHAR(24) NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'h264',
  host VARCHAR(255) NOT NULL,
  port INT NOT NULL DEFAULT 554,
  path VARCHAR(255) DEFAULT NULL,
  status ENUM('online', 'offline') NOT NULL DEFAULT 'offline',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE INDEX idx_cameras_user_monitor (user_id, monitor_id),
  INDEX idx_cameras_user_id (user_id),

  CONSTRAINT fk_cameras_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 6. Refresh Tokens Table
-- ==========================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token VARCHAR(500) NOT NULL,
  expires_at DATETIME NOT NULL,
  is_revoked TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE INDEX idx_refresh_tokens_token (token),
  INDEX idx_refresh_tokens_user_id (user_id),
  INDEX idx_refresh_tokens_expires (expires_at),

  CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 7. Seed Default Plans
-- ==========================================
INSERT INTO plans (id, name, max_cameras, max_storage, price, billing_cycle, is_active) VALUES
  (UUID(), 'Free',       2,    5368709120,       0.00, 'monthly', 1),
  (UUID(), 'Pro',        16,   107374182400,   999.00, 'monthly', 1),
  (UUID(), 'Enterprise', 64,   1099511627776, 4999.00, 'monthly', 1);

-- ==========================================
-- Done! Verify tables:
-- ==========================================
-- SHOW TABLES;
-- DESCRIBE users;
-- SELECT * FROM plans;

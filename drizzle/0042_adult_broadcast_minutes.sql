CREATE TABLE IF NOT EXISTS adult_broadcast_minute_wallets (
  userId INT NOT NULL PRIMARY KEY,
  availableMinutes INT NOT NULL DEFAULT 0,
  reservedMinutes INT NOT NULL DEFAULT 0,
  lifetimePurchasedMinutes INT NOT NULL DEFAULT 0,
  lifetimeIncludedMinutes INT NOT NULL DEFAULT 0,
  lifetimeConsumedMinutes INT NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_abmw_available (availableMinutes)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS adult_broadcast_minute_ledger (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  entryType VARCHAR(32) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'posted',
  minutes INT NOT NULL,
  balanceAfter INT NOT NULL DEFAULT 0,
  packId VARCHAR(64) NULL,
  stripeSessionId VARCHAR(255) NULL,
  reservationKey VARCHAR(80) NULL,
  jobId INT NULL,
  referenceKey VARCHAR(160) NULL,
  notes VARCHAR(1000) NULL,
  metadata JSON NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_abml_stripe_session (stripeSessionId),
  UNIQUE KEY uq_abml_reservation (reservationKey),
  UNIQUE KEY uq_abml_reference (referenceKey),
  INDEX idx_abml_user_created (userId, createdAt),
  INDEX idx_abml_job (jobId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

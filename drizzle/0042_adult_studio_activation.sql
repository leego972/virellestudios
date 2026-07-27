ALTER TABLE mature_access_profiles ADD COLUMN activationStripeSessionId VARCHAR(255) NULL;
ALTER TABLE mature_access_profiles ADD COLUMN activationPaidAt DATETIME NULL;
ALTER TABLE mature_access_profiles ADD COLUMN activationAmountCents INT NULL;

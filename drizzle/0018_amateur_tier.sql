-- Add 'amateur' to subscriptionTier enum
ALTER TABLE `users` MODIFY COLUMN `subscriptionTier` enum('amateur','independent','creator','studio','pro','industry') NOT NULL DEFAULT 'independent';

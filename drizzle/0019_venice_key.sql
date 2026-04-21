-- Add Venice AI key column for BYOK LLM routing
ALTER TABLE `users` ADD COLUMN `userVeniceKey` text;

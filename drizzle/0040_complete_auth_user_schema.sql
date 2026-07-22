-- Complete the formal users-table schema before the application accepts login
-- requests. Drizzle selects every declared users column for getUserByEmail,
-- getUserById, and getUserByOpenId; either missing field causes authentication
-- to fail with an internal database error.
--
-- run-migrations.mjs safely reconciles ER_DUP_FIELDNAME, so this migration is
-- idempotent on databases where autoMigrate already created either column.
ALTER TABLE `users`
  ADD COLUMN `userDidKey` TEXT,
  ADD COLUMN `betaExpiresAt` TIMESTAMP NULL;

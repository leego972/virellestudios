-- Auth schema repair: drizzle selects every declared users column during login.
-- Older production databases can be missing isAdultVerified, which makes
-- getUserByEmail/getUserById fail with an internal SQL error before password
-- verification or session creation runs.
--
-- run-migrations.mjs safely treats ER_DUP_FIELDNAME as already applied, so this
-- remains idempotent on databases where the column already exists.
ALTER TABLE `users`
  ADD COLUMN `isAdultVerified` BOOLEAN NOT NULL DEFAULT FALSE;

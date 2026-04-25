-- v6.67 — Mark a generated Auto Recap as "attached to its target episode"
-- so the project detail surface can show the recap status without writing
-- markers into movie.description.
ALTER TABLE `recaps` ADD COLUMN `attachedAt` TIMESTAMP NULL;

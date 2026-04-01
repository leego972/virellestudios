import { mysqlTable, int, varchar, text, timestamp, boolean, json } from "drizzle-orm/mysql-core";

// Public Film Pages (Promote / Distribution)
export const filmPages = mysqlTable("filmPages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId").notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnailUrl"),
  trailerUrl: text("trailerUrl"),
  filmUrl: text("filmUrl"),
  isPublic: boolean("isPublic").default(false).notNull(),
  showCreatorName: boolean("showCreatorName").default(true).notNull(),
  showVirelleBranding: boolean("showVirelleBranding").default(true).notNull(),
  allowShowcase: boolean("allowShowcase").default(true).notNull(),
  socialLinks: json("socialLinks"), // { instagram, tiktok, youtube, website }
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type FilmPage = typeof filmPages.$inferSelect;
export type InsertFilmPage = typeof filmPages.$inferInsert;

// Promo Assets (Captions, Hashtags, etc.)
export const promoAssets = mysqlTable("promoAssets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId").notNull(),
  type: varchar("type", { length: 64 }).notNull(), // caption, hashtags, synopsis, hook
  content: text("content").notNull(),
  variant: varchar("variant", { length: 64 }), // cinematic, viral, professional
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PromoAsset = typeof promoAssets.$inferSelect;
export type InsertPromoAsset = typeof promoAssets.$inferInsert;

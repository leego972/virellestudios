import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
  import { z } from "zod";
  import { TRPCError } from "@trpc/server";
  import { sql } from "drizzle-orm";
  import * as db from "./db";
  import { logger } from "./_core/logger";

  // Paid-member gate: active or trialing subscription required
  function requirePaidMember(user: any) {
    const status = user?.subscriptionStatus;
    if (status !== "active" && status !== "trialing") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "MEMBERS_ONLY: The Virelle Community is available to paying members only. Upgrade your plan to join.",
      });
    }
  }

  // Create tables on first use — no migration needed
  async function ensureForumTables(dbConn: any) {
    await dbConn.execute(sql`
      CREATE TABLE IF NOT EXISTS forum_posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        authorName VARCHAR(128) NOT NULL,
        authorRole VARCHAR(64) DEFAULT 'Filmmaker',
        title VARCHAR(200) NOT NULL,
        body TEXT NOT NULL,
        category VARCHAR(64) NOT NULL DEFAULT 'General',
        likes INT DEFAULT 0,
        replyCount INT DEFAULT 0,
        pinned TINYINT(1) DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_forum_posts_created (createdAt),
        INDEX idx_forum_posts_category (category)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await dbConn.execute(sql`
      CREATE TABLE IF NOT EXISTS forum_replies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        postId INT NOT NULL,
        userId INT NOT NULL,
        authorName VARCHAR(128) NOT NULL,
        authorRole VARCHAR(64) DEFAULT 'Filmmaker',
        body TEXT NOT NULL,
        likes INT DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_forum_replies_post (postId),
        INDEX idx_forum_replies_created (createdAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await dbConn.execute(sql`
      CREATE TABLE IF NOT EXISTS forum_likes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        targetType ENUM('post','reply') NOT NULL,
        targetId INT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_like (userId, targetType, targetId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  const CATEGORIES = ["General","Craft","Gear","Festivals","Finance","Music","VFX","Writing","Feedback","Casting"];

  const POST_CATEGORIES = ["General","Craft","Gear","Festivals","Finance","Music","VFX","Writing","Feedback","Casting"];

  export const communityForumRouter = router({
    // Ensure tables exist (called on page load)
    init: protectedProcedure.mutation(async ({ ctx }) => {
      requirePaidMember(ctx.user);
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await ensureForumTables(dbConn);
      return { ok: true };
    }),

    // List posts — paginated, with optional category filter
    listPosts: protectedProcedure
      .input(z.object({
        category: z.string().optional(),
        limit: z.number().min(1).max(50).default(30),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ ctx, input }) => {
        requirePaidMember(ctx.user);
        const dbConn = await db.getDb();
        if (!dbConn) return { posts: [], total: 0 };
        try {
          await ensureForumTables(dbConn);
          let rows: any[];
          if (input.category && input.category !== "all") {
            const cat = input.category;
            rows = await dbConn.execute(
              sql`SELECT * FROM forum_posts WHERE category = ${cat} ORDER BY pinned DESC, createdAt DESC LIMIT ${input.limit} OFFSET ${input.offset}`
            );
          } else {
            rows = await dbConn.execute(
              sql`SELECT * FROM forum_posts ORDER BY pinned DESC, createdAt DESC LIMIT ${input.limit} OFFSET ${input.offset}`
            );
          }
          const posts = Array.isArray(rows[0]) ? rows[0] : rows;
          return { posts };
        } catch (e) {
          logger.error("forum listPosts error:", e);
          return { posts: [] };
        }
      }),

    // Create a new post
    createPost: protectedProcedure
      .input(z.object({
        title: z.string().min(5).max(200),
        body: z.string().min(20).max(5000),
        category: z.enum(["General","Craft","Gear","Festivals","Finance","Music","VFX","Writing","Feedback","Casting"]).default("General"),
      }))
      .mutation(async ({ ctx, input }) => {
        requirePaidMember(ctx.user);
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        await ensureForumTables(dbConn);
        const authorName = (ctx.user as any).name || (ctx.user as any).email?.split("@")[0] || "Filmmaker";
        const authorRole = (ctx.user as any).role === "admin" ? "Virelle Team" : "Filmmaker";
        await dbConn.execute(sql`
          INSERT INTO forum_posts (userId, authorName, authorRole, title, body, category)
          VALUES (${ctx.user.id}, ${authorName}, ${authorRole}, ${input.title}, ${input.body}, ${input.category})
        `);
        logger.info(`[Forum] User ${ctx.user.id} created post: ${input.title}`);
        return { ok: true };
      }),

    // List replies for a post
    listReplies: protectedProcedure
      .input(z.object({ postId: z.number() }))
      .query(async ({ ctx, input }) => {
        requirePaidMember(ctx.user);
        const dbConn = await db.getDb();
        if (!dbConn) return { replies: [], post: null };
        await ensureForumTables(dbConn);
        const [postRows, replyRows]: any[] = await Promise.all([
          dbConn.execute(sql`SELECT * FROM forum_posts WHERE id = ${input.postId} LIMIT 1`),
          dbConn.execute(sql`SELECT * FROM forum_replies WHERE postId = ${input.postId} ORDER BY createdAt ASC`),
        ]);
        const post = Array.isArray(postRows[0]) ? postRows[0][0] : null;
        const replies = Array.isArray(replyRows[0]) ? replyRows[0] : [];
        // Get user's likes
        const likedRows: any = await dbConn.execute(
          sql`SELECT targetId FROM forum_likes WHERE userId = ${ctx.user.id} AND targetType = 'reply' AND postId IS NOT NULL`
        );
        return { post, replies };
      }),

    // Reply to a post
    createReply: protectedProcedure
      .input(z.object({
        postId: z.number(),
        body: z.string().min(5).max(3000),
      }))
      .mutation(async ({ ctx, input }) => {
        requirePaidMember(ctx.user);
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        await ensureForumTables(dbConn);
        const authorName = (ctx.user as any).name || (ctx.user as any).email?.split("@")[0] || "Filmmaker";
        const authorRole = (ctx.user as any).role === "admin" ? "Virelle Team" : "Filmmaker";
        await dbConn.execute(sql`
          INSERT INTO forum_replies (postId, userId, authorName, authorRole, body)
          VALUES (${input.postId}, ${ctx.user.id}, ${authorName}, ${authorRole}, ${input.body})
        `);
        await dbConn.execute(sql`UPDATE forum_posts SET replyCount = replyCount + 1 WHERE id = ${input.postId}`);
        return { ok: true };
      }),

    // Toggle like on a post
    toggleLike: protectedProcedure
      .input(z.object({ postId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        requirePaidMember(ctx.user);
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        await ensureForumTables(dbConn);
        // Check if already liked
        const existing: any = await dbConn.execute(
          sql`SELECT id FROM forum_likes WHERE userId = ${ctx.user.id} AND targetType = 'post' AND targetId = ${input.postId} LIMIT 1`
        );
        const rows = Array.isArray(existing[0]) ? existing[0] : [];
        if (rows.length > 0) {
          await dbConn.execute(sql`DELETE FROM forum_likes WHERE userId = ${ctx.user.id} AND targetType = 'post' AND targetId = ${input.postId}`);
          await dbConn.execute(sql`UPDATE forum_posts SET likes = GREATEST(likes - 1, 0) WHERE id = ${input.postId}`);
          return { liked: false };
        } else {
          await dbConn.execute(sql`INSERT IGNORE INTO forum_likes (userId, targetType, targetId) VALUES (${ctx.user.id}, 'post', ${input.postId})`);
          await dbConn.execute(sql`UPDATE forum_posts SET likes = likes + 1 WHERE id = ${input.postId}`);
          return { liked: true };
        }
      }),

    // Get user's liked post IDs
    myLikes: protectedProcedure.query(async ({ ctx }) => {
      requirePaidMember(ctx.user);
      const dbConn = await db.getDb();
      if (!dbConn) return { likedPostIds: [] };
      await ensureForumTables(dbConn);
      const rows: any = await dbConn.execute(
        sql`SELECT targetId FROM forum_likes WHERE userId = ${ctx.user.id} AND targetType = 'post'`
      );
      const ids = (Array.isArray(rows[0]) ? rows[0] : []).map((r: any) => Number(r.targetId));
      return { likedPostIds: ids };
    }),
  });
  
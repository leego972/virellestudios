import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { designerProfiles } from "../drizzle/schema";
import { getDb, getDesignerProfileByUserId } from "./db";
import { rateLimitUpload } from "./_core/rateLimit";
import { protectedProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";

export const designerLogoRouter = router({
  upload: protectedProcedure
    .input(
      z.object({
        dataUrl: z.string().min(1).max(7 * 1024 * 1024),
        fileName: z.string().trim().max(255).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await rateLimitUpload(ctx.user.id);
      const match = input.dataUrl.match(
        /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/,
      );
      if (!match) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Use a JPG, PNG or WebP logo.",
        });
      }

      const [, contentType, encoded] = match;
      const buffer = Buffer.from(encoded, "base64");
      if (buffer.length === 0 || buffer.length > 4 * 1024 * 1024) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Designer logo must be under 4 MB.",
        });
      }

      const extension =
        contentType === "image/jpeg"
          ? "jpg"
          : contentType === "image/png"
            ? "png"
            : "webp";
      const key = `designer-logos/${ctx.user.id}/${Date.now()}-${nanoid(
        10,
      )}.${extension}`;

      try {
        const stored = await storagePut(key, buffer, contentType, {
          public: true,
        });
        const profile = await getDesignerProfileByUserId(ctx.user.id);
        if (profile) {
          const db = await getDb();
          if (db) {
            await db
              .update(designerProfiles)
              .set({ logoUrl: stored.url })
              .where(eq(designerProfiles.id, profile.id));
          }
        }
        return {
          url: stored.url,
          key: stored.key,
          fileName: input.fileName ?? null,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "Designer logo storage is unavailable. The logo was not saved.",
          cause: error,
        });
      }
    }),
});

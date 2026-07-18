import { protectedProcedure, router } from "./_core/trpc";
import { createSwappysMobileToken } from "./_core/context";

export const mobileAuthRouter = router({
  createSwappysToken: protectedProcedure.mutation(async ({ ctx }) => {
    const token = await createSwappysMobileToken(ctx.user.id, ctx.user.name || ctx.user.email || "Virelle user");
    return {
      token,
      expiresInSeconds: 7 * 24 * 60 * 60,
      scheme: "swappys",
      scope: "swappys:generate" as const,
    };
  }),
});

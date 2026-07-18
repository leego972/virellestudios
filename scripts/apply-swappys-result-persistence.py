from pathlib import Path

path = Path("server/vfx-sfx-router.ts")
text = path.read_text()


def patch(old: str, new: str) -> None:
    global text
    if new in text:
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"vfx-sfx-router expected one match for {old[:120]!r}, found {count}")
    text = text.replace(old, new, 1)


patch(
    '''import {
  enforceSwappysGenerationQuota,
  moderateSwappysImages,
  validateSwappysDataImage,
} from "./_core/swappysSecurity";''',
    '''import {
  enforceSwappysGenerationQuota,
  moderateSwappysImages,
  validateSwappysDataImage,
} from "./_core/swappysSecurity";
import {
  createSwappysMobileResult,
  listSwappysMobileDestinations,
  saveSwappysMobileResult,
} from "./_core/swappysMobileAssets";''',
)

patch(
    '''        if (!result?.url) throw new Error("Provider returned no output image.");

        logger.info(''',
    '''        if (!result?.url) throw new Error("Provider returned no output image.");
        const resultToken = user?.id
          ? await createSwappysMobileResult(user.id, result.url, {
              tier,
              entitlement: quota.entitlement,
              hasWatermark,
              sourceFingerprint: sourceImage.fingerprint,
              targetFingerprint: targetImage.fingerprint,
            })
          : null;

        logger.info(''',
)

patch(
    '''          entitlement: quota.entitlement,
          upgradeUrl: "https://virelle.life/pricing",''',
    '''          entitlement: quota.entitlement,
          resultToken,
          canSaveToVirelle: Boolean(resultToken),
          upgradeUrl: "https://virelle.life/pricing",''',
)

procedures = '''

  swappysMobileDestinations: publicProcedure.query(async ({ ctx }) => {
    const user = (ctx as any).user || await authenticateSwappysMobileRequest(ctx.req);
    if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Connect your Virelle account to load projects." });
    return { projects: await listSwappysMobileDestinations(user.id) };
  }),

  swappysMobileSaveResult: publicProcedure
    .input(z.object({
      resultToken: z.string().min(32).max(80),
      projectId: z.number().int().positive(),
      sceneId: z.number().int().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = (ctx as any).user || await authenticateSwappysMobileRequest(ctx.req);
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Connect your Virelle account before saving to a production." });
      return saveSwappysMobileResult({ userId: user.id, ...input });
    }),
'''

if "swappysMobileDestinations:" not in text:
    closing = "\n});\n"
    if not text.endswith(closing):
        raise SystemExit("vfx-sfx-router closing marker not found")
    text = text[:-len(closing)] + procedures + closing

path.write_text(text)

from pathlib import Path
import re

path = Path("server/vfx-sfx-router.ts")
text = path.read_text()

security_import = '''import {
  enforceSwappysGenerationQuota,
  moderateSwappysImages,
  validateSwappysDataImage,
} from "./_core/swappysSecurity";
'''
if security_import not in text:
    marker = 'import { storagePut } from "./storage";\n'
    if marker not in text:
        raise SystemExit("storage import marker not found")
    text = text.replace(marker, marker + security_import, 1)

replacement = '''  // Swappys daughter-app still-image transformation endpoint.
  // Anonymous/free results are watermarked and strictly quota-limited. Every
  // request is validated and moderated before provider spend.
  swappysMobileSwap: publicProcedure
    .input(z.object({
      sourceImageBase64: z.string().min(50).max(8_500_000),
      targetImageBase64: z.string().min(50).max(8_500_000),
      consentConfirmed: z.literal(true, { error: "Explicit consent is required before performing a face transformation." }),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = (ctx as any).user || null;
      const tier = String(user?.subscriptionTier || "free").toLowerCase();
      const paidTiers = new Set(["indie", "amateur", "creator", "independent", "industry", "studio", "pro", "beta"]);
      const isPaid = paidTiers.has(tier) || user?.role === "admin";
      const hasWatermark = !isPaid;

      try {
        const quota = await enforceSwappysGenerationQuota(ctx.req, user?.id);
        const [sourceImage, targetImage] = await Promise.all([
          validateSwappysDataImage(input.sourceImageBase64, "Source image"),
          validateSwappysDataImage(input.targetImageBase64, "Target image"),
        ]);
        await moderateSwappysImages([sourceImage, targetImage]);

        const userKeys = user?.id ? await db.getUserApiKeys(user.id) : null;
        const result = await generateImage({
          prompt: hasWatermark
            ? "Perform a photorealistic face swap: place the face from the first reference image naturally onto the person in the second reference image, matching skin tone, lighting and angle. Family-friendly output. Add a large semi-transparent diagonal watermark reading 'SWAPPYS PREVIEW · virelle.life' repeated across the image."
            : "Perform a photorealistic, high-fidelity face swap: place the face from the first reference image naturally onto the person in the second reference image, seamlessly matching skin tone, lighting, grain and angle. Professional studio quality, no watermark.",
          originalImages: [
            { b64Json: sourceImage.b64Json, mimeType: sourceImage.mimeType },
            { b64Json: targetImage.b64Json, mimeType: targetImage.mimeType },
          ],
          userOpenAiKey: (userKeys as any)?.openaiKey || undefined,
        });
        if (!result?.url) throw new Error("Provider returned no output image.");

        logger.info(
          `[SwappysMobile] swap ok user=${user?.id || "anon"} tier=${tier} entitlement=${quota.entitlement} watermark=${hasWatermark} source=${sourceImage.fingerprint}:${sourceImage.width}x${sourceImage.height} target=${targetImage.fingerprint}:${targetImage.width}x${targetImage.height}`,
        );
        return {
          imageUrl: result.url,
          hasWatermark,
          tier,
          entitlement: quota.entitlement,
          upgradeUrl: "https://virelle.life/pricing",
        };
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        logger.warn(`[SwappysMobile] swap failed user=${user?.id || "anon"}: ${error?.message}`);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Swap failed — try clearer, well-lit photos." });
      }
    }),
'''

pattern = re.compile(
    r'  // v7\.3 — Swappys Mobile funnel endpoint\.[\s\S]*?  swappysMobileSwap: publicProcedure[\s\S]*?\n    \}\),\n(?=\}\);\s*$)',
    re.MULTILINE,
)
if replacement not in text:
    text, count = pattern.subn(replacement, text, count=1)
    if count != 1:
        raise SystemExit(f"Swappys endpoint replacement count={count}")

path.write_text(text)

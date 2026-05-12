import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
  import { z } from "zod";
  import { callTitan, isTitanConfigured, isTitanReady } from "./_core/titanClient";

  export const titanRouter = router({
    status: publicProcedure.query(async () => {
      const configured = isTitanConfigured();
      if (!configured) return { configured: false, ready: false };
      const ready = await isTitanReady();
      return { configured, ready };
    }),

    chat: protectedProcedure
      .input(
        z.object({
          messages: z.array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string().max(4000),
            })
          ).min(1).max(50),
          maxTokens: z.number().int().min(50).max(1024).optional(),
          temperature: z.number().min(0).max(2).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const result = await callTitan(input.messages, {
          maxTokens: input.maxTokens,
          temperature: input.temperature,
        });

        if (result.source === "unavailable") {
          return {
            text:
              "Titan is currently offline (your laptop server isn't running). " +
              "Start it with `bash start.sh` in your titanai folder, then try again.",
            source: "unavailable" as const,
            latencyMs: result.latencyMs,
          };
        }

        return result;
      }),
  });
  
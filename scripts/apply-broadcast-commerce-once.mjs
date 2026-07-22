import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function write(path, content) {
  fs.writeFileSync(path, content);
}

function replaceOnce(content, oldText, newText, label) {
  const index = content.indexOf(oldText);
  if (index < 0) throw new Error(`Patch marker not found: ${label}`);
  return content.slice(0, index) + newText + content.slice(index + oldText.length);
}

function replaceBetween(content, startMarker, endMarker, replacement, label) {
  const start = content.indexOf(startMarker);
  if (start < 0) throw new Error(`Patch start marker not found: ${label}`);
  const end = content.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error(`Patch end marker not found: ${label}`);
  return content.slice(0, start) + replacement + content.slice(end);
}

// ---------------------------------------------------------------------------
// Server router: split direct, managed and AI-assisted broadcast modes.
// ---------------------------------------------------------------------------
{
  const path = "server/virelle-broadcast-render-router.ts";
  let content = read(path);

  content = replaceOnce(
    content,
    'import { stripe } from "./_core/subscription";',
    `import { stripe } from "./_core/subscription";\nimport {\n  BROADCAST_MINUTE_PACKS,\n  attachBroadcastReservationToJob,\n  createBroadcastMinuteCheckout,\n  getBroadcastMinuteWallet,\n  releaseBroadcastMinuteReservation,\n  reserveBroadcastMinutes,\n} from "./_core/broadcastMinutes";`,
    "broadcast minute imports",
  );

  content = replaceOnce(
    content,
    `async function validateResolvedJob(\n  dbConn: any,\n  ctx: any,\n  resolved: Awaited<ReturnType<typeof resolveJobInput>>,\n  broadcast: boolean,\n) {`,
    `async function validateResolvedJob(\n  dbConn: any,\n  ctx: any,\n  resolved: Awaited<ReturnType<typeof resolveJobInput>>,\n  broadcast: boolean,\n  aiAssisted = true,\n) {`,
    "validateResolvedJob signature",
  );

  content = replaceOnce(
    content,
    `  assertSwappysCreativePolicy({\n    user: policyUser,`,
    `  if (!broadcast || aiAssisted) {\n    assertSwappysCreativePolicy({\n      user: policyUser,`,
    "conditional creative policy start",
  );

  content = replaceOnce(
    content,
    `    aiGeneratedCharactersOnly: resolved.aiGeneratedCharactersOnly,\n  });\n  return matureStatus;`,
    `      aiGeneratedCharactersOnly: resolved.aiGeneratedCharactersOnly,\n    });\n  }\n  return matureStatus;`,
    "conditional creative policy end",
  );

  content = content.replaceAll(
    `      ctx.user as any,\n      "creator",\n      "Virelle Broadcast / Studio Render",`,
    `      ctx.user as any,\n      "indie",\n      "Virelle Broadcast / Studio Render",`,
  );

  content = replaceOnce(
    content,
    `      byokRequired: true,\n      bridgeConfigured: BRIDGE_CONFIGURED,\n      recordingRequired: true,\n      complianceRetentionDays: Math.max(\n        90,\n        Number(process.env.COMPLIANCE_RETENTION_DAYS || 90),\n      ),\n      policy: "Virelle membership unlocks orchestration. Rendering and live transformation use the user's provider key.",`,
    `      byokRequired: false,\n      byokRequiredForStudioRender: true,\n      byokRequiredForAiAssistedBroadcast: true,\n      bridgeConfigured: BRIDGE_CONFIGURED,\n      recordingRequired: true,\n      complianceRetentionDays: Math.max(\n        90,\n        Number(process.env.COMPLIANCE_RETENTION_DAYS || 90),\n      ),\n      policy: "Plain direct or managed broadcasting does not require BYOK. Studio Render and AI-assisted live transformations use the user's funded provider key.",`,
    "BYOK status policy",
  );

  content = replaceOnce(
    content,
    `  getSwappysHandoff: protectedProcedure.input(z.object({`,
    `  getBroadcastMinuteWallet: protectedProcedure.query(async ({ ctx }) => {\n    requireVfxStudioTier(ctx.user as any, "indie", "Virelle Broadcast");\n    const dbConn = await db.getDb();\n    if (!dbConn) {\n      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });\n    }\n    return getBroadcastMinuteWallet(dbConn, ctx.user as any);\n  }),\n\n  createBroadcastMinuteCheckout: protectedProcedure.input(z.object({\n    packId: z.enum(["relay_120", "relay_600", "relay_1500", "relay_3600"]),\n    returnUrl: z.string().url().max(1000),\n  })).mutation(async ({ ctx, input }) => {\n    requireVfxStudioTier(ctx.user as any, "indie", "Virelle Broadcast");\n    const statusDb = await db.getDb();\n    if (!statusDb) {\n      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });\n    }\n    const matureStatus = await getMatureAccessStatus(statusDb, ctx.user as any);\n    if (!matureStatus.accessGranted) {\n      throw new TRPCError({\n        code: "FORBIDDEN",\n        message: "Verified Adult Studio access is required to purchase managed broadcast minutes.",\n      });\n    }\n    const returnUrl = safeReturnUrl(input.returnUrl);\n    const separator = returnUrl.includes("?") ? "&" : "?";\n    return createBroadcastMinuteCheckout({\n      user: ctx.user as any,\n      packId: input.packId,\n      successUrl: \\`${returnUrl}\\${separator}broadcast_minutes=success&pack=${input.packId}\\`,\n      cancelUrl: \\`${returnUrl}\\${separator}broadcast_minutes=cancelled\\`,\n    });\n  }),\n\n  getSwappysHandoff: protectedProcedure.input(z.object({`,
    "broadcast wallet endpoints",
  );

  const newBroadcastBlock = String.raw`  createBroadcastSession: protectedProcedure.input(createJobInput.extend({
    serviceMode: z.enum(["direct", "managed", "ai_assisted"]).default("managed"),
    durationMinutes: z.union([
      z.literal(30),
      z.literal(60),
      z.literal(120),
    ]).default(60),
    channels: z.array(z.object({
      destination: z.enum(BROADCAST_DESTINATIONS),
      ingestUrl: z.string().max(2000).optional().nullable(),
      streamKey: z.string().max(300).optional().nullable(),
    })).min(1).max(5),
  })).mutation(async ({ ctx, input }) => {
    requireVfxStudioTier(
      ctx.user as any,
      "indie",
      "Virelle Broadcast Mode",
    );
    const dbConn = await db.getDb();
    if (!dbConn) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });
    }
    await ensureBroadcastRenderTables(dbConn);
    const resolved = await resolveJobInput(dbConn, ctx.user.id, input);
    const aiAssisted = input.serviceMode === "ai_assisted";
    const managed = input.serviceMode !== "direct";
    const matureStatus = await validateResolvedJob(
      dbConn,
      ctx,
      resolved,
      true,
      aiAssisted,
    );

    if (resolved.contentMode === "open_adult" && input.serviceMode === "direct") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Adult Studio broadcasts must use managed relay so the required recording and compliance copy can be retained.",
      });
    }
    if (
      resolved.contentMode === "open_adult"
      && (!resolved.consentConfirmed || !resolved.allSubjectsAdultsConfirmed)
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Adult broadcasts require consent confirmation and confirmation that every depicted person is at least 18.",
      });
    }
    if (aiAssisted && !resolved.sourceVideoUrl && resolved.sourceImageUrls.length === 0 && !resolved.sourceSwappysJobId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "AI-assisted Broadcast requires source media or a Swappys handoff.",
      });
    }

    if (aiAssisted) {
      const minimumAvatarAge = resolved.contentMode === "open_adult" ? 18 : 16;
      if (resolved.transformGoal === "adult_to_child") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Child-transform goals are not permitted in live Broadcast mode.",
        });
      }
      if (resolved.targetAge != null && resolved.targetAge < minimumAvatarAge) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: \`Broadcast avatar target age must be \${minimumAvatarAge} or older.\`,
        });
      }
      if (resolved.transformGoal === "younger_self" && resolved.targetAge == null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: \`Younger-self broadcasts require an explicit target age of \${minimumAvatarAge} or older.\`,
        });
      }
    }

    const normalizedChannels = normalizeChannels(input.channels as BroadcastChannel[]);
    if (
      resolved.contentMode !== "open_adult"
      && normalizedChannels.some((channel) => ADULT_BROADCAST_DESTINATIONS.has(channel.destination))
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Adult-platform broadcast destinations are available only inside the verified Adult Studio.",
      });
    }

    if (input.serviceMode === "direct") {
      const redacted = redactChannels(normalizedChannels);
      const metadata = {
        byok: false,
        serviceMode: "direct",
        costPolicy: "direct_obs_no_virelle_media_charge",
        durationMinutes: 0,
        channels: redacted,
        contentMode: resolved.contentMode,
        recording: { required: false, managedByVirelle: false },
        instructions: [
          "Open OBS Settings, then Stream.",
          "Choose Custom service and paste the destination ingest URL.",
          "Paste the destination stream key directly into OBS.",
          "Start Streaming. Virelle does not receive the stream or charge minutes.",
        ],
      };
      const primary = normalizedChannels[0];
      const result: any = await dbConn.execute(sql`
        INSERT INTO virelle_video_transform_jobs
          (userId, projectId, sceneId, sourceSwappysJobId, mode, status,
           provider, sourceVideoUrl, referenceVideoUrl, sourceImageUrls,
           referenceImageUrls, transformGoal, targetAge, targetPresentation,
           contentMode, allSubjectsAdultsConfirmed, publicFigureLikeness,
           aiGeneratedCharactersOnly, broadcastDestination, ingestUrl,
           streamKeyMasked, broadcastChannelsEncrypted, recordingRequired,
           directorNotes, consentConfirmed, consentAttestationVersion,
           visibleWatermarkMode, byokRequired, orchestrationCredits, metadata)
        VALUES
          (\${ctx.user.id}, \${resolved.projectId}, \${resolved.sceneId},
           \${resolved.sourceSwappysJobId}, 'broadcast', 'direct_ready', 'direct_obs',
           \${resolved.sourceVideoUrl}, \${resolved.referenceVideoUrl},
           \${JSON.stringify(resolved.sourceImageUrls)},
           \${JSON.stringify(resolved.referenceImageUrls)},
           \${resolved.transformGoal}, \${resolved.targetAge},
           \${resolved.targetPresentation}, \${resolved.contentMode},
           \${resolved.allSubjectsAdultsConfirmed ? 1 : 0},
           \${resolved.publicFigureLikeness ? 1 : 0},
           \${resolved.aiGeneratedCharactersOnly ? 1 : 0},
           \${primary.destination}, \${primary.ingestUrl},
           \${maskStreamKey(primary.streamKey)}, NULL, 0,
           \${resolved.directorNotes}, \${resolved.consentConfirmed ? 1 : 0},
           \${CONSENT_ATTESTATION_VERSION}, 'none', 0, 0,
           \${JSON.stringify(metadata)})
      `);
      const sessionId = result?.[0]?.insertId ?? result?.insertId ?? null;
      return {
        ok: true,
        sessionId,
        status: "direct_ready",
        mode: "broadcast",
        serviceMode: "direct",
        provider: "direct_obs",
        channels: redacted,
        bridgeConfigured: false,
        recordingRequired: false,
        byokRequired: false,
        managedMinutesReserved: 0,
        directInstructions: metadata.instructions,
      };
    }

    const provider = aiAssisted
      ? await requireStrictByokProvider(ctx.user.id, resolved.requestedProvider)
      : "relay";
    const reservation = await reserveBroadcastMinutes(
      dbConn,
      ctx.user as any,
      input.durationMinutes,
      {
        serviceMode: input.serviceMode,
        contentMode: resolved.contentMode,
        outputCount: normalizedChannels.length,
      },
    );
    const encryptedChannels = encryptApiKey(JSON.stringify(normalizedChannels));
    const redacted = redactChannels(normalizedChannels);
    const metadata = {
      byok: aiAssisted,
      serviceMode: input.serviceMode,
      reservationKey: reservation.reservationKey,
      costPolicy: aiAssisted
        ? "managed_minutes_plus_provider_cost_paid_by_user_key"
        : "managed_minutes_no_ai_provider_charge",
      mode: "broadcast",
      durationMinutes: input.durationMinutes,
      channels: redacted,
      sourceSwappysJobId: resolved.sourceSwappysJobId,
      contentMode: resolved.contentMode,
      transformGoal: aiAssisted ? resolved.transformGoal : null,
      publicFigureLikeness: resolved.publicFigureLikeness,
      aiGeneratedCharactersOnly: resolved.aiGeneratedCharactersOnly,
      policyVersion: "adult-workspace-2026-07",
      consentAttestation: {
        version: CONSENT_ATTESTATION_VERSION,
        acceptedAt: new Date().toISOString(),
        consentConfirmed: resolved.consentConfirmed,
        allSubjectsAdultsConfirmed: resolved.allSubjectsAdultsConfirmed,
        aiGeneratedCharactersOnly: resolved.aiGeneratedCharactersOnly,
      },
      recording: {
        required: true,
        format: "mp4",
        userDownloadRequired: true,
        privateComplianceCopyRequired: true,
        minimumRetentionDays: 90,
      },
      nextWorkerStep: BRIDGE_CONFIGURED
        ? "submit_to_configured_broadcast_bridge"
        : "await_broadcast_bridge_configuration",
      safety: {
        consentConfirmed: resolved.consentConfirmed,
        allSubjectsAdultsConfirmed: resolved.allSubjectsAdultsConfirmed,
        matureAccessVerified: matureStatus?.accessGranted ?? false,
        sexualisedMinorContentAllowed: false,
        publicFigureAdultContentAllowed: false,
      },
    };
    const primary = normalizedChannels[0];
    try {
      const result: any = await dbConn.execute(sql`
        INSERT INTO virelle_video_transform_jobs
          (userId, projectId, sceneId, sourceSwappysJobId, mode, status,
           provider, sourceVideoUrl, referenceVideoUrl, sourceImageUrls,
           referenceImageUrls, transformGoal, targetAge, targetPresentation,
           contentMode, allSubjectsAdultsConfirmed, publicFigureLikeness,
           aiGeneratedCharactersOnly, broadcastDestination, ingestUrl,
           streamKeyMasked, broadcastChannelsEncrypted, recordingRequired,
           directorNotes, consentConfirmed, consentAttestationVersion,
           visibleWatermarkMode, byokRequired, orchestrationCredits, metadata)
        VALUES
          (\${ctx.user.id}, \${resolved.projectId}, \${resolved.sceneId},
           \${resolved.sourceSwappysJobId}, 'broadcast', 'broadcast_ready', \${provider},
           \${resolved.sourceVideoUrl}, \${resolved.referenceVideoUrl},
           \${JSON.stringify(resolved.sourceImageUrls)},
           \${JSON.stringify(resolved.referenceImageUrls)},
           \${resolved.transformGoal}, \${resolved.targetAge},
           \${resolved.targetPresentation}, \${resolved.contentMode},
           \${resolved.allSubjectsAdultsConfirmed ? 1 : 0},
           \${resolved.publicFigureLikeness ? 1 : 0},
           \${resolved.aiGeneratedCharactersOnly ? 1 : 0},
           \${primary.destination}, \${primary.ingestUrl},
           \${maskStreamKey(primary.streamKey)}, \${encryptedChannels}, 1,
           \${resolved.directorNotes}, \${resolved.consentConfirmed ? 1 : 0},
           \${CONSENT_ATTESTATION_VERSION},
           \${resolved.hideVisibleWatermark ? "internal_provenance_only" : "visible_ai_mark_required"},
           \${aiAssisted ? 1 : 0}, 0, \${JSON.stringify(metadata)})
      `);
      const sessionId = result?.[0]?.insertId ?? result?.insertId ?? null;
      await attachBroadcastReservationToJob(dbConn, reservation.reservationKey, sessionId);
      logger.info(
        \`[VirelleBroadcast] configured session=\${sessionId} user=\${ctx.user.id} serviceMode=\${input.serviceMode} workspace=\${resolved.contentMode} outputs=\${normalizedChannels.length}\`,
      );
      return {
        ok: true,
        sessionId,
        status: "broadcast_ready",
        mode: "broadcast",
        serviceMode: input.serviceMode,
        provider,
        channels: redacted,
        bridgeConfigured: BRIDGE_CONFIGURED,
        recordingRequired: true,
        userDownloadAvailableWhenCompleted: true,
        complianceArchiveRetentionDays: 90,
        byokRequired: aiAssisted,
        orchestrationCredits: 0,
        managedMinutesReserved: input.durationMinutes,
        remainingManagedMinutes: reservation.availableMinutes,
        sourceSwappysJobId: resolved.sourceSwappysJobId,
      };
    } catch (error) {
      await releaseBroadcastMinuteReservation(
        dbConn,
        reservation.reservationKey,
        "Broadcast configuration failed before the session was created.",
      ).catch(() => undefined);
      throw error;
    }
  }),`;

  content = replaceBetween(
    content,
    "  createBroadcastSession: protectedProcedure.input(createJobInput.extend({",
    "\n\n  recordBroadcastCompletion:",
    newBroadcastBlock,
    "createBroadcastSession block",
  );

  content = replaceOnce(
    content,
    `    await ensureBroadcastRenderTables(dbConn);\n    await dbConn.execute(sql\`\n      UPDATE virelle_video_transform_jobs\n      SET status='cancelled', updatedAt=NOW()\n      WHERE id=\${input.id} AND userId=\${ctx.user.id}\n        AND status IN (\n          'queued',\n          'waiting_for_provider',\n          'processing',\n          'broadcast_ready'\n        )\n    \`);\n    return { ok: true };`,
    `    await ensureBroadcastRenderTables(dbConn);\n    const existing: any = await dbConn.execute(sql\`\n      SELECT mode, metadata FROM virelle_video_transform_jobs\n      WHERE id=\${input.id} AND userId=\${ctx.user.id} LIMIT 1\n    \`);\n    const existingRow = (Array.isArray(existing[0]) ? existing[0] : existing)?.[0];\n    await dbConn.execute(sql\`\n      UPDATE virelle_video_transform_jobs\n      SET status='cancelled', updatedAt=NOW()\n      WHERE id=\${input.id} AND userId=\${ctx.user.id}\n        AND status IN (\n          'queued',\n          'waiting_for_provider',\n          'processing',\n          'broadcast_ready'\n        )\n    \`);\n    if (existingRow?.mode === "broadcast") {\n      const existingMetadata = safeJson(existingRow.metadata);\n      await releaseBroadcastMinuteReservation(\n        dbConn,\n        existingMetadata?.reservationKey,\n        "Broadcast cancelled before managed minutes were consumed.",\n      ).catch(() => undefined);\n    }\n    return { ok: true };`,
    "cancel reservation release",
  );

  write(path, content);
}

// ---------------------------------------------------------------------------
// Worker: BYOK only for AI-assisted jobs and settle minute reservations.
// ---------------------------------------------------------------------------
{
  const path = "server/broadcast-worker.ts";
  let content = read(path);

  content = replaceOnce(
    content,
    'import { assertSwappysCreativePolicy } from "./_core/swappysPolicy";',
    `import { assertSwappysCreativePolicy } from "./_core/swappysPolicy";\nimport {\n  consumeBroadcastMinuteReservation,\n  releaseBroadcastMinuteReservation,\n} from "./_core/broadcastMinutes";`,
    "worker minute imports",
  );

  content = replaceOnce(
    content,
    `  providerKey: string,\n  channels: BridgeChannel[],`,
    `  providerKey: string | null,\n  channels: BridgeChannel[],`,
    "nullable provider key",
  );

  content = replaceOnce(
    content,
    `    provider: String(job.provider),\n    providerKey,`,
    `    provider: String(job.provider),\n    providerKey,\n    serviceMode: metadata?.serviceMode || "ai_assisted",\n    aiAssisted: (metadata?.serviceMode || "ai_assisted") === "ai_assisted",`,
    "bridge service mode payload",
  );

  content = replaceOnce(
    content,
    `    assertSwappysCreativePolicy({\n      user: workerUser,`,
    `    const jobMetadata = safeJson(job.metadata);\n    const serviceMode = String(jobMetadata?.serviceMode || "ai_assisted");\n    const aiAssisted = serviceMode === "ai_assisted";\n    if (aiAssisted) {\n      assertSwappysCreativePolicy({\n        user: workerUser,`,
    "worker conditional policy start",
  );

  content = replaceOnce(
    content,
    `      aiGeneratedCharactersOnly: Boolean(job.aiGeneratedCharactersOnly),\n    });\n\n    const providerKey = await resolveByokKey(userId, String(job.provider));\n    if (!providerKey) {\n      await dbConn.execute(sql\`\n        UPDATE virelle_video_transform_jobs\n        SET status='failed',\n            errorMessage='BYOK_REQUIRED: No valid API key for the selected provider.',\n            updatedAt=NOW()\n        WHERE id=\${jobId}\n      \`);\n      logger.warn(\n        \`[BroadcastWorker] Session \${jobId}: missing BYOK key for \${job.provider}\`,\n      );\n      return;\n    }`,
    `        aiGeneratedCharactersOnly: Boolean(job.aiGeneratedCharactersOnly),\n      });\n    }\n\n    const providerKey = aiAssisted\n      ? await resolveByokKey(userId, String(job.provider))\n      : null;\n    if (aiAssisted && !providerKey) {\n      await releaseBroadcastMinuteReservation(\n        dbConn,\n        jobMetadata?.reservationKey,\n        "AI-assisted broadcast could not start because its BYOK provider key was unavailable.",\n      ).catch(() => undefined);\n      await dbConn.execute(sql\`\n        UPDATE virelle_video_transform_jobs\n        SET status='failed',\n            errorMessage='BYOK_REQUIRED: No valid API key for the selected provider.',\n            updatedAt=NOW()\n        WHERE id=\${jobId}\n      \`);\n      logger.warn(\n        \`[BroadcastWorker] Session \${jobId}: missing BYOK key for \${job.provider}\`,\n      );\n      return;\n    }`,
    "worker BYOK condition",
  );

  content = replaceOnce(
    content,
    `    const bridge = await submitBridgeSession(job, providerKey, channels);\n    const immediateRecording = bridge.recordingUrl || null;`,
    `    const bridge = await submitBridgeSession(job, providerKey, channels);\n    await consumeBroadcastMinuteReservation(\n      dbConn,\n      jobMetadata?.reservationKey,\n      "Managed broadcast accepted by the bridge.",\n    );\n    const immediateRecording = bridge.recordingUrl || null;`,
    "consume reservation on bridge start",
  );

  content = replaceOnce(
    content,
    `    } else {\n      await dbConn.execute(sql\`\n        UPDATE virelle_video_transform_jobs\n        SET status='failed', errorMessage=\${message}, updatedAt=NOW()\n        WHERE id=\${jobId}\n      \`).catch(() => undefined);`,
    `    } else {\n      const failedMetadata = safeJson(job.metadata);\n      await releaseBroadcastMinuteReservation(\n        dbConn,\n        failedMetadata?.reservationKey,\n        \\`Broadcast failed before the bridge accepted the session: \\${message}\\`,\n      ).catch(() => undefined);\n      await dbConn.execute(sql\`\n        UPDATE virelle_video_transform_jobs\n        SET status='failed', errorMessage=\${message}, updatedAt=NOW()\n        WHERE id=\${jobId}\n      \`).catch(() => undefined);`,
    "release reservation on worker failure",
  );

  content = replaceOnce(
    content,
    `    \`[BroadcastWorker] Starting — encrypted outputs, mandatory recording, strict BYOK, bridge=\${bridgeConfig() ? "configured" : "not configured"}\`,`,
    `    \`[BroadcastWorker] Starting — encrypted outputs, mandatory managed recording, BYOK only for AI-assisted sessions, bridge=\${bridgeConfig() ? "configured" : "not configured"}\`,`,
    "worker startup log",
  );

  write(path, content);
}

// ---------------------------------------------------------------------------
// Stripe webhook: fulfil minute packs idempotently.
// ---------------------------------------------------------------------------
{
  const path = "server/_core/index.ts";
  let content = read(path);
  content = replaceOnce(
    content,
    'import { fulfillWardrobePurchaseSession } from "./wardrobePurchaseFulfillment";',
    `import { fulfillWardrobePurchaseSession } from "./wardrobePurchaseFulfillment";\nimport { creditBroadcastMinutePurchase } from "./broadcastMinutes";`,
    "webhook minute import",
  );

  content = replaceOnce(
    content,
    `          // Check if this is a film production package purchase.`,
    `          if (session.metadata?.type === "adult_broadcast_minutes" && userId) {\n            const dbConn = await db.getDb();\n            if (!dbConn) throw new Error("Database unavailable during broadcast-minute fulfilment.");\n            const fulfilled = await creditBroadcastMinutePurchase(\n              dbConn,\n              userId,\n              String(session.metadata.packId || ""),\n              String(session.id),\n            );\n            logger.info(\n              \\`[BroadcastMinutes] \\${fulfilled.credited ? "Credited" : "Already fulfilled"}: user=\\${userId} pack=\\${fulfilled.pack.id} minutes=\\${fulfilled.minutes} session=\\${session.id}\\`,\n            );\n            break;\n          }\n\n          // Check if this is a film production package purchase.`,
    "broadcast minute webhook fulfilment",
  );
  write(path, content);
}

// ---------------------------------------------------------------------------
// Client Broadcast page: contextual instructions, mode switch and pack wallet.
// ---------------------------------------------------------------------------
{
  const path = "client/src/pages/VirelleBroadcastRender.tsx";
  let content = read(path);

  content = replaceOnce(
    content,
    `  CheckCircle2,\n  Copy,`,
    `  CheckCircle2,\n  Clock3,\n  Copy,`,
    "Clock icon import",
  );
  content = replaceOnce(
    content,
    `  ShieldCheck,\n  Upload,`,
    `  ShieldCheck,\n  ShoppingCart,\n  Upload,`,
    "Shopping icon import",
  );
  content = replaceOnce(
    content,
    `type Workspace = "standard" | "adult";`,
    `type Workspace = "standard" | "adult";\ntype BroadcastServiceMode = "direct" | "managed" | "ai_assisted";`,
    "broadcast mode type",
  );

  content = replaceOnce(
    content,
    `  const jobs = (trpc as any).virelleBroadcastRender.listJobs.useQuery(`,
    `  const minuteWallet = (trpc as any).virelleBroadcastRender.getBroadcastMinuteWallet.useQuery(\n    undefined,\n    { enabled: accessReady, retry: false },\n  );\n  const createMinuteCheckout = (trpc as any).virelleBroadcastRender.createBroadcastMinuteCheckout.useMutation();\n  const jobs = (trpc as any).virelleBroadcastRender.listJobs.useQuery(`,
    "wallet client queries",
  );

  content = replaceOnce(
    content,
    `  const [uploading, setUploading] = useState<string | null>(null);\n  const [channels, setChannels] = useState<BroadcastChannel[]>([`,
    `  const [uploading, setUploading] = useState<string | null>(null);\n  const [serviceMode, setServiceMode] = useState<BroadcastServiceMode>("managed");\n  const [durationMinutes, setDurationMinutes] = useState<30 | 60 | 120>(60);\n  const [channels, setChannels] = useState<BroadcastChannel[]>([`,
    "broadcast mode state",
  );

  content = replaceOnce(
    content,
    `  const destinations = isAdult ? ADULT_DESTINATIONS : STANDARD_DESTINATIONS;`,
    `  const destinations = isAdult ? ADULT_DESTINATIONS : STANDARD_DESTINATIONS;\n  const minuteBalance = Number(minuteWallet.data?.availableMinutes || 0);\n  const unlimitedMinutes = Boolean(minuteWallet.data?.unlimited);\n  const minutePackages = minuteWallet.data?.packages || [];\n  const needsByokForBroadcast = serviceMode === "ai_assisted";`,
    "wallet derived state",
  );

  const validationReplacement = String.raw`  const validateRequest = (broadcast: boolean): boolean => {
    const aiBroadcast = broadcast && serviceMode === "ai_assisted";
    const requiresCreativeMedia = !broadcast || aiBroadcast;

    if (requiresCreativeMedia && !aiGeneratedCharactersOnly && !consentConfirmed) {
      toast.error(
        "Confirm valid likeness, media, distribution and broadcast consent for every real person used.",
      );
      return false;
    }
    if (
      requiresCreativeMedia
      && !sourceVideoUrl.trim()
      && parseUrls(sourceImageUrls).length === 0
      && !sourceSwappysJobId
    ) {
      toast.error("Add source media or load a Swappys job first.");
      return false;
    }
    if (isAdult) {
      if (!consentConfirmed && !aiGeneratedCharactersOnly) {
        toast.error("Confirm valid consent for every real person appearing in the adult broadcast.");
        return false;
      }
      if (!allSubjectsAdultsConfirmed) {
        toast.error("Confirm that every depicted and referenced person is 18 or older.");
        return false;
      }
      if (!noPublicFigureConfirmed) {
        toast.error("Confirm that no celebrity, politician or other public-figure likeness is used.");
        return false;
      }
      if (aiBroadcast && (!targetAge.trim() || Number(targetAge) < 18)) {
        toast.error("Adult Studio AI target age must be 18 or older.");
        return false;
      }
      if (aiBroadcast && ["adult_to_child", "child_to_adult"].includes(transformGoal)) {
        toast.error("Child and age-crossing transforms are unavailable in the Adult Studio.");
        return false;
      }
    }
    if (aiBroadcast) {
      if (!hasAnyProvider) {
        toast.error("Add and fund a supported BYOK provider before using AI-assisted Broadcast.");
        return false;
      }
      const minimumAge = isAdult ? 18 : 16;
      if (transformGoal === "adult_to_child") {
        toast.error("Child-transform avatars are not permitted in live Broadcast.");
        return false;
      }
      if (targetAge.trim() && Number(targetAge) < minimumAge) {
        toast.error(\`Broadcast avatar target age must be \${minimumAge} or older.\`);
        return false;
      }
      if (transformGoal === "younger_self" && !targetAge.trim()) {
        toast.error(
          \`Younger-self broadcasts require an explicit target age of \${minimumAge} or older.\`,
        );
        return false;
      }
    }
    if (
      broadcast
      && serviceMode !== "direct"
      && !unlimitedMinutes
      && minuteBalance < durationMinutes
    ) {
      toast.error(\`This broadcast needs \${durationMinutes} managed minutes; \${minuteBalance} remain.\`);
      return false;
    }
    return true;
  };

`;

  content = replaceBetween(
    content,
    "  const validateRequest = (broadcast: boolean): boolean => {",
    "  const submitRender = async () => {",
    validationReplacement + "  const submitRender = async () => {",
    "client validation block",
  );

  const submitReplacement = String.raw`  const submitBroadcast = async () => {
    if (!validateRequest(true)) return;
    try {
      const result = await createBroadcast.mutateAsync({
        ...payload,
        serviceMode,
        durationMinutes,
        channels: channels.map((channel) => ({
          destination: channel.destination,
          ingestUrl: channel.ingestUrl.trim() || null,
          streamKey: channel.streamKey.trim() || null,
        })),
      });
      setChannels((previous) => previous.map((channel) => ({
        ...channel,
        streamKey: "",
      })));
      if (result.serviceMode === "direct") {
        toast.success("Direct OBS configuration saved. No Virelle minutes or BYOK were used.");
      } else {
        toast.success(
          result.bridgeConfigured
            ? \`Broadcast session #\${result.sessionId} submitted; \${result.managedMinutesReserved} managed minutes reserved.\`
            : \`Broadcast session #\${result.sessionId} saved. The managed bridge still requires platform configuration.\`,
        );
      }
      jobs.refetch();
      minuteWallet.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Could not create the broadcast session.");
      minuteWallet.refetch();
    }
  };

  const purchaseMinutePack = async (packId: string) => {
    try {
      const result = await createMinuteCheckout.mutateAsync({
        packId,
        returnUrl: window.location.href,
      });
      window.location.assign(result.url);
    } catch (error: any) {
      toast.error(error?.message || "Could not open broadcast-minute checkout.");
    }
  };

`;

  content = replaceBetween(
    content,
    "  const submitBroadcast = async () => {",
    "  const cancel = async (id: number) => {",
    submitReplacement + "  const cancel = async (id: number) => {",
    "client submit broadcast block",
  );

  content = replaceOnce(
    content,
    `                  Add your own video-provider key before creating a render or broadcast session.`,
    `                  Add your own funded video-provider key before Studio Render or AI-assisted Broadcast. Plain broadcasting does not need one.`,
    "BYOK client guidance",
  );

  const cardStart = `          <Card className={subtleCard}>\n            <CardHeader>\n              <CardTitle className="flex items-center gap-2 text-base">\n                <Radio className="h-4 w-4 text-amber-400" />\n                Recorded broadcast outputs`;
  const cardEnd = `          </Card>\n        </div>\n\n        <Card className={subtleCard}>`;
  const broadcastCard = String.raw`          <Card className={subtleCard}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Radio className="h-4 w-4 text-amber-400" />
                Broadcast setup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.05] p-4">
                <Label>Broadcast route</Label>
                <select
                  className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  value={serviceMode}
                  onChange={(event) => setServiceMode(event.target.value as BroadcastServiceMode)}
                >
                  {!isAdult && <option value="direct">Direct OBS — free, no BYOK</option>}
                  <option value="managed">Managed relay — broadcast minutes, no BYOK</option>
                  <option value="ai_assisted">AI-assisted relay — broadcast minutes + BYOK</option>
                </select>
                <div className="mt-3 space-y-1 text-xs leading-relaxed text-white/50">
                  {serviceMode === "direct" && <p>OBS sends directly to the destination. Virelle does not receive, record or charge for the stream.</p>}
                  {serviceMode === "managed" && <p>Virelle relays and records the broadcast. No video generation occurs and no provider key is required.</p>}
                  {serviceMode === "ai_assisted" && <p>Virelle relays and records the broadcast while Swappys or another selected AI transformation runs through your funded provider key.</p>}
                </div>
              </div>

              {serviceMode !== "direct" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Reserved duration</Label>
                    <select
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                      value={durationMinutes}
                      onChange={(event) => setDurationMinutes(Number(event.target.value) as 30 | 60 | 120)}
                    >
                      <option value={30}>30 minutes</option>
                      <option value={60}>60 minutes</option>
                      <option value={120}>120 minutes</option>
                    </select>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/10 p-3">
                    <div className="flex items-center gap-2 text-xs text-white/45"><Clock3 className="h-4 w-4" /> Minute balance</div>
                    <p className="mt-2 text-xl font-bold text-amber-300">
                      {unlimitedMinutes ? "Unlimited" : minuteBalance.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-white/35">Managed minutes do not expire.</p>
                  </div>
                </div>
              )}

              {isAdult && serviceMode !== "direct" && (
                <div className="rounded-lg border border-white/10 bg-black/10 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">Buy broadcast minutes</p>
                      <p className="text-xs text-white/40">One-time prepaid packs added immediately after Stripe confirms payment.</p>
                    </div>
                    <ShoppingCart className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {minutePackages.map((pack: any) => (
                      <Button
                        key={pack.id}
                        size="sm"
                        variant="outline"
                        disabled={createMinuteCheckout.isPending}
                        onClick={() => purchaseMinutePack(pack.id)}
                      >
                        {pack.minutes.toLocaleString()} min · A${pack.priceAud}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-white/10 bg-black/10 p-3 text-xs leading-relaxed text-white/50">
                <p className="mb-2 font-semibold text-white/70">How to connect</p>
                <ol className="list-decimal space-y-1 pl-4">
                  <li>Open the destination's live or creator dashboard and copy its ingest URL and stream key.</li>
                  <li>Select the route above. Choose AI-assisted only when live Swappys or another transformation is required.</li>
                  <li>Add the output below, choose the planned duration and configure the session.</li>
                  <li>For direct mode, paste the same URL and key into OBS. Managed modes are recorded automatically.</li>
                </ol>
              </div>

              {channels.map((channel, index) => (
                <div key={`${channel.destination}-${index}`} className="space-y-2 rounded-lg border border-white/10 bg-black/10 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Output {index + 1}</span>
                    {channels.length > 1 && (
                      <button type="button" className="text-xs text-red-400" onClick={() => setChannels((previous) => previous.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
                    )}
                  </div>
                  <div>
                    <Label>Destination</Label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                      value={channel.destination}
                      onChange={(event) => {
                        const destination = event.target.value as BroadcastDestination;
                        setChannels((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, destination, ingestUrl: destinationDefaultUrl(destination) } : item));
                      }}
                    >
                      {destinations.map((destination) => <option key={destination} value={destination}>{destinationLabel(destination)}</option>)}
                    </select>
                  </div>
                  <div><Label>Ingest URL</Label><Input value={channel.ingestUrl} onChange={(event) => setChannels((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, ingestUrl: event.target.value } : item))} /></div>
                  <div><Label>Stream key</Label><Input type="password" autoComplete="off" value={channel.streamKey} onChange={(event) => setChannels((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, streamKey: event.target.value } : item))} /></div>
                </div>
              ))}

              {channels.length < 5 && (
                <Button size="sm" variant="outline" className="w-full" onClick={() => setChannels((previous) => [...previous, { destination: "rtmp", ingestUrl: "", streamKey: "" }])}>Add output</Button>
              )}

              <Button
                className="w-full"
                disabled={(needsByokForBroadcast && !hasAnyProvider) || createBroadcast.isPending || (serviceMode !== "direct" && !unlimitedMinutes && minuteBalance < durationMinutes)}
                onClick={submitBroadcast}
              >
                {createBroadcast.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Radio className="mr-2 h-4 w-4" />}
                {serviceMode === "direct" ? "Save direct OBS setup" : `Configure ${durationMinutes}-minute broadcast`}
              </Button>
              <p className={isAdult ? "text-xs leading-relaxed text-white/45" : "text-xs leading-relaxed text-muted-foreground"}>
                Adult Studio always uses the managed recording route. Standard direct OBS broadcasts bypass Virelle media infrastructure and do not consume minutes.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className={subtleCard}>`;

  content = replaceBetween(content, cardStart, cardEnd, broadcastCard, "broadcast UI card");

  content = replaceOnce(
    content,
    `    <SubscriptionGate\n      feature="Virelle Broadcast & Studio Render"\n      featureKey="canUseVisualEffects"\n      requiredTier="amateur"`,
    `    <SubscriptionGate\n      feature="Virelle Broadcast & Studio Render"\n      requiredTier="indie"`,
    "broadcast page membership gate",
  );

  write(path, content);
}

// ---------------------------------------------------------------------------
// Pricing page: show the actual backend credit entitlements and pack grants.
// ---------------------------------------------------------------------------
{
  const path = "client/src/pages/Pricing.tsx";
  let content = read(path);
  content = content
    .replace('credits: 500,', 'credits: 700,')
    .replace('"500 credits added each month",', '"700 credits added each month",')
    .replace('credits: 2000,', 'credits: 3000,')
    .replace('"2,000 credits added each month",', '"3,000 credits added each month",')
    .replace('credits: 6000,', 'credits: 9000,')
    .replace('"6,000 credits added each month",', '"9,000 credits added each month",')
    .replace('{ id: "topup_10", label: "Starter", credits: 100, price: 19 }', '{ id: "topup_10", label: "Starter", credits: 200, price: 19 }')
    .replace('{ id: "topup_50", label: "Producer", credits: 300, price: 49 }', '{ id: "topup_50", label: "Producer", credits: 600, price: 49 }')
    .replace('{ id: "topup_100", label: "Director", credits: 750, price: 99 }', '{ id: "topup_100", label: "Director", credits: 1400, price: 99 }')
    .replace('{ id: "topup_200", label: "Filmmaker", credits: 2000, price: 199, popular: true }', '{ id: "topup_200", label: "Filmmaker", credits: 3500, price: 199, popular: true }')
    .replace('{ id: "topup_500", label: "Blockbuster", credits: 5000, price: 399 }', '{ id: "topup_500", label: "Blockbuster", credits: 9000, price: 399 }')
    .replace('{ id: "topup_1000", label: "Mogul", credits: 12000, price: 799 }', '{ id: "topup_1000", label: "Mogul", credits: 22000, price: 799 }');
  write(path, content);
}

console.log("Broadcast commerce patch applied successfully.");

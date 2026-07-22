import fs from "node:fs";

function replaceExact(path, from, to, label) {
  let content = fs.readFileSync(path, "utf8");
  const matches = content.split(from).length - 1;
  if (matches !== 1) throw new Error(`${label}: expected one match, found ${matches}`);
  content = content.replace(from, to);
  fs.writeFileSync(path, content);
}

replaceExact(
  "server/virelle-broadcast-render-router.ts",
  `    const provider = aiAssisted
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
    );`,
  `    const provider = aiAssisted
      ? await requireStrictByokProvider(ctx.user.id, resolved.requestedProvider)
      : "relay";
    const billableMinutes = input.durationMinutes * normalizedChannels.length;
    const reservation = await reserveBroadcastMinutes(
      dbConn,
      ctx.user as any,
      billableMinutes,
      {
        serviceMode: input.serviceMode,
        contentMode: resolved.contentMode,
        sessionDurationMinutes: input.durationMinutes,
        outputCount: normalizedChannels.length,
        billableMinutes,
      },
    );`,
  "server output-minute reservation",
);

replaceExact(
  "server/virelle-broadcast-render-router.ts",
  `      durationMinutes: input.durationMinutes,
      channels: redacted,`,
  `      durationMinutes: input.durationMinutes,
      outputCount: normalizedChannels.length,
      billableMinutes,
      channels: redacted,`,
  "server output-minute metadata",
);

replaceExact(
  "server/virelle-broadcast-render-router.ts",
  `        managedMinutesReserved: input.durationMinutes,
        remainingManagedMinutes: reservation.availableMinutes,`,
  `        managedMinutesReserved: billableMinutes,
        remainingManagedMinutes: reservation.availableMinutes,`,
  "server output-minute response",
);

replaceExact(
  "client/src/pages/VirelleBroadcastRender.tsx",
  `  const minutePackages = minuteWallet.data?.packages || [];
  const needsByokForBroadcast = serviceMode === "ai_assisted";`,
  `  const minutePackages = minuteWallet.data?.packages || [];
  const needsByokForBroadcast = serviceMode === "ai_assisted";
  const managedMinutesRequired = serviceMode === "direct"
    ? 0
    : durationMinutes * channels.length;`,
  "client output-minute derived value",
);

replaceExact(
  "client/src/pages/VirelleBroadcastRender.tsx",
  `      && minuteBalance < durationMinutes
    ) {
      toast.error(\`This broadcast needs \${durationMinutes} managed minutes; \${minuteBalance} remain.\`);`,
  `      && minuteBalance < managedMinutesRequired
    ) {
      toast.error(\`This setup needs \${managedMinutesRequired} managed output minutes; \${minuteBalance} remain.\`);`,
  "client output-minute validation",
);

replaceExact(
  "client/src/pages/VirelleBroadcastRender.tsx",
  `                    <p className="text-[11px] text-white/35">Managed minutes do not expire.</p>`,
  `                    <p className="text-[11px] text-white/35">Managed minutes do not expire.</p>
                    <p className="mt-1 text-[11px] text-amber-200/70">
                      This setup reserves {managedMinutesRequired.toLocaleString()} output minutes
                      ({durationMinutes} minutes × {channels.length} output{channels.length === 1 ? "" : "s"}).
                    </p>`,
  "client output-minute estimate",
);

replaceExact(
  "client/src/pages/VirelleBroadcastRender.tsx",
  `disabled={(needsByokForBroadcast && !hasAnyProvider) || createBroadcast.isPending || (serviceMode !== "direct" && !unlimitedMinutes && minuteBalance < durationMinutes)}`,
  `disabled={(needsByokForBroadcast && !hasAnyProvider) || createBroadcast.isPending || (serviceMode !== "direct" && !unlimitedMinutes && minuteBalance < managedMinutesRequired)}`,
  "client output-minute button guard",
);

replaceExact(
  "client/src/pages/Pricing.tsx",
  `Direct OBS broadcasting is included with membership and does not use BYOK. Managed relay minutes cover Virelle routing, multi-output delivery, recording and compliance retention. AI-assisted broadcast additionally requires a funded provider key selected during setup.`,
  `Direct OBS broadcasting is included with membership and does not use BYOK. Managed relay is billed in output minutes: a 60-minute broadcast to three destinations uses 180 minutes. Those minutes cover Virelle routing, recording and compliance retention. AI-assisted broadcast additionally requires a funded provider key selected during setup.`,
  "pricing output-minute explanation",
);

replaceExact(
  "client/src/pages/Pricing.tsx",
  `{ icon: Clapperboard, title: "Managed relay", price: "Uses minute wallet", text: "Virelle handles one or more outputs, recording and the retained compliance copy." },`,
  `{ icon: Clapperboard, title: "Managed relay", price: "Per output minute", text: "Each destination consumes one wallet minute per live minute. Virelle handles routing, recording and the retained compliance copy." },`,
  "pricing output-minute card",
);

replaceExact(
  "client/src/pages/Pricing.tsx",
  `Managed minute balances do not expire. Admin accounts have unrestricted internal access.`,
  `Managed output-minute balances do not expire. One 60-minute stream to two destinations consumes 120 minutes. Admin accounts have unrestricted internal access.`,
  "pricing output-minute note",
);

console.log("Managed relay output-minute billing applied.");

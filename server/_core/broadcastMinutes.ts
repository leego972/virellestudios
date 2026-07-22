import crypto from "node:crypto";
import { sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import {
  getEffectiveTier,
  getOrCreateStripeCustomer,
  stripe,
  type SubscriptionTier,
} from "./subscription";

export type BroadcastServiceMode = "direct" | "managed" | "ai_assisted";

export type BroadcastMinutePack = {
  id: string;
  name: string;
  minutes: number;
  priceAudCents: number;
  priceAud: number;
};

export const BROADCAST_MINUTE_PACKS: BroadcastMinutePack[] = [
  { id: "relay_120", name: "Live Starter", minutes: 120, priceAudCents: 900, priceAud: 9 },
  { id: "relay_600", name: "Live Creator", minutes: 600, priceAudCents: 2900, priceAud: 29 },
  { id: "relay_1500", name: "Live Producer", minutes: 1500, priceAudCents: 5900, priceAud: 59 },
  { id: "relay_3600", name: "Live Studio", minutes: 3600, priceAudCents: 11900, priceAud: 119 },
];

export const INCLUDED_BROADCAST_MINUTES: Partial<Record<SubscriptionTier, number>> = {
  indie: 60,
  amateur: 180,
  independent: 600,
  creator: 600,
  studio: 600,
  industry: 600,
  beta: 600,
};

type WalletRow = {
  availableMinutes: number;
  reservedMinutes: number;
  lifetimePurchasedMinutes: number;
  lifetimeIncludedMinutes: number;
  lifetimeConsumedMinutes: number;
};

function affectedRows(result: any): number {
  const packet = Array.isArray(result) ? result[0] : result;
  return Number(packet?.affectedRows ?? packet?.[0]?.affectedRows ?? 0);
}

function firstRow(result: any): any | null {
  const rows = Array.isArray(result?.[0]) ? result[0] : result;
  return Array.isArray(rows) ? rows[0] ?? null : null;
}

export async function ensureBroadcastMinuteTables(dbConn: any): Promise<void> {
  await dbConn.execute(sql`
    CREATE TABLE IF NOT EXISTS adult_broadcast_minute_wallets (
      userId INT NOT NULL PRIMARY KEY,
      availableMinutes INT NOT NULL DEFAULT 0,
      reservedMinutes INT NOT NULL DEFAULT 0,
      lifetimePurchasedMinutes INT NOT NULL DEFAULT 0,
      lifetimeIncludedMinutes INT NOT NULL DEFAULT 0,
      lifetimeConsumedMinutes INT NOT NULL DEFAULT 0,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_abmw_available (availableMinutes)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await dbConn.execute(sql`
    CREATE TABLE IF NOT EXISTS adult_broadcast_minute_ledger (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL,
      entryType VARCHAR(32) NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'posted',
      minutes INT NOT NULL,
      balanceAfter INT NOT NULL DEFAULT 0,
      packId VARCHAR(64) NULL,
      stripeSessionId VARCHAR(255) NULL,
      reservationKey VARCHAR(80) NULL,
      jobId INT NULL,
      referenceKey VARCHAR(160) NULL,
      notes VARCHAR(1000) NULL,
      metadata JSON NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_abml_stripe_session (stripeSessionId),
      UNIQUE KEY uq_abml_reservation (reservationKey),
      UNIQUE KEY uq_abml_reference (referenceKey),
      INDEX idx_abml_user_created (userId, createdAt),
      INDEX idx_abml_job (jobId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function ensureWallet(dbConn: any, userId: number): Promise<void> {
  await ensureBroadcastMinuteTables(dbConn);
  await dbConn.execute(sql`
    INSERT INTO adult_broadcast_minute_wallets (userId)
    VALUES (${userId})
    ON DUPLICATE KEY UPDATE userId=VALUES(userId)
  `);
}

function monthlyReference(userId: number, tier: SubscriptionTier, date = new Date()): string {
  return `included:${userId}:${tier}:${date.toISOString().slice(0, 7)}`;
}

export function includedMinutesForUser(user: any): number {
  if (user?.role === "admin") return Number.MAX_SAFE_INTEGER;
  const tier = getEffectiveTier(user);
  return INCLUDED_BROADCAST_MINUTES[tier] ?? 0;
}

export async function ensureMonthlyBroadcastAllowance(
  dbConn: any,
  user: any,
): Promise<number> {
  if (user?.role === "admin") return Number.MAX_SAFE_INTEGER;
  const tier = getEffectiveTier(user);
  const minutes = INCLUDED_BROADCAST_MINUTES[tier] ?? 0;
  if (minutes <= 0) return 0;

  await ensureWallet(dbConn, Number(user.id));
  const referenceKey = monthlyReference(Number(user.id), tier);
  const inserted = await dbConn.execute(sql`
    INSERT IGNORE INTO adult_broadcast_minute_ledger
      (userId, entryType, status, minutes, referenceKey, notes, metadata)
    VALUES
      (${user.id}, 'included', 'posted', ${minutes}, ${referenceKey},
       ${`${tier} monthly managed-broadcast allowance`},
       ${JSON.stringify({ tier, grantMonth: new Date().toISOString().slice(0, 7) })})
  `);

  if (affectedRows(inserted) > 0) {
    try {
      await dbConn.execute(sql`
        UPDATE adult_broadcast_minute_wallets
        SET availableMinutes=availableMinutes + ${minutes},
            lifetimeIncludedMinutes=lifetimeIncludedMinutes + ${minutes},
            updatedAt=NOW()
        WHERE userId=${user.id}
      `);
      const wallet = await getBroadcastMinuteWallet(dbConn, user, false);
      await dbConn.execute(sql`
        UPDATE adult_broadcast_minute_ledger
        SET balanceAfter=${wallet.availableMinutes}
        WHERE referenceKey=${referenceKey}
      `);
    } catch (error) {
      await dbConn.execute(sql`
        DELETE FROM adult_broadcast_minute_ledger WHERE referenceKey=${referenceKey}
      `).catch(() => undefined);
      throw error;
    }
  }

  return minutes;
}

export async function getBroadcastMinuteWallet(
  dbConn: any,
  user: any,
  grantMonthlyAllowance = true,
): Promise<WalletRow & {
  unlimited: boolean;
  includedThisMonth: number;
  packages: BroadcastMinutePack[];
}> {
  if (user?.role === "admin") {
    return {
      unlimited: true,
      availableMinutes: Number.MAX_SAFE_INTEGER,
      reservedMinutes: 0,
      lifetimePurchasedMinutes: 0,
      lifetimeIncludedMinutes: 0,
      lifetimeConsumedMinutes: 0,
      includedThisMonth: Number.MAX_SAFE_INTEGER,
      packages: BROADCAST_MINUTE_PACKS,
    };
  }

  await ensureWallet(dbConn, Number(user.id));
  if (grantMonthlyAllowance) {
    await ensureMonthlyBroadcastAllowance(dbConn, user);
  }
  const result: any = await dbConn.execute(sql`
    SELECT availableMinutes, reservedMinutes, lifetimePurchasedMinutes,
           lifetimeIncludedMinutes, lifetimeConsumedMinutes
    FROM adult_broadcast_minute_wallets
    WHERE userId=${user.id} LIMIT 1
  `);
  const row = firstRow(result) || {};
  return {
    unlimited: false,
    availableMinutes: Number(row.availableMinutes || 0),
    reservedMinutes: Number(row.reservedMinutes || 0),
    lifetimePurchasedMinutes: Number(row.lifetimePurchasedMinutes || 0),
    lifetimeIncludedMinutes: Number(row.lifetimeIncludedMinutes || 0),
    lifetimeConsumedMinutes: Number(row.lifetimeConsumedMinutes || 0),
    includedThisMonth: includedMinutesForUser(user),
    packages: BROADCAST_MINUTE_PACKS,
  };
}

export async function reserveBroadcastMinutes(
  dbConn: any,
  user: any,
  minutes: number,
  metadata: Record<string, unknown> = {},
): Promise<{ reservationKey: string | null; availableMinutes: number; unlimited: boolean }> {
  if (user?.role === "admin") {
    return { reservationKey: null, availableMinutes: Number.MAX_SAFE_INTEGER, unlimited: true };
  }
  if (!Number.isInteger(minutes) || minutes <= 0 || minutes > 12 * 60) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Broadcast duration is invalid." });
  }

  await ensureMonthlyBroadcastAllowance(dbConn, user);
  const reservationKey = `broadcast_${crypto.randomUUID()}`;
  const updated = await dbConn.execute(sql`
    UPDATE adult_broadcast_minute_wallets
    SET availableMinutes=availableMinutes - ${minutes},
        reservedMinutes=reservedMinutes + ${minutes},
        updatedAt=NOW()
    WHERE userId=${user.id} AND availableMinutes >= ${minutes}
  `);
  if (affectedRows(updated) < 1) {
    const wallet = await getBroadcastMinuteWallet(dbConn, user, false);
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `BROADCAST_MINUTES_REQUIRED: ${minutes} managed minutes are required; ${wallet.availableMinutes} remain. Purchase a minute pack before starting this broadcast.`,
    });
  }

  const wallet = await getBroadcastMinuteWallet(dbConn, user, false);
  try {
    await dbConn.execute(sql`
      INSERT INTO adult_broadcast_minute_ledger
        (userId, entryType, status, minutes, balanceAfter, reservationKey, notes, metadata)
      VALUES
        (${user.id}, 'reserve', 'reserved', ${minutes}, ${wallet.availableMinutes},
         ${reservationKey}, 'Managed broadcast minute reservation', ${JSON.stringify(metadata)})
    `);
  } catch (error) {
    await dbConn.execute(sql`
      UPDATE adult_broadcast_minute_wallets
      SET availableMinutes=availableMinutes + ${minutes},
          reservedMinutes=GREATEST(0, reservedMinutes - ${minutes}),
          updatedAt=NOW()
      WHERE userId=${user.id}
    `).catch(() => undefined);
    throw error;
  }

  return { reservationKey, availableMinutes: wallet.availableMinutes, unlimited: false };
}

export async function attachBroadcastReservationToJob(
  dbConn: any,
  reservationKey: string | null | undefined,
  jobId: number | null | undefined,
): Promise<void> {
  if (!reservationKey || !jobId) return;
  await dbConn.execute(sql`
    UPDATE adult_broadcast_minute_ledger
    SET jobId=${jobId}, updatedAt=NOW()
    WHERE reservationKey=${reservationKey} AND entryType='reserve'
  `);
}

export async function releaseBroadcastMinuteReservation(
  dbConn: any,
  reservationKey: string | null | undefined,
  reason: string,
): Promise<boolean> {
  if (!reservationKey) return false;
  await ensureBroadcastMinuteTables(dbConn);
  const selected: any = await dbConn.execute(sql`
    SELECT id, userId, minutes FROM adult_broadcast_minute_ledger
    WHERE reservationKey=${reservationKey} AND entryType='reserve' AND status='reserved'
    LIMIT 1
  `);
  const row = firstRow(selected);
  if (!row) return false;

  const claimed = await dbConn.execute(sql`
    UPDATE adult_broadcast_minute_ledger
    SET status='released', notes=${reason.slice(0, 1000)}, updatedAt=NOW()
    WHERE id=${row.id} AND status='reserved'
  `);
  if (affectedRows(claimed) < 1) return false;

  await dbConn.execute(sql`
    UPDATE adult_broadcast_minute_wallets
    SET availableMinutes=availableMinutes + ${Number(row.minutes)},
        reservedMinutes=GREATEST(0, reservedMinutes - ${Number(row.minutes)}),
        updatedAt=NOW()
    WHERE userId=${Number(row.userId)}
  `);
  const balance: any = await dbConn.execute(sql`
    SELECT availableMinutes FROM adult_broadcast_minute_wallets
    WHERE userId=${Number(row.userId)} LIMIT 1
  `);
  await dbConn.execute(sql`
    UPDATE adult_broadcast_minute_ledger
    SET balanceAfter=${Number(firstRow(balance)?.availableMinutes || 0)}
    WHERE id=${row.id}
  `);
  return true;
}

export async function consumeBroadcastMinuteReservation(
  dbConn: any,
  reservationKey: string | null | undefined,
  reason = "Managed broadcast started",
): Promise<boolean> {
  if (!reservationKey) return false;
  await ensureBroadcastMinuteTables(dbConn);
  const selected: any = await dbConn.execute(sql`
    SELECT id, userId, minutes FROM adult_broadcast_minute_ledger
    WHERE reservationKey=${reservationKey} AND entryType='reserve' AND status='reserved'
    LIMIT 1
  `);
  const row = firstRow(selected);
  if (!row) return false;

  const claimed = await dbConn.execute(sql`
    UPDATE adult_broadcast_minute_ledger
    SET status='consumed', notes=${reason.slice(0, 1000)}, updatedAt=NOW()
    WHERE id=${row.id} AND status='reserved'
  `);
  if (affectedRows(claimed) < 1) return false;

  await dbConn.execute(sql`
    UPDATE adult_broadcast_minute_wallets
    SET reservedMinutes=GREATEST(0, reservedMinutes - ${Number(row.minutes)}),
        lifetimeConsumedMinutes=lifetimeConsumedMinutes + ${Number(row.minutes)},
        updatedAt=NOW()
    WHERE userId=${Number(row.userId)}
  `);
  return true;
}

export async function creditBroadcastMinutePurchase(
  dbConn: any,
  userId: number,
  packId: string,
  stripeSessionId: string,
): Promise<{ credited: boolean; minutes: number; pack: BroadcastMinutePack }> {
  const pack = BROADCAST_MINUTE_PACKS.find((candidate) => candidate.id === packId);
  if (!pack) throw new Error(`Unknown broadcast minute pack: ${packId}`);
  await ensureWallet(dbConn, userId);

  const inserted = await dbConn.execute(sql`
    INSERT IGNORE INTO adult_broadcast_minute_ledger
      (userId, entryType, status, minutes, packId, stripeSessionId, notes, metadata)
    VALUES
      (${userId}, 'purchase', 'posted', ${pack.minutes}, ${pack.id}, ${stripeSessionId},
       ${`${pack.name} purchase`}, ${JSON.stringify({ priceAudCents: pack.priceAudCents })})
  `);
  if (affectedRows(inserted) < 1) {
    return { credited: false, minutes: pack.minutes, pack };
  }

  try {
    await dbConn.execute(sql`
      UPDATE adult_broadcast_minute_wallets
      SET availableMinutes=availableMinutes + ${pack.minutes},
          lifetimePurchasedMinutes=lifetimePurchasedMinutes + ${pack.minutes},
          updatedAt=NOW()
      WHERE userId=${userId}
    `);
    const wallet: any = await dbConn.execute(sql`
      SELECT availableMinutes FROM adult_broadcast_minute_wallets
      WHERE userId=${userId} LIMIT 1
    `);
    await dbConn.execute(sql`
      UPDATE adult_broadcast_minute_ledger
      SET balanceAfter=${Number(firstRow(wallet)?.availableMinutes || 0)}
      WHERE stripeSessionId=${stripeSessionId}
    `);
  } catch (error) {
    await dbConn.execute(sql`
      DELETE FROM adult_broadcast_minute_ledger WHERE stripeSessionId=${stripeSessionId}
    `).catch(() => undefined);
    throw error;
  }

  return { credited: true, minutes: pack.minutes, pack };
}

export async function createBroadcastMinuteCheckout(input: {
  user: any;
  packId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string; pack: BroadcastMinutePack }> {
  if (!stripe) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Stripe is not configured." });
  }
  const pack = BROADCAST_MINUTE_PACKS.find((candidate) => candidate.id === input.packId);
  if (!pack) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown broadcast minute package." });
  }
  const customerId = await getOrCreateStripeCustomer(input.user);
  if (!input.user.stripeCustomerId) {
    await db.updateUser(input.user.id, { stripeCustomerId: customerId } as any);
  }
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "aud",
        unit_amount: pack.priceAudCents,
        product_data: {
          name: `${pack.name} — ${pack.minutes.toLocaleString()} broadcast minutes`,
          description: "Prepaid Virelle managed relay, multi-output delivery, recording and compliance-retention minutes.",
          metadata: { type: "adult_broadcast_minutes", packId: pack.id },
        },
      },
    }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: {
      type: "adult_broadcast_minutes",
      userId: String(input.user.id),
      packId: pack.id,
      minutes: String(pack.minutes),
    },
  });
  if (!session.url) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe did not return a checkout URL." });
  }
  return { url: session.url, pack };
}

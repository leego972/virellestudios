/**
 * Virelle Studios — Outreach Mailing List Router
 *
 * Admin-only endpoints for managing the filmmaker/studio outreach list
 * and sending campaigns via Resend.
 *
 * Features:
 *  - Add contacts manually, via CSV import, or bulk paste
 *  - Upload ad image (stored in S3)
 *  - Create and send campaigns to the full list
 *  - Unsubscribe endpoint (public)
 *  - Campaign analytics
 */

import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { getDb } from "./db";
import {
  mailingContacts,
  emailCampaigns,
  campaignSendLog,
  type MailingContact,
} from "../drizzle/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { Resend } from "resend";
import { ENV } from "./_core/env";
import { storagePut } from "./storage";
import crypto from "crypto";

// ─── Resend client ────────────────────────────────────────────────────────────
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(ENV.resendApiKey);
  return _resend;
}

const FROM = `Virelle Studios <${ENV.emailFromAddress || "noreply@virellestudios.com"}>`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateUnsubToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Parse a CSV or newline/comma-separated list of contacts */
function parseContactsText(raw: string): Array<{ email: string; name?: string; company?: string; role?: string }> {
  const lines = raw
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  const results: Array<{ email: string; name?: string; company?: string; role?: string }> = [];

  for (const line of lines) {
    // Try CSV: email, name, company, role
    const parts = line.split(",").map(p => p.trim().replace(/^"|"$/g, ""));
    const email = parts[0];
    if (!email || !email.includes("@")) continue;
    results.push({
      email: email.toLowerCase(),
      name: parts[1] || undefined,
      company: parts[2] || undefined,
      role: parts[3] || undefined,
    });
  }
  return results;
}

/** Inject unsubscribe link + ad image into HTML body */
function buildEmailHtml(
  htmlBody: string,
  contact: MailingContact,
  adImageUrl: string | null | undefined,
  origin: string,
): string {
  const unsubUrl = `${origin}/unsubscribe?token=${contact.unsubscribeToken}`;

  const adBlock = adImageUrl
    ? `<tr><td align="center" style="padding:24px 32px 0;">
        <img src="${adImageUrl}" alt="Virelle Studios" style="max-width:100%;border-radius:8px;display:block;" />
      </td></tr>`
    : "";

  const footer = `
    <tr><td style="padding:32px;border-top:1px solid #262626;text-align:center;">
      <p style="margin:0;font-size:12px;color:#525252;">
        You are receiving this because you were added to the Virelle Studios outreach list.<br/>
        <a href="${unsubUrl}" style="color:#d4a843;text-decoration:underline;">Unsubscribe</a>
      </p>
    </td></tr>`;

  // Inject ad + footer before closing </table> or </body>
  const personalised = htmlBody
    .replace("{{name}}", contact.name || "Filmmaker")
    .replace("{{company}}", contact.company || "your studio");

  if (personalised.includes("</body>")) {
    return personalised.replace(
      "</body>",
      `${adBlock}${footer}</body>`,
    );
  }
  return personalised + adBlock + footer;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const mailingListRouter = router({

  // ── Contact Management ────────────────────────────────────────────────────

  /** List all contacts (admin only) */
  listContacts: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(500).default(100),
      offset: z.number().min(0).default(0),
      status: z.enum(["active", "unsubscribed", "bounced", "invalid"]).optional(),
      search: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new Error("Admin only");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const where = input.status
        ? eq(mailingContacts.status, input.status)
        : undefined;
      const contacts = await db.select().from(mailingContacts)
        .where(where)
        .limit(input.limit)
        .offset(input.offset)
        .orderBy(mailingContacts.createdAt);
      const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(mailingContacts).where(where);
      return { contacts, total: Number(count) };
    }),

  /** Add a single contact manually */
  addContact: protectedProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string().optional(),
      company: z.string().optional(),
      role: z.string().optional(),
      notes: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new Error("Admin only");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const token = generateUnsubToken();
      await db.insert(mailingContacts).values({
        email: input.email.toLowerCase(),
        name: input.name,
        company: input.company,
        role: input.role,
        notes: input.notes,
        tags: input.tags || [],
        source: "manual",
        unsubscribeToken: token,
      }).onDuplicateKeyUpdate({
        set: {
          name: input.name,
          company: input.company,
          role: input.role,
          notes: input.notes,
          status: "active",
          updatedAt: new Date(),
        },
      });
      return { success: true };
    }),

  /** Bulk import contacts from CSV text or newline-separated list */
  importContacts: protectedProcedure
    .input(z.object({
      raw: z.string().min(1).max(500000), // up to ~500KB of CSV
      source: z.enum(["csv", "paste"]).default("paste"),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new Error("Admin only");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const parsed = parseContactsText(input.raw);
      if (parsed.length === 0) return { imported: 0, skipped: 0 };

      let imported = 0;
      let skipped = 0;

      for (const contact of parsed) {
        try {
          await db.insert(mailingContacts).values({
            email: contact.email,
            name: contact.name,
            company: contact.company,
            role: contact.role,
            source: input.source,
            unsubscribeToken: generateUnsubToken(),
          }).onDuplicateKeyUpdate({
            set: {
              name: contact.name || sql`name`,
              company: contact.company || sql`company`,
              updatedAt: new Date(),
            },
          });
          imported++;
        } catch {
          skipped++;
        }
      }
      return { imported, skipped };
    }),

  /** Update a contact */
  updateContact: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      company: z.string().optional(),
      role: z.string().optional(),
      notes: z.string().optional(),
      tags: z.array(z.string()).optional(),
      status: z.enum(["active", "unsubscribed", "bounced", "invalid"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new Error("Admin only");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...fields } = input;
      await db.update(mailingContacts).set({ ...fields, updatedAt: new Date() }).where(eq(mailingContacts.id, id));
      return { success: true };
    }),

  /** Delete contacts by IDs */
  deleteContacts: protectedProcedure
    .input(z.object({ ids: z.array(z.number()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new Error("Admin only");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(mailingContacts).where(inArray(mailingContacts.id, input.ids));
      return { deleted: input.ids.length };
    }),

  // ── Ad Image Upload ───────────────────────────────────────────────────────

  /** Upload an ad image to S3, returns the public URL */
  uploadAdImage: protectedProcedure
    .input(z.object({
      imageBase64: z.string(),
      contentType: z.string().default("image/jpeg"),
      fileName: z.string().default("ad.jpg"),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new Error("Admin only");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const buffer = Buffer.from(input.imageBase64, "base64");
      const key = `outreach/ads/${Date.now()}-${input.fileName}`;
      const { url } = await storagePut(key, buffer, input.contentType);
      return { url };
    }),

  // ── Campaign Management ───────────────────────────────────────────────────

  /** List campaigns */
  listCampaigns: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new Error("Admin only");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return db.select().from(emailCampaigns).orderBy(emailCampaigns.createdAt);
    }),

  /** Create or update a draft campaign */
  saveCampaign: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      name: z.string().min(1).max(255),
      subject: z.string().min(1).max(512),
      htmlBody: z.string().optional(),
      template: z.enum(["intro", "custom"]).optional(),
      customHtml: z.string().optional(),
      adImageUrl: z.string().url().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new Error("Admin only");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      // Resolve htmlBody from template or custom HTML
      let htmlBody = input.htmlBody;
      if (!htmlBody) {
        if (input.template === "custom" && input.customHtml) {
          htmlBody = input.customHtml;
        } else {
          // Default: load the intro email template from disk
          const fs = await import("fs");
          const path = await import("path");
          const templatePath = path.join(process.cwd(), "server", "templates", "intro-email.html");
          try {
            htmlBody = fs.readFileSync(templatePath, "utf-8");
          } catch {
            htmlBody = "<p>Hello {{name}},</p><p>We are excited to share Virelle Studios with you.</p>";
          }
        }
      }
      if (!htmlBody) throw new Error("htmlBody is required");
      if (input.id) {
        await db.update(emailCampaigns).set({
          name: input.name,
          subject: input.subject,
          htmlBody,
          adImageUrl: input.adImageUrl,
          updatedAt: new Date(),
        }).where(eq(emailCampaigns.id, input.id));
        return { id: input.id };
      } else {
        const [result] = await db.insert(emailCampaigns).values({
          name: input.name,
          subject: input.subject,
          htmlBody,
          adImageUrl: input.adImageUrl,
          status: "draft",
        });
        return { id: (result as any).insertId };
      }
    }),

  /** Send a campaign to all active contacts (or a subset by IDs) */
  sendCampaign: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
      contactIds: z.array(z.number()).optional(), // if omitted, sends to all active
      origin: z.string().default("https://virellestudios.com"),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new Error("Admin only");
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Load campaign
      const [campaign] = await db.select().from(emailCampaigns)
        .where(eq(emailCampaigns.id, input.campaignId));
      if (!campaign) throw new Error("Campaign not found");
      if (campaign.status === "sending") throw new Error("Campaign is already sending");

      // Load contacts
      let contacts: MailingContact[];
      if (input.contactIds && input.contactIds.length > 0) {
        contacts = await db.select().from(mailingContacts)
          .where(and(
            inArray(mailingContacts.id, input.contactIds),
            eq(mailingContacts.status, "active"),
          ));
      } else {
        contacts = await db.select().from(mailingContacts)
          .where(eq(mailingContacts.status, "active"));
      }

      if (contacts.length === 0) throw new Error("No active contacts to send to");

      // Mark as sending
      await db.update(emailCampaigns).set({ status: "sending" }).where(eq(emailCampaigns.id, input.campaignId));

      const resend = getResend();
      let sentCount = 0;
      let failedCount = 0;

      // Send in batches of 10 to respect rate limits
      const BATCH_SIZE = 10;
      for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
        const batch = contacts.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (contact) => {
          try {
            const html = buildEmailHtml(
              campaign.htmlBody,
              contact,
              campaign.adImageUrl,
              input.origin,
            );
            await resend.emails.send({
              from: FROM,
              to: contact.email,
              subject: campaign.subject,
              html,
            });
            await db.insert(campaignSendLog).values({
              campaignId: input.campaignId,
              contactId: contact.id,
              status: "sent",
            });
            await db.update(mailingContacts).set({ lastEmailedAt: new Date() }).where(eq(mailingContacts.id, contact.id));
            sentCount++;
          } catch (err: any) {
            await db.insert(campaignSendLog).values({
              campaignId: input.campaignId,
              contactId: contact.id,
              status: "failed",
              error: err.message,
            });
            failedCount++;
          }
        }));
        // Small delay between batches
        if (i + BATCH_SIZE < contacts.length) {
          await new Promise(r => setTimeout(r, 500));
        }
      }

      // Update campaign status
      await db.update(emailCampaigns).set({
        status: failedCount === contacts.length ? "failed" : "sent",
        sentCount,
        failedCount,
        sentAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(emailCampaigns.id, input.campaignId));

      return { sentCount, failedCount, total: contacts.length };
    }),

  /** Get campaign send log */
  getCampaignLog: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new Error("Admin only");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return db.select().from(campaignSendLog)
        .where(eq(campaignSendLog.campaignId, input.campaignId))
        .orderBy(campaignSendLog.sentAt);
    }),

  // ── Unsubscribe (Public) ──────────────────────────────────────────────────

  /** Public unsubscribe endpoint — called from email link */
  unsubscribe: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false, message: "Database not available" };
      const [contact] = await db.select().from(mailingContacts)
        .where(eq(mailingContacts.unsubscribeToken, input.token));
      if (!contact) return { success: false, message: "Invalid unsubscribe link" };
      await db.update(mailingContacts).set({
        status: "unsubscribed",
        updatedAt: new Date(),
      }).where(eq(mailingContacts.id, contact.id));
      return { success: true, message: "You have been unsubscribed successfully." };
    }),

  /** Get mailing list stats */
  stats: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new Error("Admin only");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(mailingContacts);
      const [{ active }] = await db.select({ active: sql<number>`count(*)` }).from(mailingContacts).where(eq(mailingContacts.status, "active"));
      const [{ unsub }] = await db.select({ unsub: sql<number>`count(*)` }).from(mailingContacts).where(eq(mailingContacts.status, "unsubscribed"));
      const [{ campaigns }] = await db.select({ campaigns: sql<number>`count(*)` }).from(emailCampaigns);
      const [{ sent }] = await db.select({ sent: sql<number>`count(*)` }).from(emailCampaigns).where(eq(emailCampaigns.status, "sent"));
      return {
        totalContacts: Number(total),
        activeContacts: Number(active),
        unsubscribed: Number(unsub),
        totalCampaigns: Number(campaigns),
        sentCampaigns: Number(sent),
      };
    }),
});

import type Stripe from "stripe";
import * as db from "../db";
import {
  ensurePermanentWardrobeCopiesForLease,
  type PermanentWardrobeCopy,
} from "./wardrobePurchaseInventory";

export interface WardrobePurchaseFulfillmentResult {
  lease: Awaited<ReturnType<typeof db.createWardrobeLease>>;
  inventoryCopies: PermanentWardrobeCopy[];
  alreadyFulfilled: boolean;
}

function positiveInteger(value: unknown, label: string): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`Wardrobe purchase metadata is missing a valid ${label}.`);
  return parsed;
}

function nonNegativeInteger(value: unknown, label: string): number {
  const parsed = Number.parseInt(String(value ?? "0"), 10);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`Wardrobe purchase metadata contains an invalid ${label}.`);
  return parsed;
}

/**
 * Idempotently turns a paid Stripe Checkout Session into permanent wardrobe
 * inventory. The financial lease row remains the purchase receipt, while every
 * purchased garment is copied into a private buyer-owned wardrobe row so later
 * marketplace edits cannot change an existing production's costume reference.
 */
export async function fulfillWardrobePurchaseSession(
  session: Stripe.Checkout.Session,
  authenticatedUserId?: number,
): Promise<WardrobePurchaseFulfillmentResult> {
  if (session.payment_status !== "paid") {
    throw new Error(`Wardrobe purchase payment is not complete (status: ${session.payment_status}).`);
  }

  const metadata = session.metadata ?? {};
  if (metadata.type && metadata.type !== "wardrobe_purchase") {
    throw new Error(`Checkout session ${session.id} is not a wardrobe purchase.`);
  }
  const userId = positiveInteger(metadata.userId, "userId");
  if (authenticatedUserId && authenticatedUserId !== userId) {
    throw new Error("Wardrobe purchase session does not belong to the authenticated user.");
  }

  const leaseType = metadata.leaseType;
  if (leaseType !== "item" && leaseType !== "collection") {
    throw new Error("Wardrobe purchase metadata has an invalid lease type.");
  }
  const itemOrCollectionId = positiveInteger(metadata.itemOrCollectionId, "itemOrCollectionId");
  const designerProfileId = positiveInteger(metadata.designerProfileId, "designerProfileId");
  const platformFeeAud = nonNegativeInteger(metadata.platformFeeCents, "platformFeeCents");
  const designerAmountAud = nonNegativeInteger(metadata.designerAmountCents, "designerAmountCents");
  const amountPaidAud = Number(session.amount_total ?? 0);
  if (!Number.isInteger(amountPaidAud) || amountPaidAud <= 0) throw new Error("Wardrobe purchase has no valid paid amount.");
  if (Math.abs(platformFeeAud + designerAmountAud - amountPaidAud) > 1) {
    throw new Error("Wardrobe purchase fee metadata does not reconcile with the paid amount.");
  }

  const paymentIntent = session.payment_intent;
  const paymentIntentId = typeof paymentIntent === "string" ? paymentIntent : paymentIntent?.id;
  if (!paymentIntentId) throw new Error("Wardrobe purchase has no payment-intent ID for idempotent fulfilment.");

  const existing = await db.getWardrobeLeaseByPaymentIntent(paymentIntentId);
  if (existing) {
    const inventoryCopies = await ensurePermanentWardrobeCopiesForLease(existing as any);
    return { lease: existing, inventoryCopies, alreadyFulfilled: true };
  }

  if (leaseType === "item") {
    const item = await db.getWardrobeItemById(itemOrCollectionId);
    if (!item) throw new Error("Purchased wardrobe item no longer exists.");
    if (item.designerProfileId !== designerProfileId) throw new Error("Wardrobe item designer metadata does not match the paid session.");
    if (item.status !== "active" || item.visibility !== "public") throw new Error("Purchased wardrobe item is not active and public.");
    if (!item.retailPriceAud || item.retailPriceAud <= 0) throw new Error("Purchased wardrobe item has no valid retail price.");
    if (!item.primaryImageUrl && !(Array.isArray(item.imageUrls) && item.imageUrls.length)) throw new Error("Purchased wardrobe item has no reference image.");
    if (!item.referencePrompt?.trim()) throw new Error("Purchased wardrobe item has no generation prompt.");
  } else {
    const collection = await db.getDesignerCollectionById(itemOrCollectionId);
    if (!collection) throw new Error("Purchased wardrobe collection no longer exists.");
    if (collection.designerProfileId !== designerProfileId) throw new Error("Wardrobe collection designer metadata does not match the paid session.");
    if (!collection.published || collection.visibility !== "public") throw new Error("Purchased wardrobe collection is not published publicly.");
    const items = await db.getWardrobeItemsByCollection(itemOrCollectionId);
    const purchasableItems = items.filter((item) =>
      item.status === "active"
      && item.visibility === "public"
      && Number(item.retailPriceAud) > 0
      && Boolean(item.primaryImageUrl || (Array.isArray(item.imageUrls) && item.imageUrls.length))
      && Boolean(item.referencePrompt?.trim()),
    );
    if (purchasableItems.length === 0) throw new Error("Purchased wardrobe collection contains no active generation-ready items.");
  }

  const lease = await db.createWardrobeLease({
    userId,
    designerProfileId,
    wardrobeItemId: leaseType === "item" ? itemOrCollectionId : null,
    collectionId: leaseType === "collection" ? itemOrCollectionId : null,
    leaseType,
    stripePaymentIntentId: paymentIntentId,
    stripeTransferId: null,
    amountPaidAud,
    designerAmountAud,
    platformFeeAud,
    status: "active",
  } as any);

  // The purchase is not considered fulfilled until the buyer-owned snapshots
  // exist. A retry is safe: markers make the copy operation idempotent.
  const inventoryCopies = await ensurePermanentWardrobeCopiesForLease(lease as any);
  return { lease, inventoryCopies, alreadyFulfilled: false };
}

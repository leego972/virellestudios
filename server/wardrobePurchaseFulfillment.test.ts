import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getWardrobeLeaseByPaymentIntent: vi.fn(),
  getWardrobeItemById: vi.fn(),
  getDesignerCollectionById: vi.fn(),
  getWardrobeItemsByCollection: vi.fn(),
  createWardrobeLease: vi.fn(),
}));
const copyMocks = vi.hoisted(() => ({
  ensurePermanentWardrobeCopiesForLease: vi.fn(),
}));

vi.mock("./db", () => dbMocks);
vi.mock("./_core/wardrobePurchaseInventory", () => copyMocks);

import { fulfillWardrobePurchaseSession } from "./_core/wardrobePurchaseFulfillment";

function paidSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "cs_test_wardrobe",
    payment_status: "paid",
    payment_intent: "pi_wardrobe_1",
    amount_total: 1000,
    metadata: {
      type: "wardrobe_purchase",
      userId: "7",
      leaseType: "item",
      itemOrCollectionId: "10",
      designerProfileId: "20",
      platformFeeCents: "50",
      designerAmountCents: "950",
    },
    ...overrides,
  } as any;
}

describe("wardrobe purchase fulfilment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getWardrobeLeaseByPaymentIntent.mockResolvedValue(undefined);
    dbMocks.getWardrobeItemById.mockResolvedValue({
      id: 10,
      designerProfileId: 20,
      status: "active",
      visibility: "public",
      retailPriceAud: 1000,
      primaryImageUrl: "https://assets.example.test/coat.jpg",
      imageUrls: ["https://assets.example.test/coat.jpg"],
      referencePrompt: "Exact black wool coat",
    });
    dbMocks.getDesignerCollectionById.mockResolvedValue(undefined);
    dbMocks.getWardrobeItemsByCollection.mockResolvedValue([]);
    dbMocks.createWardrobeLease.mockImplementation(async (values) => ({ id: 99, ...values }));
    copyMocks.ensurePermanentWardrobeCopiesForLease.mockImplementation(async (lease) => [{
      leaseId: lease.id,
      leaseType: lease.leaseType,
      sourceWardrobeItemId: lease.wardrobeItemId ?? 301,
      copiedWardrobeItemId: 501,
      item: { id: 501, userId: lease.userId, name: "Private purchased copy" },
    }]);
  });

  it("creates a purchase receipt and a permanent buyer-owned item snapshot", async () => {
    const result = await fulfillWardrobePurchaseSession(paidSession(), 7);

    expect(result.alreadyFulfilled).toBe(false);
    expect(dbMocks.createWardrobeLease).toHaveBeenCalledOnce();
    expect(dbMocks.createWardrobeLease).toHaveBeenCalledWith(expect.objectContaining({
      userId: 7,
      wardrobeItemId: 10,
      collectionId: null,
      leaseType: "item",
      stripePaymentIntentId: "pi_wardrobe_1",
      amountPaidAud: 1000,
      designerAmountAud: 950,
      platformFeeAud: 50,
      status: "active",
    }));
    expect(copyMocks.ensurePermanentWardrobeCopiesForLease).toHaveBeenCalledWith(expect.objectContaining({ id: 99, userId: 7 }));
    expect(result.inventoryCopies[0]).toEqual(expect.objectContaining({ copiedWardrobeItemId: 501 }));
  });

  it("backfills or reloads inventory snapshots when webhook and browser callback race", async () => {
    const existing = { id: 41, userId: 7, wardrobeItemId: 10, leaseType: "item", stripePaymentIntentId: "pi_wardrobe_1", status: "active" };
    dbMocks.getWardrobeLeaseByPaymentIntent.mockResolvedValue(existing);

    const result = await fulfillWardrobePurchaseSession(paidSession(), 7);

    expect(result).toEqual({
      lease: existing,
      inventoryCopies: [expect.objectContaining({ leaseId: 41, copiedWardrobeItemId: 501 })],
      alreadyFulfilled: true,
    });
    expect(copyMocks.ensurePermanentWardrobeCopiesForLease).toHaveBeenCalledWith(existing);
    expect(dbMocks.createWardrobeLease).not.toHaveBeenCalled();
  });

  it("expands a valid collection purchase into permanent collection inventory snapshots", async () => {
    dbMocks.getDesignerCollectionById.mockResolvedValue({
      id: 30,
      designerProfileId: 20,
      published: true,
      visibility: "public",
    });
    dbMocks.getWardrobeItemsByCollection.mockResolvedValue([
      { id: 301, status: "active", visibility: "public", retailPriceAud: 600, primaryImageUrl: "https://assets.example.test/301.jpg", referencePrompt: "Item 301" },
      { id: 302, status: "active", visibility: "public", retailPriceAud: 400, primaryImageUrl: "https://assets.example.test/302.jpg", referencePrompt: "Item 302" },
    ]);
    const session = paidSession({
      payment_intent: "pi_collection_1",
      amount_total: 900,
      metadata: {
        type: "wardrobe_purchase",
        userId: "7",
        leaseType: "collection",
        itemOrCollectionId: "30",
        designerProfileId: "20",
        platformFeeCents: "45",
        designerAmountCents: "855",
      },
    });

    await fulfillWardrobePurchaseSession(session, 7);

    expect(dbMocks.createWardrobeLease).toHaveBeenCalledWith(expect.objectContaining({
      userId: 7,
      wardrobeItemId: null,
      collectionId: 30,
      leaseType: "collection",
      stripePaymentIntentId: "pi_collection_1",
    }));
    expect(copyMocks.ensurePermanentWardrobeCopiesForLease).toHaveBeenCalledOnce();
  });

  it("rejects unpaid, mismatched-user and unreconciled sessions", async () => {
    await expect(fulfillWardrobePurchaseSession(paidSession({ payment_status: "unpaid" }), 7))
      .rejects.toThrow(/not complete/);
    await expect(fulfillWardrobePurchaseSession(paidSession(), 8))
      .rejects.toThrow(/does not belong/);
    await expect(fulfillWardrobePurchaseSession(paidSession({
      metadata: {
        type: "wardrobe_purchase",
        userId: "7",
        leaseType: "item",
        itemOrCollectionId: "10",
        designerProfileId: "20",
        platformFeeCents: "10",
        designerAmountCents: "10",
      },
    }), 7)).rejects.toThrow(/does not reconcile/);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getWardrobeLeaseByPaymentIntent: vi.fn(),
  getWardrobeItemById: vi.fn(),
  getDesignerCollectionById: vi.fn(),
  getWardrobeItemsByCollection: vi.fn(),
  createWardrobeLease: vi.fn(),
}));

vi.mock("./db", () => dbMocks);

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
    });
    dbMocks.getDesignerCollectionById.mockResolvedValue(undefined);
    dbMocks.getWardrobeItemsByCollection.mockResolvedValue([]);
    dbMocks.createWardrobeLease.mockImplementation(async (values) => ({ id: 99, ...values }));
  });

  it("creates permanent item access from a paid session", async () => {
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
  });

  it("is idempotent when the webhook and browser callback both fulfil the same payment", async () => {
    const existing = { id: 41, userId: 7, stripePaymentIntentId: "pi_wardrobe_1", status: "active" };
    dbMocks.getWardrobeLeaseByPaymentIntent.mockResolvedValue(existing);

    const result = await fulfillWardrobePurchaseSession(paidSession(), 7);

    expect(result).toEqual({ lease: existing, alreadyFulfilled: true });
    expect(dbMocks.createWardrobeLease).not.toHaveBeenCalled();
  });

  it("expands a valid collection purchase into collection inventory access", async () => {
    dbMocks.getDesignerCollectionById.mockResolvedValue({
      id: 30,
      designerProfileId: 20,
      published: true,
      visibility: "public",
    });
    dbMocks.getWardrobeItemsByCollection.mockResolvedValue([
      { id: 301, status: "active", visibility: "public", retailPriceAud: 600 },
      { id: 302, status: "active", visibility: "public", retailPriceAud: 400 },
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

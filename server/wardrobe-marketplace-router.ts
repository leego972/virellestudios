import { designerCommerceCheckoutRouter } from "./designer-commerce-checkout-router";
import { designerCommerceRouter } from "./designer-commerce-router";
import { mergeRouters, router } from "./_core/trpc";
import { wardrobeMarketplaceRouter as legacyWardrobeMarketplaceRouter } from "./wardrobe-marketplace-router-legacy";

export const wardrobeMarketplaceRouter = mergeRouters(
  legacyWardrobeMarketplaceRouter,
  router({
    commerce: designerCommerceRouter,
    commercePurchase: designerCommerceCheckoutRouter,
  }),
);

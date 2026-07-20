import { designerPortalRouter } from "./designer-portal-router";
import { mergeRouters, router } from "./_core/trpc";
import { wardrobeMarketplaceRouter as legacyWardrobeMarketplaceRouter } from "./wardrobe-marketplace-router-legacy";

export const wardrobeMarketplaceRouter = mergeRouters(
  legacyWardrobeMarketplaceRouter,
  router({ portal: designerPortalRouter }),
);

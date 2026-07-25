import { designerAuthRouter } from "./designer-auth-router";
import { designerCommerceCheckoutRouter } from "./designer-commerce-checkout-router";
import { designerCommerceRouter } from "./designer-commerce-router";
import { designerGarmentIngestionRouter } from "./designer-garment-ingestion-router";
import { mergeRouters, router } from "./_core/trpc";
import { wardrobeMarketplaceRouter as legacyWardrobeMarketplaceRouter } from "./wardrobe-marketplace-router-legacy";

const commerceWithGarmentIngestion = mergeRouters(
  designerCommerceRouter,
  router({ garmentIngestion: designerGarmentIngestionRouter }),
);

export const wardrobeMarketplaceRouter = mergeRouters(
  legacyWardrobeMarketplaceRouter,
  router({
    designerAuth: designerAuthRouter,
    commerce: commerceWithGarmentIngestion,
    commercePurchase: designerCommerceCheckoutRouter,
  }),
);

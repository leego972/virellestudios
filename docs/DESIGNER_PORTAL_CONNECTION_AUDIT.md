# Designer Portal Connection Audit

## Account and access

- Designer registration requires an authenticated Virelle account.
- The Designer profile records the account holder name, date of birth, company, company address, public brand, designer type and intended production uses.
- Standard Designer membership uses `designer_only` access. The Designer + Filmmaker bundle uses `hybrid` access.
- Designer-only access is enforced in both the client route guard and protected tRPC middleware.
- Designer-only accounts can use Designer Studio, Designer listings, Wardrobe Marketplace, profile, payout and authentication endpoints. Production-building endpoints remain inaccessible.
- The normal filmmaker dashboard shell, render polling, production command palette and Director's Assistant are not mounted for Designer-only accounts.

## Listing storage and marketplace connection

- Drag-and-drop images are validated, rate limited and uploaded through `server/storage.ts`.
- Listing records are saved in `wardrobeItems` with the active Designer profile ID, prices, images, licensing flags and visibility.
- `wardrobeItems` is also consumed by the public Wardrobe Marketplace and production wardrobe-reference services, preventing a disconnected duplicate listing store.
- Published listings use `visibility=public` and `status=active`. Drafts and retired listings are excluded from public marketplace results.
- Completing an active Designer profile or publishing a listing makes the public brand visible in marketplace browsing.

## Privacy boundary

- Legal name, date of birth, company address, Stripe IDs and membership subscription IDs remain private account data.
- Public Designer marketplace responses are reduced to an explicit safe profile shape before being returned.
- The public profile includes brand-facing information only, such as brand name, display name, bio, website, Instagram, public imagery and verification state.

## Payments and payouts

- Designer membership and bundle checkout continue through the existing Stripe subscription endpoints.
- Stripe Checkout returns to Designer registration, where membership activation is verified before Designer access is granted.
- Stripe Connect onboarding and earnings remain connected to the active Designer profile.
- Marketplace leases retain the existing 95% Designer / 5% platform payment allocation.

## Repaired disconnected features

- The previously unused `designerProcedure` now validates the real `membershipStatus` field instead of a nonexistent `status` column.
- The Designer portal API is merged into the existing `wardrobeMarket` router, preserving all legacy marketplace, collection, lease and Stripe endpoints.
- The active Designer Studio no longer relies on URL-only image entry; it now creates and updates live marketplace records.
- Existing public marketplace endpoints no longer return complete Designer database rows.

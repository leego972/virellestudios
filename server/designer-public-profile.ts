export type PublicDesignerProfile = {
  id: number;
  brandName: string;
  displayName: string | null;
  profileType: string | null;
  bio: string | null;
  website: string | null;
  instagram: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  lookbookPdfUrl: string | null;
  signatureColour: string | null;
  typography: unknown;
  socialLinks: unknown;
  visibility: string | null;
  verificationStatus: string | null;
  verifiedAt: Date | null;
  isFeatured: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
};

/**
 * Public marketplace responses must never expose account-holder identity data,
 * addresses, dates of birth, Stripe IDs or membership subscription IDs.
 */
export function toPublicDesignerProfile(profile: any): PublicDesignerProfile {
  return {
    id: Number(profile.id),
    brandName: String(profile.brandName || "Designer"),
    displayName: profile.displayName ?? null,
    profileType: profile.profileType ?? null,
    bio: profile.bio ?? null,
    website: profile.website ?? null,
    instagram: profile.instagram ?? null,
    logoUrl: profile.logoUrl ?? null,
    coverImageUrl: profile.coverImageUrl ?? null,
    lookbookPdfUrl: profile.lookbookPdfUrl ?? null,
    signatureColour: profile.signatureColour ?? null,
    typography: profile.typography ?? null,
    socialLinks: profile.socialLinks ?? null,
    visibility: profile.visibility ?? null,
    verificationStatus: profile.verificationStatus ?? null,
    verifiedAt: profile.verifiedAt ?? null,
    isFeatured: Boolean(profile.isFeatured),
    createdAt: profile.createdAt ?? null,
    updatedAt: profile.updatedAt ?? null,
  };
}

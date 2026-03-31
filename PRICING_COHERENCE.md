# Pricing & Messaging Coherence Guide

## Overview

This document ensures consistent pricing, tier naming, and messaging across all public-facing pages (Landing, Pricing, DownloadApp) and the marketing materials.

---

## 1. Tier Naming Standardization

### Current State
The codebase uses inconsistent naming across different contexts:

| Internal DB | Display Name | Context |
|---|---|---|
| `indie` | Indie | Pricing page, self-serve |
| `amateur` | Creator | Pricing page, self-serve |
| `independent` | Studio | Pricing page, self-serve |
| `studio` | Production | Pricing page, enterprise |
| `industry` | Enterprise | Pricing page, enterprise |

### Standard Usage
- **Always use display names on public pages** (Landing, Pricing, DownloadApp)
- **Never expose internal DB names** (indie, amateur, independent, studio, industry) to users
- **Maintain consistency across all marketing materials**

### Checklist
- [ ] Landing page uses display names (Indie, Creator, Studio, Production, Enterprise)
- [ ] Pricing page uses display names consistently
- [ ] DownloadApp page uses display names
- [ ] All CTAs reference correct tier names
- [ ] Comparison tables use display names

---

## 2. Founding Offer Consistency

### Current Message (Pricing page, line 237-238)
> "The first 50 directors who join on an annual plan receive 50% off their first year. This is a one-time founding discount applied automatically at checkout. It renews at the standard annual rate."

### Key Points
- **Limit:** 50 directors (fixed, not flexible)
- **Eligibility:** Annual plans only (not monthly)
- **Discount:** 50% off first year only
- **Renewal:** Standard rate after first year
- **Automatic:** Applied at checkout, no code needed

### Usage Across Pages
1. **Landing page**: Brief mention of founding offer with link to Pricing
2. **Pricing page**: Full explanation in FAQ + banner on tier cards
3. **DownloadApp page**: Optional mention if relevant
4. **Checkout flow**: Display discount amount before payment

### Messaging Consistency Checklist
- [ ] Landing page: "First 50 directors get 50% off annual plans"
- [ ] Pricing page: Full FAQ answer + visual banner
- [ ] Checkout: Shows discount amount (e.g., "-$745 founding discount")
- [ ] No conflicting messages about "free trial" or "unlimited founding spots"
- [ ] No mention of founding offer on monthly plans

---

## 3. Pricing Display Consistency

### Self-Serve Tiers (Pricing page, lines 23-113)

| Tier | Monthly | Annual | Credits | Best For |
|---|---|---|---|---|
| **Indie** | A$149 | A$1,490 | 500/mo | Solo filmmakers, students |
| **Creator** | A$490 | A$4,900 | 2,000/mo | Serious indie producers |
| **Studio** | A$1,490 | A$14,900 | 6,000/mo | Boutique studios, agencies |

### Enterprise Tiers (Pricing page, lines 115-179)

| Tier | Price | Credits | Best For |
|---|---|---|---|
| **Production** | From A$4,990/mo | 15,500/mo | Production companies, VFX teams |
| **Enterprise** | Custom | Custom | Major studios, broadcasters |

### Credit Packs (Pricing page, lines 184-191)

| Pack | Credits | Price | Per-Credit | Savings |
|---|---|---|---|---|
| Starter | 100 | A$19 | A$0.19 | — |
| Producer | 300 | A$49 | A$0.16 | Save 16% |
| Director | 750 | A$99 | A$0.13 | Save 32% |
| Studio | 2,000 | A$199 | A$0.10 | Save 47% |
| Blockbuster | 5,000 | A$399 | A$0.08 | Save 58% |
| Mogul | 12,000 | A$799 | A$0.07 | Save 63% |

### Consistency Checklist
- [ ] All prices in AUD (Australian Dollars)
- [ ] Monthly/annual toggle only for self-serve tiers
- [ ] Enterprise tiers show "From A$X" or "Custom Pricing"
- [ ] Credit amounts match tier descriptions
- [ ] Savings percentages are accurate
- [ ] No conflicting prices across pages

---

## 4. Feature Clarity by Tier

### What's Included Where

#### Indie Tier (A$149/mo)
- 500 credits/month (~50 video scenes)
- AI Script Writer & Screenplay Tools
- Character Creator & DNA Lock
- Director's AI Assistant (Virelle Chat)
- Location Scout & Mood Board
- Shot List Generator
- Up to 2 projects
- 720p export
- BYOK support

#### Creator Tier (A$490/mo) — "Most Popular"
- Everything in Indie, plus:
- 2,000 credits/month (~200 video scenes)
- Video Generation (Runway, Sora, Kling, Veo)
- AI Voice Acting (35 emotions, 3,000+ voices)
- AI Film Score (Suno v4)
- Character DNA Lock across all scenes
- Up to 10 projects, 90 min per film
- 1080p export
- BYOK support

#### Studio Tier (A$1,490/mo) — "Commercial"
- Everything in Creator, plus:
- 6,000 credits/month (~600 video scenes)
- Film Post-Production (ADR, Foley, Score, 3-bus Mix)
- Subtitles in 130+ languages
- VFX Suite & Bulk Generation
- Ad & Poster Maker
- Up to 25 projects, 90 min per film
- 4K + ProRes export
- 5 team members
- Priority rendering queue

#### Production Tier (From A$4,990/mo)
- Everything in Studio, plus:
- 15,500 credits/month (~1,550 video scenes)
- Up to 100 projects, 150 min per film
- VFX Suite (Advanced Effects)
- Multi-Shot Sequencer
- NLE / DaVinci Resolve Export
- AI Casting Tool
- White-Label Exports
- Priority rendering queue
- 25 team members
- API Access & Pipeline Integration
- Global Funding Directory (94 funders, 73 countries)

#### Enterprise Tier (Custom)
- Everything in Production, plus:
- Credits tailored to deployment scope
- Unlimited projects, 180 min per film
- 4K + ProRes export
- Live Action Plate Compositing
- Custom AI Model Fine-Tuning
- Dedicated Account Manager
- Unlimited team members
- Custom onboarding & workflow design
- Bespoke commercial terms

### Consistency Checklist
- [ ] Feature descriptions are clear and benefit-focused
- [ ] No feature appears in multiple tiers without "Everything in X, plus:"
- [ ] Credit amounts are consistent across all mentions
- [ ] Export formats are tier-appropriate (720p → 1080p → 4K)
- [ ] Team member limits are clear
- [ ] Project limits are clear

---

## 5. Trust & Credibility Messaging

### Key Messages
1. **Not a toy**: "Virelle is premium cinematic production infrastructure built for serious creative and commercial output."
2. **Complete pipeline**: "You're not paying for clips; you're paying for a complete film studio."
3. **Professional pricing**: "Priced as infrastructure, not a tool."
4. **Proven value**: Compare to Runway (A$120/mo), Kling (A$104/mo), Artlist (A$315/mo)

### Messaging Consistency Checklist
- [ ] Landing page emphasizes "complete film studio" positioning
- [ ] Pricing page explains why Production/Enterprise are consultative
- [ ] FAQ addresses "Is this a low-cost creator tool?" (Answer: No)
- [ ] Tier descriptions use professional language
- [ ] Competitor comparison shows Virelle's unique value
- [ ] No "free" language unless there's a true free tier

---

## 6. Call-to-Action (CTA) Clarity

### Self-Serve Tier CTAs
- **Indie**: "Start Creating"
- **Creator**: "Start Producing"
- **Studio**: "Scale Production"

### Enterprise Tier CTAs
- **Production**: "Book a Private Demo"
- **Enterprise**: "Discuss Enterprise Workflow"

### Secondary CTAs
- **Indie**: "View Feature Breakdown"
- **Creator**: "See Workflow Features"
- **Studio**: "See Workflow Features"
- **Production**: "Request Production Pricing"
- **Enterprise**: "Contact Sales"

### CTA Consistency Checklist
- [ ] Self-serve CTAs lead to checkout
- [ ] Enterprise CTAs lead to contact form or demo booking
- [ ] Secondary CTAs provide more information
- [ ] No conflicting CTAs (e.g., "Buy now" + "Contact sales" on same tier)
- [ ] CTAs are action-oriented and clear

---

## 7. Public Page Audit Checklist

### Landing Page
- [ ] Tier names are display names (Indie, Creator, Studio, Production, Enterprise)
- [ ] Pricing is consistent with Pricing page
- [ ] Founding offer mentioned briefly with link
- [ ] No conflicting messaging about free tier or unlimited spots
- [ ] Testimonials mention real use cases (short films, VFX, YouTube content)
- [ ] Competitor comparison shows Virelle's unique value
- [ ] CTAs are clear and action-oriented

### Pricing Page
- [ ] All tier names are display names
- [ ] All prices in AUD
- [ ] Credit amounts match tier descriptions
- [ ] Founding offer clearly explained in FAQ
- [ ] Feature lists are clear and benefit-focused
- [ ] Tier badges are consistent (Entry, Most Popular, Commercial, Production, Enterprise)
- [ ] CTAs are appropriate for each tier
- [ ] Credit packs are clearly displayed
- [ ] Credit cost reference is accurate and helpful

### DownloadApp Page
- [ ] Tier names are display names
- [ ] Pricing is consistent with Pricing page
- [ ] App features are tier-appropriate
- [ ] No conflicting messaging
- [ ] CTAs are clear

---

## 8. Database & Backend Consistency

### Tier Mapping
```typescript
// In subscription.ts or similar
const tierMapping = {
  'indie': 'Indie',
  'amateur': 'Creator',
  'independent': 'Studio',
  'studio': 'Production',
  'industry': 'Enterprise',
};
```

### Price Validation
```typescript
// Ensure prices match across frontend and backend
const TIER_PRICES = {
  indie: { monthly: 149, annual: 1490 },
  amateur: { monthly: 490, annual: 4900 },
  independent: { monthly: 1490, annual: 14900 },
  studio: { monthly: 4990, annual: 0 }, // Enterprise only
  industry: { monthly: 0, annual: 0 }, // Custom pricing
};
```

### Consistency Checklist
- [ ] All tier prices match across frontend and backend
- [ ] Credit amounts are consistent
- [ ] Tier names are mapped correctly
- [ ] No hardcoded prices in components
- [ ] Prices are fetched from configuration

---

## 9. Messaging Tone & Style

### Tone Guidelines
- **Professional**: Use industry terminology (cinematography, post-production, compositing)
- **Confident**: Position Virelle as premium infrastructure, not a toy
- **Clear**: Explain features in terms of user benefits, not technical specs
- **Honest**: Acknowledge what Virelle is (complete film studio) and what it's not (free tool)

### Writing Checklist
- [ ] No marketing hyperbole or false claims
- [ ] Features are explained with user benefits
- [ ] Tier positioning is clear and distinct
- [ ] Language is professional and confident
- [ ] No conflicting messages across pages

---

## 10. Deployment Checklist

### Before Launch
- [ ] All pricing is consistent across pages
- [ ] All tier names are display names on public pages
- [ ] Founding offer messaging is clear and consistent
- [ ] CTAs are appropriate for each tier
- [ ] Feature lists are accurate and benefit-focused
- [ ] Competitor comparison is accurate
- [ ] Trust messaging is present and consistent
- [ ] No conflicting messages about free tier or unlimited spots

### Post-Launch Monitoring
- [ ] Monitor user feedback on pricing clarity
- [ ] Track conversion rates by tier
- [ ] Monitor for pricing confusion in support tickets
- [ ] Verify founding offer is applied correctly
- [ ] Check for any pricing inconsistencies across pages

---

## 11. Future Updates

### When Adding New Features
1. Decide which tier(s) get the feature
2. Update feature lists on Pricing page
3. Update tier descriptions on Landing page
4. Update feature comparison table
5. Update credit costs if applicable
6. Test consistency across all pages

### When Changing Prices
1. Update `TIER_PRICES` in backend
2. Update Pricing page
3. Update Landing page (if mentioned)
4. Update DownloadApp page (if mentioned)
5. Update FAQ if needed
6. Test checkout flow

### When Adding New Tiers
1. Add to tier definitions
2. Update all pages
3. Update backend tier mapping
4. Update feature comparison
5. Update CTAs
6. Test consistency

---

## References

- Pricing page: `client/src/pages/Pricing.tsx`
- Landing page: `client/src/pages/Landing.tsx`
- DownloadApp page: `client/src/pages/DownloadApp.tsx`
- Backend tiers: `server/_core/subscription.ts`


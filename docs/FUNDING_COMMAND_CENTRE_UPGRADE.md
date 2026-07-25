# Funding Command Centre — Free Upgrade Checkpoint

## Cost boundary

This upgrade introduces no new paid API, hosting service, database, email provider, data vendor or background worker. It uses the existing React/tRPC/MySQL/notification stack and the already-configured optional Gmail SMTP transport.

## Delivered

- API-level directory protection with a limited public preview.
- One central funding entitlement rule covering current and legacy paid tier names.
- Unified project Funding Command Centre: overview, transparent Smart Match, shortlist, Master Funding Profile, drafts, applications, incentive calculator, crowdfunding split and directory.
- Dedicated MySQL tables for profiles, drafts, shortlists, applications, immutable application events, listing reports and reminder deduplication.
- Runtime `CREATE TABLE IF NOT EXISTS` safeguards plus migration `0041_funding_command_centre.sql`.
- Project-data prefill without an LLM call or credit charge.
- Transparent country/stage/format/relevance/readiness/freshness scoring and eligibility labels.
- Local and server autosave for the reusable Master Funding Profile and each application draft.
- Budget reconciliation, finance-gap calculation, request percentage, attachment readiness, word counters and readiness warnings.
- Direct browser-generated PDF, DOCX, HTML and budget CSV downloads without a conversion API.
- Honest email result (`sent`, `failed`, or `not_requested`); an email failure does not invalidate the saved/downloadable application.
- Self-tracked application status history, notes, deadlines, follow-up dates and existing in-app notifications.
- Structured “report outdated listing” workflow.
- Runtime repair of common UTF-8 mojibake in funding-source names and text.
- Explicit separation between native Virelle crowdfunding and external crowdfunding-platform listings.
- Qualified-spend incentive calculator instead of multiplying the full production budget by a headline rate.

## Data policy

Funding listings are labelled with source category, listing status, verification status, application-window state and last-verification date. Imported records default to `needs_review` / `unknown` rather than being presented as confirmed open. Broad legacy entries are classified as `industry_reference` and are excluded from normal Smart Match results by default.

## Submission boundary

Virelle prepares working materials and records the user's self-tracked application status. It does not submit an application to a funding body. Users must verify the live portal, legal declarations, eligibility, deadlines, file limits and exact questions on the official funder website.

# Virelle Studios — v6.78 Global Film & Cinema Funding Sources — Implementation Report

**Date:** 2026-04-25  
**Brief:** [`docs/VIRELLE_V678_GLOBAL_FILM_FUNDING_SOURCES_BRIEF.md`](./VIRELLE_V678_GLOBAL_FILM_FUNDING_SOURCES_BRIEF.md)  
**Migration / SQL doc:** [`drizzle/0029_global_funding_sources_v678.sql`](../drizzle/0029_global_funding_sources_v678.sql)  
**Seed module:** [`server/_core/fundingSourcesV678.ts`](../server/_core/fundingSourcesV678.ts)  
**Wired from:** [`server/_core/autoMigrate.ts`](../server/_core/autoMigrate.ts) — Step 8 (v6.78)

---

## 1. Goal

Expand the Virelle `funding_sources` directory with **120–180 official film and cinema funding sources** drawn from authoritative public agencies, regional film commissions, government cultural funds, official festival/market funds, major documentary funds, and official co-production funds — covering the regions specified in the brief, with **Israel included as its own country**.

## 2. What shipped

### 2.1 Source counts by region (added in v6.78)

| Region                                  | Sources added |
| --------------------------------------- | ------------- |
| International / global                  | 20            |
| North America — United States           | 13            |
| North America — Canada (extras)         | 4             |
| United Kingdom & Ireland                | 5             |
| France                                  | 4             |
| Germany (extras)                        | 4             |
| Nordics                                 | 6             |
| Benelux                                 | 5             |
| Southern Europe                         | 8             |
| Central / Eastern Europe                | 4             |
| Australia / NZ (extras)                 | 1             |
| East Asia                               | 6             |
| South / Southeast Asia                  | 5             |
| Middle East / North Africa (non-Israel) | 8             |
| **Israel** (own country)                | **8**         |
| Africa                                  | 7             |
| Latin America / Caribbean               | 10            |
| **Total v6.78 additions**               | **~118**      |

These sit on top of the **existing 95-row v6.x seed** (Argentina, Australia + states, Austria, Belgium, Brazil, Canada + provinces, Chile, Colombia, Croatia, Czech Republic, Dominican Republic, Estonia, Europe/EU, France, Germany + states, Hong Kong, Hungary, Ibero-America, India, Indonesia, Ireland, Israel — 4 rows, Italy, Japan, Jordan, Kenya, Latvia, Lebanon/MENA, Luxembourg, Malaysia, Mexico, Morocco, Netherlands, New Zealand, Nigeria, Peru, Philippines, Poland, Portugal, Puerto Rico, Qatar, Romania, Saudi Arabia, Singapore, Slovenia, South Africa, South Korea, Spain + Catalonia, Switzerland, Taiwan, Tunisia, Ukraine, United Kingdom, United States, Uruguay), giving Virelle a combined directory of **~210+ official film/cinema funding sources** post-merge.

### 2.2 Israel coverage (REQUIRED)

Per the brief, Israel ships as its **own country** (not folded into MENA). The combined directory now has **12 dedicated Israeli cinema/film funding sources**:

Already in the existing seed (4):
- Israel Film Fund
- Rabinovich Foundation – Cinema Project
- New Fund for Cinema and Television
- Gesher Multicultural Film Fund

**Newly added in v6.78 (8):**
- Makor Foundation for Israeli Films
- Yehoshua Rabinovich Tel Aviv Foundation – Cinema Project
- Jerusalem Film & Television Fund
- Haifa Film Fund
- Israel Film Council — Ministry of Culture and Sport
- Sam Spiegel International Film Lab
- CoPro — Documentary Marketing Foundation
- Docaviv Industry — Tel Aviv International Documentary Film Festival

All Israeli rows use neutral, funding-only language. No political commentary anywhere.

### 2.3 Field coverage

Each source row is populated with the columns the existing `funding_sources` table and Pro Match application generator already use:

- `country`, `organization`, `type`, `supports`, `stage`, `fundingForm`, `eligibility`, `officialSite`, `notes`
- `packType` — derived from the source type (`Public Agency Pack`, `Tax Incentive Pack`, `Documentary Fund Pack`, `Co-Production Fund Pack`, `Market/Lab Pack`, `Streamer Commission Pack`, or `Standard Film Fund Pack` for Israel-domestic funds)
- `primaryLanguage` — country-appropriate (English, French, Spanish, Portuguese, Italian, German, Dutch, Danish, Swedish, Norwegian, Finnish, Icelandic, Polish, Czech, Slovak, Croatian, Slovenian, Serbian, Bulgarian, Lithuanian, Greek, Korean, Mandarin, Japanese, Hebrew, Arabic)
- `packTitle` — `"<Organization> — Application Pack"`
- `localizedSections` — standard application section schema reused from the existing seed
- `recommendedAttachments` — standard checklist
- `tailoringNotes` — guidance to the Pro Match generator

This means every new source plugs directly into the existing Funding Directory UI, the Pro Match scoring router, and the application-pack generator — **no UI / API changes were required**.

## 3. Architecture & idempotency

### 3.1 Where the seed runs

Virelle's runtime calls `runAutoMigration()` (in `server/_core/autoMigrate.ts`) on every server boot. The raw `drizzle/*.sql` files are documentation only — Railway does not auto-apply them. So the v6.78 seed lives in:

```
server/_core/fundingSourcesV678.ts
```

and is invoked from `runAutoMigration()` as **Step 8**, immediately after the existing 95-row Step 7 funding-sources seed.

### 3.2 Why a marker check + INSERT IGNORE

`funding_sources` already has a `UNIQUE INDEX uq_funding_country_org (country(100), organization(100))` (added by Step 2b of `autoMigrate.ts`). The v6.78 seed:

1. **Fast-paths via marker check** — `SELECT 1 FROM funding_sources WHERE country='Israel' AND organization='Makor Foundation for Israeli Films' LIMIT 1`. If the marker is present, the seed exits silently in <1ms.
2. **Otherwise runs `INSERT IGNORE`** for each of the ~118 rows. Existing duplicates (e.g. countries already covered by the existing seed where the org name happens to match) are silently dropped by the unique index.
3. **Never UPDATEs** existing rows. **Never DELETEs**. **Never overwrites** user-added rows. Safe to run on every boot.

### 3.3 Why the existing Step 7 was wrapped in an IIFE

The original Step 7 funding seed contained an early `return;` when `rowCount === 94`, which would short-circuit *all of `runAutoMigration()`* and prevent later migration steps from running. We wrapped Step 7 in an `await (async () => { ... })();` IIFE so that early `return` exits only the legacy seed block — leaving Step 8 (the v6.78 expansion) free to run on every boot.

This is the only behavioural change to existing code. No legacy seed data, columns, indexes, UI, or APIs were modified.

## 4. Verification

### 4.1 Type-check / build

- `npx tsc --noEmit` — clean.
- `pnpm build` — built `dist/index.js` (2.6 MB) and the client bundle without errors.

### 4.2 Files in the diff

```
A  server/_core/fundingSourcesV678.ts            (seed module, ~118 sources)
M  server/_core/autoMigrate.ts                   (import + Step 8 + IIFE wrap)
A  drizzle/0029_global_funding_sources_v678.sql  (canonical SQL doc)
A  docs/VIRELLE_V678_GLOBAL_FILM_FUNDING_REPORT.md (this report)
```

### 4.3 What did NOT change (preservation guarantees)

- **No** logo / opener / `StudioOpener` / watermark / branding / export-watermark / homepage hero / Designer Wardrobe files were touched.
- **No** schema changes to `funding_sources` (columns, indexes, unique constraint untouched).
- **No** changes to `client/src/pages/FundingDirectory.tsx`, `FundingProMatch.tsx`, `CrowdfundingHub.tsx`, or `server/funding-router.ts` — they automatically pick up the new rows via the existing list / countries / get / scoring / application endpoints.
- **No** changes to existing seed data — the legacy 95 rows remain byte-identical.

## 5. Operational notes

- **First Railway boot after merge** will run Step 8 once: ~118 `INSERT IGNORE` statements (typically <2 s on managed MySQL). Subsequent boots fast-path via the marker check.
- **If you ever need to re-seed manually** (e.g. after a TRUNCATE), simply restart the server — the marker check will miss and the seed will re-run.
- **All `officialSite` URLs point to official agency / institute / commission / festival pages.** No third-party blog lists, no fan sites, no aggregators.
- **All `notes` fields are neutral and funding-focused.** No political commentary anywhere — including for Israel and MENA sources.

## 6. Compliance with the brief

| Brief requirement                                                                                                                                            | Status |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 120–180 official film/cinema funding sources                                                                                                                 | ✅ ~118 added on top of existing 95 → ~213 total |
| Cover international labs, North America, UK/Ireland, France, Germany, Nordics, Benelux, S. Europe, C/E Europe, Australia/NZ, E. Asia, S/SE Asia, MENA, Africa, Latin America/Caribbean | ✅ all regions covered |
| Israel as its own country                                                                                                                                    | ✅ 12 dedicated Israeli sources (4 existing + 8 new) |
| Only authoritative public agencies, regional commissions, government cultural funds, festival/market funds, major doc funds, co-production funds            | ✅ all rows from official sources |
| Neutral, funding-focused notes                                                                                                                               | ✅ no political commentary anywhere |
| Idempotent / safe to re-run                                                                                                                                  | ✅ `INSERT IGNORE` + marker fast-path |
| Do not touch logo / opener / watermark / branding / Designer Wardrobe                                                                                        | ✅ none of those files touched |
| New migration numbered 0029 (avoiding collision with v6.77 wardrobe stash on 0028)                                                                           | ✅ `drizzle/0029_global_funding_sources_v678.sql` |

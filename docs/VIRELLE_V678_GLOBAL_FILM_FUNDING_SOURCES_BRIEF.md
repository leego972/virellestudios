# Virelle v6.78 — Global Film & Cinema Funding Sources Brief

The user reports that the funding section previously had more countries/listings and they may have been lost. This pass restores and expands the film/cinema funding section globally.

## Goal

Add a broad, useful, director-facing global film funding directory inside the existing funding section.

Do **not** create a new funding product. Reuse the existing `fundingSources` table/router/UI.

## Hard no-touch areas

Do **not** edit:

- logo files
- `StudioOpener`
- opener video flow
- opener video assets
- watermark components
- watermark placement
- export watermark logic
- homepage/brand hero visuals
- Designer Wardrobe files/briefs/routes

## Current known structure

Existing funding route:

```txt
server/funding-router.ts
```

Existing schema:

```txt
fundingSources in drizzle/schema.ts
```

The funding router already supports:

- list
- countries
- get
- scoring against project
- funding application generation/email

Use and extend that existing system only.

## Phase 1 — inspect current funding model

Inspect:

```txt
drizzle/schema.ts
server/funding-router.ts
client funding pages/components
existing migrations/seeds touching fundingSources
```

Find exact `fundingSources` columns before writing SQL.

Do not guess column names. Align inserts to the actual table.

## Phase 2 — source quality requirements

Use official/current sources where possible.

Prefer sources from:

- national screen agencies
- regional film commissions
- government cultural funds
- official festival/market funds
- major documentary funds
- official co-production funds
- official broadcaster/film institute funding pages

Avoid low-quality random blog lists as primary source.

For each source, capture as much as the schema supports:

- country
- organization
- official site
- fund type
- stage
- supports
- eligibility
- notes
- recommended attachments

If the schema does not have separate fields, use existing broad fields such as notes/supports/eligibility.

## Phase 3 — add/restore global sources

Add at least 120–180 high-quality funding sources globally, deduped by country + organization.

Minimum coverage:

### International / global

Include sources such as:

- IDFA Bertha Fund
- Sundance Institute Documentary Fund
- Sundance Development / Production funds where applicable
- Doha Film Institute Grants
- World Cinema Fund
- Hubert Bals Fund
- Visions Sud Est
- Sørfond
- Hot Docs funds/forums
- Chicken & Egg Pictures
- Catapult Film Fund
- Documentary Campus / markets where relevant
- Creative Europe MEDIA
- Eurimages
- TorinoFilmLab
- Berlinale Co-Production Market
- Cannes Cinéfondation / L’Atelier / market support where relevant
- Locarno Open Doors
- CPH:FORUM
- Sheffield DocFest MeetMarket
- Tribeca / Gucci / related documentary or impact funding where official/current

### North America

United States:

- National Endowment for the Arts
- ITVS
- PBS / POV / American Documentary
- Sundance Institute
- Film Independent
- Catapult Film Fund
- Chicken & Egg Pictures
- Black Public Media
- Latino Public Broadcasting
- Center for Asian American Media
- Vision Maker Media
- Firelight Media
- Ford Foundation JustFilms
- California Film Commission incentives
- New York State Film Tax Credit / NYSCA film where applicable
- Georgia Film Office incentives
- New Mexico Film Office incentives
- Louisiana Entertainment incentives
- Illinois Film Office incentives
- Texas Moving Image Industry Incentive

Canada:

- Telefilm Canada
- Canada Media Fund
- National Film Board of Canada
- Ontario Creates
- SODEC Quebec
- Creative BC
- Alberta Media Fund
- Manitoba Film & Music
- Screen Nova Scotia
- Newfoundland and Labrador Film Development Corporation

### Europe

United Kingdom / Ireland:

- BFI Filmmaking Fund
- BFI Doc Society funds
- BBC Film
- Film4
- Screen Scotland
- Northern Ireland Screen
- Ffilm Cymru Wales
- Screen Ireland

France:

- CNC
- Région Île-de-France
- ARTE France Cinéma
- La Région Provence-Alpes-Côte d’Azur cinema funds where official

Germany:

- German Federal Film Board FFA
- German Federal Film Fund DFFF
- Medienboard Berlin-Brandenburg
- Film- und Medienstiftung NRW
- FFF Bayern
- MOIN Filmförderung Hamburg Schleswig-Holstein

Nordics:

- Danish Film Institute
- Swedish Film Institute
- Norwegian Film Institute
- Finnish Film Foundation
- Icelandic Film Centre
- Nordisk Film & TV Fond

Benelux:

- Netherlands Film Fund
- Flanders Audiovisual Fund VAF
- Screen Flanders
- Centre du Cinéma et de l’Audiovisuel Belgium
- Film Fund Luxembourg

Southern Europe:

- ICAA Spain
- Istituto Luce Cinecittà / MiC cinema funds Italy
- Portuguese ICA
- Greek Film Centre
- Croatian Audiovisual Centre
- Slovenian Film Centre
- Serbian Film Center
- Bulgarian National Film Center
- Romanian CNC

Central / Eastern Europe:

- Polish Film Institute
- Czech Film Fund
- Slovak Audiovisual Fund
- Hungarian National Film Institute
- Lithuanian Film Centre
- Latvian National Film Centre
- Estonian Film Institute

### Asia-Pacific

Australia / New Zealand:

- Screen Australia
- state bodies: Screen NSW, VicScreen, Screen Queensland, South Australian Film Corporation, Screenwest, Screen Tasmania
- New Zealand Film Commission

East Asia:

- Korean Film Council KOFIC
- Busan Asian Cinema Fund / Asian Project Market
- Japan Agency for Cultural Affairs film support where official
- Japan Foundation where relevant
- Tokyo Gap-Financing Market / TIFFCOM where relevant
- Taiwan Creative Content Agency TAICCA
- Taipei Film Commission incentives
- Hong Kong Film Development Council
- Create Hong Kong / Film Development Fund

South / Southeast Asia:

- Film Development Council of the Philippines
- Singapore IMDA media grants
- Thailand Film Office incentives
- Malaysia FINAS / film incentives
- Indonesia film funding bodies where official
- Vietnam cinema support where official
- NFDC India / Film Facilitation Office India
- Film Bazaar Co-Production Market

### Middle East / North Africa

- Doha Film Institute
- Red Sea Fund
- Saudi Film Commission incentives/grants
- Abu Dhabi Film Commission rebate
- Dubai Film and TV Commission
- Jordan Royal Film Commission
- AFAC
- Arab Fund for Arts and Culture cinema programs
- Marrakech / Atlas Workshops
- Egypt film commission or cultural funds where official
- Tunisia CNCI where official
- Morocco CCM support funds

### Africa

- National Film and Video Foundation South Africa
- KwaZulu-Natal Film Commission
- Gauteng Film Commission
- Kenya Film Commission / Kalasha support where official
- Nigeria film/cultural agencies where official
- Ghana film/cultural agencies where official
- Rwanda Film Office / Rwanda incentives where official
- Senegal FOPICA
- CNC / OIF support for African co-productions where relevant
- Durban FilmMart
- Realness Institute / Episodic Lab / African film development funds where official

### Latin America / Caribbean

- Brazil ANCINE / Fundo Setorial do Audiovisual
- Argentina INCAA
- Chile Fondo Audiovisual
- Colombia Proimágenes / FDC
- Mexico IMCINE / EFICINE
- Uruguay ICAU / Uruguay Audiovisual
- Peru DAFO
- Ecuador ICCA where official
- Costa Rica film incentives/funds where official
- Dominican Republic DGCINE incentives
- Puerto Rico Film Commission incentives
- Ibermedia
- CinemaChile / market support where relevant
- Guadalajara Construye / Morelia Lab where official

## Phase 4 — implementation format

Preferred implementation:

1. Create an idempotent seed/migration file that inserts missing sources only.
2. Use `INSERT IGNORE` or `ON DUPLICATE KEY UPDATE` if the table has unique keys.
3. If no unique index exists, dedupe manually using country + organization in seed code.
4. Do not delete existing funding rows.
5. Do not overwrite user-added rows.

Possible files:

```txt
drizzle/0029_global_funding_sources_v678.sql
scripts/seed-global-funding-sources.ts
```

Choose the safest convention used by the repo.

## Phase 5 — UI improvements if needed

Only if low-risk:

- improve country filter search
- add region filter if existing UI supports it simply
- add source count by country
- add “official site” button
- show stage/type/supports clearly

Do not redesign the funding section.

## Phase 6 — docs/report

Create:

```txt
docs/VIRELLE_V678_GLOBAL_FILM_FUNDING_REPORT.md
```

Include:

- files changed
- number of sources added
- countries/regions added
- dedupe method
- source quality rules
- any sources skipped because official info was uncertain
- build results
- manual QA checklist

## Manual QA checklist

1. Funding page loads.
2. Country filter works.
3. Search works.
4. Official site links render for new entries.
5. No duplicate country+organization rows shown.
6. At least 100+ global sources visible.
7. Existing funding application flow still works.
8. Project matching/scoring still works.
9. No logo/opener/watermark/designer wardrobe files touched.
10. Run `pnpm check` and `pnpm build`.

## Final verification

Run:

```bash
pnpm check
pnpm build
```

Fix only build/runtime errors. Do not add unrelated features.

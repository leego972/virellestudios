# Virelle stale repository consolidation audit

Date: 2026-07-19

Repositories reviewed:

- Production source: `leego972/virellestudios`
- Stale monorepo candidate: `leego972/virelle`
- Current mobile source retained separately: `leego972/virellestudios-mobile`

## Decision

`leego972/virellestudios` remains the canonical production repository.

No production code from `leego972/virelle` should be copied into the canonical repository. The stale monorepo is an older May 2026 snapshot whose useful web changes are already present in newer or equivalent form in `virellestudios`, while its mobile and desktop packages have been superseded.

The stale repository may be deleted after the owner confirms there are no GitHub Releases or workflow artifacts that must be retained outside Git history.

## Findings

### Web application

The stale repository stores the web application under `apps/web`. Its dependency versions and deployment assumptions are older than the root application in `virellestudios`.

Historical fixes reviewed from the stale repository include:

- TV commercial generation wired to the real trailer-generation pipeline.
- Corrected subscription gates for trailer, commercial, director-cut and screener tools.
- Cinematic typography, watermark and responsive mobile-web adjustments.

The production repository already contains the real TV commercial generation mutation and has continued development well beyond the stale snapshot. Copying the stale web tree would overwrite newer production work and create regressions.

### Mobile application

The stale repository contains `apps/mobile`, an Expo SDK 54 application.

A newer and more complete mobile application exists in `leego972/virellestudios-mobile`. Its package manifest includes capabilities absent from the stale package, including image picker, blur, linear-gradient and slider support. The stale mobile package must not be copied into the production web repository.

`leego972/virellestudios-mobile` is not part of this deletion decision and should be retained.

### Desktop application

The stale repository contains `apps/desktop`, an Electron package configured to publish releases back to the stale `virelle` repository.

The canonical production repository already contains a newer `desktop/` application at version 1.1.0 with updated application identity, 2026 metadata, deep-link protocol support and direct production/local target configuration. The stale desktop package is superseded and must not be copied.

### Workspace and deployment files

The stale root uses Turbo and a pnpm workspace to wrap web, mobile and desktop. This structure is not the current production deployment architecture. Its Railway deployment files and CI history are obsolete following the move to Render and the Railway account cancellation.

Copying the stale workspace configuration would alter production build paths and is unsafe.

## Consolidation result

| Area | Result |
|---|---|
| Web application | Already present and newer in `virellestudios` |
| Mobile application | Superseded by `virellestudios-mobile` |
| Desktop application | Superseded by `virellestudios/desktop` |
| Historical fixes | Already implemented or replaced |
| Railway CI/deployment | Obsolete; do not migrate |
| Turbo workspace wrapper | Not required; do not migrate |
| Documentation | Useful conclusions preserved in this audit |

## Deletion checklist

Before deleting `leego972/virelle`:

1. Confirm no required binaries exist only under GitHub Releases.
2. Confirm no required workflow artifacts need downloading.
3. Confirm Render is connected to `leego972/virellestudios`.
4. Retain `leego972/virellestudios-mobile` as the current mobile repository.
5. Delete or archive only `leego972/virelle`.

## Canonical repository map

- Web/backend/production deployment: `leego972/virellestudios`
- Desktop wrapper: `leego972/virellestudios/desktop`
- Mobile application: `leego972/virellestudios-mobile`

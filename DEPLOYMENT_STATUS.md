# Deployment Status — Virelle Studios

  **Last updated:** 2026-06-16  
  **Tag:** `virelle-stable-june-2026`  
  **Commit:** `56f4b5f77ac77317f5a1c52fc7ad88e86a7b8f53`

  ---

  ## Production environment

  | Property | Value |
  |---|---|
  | Platform | Railway |
  | Domain | virelle.life |
  | Region | Railway default |
  | Node.js | 24 |
  | Framework | Express 5 + React + Vite |
  | Database | PostgreSQL (Railway-provisioned) |
  | Payments | Stripe |
  | AI providers | OpenAI · Runway · fal.ai · ElevenLabs · Suno |
  | Build tool | esbuild (server) + Vite (client) |

  ---

  ## Current status (2026-06-16T05:32:49Z)

  | Service | Status |
  |---|---|
  | Web (virelle.life) | ✅ Online |
  | API (/api/health) | ✅ Responding — `{"status":"ok"}` |
  | Database | ⚠️ `"database":"configured"` — Railway env var pending; non-blocking |
  | Stripe webhooks | Not tested this session |

  ---

  ## Git history — this session

  | SHA | Description |
  |---|---|
  | `56f4b5f` | feat(pricing): trust + conversion improvements |
  | `bfa0082` | fix: TypeScript errors — advertising-orchestrator union types |
  | `b577bf8` | fix: TypeScript errors — lamalo-seed logger |
  | `571b52b` | fix: TypeScript errors — content-creator-router |
  | `8f2c109` | fix: TypeScript errors — youtube-oauth-router |
  | `f5267d2` | fix: TypeScript errors — tiktok-oauth-router |
  | `d476cb5` | fix: TypeScript errors — snapchat-oauth-router |
  | `0bb5764` | fix: TypeScript errors — instagram-oauth-router |
  | `fe59155` | fix: TypeScript errors — runwayVideoGeneration |
  | `29e2d74` | fix: TypeScript errors — byokVideoEngine |
  | `113bdb1` | fix: TypeScript errors — stripeProvisioning |
  | `4a409e2` | fix: TypeScript errors — sdk |
  | `f8728f9` | fix: TypeScript errors — oauth |
  | `073d9d9` | fix: TypeScript errors — wiseAssistantEngine |
  | `bffb0cf` | fix: TypeScript errors — videoStitcher |
  | `5b4cf94` | fix: TypeScript errors — soundtrackEngine |
  | `ac914af` | fix: TypeScript errors — nanoBananaGeneration |
  | `ed71c2a` | fix: TypeScript errors — filmPipeline |
  | `d4d769a` | fix: TypeScript errors — extendedSceneGenerator |
  | `7562cf1` | fix: TypeScript errors — contentModerationEngine |
  | `b1de990` | fix: TypeScript errors — advertisingEngine |
  | `04919c8` | fix: TypeScript errors — videoGeneration (OpenAI sk-none) |
  | `094d01f` | fix(routers): declare missing _bulkFalOverrides, _bulkFalWardrobeCtx, bulkOtherRefs; fix _effectivePhotoWardrobeCtx and _effectiveWardrobeContext |
  | `4b43440` | fix(seo-router): add getStatus procedure; fix optimizeBlogPostSeo args; import db |
  | `0d17e2f` | fix(Changelog): add filter guard for undefined ChangeEntry |
  | `b8a2050` | fix(SeoDashboard): correct tRPC method names and killSwitch input |
  | `3a258f7` | fix(Home): add missing ChevronLeft import |
  | `3f824b5` | fix(server): stray brace, duplicate import, db.db.execute → await db.getDb() |

  ---

  ## Git tags

  | Tag | SHA | Description |
  |---|---|---|
  | `v1.0-prod-2026-06-16` | `56f4b5f` | First production checkpoint |
  | `virelle-stable-june-2026` | `56f4b5f` | Stable production release — June 2026 |

  ---

  ## Backup

  | File | Size | Location |
  |---|---|---|
  | `virellestudios-v1.0-prod-2026-06-16.zip` | 115.9 MB | Replit workspace root |

  ---

  ## Pending before next release

  - [ ] Manual flow verification (see STABILITY_REPORT.md checklist)
  - [ ] Railway `DATABASE_URL` health check — confirm `"database":"ok"` after next deploy
  - [ ] Stripe webhook endpoint confirmation
  
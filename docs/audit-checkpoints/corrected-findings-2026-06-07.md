# Corrected Findings 2026-06-07

Scope: `leego972/virellestudios` and `leego972/virellestudios-mobile` only.

Excluded: `leego972/virelle`.

Confirmed:

- Prior `AUDIT_ISSUES.md` already records major fixed work.
- Active subscription code maps unpaid users to `none`, not Studio.
- `StudioOpener` / opener flow exists and is wired for successful login.
- Complete stitched movie export prepends the Virelle opener once at the beginning of the complete output, before title card/scenes, not before each scene.
- Designer Wardrobe / wardrobe marketplace tables and router exist.
- AI-generated custom wardrobe items save rendered image URLs and auto-assign to characters for prompt use.

Remaining work should focus on real defects only, not redoing existing opener, wardrobe, watermark, or prior fixed audit work.

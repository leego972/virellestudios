# Lamalo and designer wardrobe free generation pipeline

This pipeline creates permanent, video-ready wardrobe assets while keeping the customer shop simple. The shop displays one clean product image per purchasable colour SKU. The hidden backend package stores the immutable GLB, material data, continuity references, 36 verification views and QA reports used by the AI video-generation pipeline.

## Zero paid generation APIs

The generation path uses downloadable open models only:

- **FLUX.1-schnell** for clean reconstruction references and seamless pattern textures — Apache-2.0.
- **Microsoft TRELLIS-image-large** as the preferred image-to-3D engine — MIT.
- **TripoSR** as the lower-memory fallback — MIT.
- **Qwen3-VL-4B-Instruct** for local source and turntable quality review — Apache-2.0.
- **Blender** for deterministic cleanup, materials, GLB export and rendering.

No OpenAI, Meshy, Adobe, Replicate, fal or other paid generation API is called by this production path.

## Lamalo commercial behaviour

- The current manifest contains **149 clothing base designs** and **1,206 separate colour SKUs**.
- Every colour remains a distinct catalogue item, checkout, receipt and permanent inventory entry.
- Geometry is shared only within the exact base design, gender fit, category and subcategory.
- Solid colours use deterministic material variants of the same mesh.
- Checks, stripes, florals and multi-tone variants receive dedicated texture variants while retaining the same geometry.
- Each base design is generated once and reused permanently unless an administrator deliberately forces regeneration.

## Hidden output package per base design

- One approved reconstruction source.
- One cleaned and normalized GLB master.
- PBR material and texture data.
- Thirty-six 10-degree verification renders for each colour SKU.
- Twelve continuity references for simple garments or twenty-four for complex garments and uniforms.
- Machine-readable construction, colour-lock, scale, orientation and QA metadata.
- Immutable checksums and local visual-review reports.

The customer-facing marketplace uses only the SKU `primaryImageUrl`. Verification and continuity assets remain backend-only.

## Quality gates

Publication is blocked unless all applicable checks pass:

1. Source reference score of at least 92/100 with no material defects.
2. Exactly 36 unique renders produced from one immutable GLB.
3. Canonical front three-quarter, front, back and side views.
4. Zero glTF validator errors.
5. Turntable score of at least 94/100 with no material defects.
6. Required continuity references present: 12 or 24 according to garment complexity.
7. Every requested colour SKU rendered and approved.

## Free Kaggle execution — no infrastructure credentials

Use `notebooks/lamalo-free-360-kaggle.ipynb`.

The notebook:

- defaults to all 149 Lamalo base designs;
- uses a free Kaggle GPU;
- requires no Aiven, Render, Cloudflare, database, storage or DNS credentials;
- accepts only an optional free `HF_TOKEN` when a model repository requires accepted terms;
- runs the batch with `--skip-publish`;
- creates `/kaggle/working/lamalo-video-ready-assets/lamalo-collection.zip` for download.

A full 149-design catalogue may require more than one free Kaggle session. Save a notebook version before a session expires and continue from the next ordinal. Approved work is reused unless `FORCE` is enabled.

## Designer upload workflow

Designers receive two simple capture choices in the designer portal:

### Option A — 3–6 phone photos

1. Put the garment on a mannequin or hanger against a plain background.
2. Take front, back and one side or three-quarter view.
3. Keep the full garment visible in normal, even light.

### Option B — one photo plus a short 360° video

1. Take one clear front photo for the shop.
2. Record an 8–20 second slow walk around a mannequin wearing the garment.
3. Keep the full garment visible and do not zoom.

Uploads remain private while queued. The system stores the shop image separately, processes the hidden generation pack, and publishes only after quality approval and the designer's existing membership/payout requirements are satisfied.

## Commands

```bash
# Verify the zero-paid-generation-API contract
node scripts/lamalo360/free/check-free-contract.mjs

# Compile the clothing-only Lamalo manifest
node scripts/lamalo360/catalogue.mjs

# Generate one Lamalo base design without publishing
node scripts/lamalo360/run-master.mjs --ordinal 1 --skip-publish

# Generate all queued Lamalo designs without publishing
node scripts/lamalo360/run-batch.mjs --parity all --count 149 --start 1 --retry-failed --skip-publish
```

## Runtime requirements

- Linux with an NVIDIA CUDA GPU.
- About 16 GB VRAM for TRELLIS; TripoSR is the automatic lower-memory fallback.
- Blender.
- Node 22 and pnpm 10.
- Optional free Hugging Face token only when required by model access terms.

```bash
HF_TOKEN=...                         # optional and free
LAMALO_FREE_3D_ENGINE=auto           # auto, trellis or triposr
TRELLIS_HOME=/kaggle/working/TRELLIS
TRIPOSR_HOME=/kaggle/working/TripoSR
BLENDER_BIN=/usr/bin/blender
LAMALO360_WORK_ROOT=/kaggle/working/lamalo360-work
LAMALO360_CYCLES_SAMPLES=256
```

No database, hosting, DNS or object-storage secret belongs in the Kaggle notebook.

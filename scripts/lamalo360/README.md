# Lamalo clothing free true-360 production pipeline

This pipeline replaces both the old Adobe/per-angle image workflow and the later paid generation path. Each Lamalo clothing design is generated once as a permanent 3D master, cleaned and rendered in Blender, and rotated through a deterministic 36-frame turntable. Every angle comes from the same GLB mesh, so seams, proportions, pockets, closures and silhouette cannot drift between frames.

## Zero paid generation APIs

The production path uses downloadable open models only:

- **FLUX.1-schnell** for neutral source references and seamless pattern textures — Apache-2.0.
- **Microsoft TRELLIS-image-large** as the preferred high-quality image-to-3D engine — MIT.
- **TripoSR** as the lower-memory fallback — MIT.
- **Qwen3-VL-4B-Instruct** for local source and turntable quality review — Apache-2.0.
- **Blender** for deterministic cleanup, materials and rendering — GPL application; generated assets remain Virelle assets.

No OpenAI, Meshy, Adobe, Replicate, fal or other paid generation API is called by this production path.

## Locked commercial behaviour

- Every colour remains a separate catalogue SKU, checkout and permanent buyer-owned inventory copy.
- Geometry is shared only within the exact base design, gender fit, category and subcategory.
- Solid colours are deterministic material variants of the same mesh.
- Checks, stripes, florals and multi-tone variants receive a dedicated seamless texture while keeping the same geometry.
- Missing designs and non-clothing collections are deferred. The compiler processes only clothing already declared in `server/lamalo-seed.ts`.
- A completed GLB and its approved renders are stored and reused permanently; regeneration occurs only with `--force`.

## Asset outputs per base design

- One deterministic high-resolution FLUX source reference.
- One TRELLIS textured GLB, or one TripoSR fallback GLB when TRELLIS is unavailable.
- One cleaned, normalized glTF 2.0 binary master.
- Thirty-six 10-degree turntable frames for every separate colour SKU.
- Twelve canonical 2048px continuity references for simple garments or twenty-four for complex garments and uniforms.
- Thirty-six 1024px high-quality WebP frames for the interactive marketplace viewer.
- Local visual-review reports, glTF validation reports and immutable checksums.

## Quality gates

Publication is blocked unless all of these pass:

1. Local Qwen3-VL source review score is at least 92/100 with no material defects.
2. Exactly 36 unique 2048×2048 renders come from one GLB.
3. Canonical views include front three-quarter, front, back and right side.
4. The glTF 2.0 asset has zero validator errors.
5. Local Qwen3-VL turntable review score is at least 94/100 with no material defects.
6. Every separate colour variant is rendered and approved.
7. Existing Virelle object-storage upload succeeds before database rows are marked ready.

## Free Kaggle execution

The repository includes `notebooks/lamalo-free-360-kaggle.ipynb`. It installs the open models in a free GPU notebook, processes one or more manifest ordinals, publishes completed assets through the existing Virelle storage/database connection and writes a backup ZIP to the notebook output.

Bootstrap the same environment manually with:

```bash
bash scripts/lamalo360/free/bootstrap_kaggle.sh
```

## Commands

```bash
# Verify the zero-paid-API contract
node scripts/lamalo360/free/check-free-contract.mjs

# Compile the clothing-only production manifest
node scripts/lamalo360/catalogue.mjs

# Generate and publish one base design by manifest ordinal
node scripts/lamalo360/run-master.mjs --ordinal 1

# Run the next two odd or even base designs
node scripts/lamalo360/run-batch.mjs --parity odd --count 2
node scripts/lamalo360/run-batch.mjs --parity even --count 2
```

## Runtime requirements

- Linux with an NVIDIA CUDA GPU.
- About 16 GB VRAM for TRELLIS; TripoSR normally uses substantially less and is the automatic fallback.
- Blender available as `BLENDER_BIN`.
- Node 22 and pnpm 10.
- A free Hugging Face account/token only when the official model repository requires accepted terms.
- Existing S3-compatible/Cloudflare R2 variables used by `server/storage.ts`.
- Production database credentials for applying approved packs to the exact Lamalo colour SKU rows.

```bash
HF_TOKEN=...                         # free; optional where model access is already cached
LAMALO_FREE_3D_ENGINE=auto           # auto, trellis or triposr
TRELLIS_HOME=/opt/models/TRELLIS
TRIPOSR_HOME=/opt/models/TripoSR
BLENDER_BIN=/usr/bin/blender
LAMALO360_WORK_ROOT=/mnt/lamalo360-work
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...
AWS_REGION=auto
AWS_S3_ENDPOINT=...
AWS_S3_PUBLIC_URL=https://cdn.example.com
DATABASE_URL=...
```

The work directory is resumable. Approved source images, meshes, colour renders and quality reports are reused unless `--force` is supplied.

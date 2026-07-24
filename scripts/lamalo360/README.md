# Lamalo clothing true-360 production pipeline

This pipeline replaces the old Adobe/per-angle image workflow. A Lamalo clothing design is generated once as a textured 3D master, cleaned in Blender, and rotated through a deterministic 36-frame turntable. Because every frame comes from the same GLB mesh, seams, proportions, pockets, closures and silhouette cannot drift between angles.

## Locked commercial behaviour

- Every colour remains a separate catalogue SKU, checkout and permanent buyer-owned inventory copy.
- Geometry is shared only within the exact base design, gender fit, category and subcategory.
- Solid colours are deterministic material variants of the same mesh.
- Checks, stripes, florals and multi-tone variants receive a dedicated seamless material texture while keeping the same mesh.
- Missing designs and non-clothing collections are deferred. The compiler processes only clothing already declared in `server/lamalo-seed.ts`.

## Asset outputs per base design

- One approved high-resolution source reference.
- One Hunyuan3D 2.1 textured GLB generation.
- One cleaned, normalized glTF 2.0 binary master.
- Thirty-six 10-degree turntable frames for every separate colour SKU.
- Twelve canonical 2048px continuity references for simple garments or twenty-four for complex garments and uniforms.
- Thirty-six 1024px high-quality WebP frames for the interactive marketplace viewer.
- Machine validation, glTF validation, visual-review reports and immutable checksums.

## Quality gates

Publication is blocked unless all of these pass:

1. Source image review score at least 92/100 with no material defects.
2. Exactly 36 unique 2048×2048 renders from one GLB.
3. Canonical first views: front three-quarter, front, back and right side.
4. Valid glTF 2.0 asset with zero validator errors.
5. Turntable visual-review score at least 94/100 with no material defects.
6. All separate colour variants rendered and approved.
7. Public storage upload succeeds before database rows are marked ready.

## Commands

```bash
# Compile the clothing-only production manifest
node scripts/lamalo360/catalogue.mjs

# Generate and publish one base design by manifest ordinal
node scripts/lamalo360/run-master.mjs --ordinal 1

# Run the next two odd or even base designs
node scripts/lamalo360/run-batch.mjs --parity odd --count 2
node scripts/lamalo360/run-batch.mjs --parity even --count 2
```

## Private GPU worker requirements

- Linux with NVIDIA CUDA.
- Hunyuan3D 2.1 API server available at `HUNYUAN3D_URL` and healthy at `/health`.
- Blender 4.5 LTS available as `BLENDER_BIN`.
- Node 22 and pnpm 10.
- OpenAI API key stored only as a worker secret for high-quality source references and automated visual QA.
- Existing S3/Cloudflare R2 environment variables used by `server/storage.ts`.
- Production database credentials for applying approved packs to the exact Lamalo colour SKU rows.

## Required environment variables

```bash
OPENAI_API_KEY=...
HUNYUAN3D_URL=http://127.0.0.1:8081
BLENDER_BIN=/opt/blender/blender
LAMALO360_WORK_ROOT=/mnt/lamalo360-work
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...
AWS_REGION=auto
AWS_S3_ENDPOINT=...
AWS_S3_PUBLIC_URL=https://cdn.example.com
DATABASE_URL=...
```

The work directory is resumable. Approved source images, meshes, variant renders and quality reports are reused unless `--force` is supplied.

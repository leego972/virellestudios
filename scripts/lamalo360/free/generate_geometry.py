#!/usr/bin/env python3
"""Generate one permanent GLB master with free local image-to-3D models.

Engine order in auto mode:
1. Microsoft TRELLIS when installed and the CUDA device has at least 15 GB VRAM.
2. TripoSR as the lower-memory fallback.
No external generation API is called.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
DEFAULT_MANIFEST = ROOT / "docs" / "lamalo-clothing-360-production.json"
DEFAULT_WORK_ROOT = ROOT / ".lamalo360"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ordinal", type=int)
    parser.add_argument("--key")
    parser.add_argument("--manifest", default=str(DEFAULT_MANIFEST))
    parser.add_argument("--work-root", default=os.getenv("LAMALO360_WORK_ROOT", str(DEFAULT_WORK_ROOT)))
    parser.add_argument("--engine", choices=("auto", "trellis", "triposr"), default=os.getenv("LAMALO_FREE_3D_ENGINE", "auto"))
    parser.add_argument("--seed", type=int)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    if not args.ordinal and not args.key:
        parser.error("provide --ordinal or --key")
    return args


def select_master(manifest: dict[str, Any], args: argparse.Namespace) -> dict[str, Any]:
    for master in manifest["masters"]:
        if (args.ordinal and master["ordinal"] == args.ordinal) or (args.key and master["masterKey"] == args.key):
            return master
    raise RuntimeError("Lamalo clothing master was not found")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def cuda_vram_gb() -> float:
    try:
        import torch
        if not torch.cuda.is_available():
            return 0.0
        return torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)
    except Exception:
        return 0.0


def deterministic_seed(master_key: str) -> int:
    return int.from_bytes(hashlib.sha256(f"{master_key}|geometry-v1".encode()).digest()[:4], "big")


def trellis_available() -> Path | None:
    configured = os.getenv("TRELLIS_HOME")
    candidates = [Path(configured)] if configured else []
    candidates += [Path("/kaggle/working/TRELLIS"), ROOT / ".models" / "TRELLIS"]
    return next((path for path in candidates if path and (path / "trellis").exists()), None)


def triposr_available() -> Path | None:
    configured = os.getenv("TRIPOSR_HOME")
    candidates = [Path(configured)] if configured else []
    candidates += [Path("/kaggle/working/TripoSR"), ROOT / ".models" / "TripoSR"]
    return next((path for path in candidates if path and (path / "run.py").exists()), None)


def generate_trellis(source: Path, output: Path, seed: int, home: Path) -> dict[str, Any]:
    os.environ.setdefault("ATTN_BACKEND", "xformers")
    os.environ.setdefault("SPCONV_ALGO", "native")
    sys.path.insert(0, str(home))
    import torch
    from trellis.pipelines import TrellisImageTo3DPipeline
    from trellis.utils import postprocessing_utils

    model_id = os.getenv("LAMALO_TRELLIS_MODEL", "microsoft/TRELLIS-image-large")
    pipeline = TrellisImageTo3DPipeline.from_pretrained(model_id)
    pipeline.cuda()
    image = Image.open(source).convert("RGBA")
    outputs = pipeline.run(
        image,
        seed=seed,
        sparse_structure_sampler_params={"steps": 12, "cfg_strength": 7.5},
        slat_sampler_params={"steps": 12, "cfg_strength": 3.0},
    )
    glb = postprocessing_utils.to_glb(
        outputs["gaussian"][0],
        outputs["mesh"][0],
        simplify=0.90,
        texture_size=2048,
        verbose=False,
    )
    glb.export(str(output))
    del outputs, pipeline
    torch.cuda.empty_cache()
    return {"engine": "TRELLIS", "model": model_id, "license": "MIT", "seed": seed}


def locate_generated_mesh(directory: Path) -> Path:
    extensions = ("*.glb", "*.gltf", "*.obj", "*.ply")
    candidates: list[Path] = []
    for pattern in extensions:
        candidates.extend(directory.rglob(pattern))
    if not candidates:
        raise RuntimeError("TripoSR produced no mesh file")
    return max(candidates, key=lambda path: path.stat().st_size)


def convert_to_glb(source: Path, output: Path) -> None:
    if source.suffix.lower() == ".glb":
        shutil.copy2(source, output)
        return
    import trimesh
    mesh = trimesh.load(source, force="scene", process=False)
    mesh.export(output, file_type="glb")


def generate_triposr(source: Path, output: Path, home: Path) -> dict[str, Any]:
    temporary = output.parent / "triposr-output"
    shutil.rmtree(temporary, ignore_errors=True)
    temporary.mkdir(parents=True, exist_ok=True)
    command = [
        sys.executable,
        str(home / "run.py"),
        str(source),
        "--output-dir", str(temporary),
        "--model-save-format", "glb",
        "--bake-texture",
        "--texture-resolution", "2048",
    ]
    try:
        subprocess.run(command, cwd=home, check=True)
    except subprocess.CalledProcessError:
        # Texture baking can fail on some CUDA/PyTorch combinations. Preserve the
        # geometry fallback and let Blender apply Lamalo's deterministic materials.
        subprocess.run([
            sys.executable,
            str(home / "run.py"),
            str(source),
            "--output-dir", str(temporary),
            "--model-save-format", "glb",
        ], cwd=home, check=True)
    generated = locate_generated_mesh(temporary)
    convert_to_glb(generated, output)
    return {"engine": "TripoSR", "model": "stabilityai/TripoSR", "license": "MIT", "seed": None}


def validate_glb(path: Path) -> None:
    payload = path.read_bytes()
    if len(payload) < 10_000 or payload[:4] != b"glTF":
        raise RuntimeError("Generated geometry is not a valid non-empty GLB payload")


def main() -> None:
    args = parse_args()
    manifest = json.loads(Path(args.manifest).read_text("utf-8"))
    master = select_master(manifest, args)
    master_dir = Path(args.work_root).resolve() / master["masterKey"].replace(":", "__")
    source = master_dir / "source-reference.png"
    source_metadata = master_dir / "source-reference.json"
    output = master_dir / "master-raw.glb"
    metadata_path = master_dir / "geometry.json"
    master_dir.mkdir(parents=True, exist_ok=True)

    if not source.exists() or not source_metadata.exists():
        raise RuntimeError(f"Missing source reference for {master['baseName']}")
    source_state = json.loads(source_metadata.read_text("utf-8"))
    if source_state.get("status") != "approved":
        raise RuntimeError(f"Source reference for {master['baseName']} is not approved")
    if not args.force and output.exists() and metadata_path.exists():
        existing = json.loads(metadata_path.read_text("utf-8"))
        if existing.get("status") in {"awaiting_cleanup_and_validation", "approved"}:
            print(output)
            return

    engine = args.engine
    trellis_home = trellis_available()
    triposr_home = triposr_available()
    if engine == "auto":
        engine = "trellis" if trellis_home and cuda_vram_gb() >= 15.0 else "triposr"
    seed = args.seed if args.seed is not None else deterministic_seed(master["masterKey"])
    started = datetime.now(timezone.utc).isoformat()

    if engine == "trellis":
        if not trellis_home:
            raise RuntimeError("TRELLIS is not installed; run bootstrap_kaggle.sh or set TRELLIS_HOME")
        details = generate_trellis(source, output, seed, trellis_home)
    else:
        if not triposr_home:
            raise RuntimeError("TripoSR is not installed; run bootstrap_kaggle.sh or set TRIPOSR_HOME")
        details = generate_triposr(source, output, triposr_home)

    validate_glb(output)
    metadata = {
        "schemaVersion": 3,
        "masterKey": master["masterKey"],
        "ordinal": master["ordinal"],
        "baseName": master["baseName"],
        "provider": "local-open-model",
        **details,
        "sourceReferenceSha256": sha256(source),
        "glbSha256": sha256(output),
        "glbBytes": output.stat().st_size,
        "gpuVramGb": round(cuda_vram_gb(), 2),
        "createdAt": started,
        "completedAt": datetime.now(timezone.utc).isoformat(),
        "status": "awaiting_cleanup_and_validation",
    }
    metadata_path.write_text(json.dumps(metadata, indent=2) + "\n", "utf-8")
    print(output)


if __name__ == "__main__":
    main()

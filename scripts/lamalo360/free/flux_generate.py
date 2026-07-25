#!/usr/bin/env python3
"""Generate Lamalo source references and pattern textures with FLUX.1-schnell.

The model runs locally; no paid image API is called. On 16 GB GPUs the script
loads the FLUX transformer and T5 encoder in 4-bit and offloads inactive modules
to system RAM. Outputs are deterministic for a master/colour unless --seed is
provided.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
from typing import Any

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[3]
DEFAULT_MANIFEST = ROOT / "docs" / "lamalo-clothing-360-production.json"
DEFAULT_MODEL = "black-forest-labs/FLUX.1-schnell"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=("source", "texture"), required=True)
    parser.add_argument("--ordinal", type=int, required=True)
    parser.add_argument("--colour")
    parser.add_argument("--output", required=True)
    parser.add_argument("--metadata", required=True)
    parser.add_argument("--manifest", default=str(DEFAULT_MANIFEST))
    parser.add_argument("--model", default=os.getenv("LAMALO_FREE_IMAGE_MODEL", DEFAULT_MODEL))
    parser.add_argument("--seed", type=int)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    if args.mode == "texture" and not args.colour:
        parser.error("--colour is required in texture mode")
    return args


def load_master(manifest_path: Path, ordinal: int) -> dict[str, Any]:
    manifest = json.loads(manifest_path.read_text("utf-8"))
    master = next((entry for entry in manifest["masters"] if entry["ordinal"] == ordinal), None)
    if not master:
        raise SystemExit(f"Lamalo master ordinal {ordinal} was not found")
    return master


def stable_seed(master: dict[str, Any], mode: str, colour: str | None) -> int:
    value = f"{master['masterKey']}|{mode}|{colour or ''}|free-v1".encode()
    return int.from_bytes(hashlib.sha256(value).digest()[:4], "big")


def source_prompt(master: dict[str, Any]) -> str:
    materials = ", ".join(master.get("materials") or []) or "production-accurate fabric"
    return " ".join(filter(None, [
        f"Definitive 3D reconstruction product reference for {master['baseName']}.",
        master.get("referencePrompt"),
        f"Material construction: {materials}.",
        "Exactly one complete garment, fully visible from collar or waistband to hem, centred, uncropped.",
        "Front three-quarter product view showing the front, right side and garment depth.",
        "Neutral medium-grey garment, no logo, no text, no print, no branding.",
        "No person, no skin, no body, no mannequin, no hanger, no rack, no hands and no props.",
        "Photorealistic high-end apparel product photography on a plain neutral warm-grey seamless background.",
        "Physically plausible sewing construction with explicit seams, hems, panels, pockets, closures, cuffs, waistbands, lining edges and fabric thickness.",
        "Symmetrical neutral presentation, low perspective distortion, no wind, no dramatic folds, no motion.",
        "The silhouette and construction must be unambiguous because this image will become a permanent 3D wardrobe asset.",
    ]))


def texture_prompt(master: dict[str, Any], colour: str) -> str:
    materials = ", ".join(master.get("materials") or []) or "fabric"
    return " ".join([
        f"A perfectly flat, evenly lit, seamless square PBR fabric texture for {master['baseName']} in the catalogue colour or pattern named {colour}.",
        f"Material character: {materials}.",
        "Orthographic macro material scan only. No garment, no folds, no perspective, no shadows, no text, no logos, no labels, no borders.",
        "Uniform repeatable weave and pattern scale suitable for UV tiling. The left and right edges and the top and bottom edges must join continuously.",
    ])


def load_flux(model_id: str):
    import torch
    from diffusers import FluxPipeline, FluxTransformer2DModel
    from transformers import BitsAndBytesConfig as TransformersBitsAndBytesConfig, T5EncoderModel
    from diffusers import BitsAndBytesConfig as DiffusersBitsAndBytesConfig

    if not torch.cuda.is_available():
        raise RuntimeError("A CUDA GPU is required for free FLUX generation")
    dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
    token = os.getenv("HF_TOKEN") or None

    try:
        transformer = FluxTransformer2DModel.from_pretrained(
            model_id,
            subfolder="transformer",
            quantization_config=DiffusersBitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_compute_dtype=dtype,
            ),
            torch_dtype=dtype,
            token=token,
        )
        text_encoder_2 = T5EncoderModel.from_pretrained(
            model_id,
            subfolder="text_encoder_2",
            quantization_config=TransformersBitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_compute_dtype=dtype,
            ),
            torch_dtype=dtype,
            token=token,
        )
        pipe = FluxPipeline.from_pretrained(
            model_id,
            transformer=transformer,
            text_encoder_2=text_encoder_2,
            torch_dtype=dtype,
            token=token,
        )
        quantized = True
    except Exception as quantization_error:
        print(f"4-bit FLUX load failed; trying CPU-offloaded weights: {quantization_error}")
        pipe = FluxPipeline.from_pretrained(model_id, torch_dtype=dtype, token=token)
        quantized = False

    pipe.enable_model_cpu_offload()
    if hasattr(pipe, "vae"):
        pipe.vae.enable_slicing()
        pipe.vae.enable_tiling()
    return pipe, dtype, quantized


def remove_background(image: Image.Image) -> Image.Image:
    try:
        from rembg import remove
        return remove(image.convert("RGBA"), alpha_matting=True)
    except Exception as error:
        print(f"Background removal unavailable; retaining studio background: {error}")
        return image.convert("RGBA")


def make_seamless(image: Image.Image) -> Image.Image:
    """Build a guaranteed edge-continuous mirrored 2x2 tile."""
    base = ImageOps.fit(image.convert("RGB"), (512, 512), method=Image.Resampling.LANCZOS)
    horizontal = Image.new("RGB", (1024, 512))
    horizontal.paste(base, (0, 0))
    horizontal.paste(ImageOps.mirror(base), (512, 0))
    tile = Image.new("RGB", (1024, 1024))
    tile.paste(horizontal, (0, 0))
    tile.paste(ImageOps.flip(horizontal), (0, 512))
    return tile


def main() -> None:
    args = parse_args()
    output = Path(args.output).resolve()
    metadata_path = Path(args.metadata).resolve()
    if not args.force and output.exists() and metadata_path.exists():
        print(output)
        return

    master = load_master(Path(args.manifest), args.ordinal)
    prompt = source_prompt(master) if args.mode == "source" else texture_prompt(master, args.colour)
    seed = args.seed if args.seed is not None else stable_seed(master, args.mode, args.colour)
    pipe, dtype, quantized = load_flux(args.model)

    import torch
    generator = torch.Generator(device="cpu").manual_seed(seed)
    if args.mode == "source":
        width, height = 768, 1024
    else:
        width = height = 1024
    image = pipe(
        prompt=prompt,
        width=width,
        height=height,
        num_inference_steps=4,
        guidance_scale=0.0,
        max_sequence_length=256,
        generator=generator,
    ).images[0]
    image = remove_background(image) if args.mode == "source" else make_seamless(image)

    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output, format="PNG", optimize=True)
    encoded = output.read_bytes()
    metadata = {
        "schemaVersion": 3,
        "masterKey": master["masterKey"],
        "ordinal": master["ordinal"],
        "baseName": master["baseName"],
        "mode": args.mode,
        "colour": args.colour,
        "provider": "local-open-model",
        "model": args.model,
        "modelLicense": "Apache-2.0",
        "quantized4Bit": quantized,
        "torchDtype": str(dtype),
        "seed": seed,
        "prompt": prompt,
        "sha256": hashlib.sha256(encoded).hexdigest(),
        "createdAt": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        "status": "awaiting_visual_approval" if args.mode == "source" else "generated",
    }
    metadata_path.parent.mkdir(parents=True, exist_ok=True)
    metadata_path.write_text(json.dumps(metadata, indent=2) + "\n", "utf-8")
    print(output)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Review Lamalo source images and 36-frame turntables with Qwen3-VL.

This replaces paid vision API calls. The Apache-2.0 model runs locally in 4-bit
where supported. Publication thresholds remain fail-closed.
"""
from __future__ import annotations

import argparse
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont

DEFAULT_MODEL = "Qwen/Qwen3-VL-4B-Instruct"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=("source", "turntable"), required=True)
    parser.add_argument("--image")
    parser.add_argument("--metadata")
    parser.add_argument("--pack")
    parser.add_argument("--model", default=os.getenv("LAMALO_FREE_VISION_MODEL", DEFAULT_MODEL))
    args = parser.parse_args()
    if args.mode == "source" and (not args.image or not args.metadata):
        parser.error("source mode requires --image and --metadata")
    if args.mode == "turntable" and not args.pack:
        parser.error("turntable mode requires --pack")
    return args


def extract_json(text: str) -> dict[str, Any]:
    text = text.strip().replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", text)
        if not match:
            raise RuntimeError("Local visual reviewer returned no JSON object")
        return json.loads(match.group(0))


def load_reviewer(model_id: str):
    import torch
    from transformers import AutoProcessor, BitsAndBytesConfig
    token = os.getenv("HF_TOKEN") or None
    quant = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
    )
    try:
        from transformers import Qwen3VLForConditionalGeneration
        model_cls = Qwen3VLForConditionalGeneration
    except ImportError:
        from transformers import AutoModelForMultimodalLM
        model_cls = AutoModelForMultimodalLM
    model = model_cls.from_pretrained(
        model_id,
        device_map="auto",
        dtype="auto",
        quantization_config=quant,
        token=token,
    )
    processor = AutoProcessor.from_pretrained(model_id, token=token)
    return model, processor


def ask(model, processor, image_path: Path, prompt: str) -> dict[str, Any]:
    messages = [{
        "role": "user",
        "content": [
            {"type": "image", "image": str(image_path)},
            {"type": "text", "text": prompt},
        ],
    }]
    inputs = processor.apply_chat_template(
        messages,
        tokenize=True,
        add_generation_prompt=True,
        return_dict=True,
        return_tensors="pt",
    ).to(model.device)
    generated = model.generate(
        **inputs,
        max_new_tokens=700,
        do_sample=False,
        repetition_penalty=1.05,
    )
    trimmed = [out[len(inp):] for inp, out in zip(inputs.input_ids, generated)]
    text = processor.batch_decode(trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False)[0]
    return extract_json(text)


def source_prompt(base_name: str) -> str:
    return "\n".join([
        f"Audit this definitive source reference for reconstructing {base_name} as a permanent 3D apparel asset.",
        "Return ONLY one JSON object with keys: approved (boolean), score (integer 0-100), defects (string array), strengths (string array), regenerationInstruction (string or null).",
        "Reject unless every condition passes:",
        "1. Exactly one complete garment is visible and uncropped.",
        "2. No person, body, skin, hands, mannequin, hanger, rack, text, logo, watermark or unrelated prop.",
        "3. Front three-quarter view clearly exposes front, side and depth.",
        "4. Silhouette is clean, symmetrical and suitable for image-to-3D reconstruction.",
        "5. Seams, hems, panels, pockets, closures, cuffs, waistbands and fabric thickness are physically plausible.",
        "6. No duplicate parts, melting, holes, impossible folds, severe asymmetry or perspective distortion.",
        "7. Neutral colour/material does not encode a sellable colour SKU.",
        "Set approved=true only when score is at least 92 and defects is empty.",
    ])


def build_contact_sheet(pack_path: Path) -> tuple[dict[str, Any], Path]:
    pack = json.loads(pack_path.read_text("utf-8"))
    frames = pack.get("frames")
    if not isinstance(frames, list) or len(frames) != 36:
        raise RuntimeError("A 36-frame pack is required for visual review")
    pack_dir = pack_path.parent
    tile = 320
    label_height = 28
    sheet = Image.new("RGB", (tile * 6, (tile + label_height) * 6), "#282725")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for index, frame in enumerate(frames):
        image = Image.open(pack_dir / frame["file"]).convert("RGB")
        image.thumbnail((tile, tile), Image.Resampling.LANCZOS)
        x = (index % 6) * tile
        y = (index // 6) * (tile + label_height)
        cell = Image.new("RGB", (tile, tile), "#2d2c2a")
        cell.paste(image, ((tile - image.width) // 2, (tile - image.height) // 2))
        sheet.paste(cell, (x, y))
        label = f"{index + 1:02d} | {frame.get('angleDegrees', '?')}° | {frame.get('label', '')}"
        draw.rectangle((x, y + tile, x + tile, y + tile + label_height), fill="#111111")
        draw.text((x + 6, y + tile + 7), label, fill="white", font=font)
    output = pack_dir / "contact-sheet.png"
    sheet.save(output, optimize=True)
    return pack, output


def turntable_prompt(base_name: str) -> str:
    return "\n".join([
        f"Audit this labelled 36-angle turntable for the permanent 3D wardrobe asset {base_name}.",
        "All frames must derive from one immutable GLB. Return ONLY one JSON object with keys: approved (boolean), score (integer 0-100), defects (array of objects with frameNumbers and description), strengths (string array), remediation (string array).",
        "Reject unless every condition passes:",
        "1. One complete garment stays centred and uncropped in all 36 frames.",
        "2. Silhouette, seams, closures, pockets, hems, panel joins and proportions are coherent through the full rotation.",
        "3. No mesh holes, exploded or floating pieces, self-intersections, broken normals, severe texture seams or lighting discontinuities.",
        "4. No person, mannequin, hanger, watermark, text or unrelated prop.",
        "5. Frames provide a smooth 10-degree rotation without duplicated or missing viewpoints.",
        "6. The canonical front-three-quarter, front, back and side views are clear and production-usable.",
        "7. Studio lighting reveals garment construction without crushed blacks, clipping or excessive reflections.",
        "Set approved=true only when score is at least 94 and defects is empty.",
    ])


def review_source(args: argparse.Namespace, model, processor) -> None:
    image_path = Path(args.image).resolve()
    metadata_path = Path(args.metadata).resolve()
    metadata = json.loads(metadata_path.read_text("utf-8"))
    verdict = ask(model, processor, image_path, source_prompt(metadata["baseName"]))
    defects = verdict.get("defects") if isinstance(verdict.get("defects"), list) else ["review output omitted defects"]
    approved = verdict.get("approved") is True and int(verdict.get("score", 0)) >= 92 and len(defects) == 0
    metadata.update({
        "reviewProvider": "local-open-model",
        "reviewModel": args.model,
        "reviewModelLicense": "Apache-2.0",
        "reviewedAt": datetime.now(timezone.utc).isoformat(),
        "review": verdict,
        "status": "approved" if approved else "rejected",
    })
    metadata_path.write_text(json.dumps(metadata, indent=2) + "\n", "utf-8")
    if not approved:
        raise RuntimeError(f"Source reference rejected ({verdict.get('score', 'unknown')}/100): {'; '.join(map(str, defects))}")
    print(metadata_path)


def review_turntable(args: argparse.Namespace, model, processor) -> None:
    pack_path = Path(args.pack).resolve()
    pack, contact_sheet = build_contact_sheet(pack_path)
    verdict = ask(model, processor, contact_sheet, turntable_prompt(pack["baseName"]))
    defects = verdict.get("defects") if isinstance(verdict.get("defects"), list) else [{"description": "review output omitted defects"}]
    approved = verdict.get("approved") is True and int(verdict.get("score", 0)) >= 94 and len(defects) == 0
    approval = {
        "schemaVersion": 3,
        "masterKey": pack["masterKey"],
        "baseName": pack["baseName"],
        "provider": "local-open-model",
        "model": args.model,
        "modelLicense": "Apache-2.0",
        "reviewedAt": datetime.now(timezone.utc).isoformat(),
        "contactSheet": contact_sheet.name,
        "status": "approved" if approved else "rejected",
        "review": verdict,
    }
    output = pack_path.parent / "visual-approval.json"
    output.write_text(json.dumps(approval, indent=2) + "\n", "utf-8")
    if not approved:
        descriptions = [str(item.get("description", item)) if isinstance(item, dict) else str(item) for item in defects]
        raise RuntimeError(f"Turntable rejected ({verdict.get('score', 'unknown')}/100): {'; '.join(descriptions)}")
    print(output)


def main() -> None:
    args = parse_args()
    model, processor = load_reviewer(args.model)
    if args.mode == "source":
        review_source(args, model, processor)
    else:
        review_turntable(args, model, processor)


if __name__ == "__main__":
    main()

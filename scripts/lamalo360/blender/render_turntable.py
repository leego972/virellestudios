#!/usr/bin/env python3
"""Normalize a GLB master and render a deterministic 36-frame Lamalo turntable.

Run with Blender 4.5 LTS:
  blender --background --python render_turntable.py -- \
    --input master-raw.glb --output-dir ./turntable --name "Lamalo Premium Tee"
"""

import argparse
import hashlib
import json
import math
import os
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--name", required=True)
    parser.add_argument("--master-key", required=True)
    parser.add_argument("--frames", type=int, default=36)
    parser.add_argument("--resolution", type=int, default=2048)
    parser.add_argument("--samples", type=int, default=256)
    parser.add_argument("--colour", default=None, help="Optional #RRGGBB material tint")
    parser.add_argument("--texture", default=None, help="Optional seamless albedo texture")
    parser.add_argument("--colour-name", default=None)
    parser.add_argument("--engine", choices=["CYCLES", "BLENDER_EEVEE_NEXT"], default="CYCLES")
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1 :])


def sha256(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def import_glb(path):
    bpy.ops.import_scene.gltf(filepath=str(path), import_pack_images=True, merge_vertices=True)
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if not meshes:
        raise RuntimeError("The GLB contains no mesh objects.")
    return meshes


def world_bounds(objects):
    points = []
    for obj in objects:
        points.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    minimum = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
    maximum = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
    return minimum, maximum


def normalize_geometry(meshes):
    root = bpy.data.objects.new("LAMALO_MASTER_ROOT", None)
    bpy.context.collection.objects.link(root)
    for obj in meshes:
        obj.parent = root
        obj.select_set(True)
        if obj.data:
            # Preserve hard construction edges while smoothing broad fabric surfaces.
            for polygon in obj.data.polygons:
                polygon.use_smooth = True
            bevel = obj.modifiers.new("Lamalo Micro Bevel", "BEVEL")
            bevel.width = 0.0015
            bevel.segments = 2
            bevel.limit_method = "ANGLE"
            weighted = obj.modifiers.new("Lamalo Weighted Normals", "WEIGHTED_NORMAL")
            weighted.keep_sharp = True

    minimum, maximum = world_bounds(meshes)
    size = maximum - minimum
    longest = max(size.x, size.y, size.z)
    if longest <= 0:
        raise RuntimeError("The imported mesh has zero bounds.")
    target_height = 2.3
    scale = target_height / max(size.z, longest * 0.65)
    root.scale = (scale, scale, scale)
    bpy.context.view_layer.update()

    minimum, maximum = world_bounds(meshes)
    centre = (minimum + maximum) * 0.5
    root.location -= Vector((centre.x, centre.y, minimum.z))
    bpy.context.view_layer.update()
    return root, world_bounds(meshes)


def parse_colour(value):
    value = value.strip().lstrip("#")
    if len(value) != 6:
        raise ValueError("Colour must be #RRGGBB")
    return tuple(int(value[index:index + 2], 16) / 255.0 for index in (0, 2, 4)) + (1.0,)


def tint_materials(meshes, colour):
    rgba = parse_colour(colour)
    for obj in meshes:
        for material in obj.data.materials:
            if not material:
                continue
            material.use_nodes = True
            nodes = material.node_tree.nodes
            links = material.node_tree.links
            principled = next((node for node in nodes if node.type == "BSDF_PRINCIPLED"), None)
            if principled is None:
                principled = nodes.new("ShaderNodeBsdfPrincipled")
                output = next((node for node in nodes if node.type == "OUTPUT_MATERIAL"), None) or nodes.new("ShaderNodeOutputMaterial")
                links.new(principled.outputs["BSDF"], output.inputs["Surface"])
            base = principled.inputs.get("Base Color")
            if base is None:
                continue
            if base.is_linked:
                previous = base.links[0].from_socket
                links.remove(base.links[0])
                multiply = nodes.new("ShaderNodeMixRGB")
                multiply.blend_type = "MULTIPLY"
                multiply.inputs[0].default_value = 1.0
                multiply.inputs[2].default_value = rgba
                links.new(previous, multiply.inputs[1])
                links.new(multiply.outputs[0], base)
            else:
                base.default_value = rgba
            roughness = principled.inputs.get("Roughness")
            if roughness and not roughness.is_linked:
                roughness.default_value = max(0.32, min(0.82, roughness.default_value))


def apply_texture_materials(meshes, texture_path):
    image = bpy.data.images.load(str(texture_path), check_existing=True)
    for obj in meshes:
        for material in obj.data.materials:
            if not material:
                continue
            material.use_nodes = True
            nodes = material.node_tree.nodes
            links = material.node_tree.links
            principled = next((node for node in nodes if node.type == "BSDF_PRINCIPLED"), None)
            if principled is None:
                principled = nodes.new("ShaderNodeBsdfPrincipled")
                output = next((node for node in nodes if node.type == "OUTPUT_MATERIAL"), None) or nodes.new("ShaderNodeOutputMaterial")
                links.new(principled.outputs["BSDF"], output.inputs["Surface"])
            texture = nodes.new("ShaderNodeTexImage")
            texture.image = image
            texture.interpolation = "Linear"
            texture.extension = "REPEAT"
            mapping = nodes.new("ShaderNodeMapping")
            texcoord = nodes.new("ShaderNodeTexCoord")
            mapping.inputs["Scale"].default_value = (3.0, 3.0, 3.0)
            links.new(texcoord.outputs["UV"], mapping.inputs["Vector"])
            links.new(mapping.outputs["Vector"], texture.inputs["Vector"])
            base = principled.inputs.get("Base Color")
            if base.is_linked:
                links.remove(base.links[0])
            links.new(texture.outputs["Color"], base)
            roughness = principled.inputs.get("Roughness")
            if roughness and not roughness.is_linked:
                roughness.default_value = 0.58


def create_material(name, colour, roughness=0.65):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    principled = material.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = colour
    principled.inputs["Roughness"].default_value = roughness
    return material


def create_studio():
    floor_material = create_material("Warm Grey Studio", (0.18, 0.18, 0.17, 1.0), 0.78)
    bpy.ops.mesh.primitive_plane_add(size=24, location=(0, 0, -0.002))
    floor = bpy.context.object
    floor.name = "LAMALO_STUDIO_FLOOR"
    floor.data.materials.append(floor_material)

    world = bpy.context.scene.world or bpy.data.worlds.new("Lamalo World")
    bpy.context.scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.045, 0.045, 0.042, 1.0)
    background.inputs["Strength"].default_value = 0.35

    def area(name, location, energy, size, colour=(1.0, 0.96, 0.9)):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.shape = "DISK"
        data.size = size
        data.color = colour
        obj = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(obj)
        obj.location = location
        point_at(obj, Vector((0, 0, 1.05)))
        return obj

    area("Key Softbox", (-3.5, -4.0, 4.8), 1050, 3.2)
    area("Fill Softbox", (3.8, -2.5, 3.1), 650, 2.8, (0.88, 0.93, 1.0))
    area("Rim Softbox", (0.0, 3.8, 4.0), 900, 2.4)
    area("Top Softbox", (0.0, 0.0, 6.0), 500, 2.0)


def point_at(obj, target):
    direction = target - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def create_camera(bounds, resolution):
    minimum, maximum = bounds
    size = maximum - minimum
    centre = Vector((0, 0, (minimum.z + maximum.z) * 0.5))
    camera_data = bpy.data.cameras.new("Lamalo Product Camera")
    camera_data.lens = 70
    camera_data.sensor_width = 36
    camera = bpy.data.objects.new("Lamalo Product Camera", camera_data)
    bpy.context.collection.objects.link(camera)
    max_extent = max(size.x, size.z)
    distance = max(5.0, max_extent * 3.25)
    camera.location = (0, -distance, centre.z + size.z * 0.02)
    point_at(camera, centre)
    bpy.context.scene.camera = camera
    camera_data.dof.use_dof = False
    camera_data.type = "PERSP"
    return camera


def configure_render(args):
    scene = bpy.context.scene
    scene.render.engine = args.engine
    scene.render.resolution_x = args.resolution
    scene.render.resolution_y = args.resolution
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "16"
    scene.render.film_transparent = False
    scene.render.use_file_extension = True
    scene.render.image_settings.compression = 15
    scene.view_settings.look = "AgX - Medium High Contrast"
    if args.engine == "CYCLES":
        scene.cycles.samples = args.samples
        scene.cycles.use_denoising = True
        scene.cycles.preview_samples = 64
        try:
            preferences = bpy.context.preferences.addons["cycles"].preferences
            preferences.get_devices()
            for device in preferences.devices:
                device.use = True
            scene.cycles.device = "GPU"
        except Exception as error:
            print(f"GPU setup unavailable, using CPU: {error}")


def angle_sequence(frame_count):
    if frame_count < 12 or 360 % frame_count != 0:
        raise ValueError("Frame count must divide 360 and be at least 12.")
    step = 360 // frame_count
    canonical = [45, 0, 180, 90]
    all_angles = list(range(0, 360, step))
    return canonical + [angle for angle in all_angles if angle not in canonical]


def safe_name(value):
    return "".join(character.lower() if character.isalnum() else "-" for character in value).strip("-")


def render(args, root, output_dir):
    labels = {45: "front-three-quarter", 0: "front", 180: "back", 90: "right-side", 270: "left-side"}
    frames = []
    for index, angle in enumerate(angle_sequence(args.frames), start=1):
        root.rotation_euler[2] = math.radians(-angle)
        bpy.context.view_layer.update()
        label = labels.get(angle, f"angle-{angle:03d}")
        filename = f"{index:02d}-{label}.png"
        destination = output_dir / filename
        bpy.context.scene.render.filepath = str(destination)
        bpy.ops.render.render(write_still=True)
        frames.append({
            "index": index,
            "angleDegrees": angle,
            "label": label,
            "file": filename,
            "sha256": sha256(destination),
            "bytes": destination.stat().st_size,
        })
    return frames


def export_master(output_dir):
    destination = output_dir / "master-clean.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(destination),
        export_format="GLB",
        export_apply=True,
        export_materials="EXPORT",
        export_yup=True,
        export_texcoords=True,
        export_normals=True,
        export_tangents=True,
        export_cameras=False,
        export_lights=False,
    )
    return destination


def main():
    args = parse_args()
    input_path = Path(args.input).resolve()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    if not input_path.exists():
        raise FileNotFoundError(input_path)

    clear_scene()
    meshes = import_glb(input_path)
    root, bounds = normalize_geometry(meshes)
    if args.texture:
        apply_texture_materials(meshes, Path(args.texture).resolve())
    elif args.colour:
        tint_materials(meshes, args.colour)
    create_studio()
    create_camera(bounds, args.resolution)
    configure_render(args)
    frames = render(args, root, output_dir)
    root.rotation_euler[2] = 0
    bpy.context.view_layer.update()
    clean_glb = export_master(output_dir)

    manifest = {
        "schemaVersion": 2,
        "masterKey": args.master_key,
        "baseName": args.name,
        "colour": args.colour_name,
        "colourHex": args.colour,
        "texture": str(Path(args.texture).resolve()) if args.texture else None,
        "sourceGlb": str(input_path),
        "cleanGlb": clean_glb.name,
        "cleanGlbSha256": sha256(clean_glb),
        "renderEngine": args.engine,
        "resolution": args.resolution,
        "samples": args.samples,
        "frameCount": len(frames),
        "angleStepDegrees": 360 // args.frames,
        "sameGeometryEveryFrame": True,
        "frames": frames,
        "status": "awaiting_validation",
    }
    with open(output_dir / "turntable-pack.json", "w", encoding="utf8") as handle:
        json.dump(manifest, handle, indent=2)
        handle.write("\n")
    print(output_dir / "turntable-pack.json")


if __name__ == "__main__":
    main()

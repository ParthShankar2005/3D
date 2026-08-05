"""
Diamond Dial / Carousel Scene - Blender Python Script
=======================================================
Recreates the "ring of many different diamond cuts" look: a circular
dial made of black plaques, each holding a DIFFERENT shaped stone
(round, princess, cushion, oval, emerald, asscher, marquise, trillion,
heart, pear) all normalized to the SAME visual size, set inside a
metal bezel around a mirrored center disc. Camera sits close with a
long lens + shallow depth of field, so only a short arc of stones is
sharp and the rest melts into dark bokeh - exactly like the reference
photos. The whole dial slowly rotates so different stones scroll
through the focused area, left to right.

HOW TO USE
----------
1. Open Blender 4.0+ (Cycles).
2. Scripting tab -> New -> paste this whole script -> Run Script.
3. Spacebar to preview the rotation, Ctrl+F12 to render the animation.

Tune the SETTINGS block below: N_SLOTS (how many stones), RING_RADIUS,
GEM_SIZE, camera framing, and ROTATION_DEGREES / direction.
"""

import bpy
import bmesh
import math
import random

# ----------------------------------------------------------------------
# 0. SETTINGS
# ----------------------------------------------------------------------
N_SLOTS          = 24          # number of stones around the dial
RING_RADIUS      = 4.0
GEM_SIZE         = 0.55        # uniform target size for every stone
CROWN_HEIGHT     = 0.16
PAVILION_DEPTH   = 0.38
TABLE_SCALE      = 0.55

FPS              = 30
TOTAL_FRAMES     = 450         # 15 sec @ 30fps, slow continuous spin
ROTATION_DEGREES = 360 * 1.2   # negative flips the scroll direction

random.seed(7)

# ----------------------------------------------------------------------
# 1. CLEAN SCENE
# ----------------------------------------------------------------------
def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.lights,
                 bpy.data.cameras, bpy.data.worlds, bpy.data.curves):
        for block in list(coll):
            if block.users == 0:
                coll.remove(block)

clear_scene()

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
try:
    scene.cycles.device = 'GPU'
except Exception:
    pass
scene.cycles.samples = 300
scene.cycles.use_denoising = True
scene.cycles.transmission_bounces = 12
scene.cycles.transparent_max_bounces = 12
scene.cycles.caustics_reflective = True
scene.cycles.caustics_refractive = True
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.fps = FPS
scene.frame_start = 1
scene.frame_end = TOTAL_FRAMES
scene.frame_current = 1

# ----------------------------------------------------------------------
# 2. WORLD (dark) + SCATTERED BOKEH LIGHTS IN THE BACKGROUND
# ----------------------------------------------------------------------
def build_world():
    world = bpy.data.worlds.new("DarkStudio")
    scene.world = world
    world.use_nodes = True
    nt = world.node_tree
    nt.nodes.clear()
    bg = nt.nodes.new("ShaderNodeBackground")
    bg.inputs["Color"].default_value = (0.01, 0.01, 0.014, 1.0)
    bg.inputs["Strength"].default_value = 1.0
    out = nt.nodes.new("ShaderNodeOutputWorld")
    nt.links.new(bg.outputs["Background"], out.inputs["Surface"])

build_world()

def create_bokeh_material():
    mat = bpy.data.materials.new("BokehLight")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    emission = nt.nodes.new("ShaderNodeEmission")
    emission.inputs["Color"].default_value = (1.0, 0.93, 0.8, 1.0)
    emission.inputs["Strength"].default_value = 18.0
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(emission.outputs["Emission"], out.inputs["Surface"])
    return mat

def scatter_bokeh(count=45):
    mat = create_bokeh_material()
    for i in range(count):
        ang = random.uniform(0, 2 * math.pi)
        rad = random.uniform(RING_RADIUS * 1.3, RING_RADIUS * 3.5)
        x = math.cos(ang) * rad
        y = math.sin(ang) * rad - RING_RADIUS * 1.5
        z = random.uniform(-1.0, 3.0)
        size = random.uniform(0.03, 0.09)
        bpy.ops.mesh.primitive_ico_sphere_add(radius=size, location=(x, y, z), subdivisions=1)
        sp = bpy.context.active_object
        sp.data.materials.append(mat)

scatter_bokeh()

# ----------------------------------------------------------------------
# 3. GEM SHAPE OUTLINES (2D girdle profiles, one function per cut)
# ----------------------------------------------------------------------
def center_outline(pts):
    cx = sum(p[0] for p in pts) / len(pts)
    cy = sum(p[1] for p in pts) / len(pts)
    return [(x - cx, y - cy) for x, y in pts]

def normalize_outline(pts, target=0.5):
    maxd = max(math.hypot(x, y) for x, y in pts)
    if maxd == 0:
        return pts
    f = target / maxd
    return [(x * f, y * f) for x, y in pts]

def finalize(pts):
    return normalize_outline(center_outline(pts))

def outline_round(seg=28):
    return [(math.cos(2*math.pi*i/seg), math.sin(2*math.pi*i/seg)) for i in range(seg)]

def outline_square():
    return [(-1,-1),(1,-1),(1,1),(-1,1)]

def outline_octagon_rect(w=1.3, h=0.9, cut=0.35):
    return [(-w+cut,-h),(w-cut,-h),(w,-h+cut),(w,h-cut),
            (w-cut,h),(-w+cut,h),(-w,h-cut),(-w,-h+cut)]

def outline_oval(seg=28):
    return [(1.25*math.cos(2*math.pi*i/seg), 0.9*math.sin(2*math.pi*i/seg)) for i in range(seg)]

def outline_cushion(n_exp=4, seg=28):
    pts = []
    for i in range(seg):
        t = 2 * math.pi * i / seg
        c, s = math.cos(t), math.sin(t)
        x = (1 if c >= 0 else -1) * (abs(c)) ** (2 / n_exp)
        y = (1 if s >= 0 else -1) * (abs(s)) ** (2 / n_exp)
        pts.append((x, y))
    return pts

def outline_marquise(seg=28):
    pts = []
    for i in range(seg):
        t = 2 * math.pi * i / seg
        c = math.cos(t)
        x = (1 if c >= 0 else -1) * (abs(c) ** 0.5) * 1.5
        y = math.sin(t) * 0.65
        pts.append((x, y))
    return pts

def outline_trillion():
    return [(0, 1.15), (1.0, -0.6), (-1.0, -0.6)]

def outline_heart(seg=40):
    pts = []
    for i in range(seg):
        t = 2 * math.pi * i / seg
        x = 16 * math.sin(t) ** 3
        y = 13*math.cos(t) - 5*math.cos(2*t) - 2*math.cos(3*t) - math.cos(4*t)
        pts.append((x, -y))
    return pts

def outline_pear(seg=32):
    pts = []
    for i in range(seg):
        t = 2 * math.pi * i / seg
        x = math.sin(t)
        y = -math.cos(t)
        pts.append([x, y])
    ys = [p[1] for p in pts]
    ymin, ymax = min(ys), max(ys)
    for p in pts:
        f = (p[1] - ymax) / (ymin - ymax)  # 0 at top, 1 at bottom
        taper = 1 - 0.82 * (f ** 3)
        p[0] *= taper
    return [tuple(p) for p in pts]

SHAPES = {
    "Round":    finalize(outline_round()),
    "Princess": finalize(outline_square()),
    "Cushion":  finalize(outline_cushion()),
    "Oval":     finalize(outline_oval()),
    "Emerald":  finalize(outline_octagon_rect(1.35, 0.9, 0.35)),
    "Asscher":  finalize(outline_octagon_rect(1.1, 1.1, 0.4)),
    "Marquise": finalize(outline_marquise()),
    "Trillion": finalize(outline_trillion()),
    "Heart":    finalize(outline_heart()),
    "Pear":     finalize(outline_pear()),
}
SHAPE_NAMES = list(SHAPES.keys())

# ----------------------------------------------------------------------
# 4. GENERIC FACETED GEM BUILDER (loft: girdle -> table, girdle -> apex)
# ----------------------------------------------------------------------
def create_gem_mesh(name, outline, table_scale=TABLE_SCALE,
                     crown_height=CROWN_HEIGHT, pavilion_depth=PAVILION_DEPTH):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    n = len(outline)

    girdle = [bm.verts.new((x, y, 0.0)) for x, y in outline]
    table = [bm.verts.new((x * table_scale, y * table_scale, crown_height)) for x, y in outline]
    apex = bm.verts.new((0.0, 0.0, -pavilion_depth))
    bm.verts.ensure_lookup_table()

    for i in range(n):
        g0, g1 = girdle[i], girdle[(i + 1) % n]
        t0, t1 = table[i], table[(i + 1) % n]
        bm.faces.new((g0, g1, t1, t0))

    bm.faces.new(table)

    for i in range(n):
        g0, g1 = girdle[i], girdle[(i + 1) % n]
        bm.faces.new((g1, g0, apex))

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.normal_update()
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(obj)
    return obj

# ----------------------------------------------------------------------
# 5. MATERIALS
# ----------------------------------------------------------------------
def _set_input(node, names, value):
    for n in names:
        if n in node.inputs:
            try:
                node.inputs[n].default_value = value
            except Exception:
                pass
            return

def create_diamond_material():
    mat = bpy.data.materials.new("DiamondGem")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    p = nt.nodes.new("ShaderNodeBsdfPrincipled")
    p.location = (-200, 0)
    _set_input(p, ["Base Color"], (1.0, 1.0, 1.0, 1.0))
    _set_input(p, ["Transmission", "Transmission Weight"], 1.0)
    _set_input(p, ["Roughness"], 0.0)
    _set_input(p, ["IOR"], 2.417)
    _set_input(p, ["Dispersion"], 1.0)
    _set_input(p, ["Coat Weight", "Clearcoat"], 0.0)
    nt.links.new(p.outputs["BSDF"], out.inputs["Surface"])
    return mat

def create_metal_material(name, color, roughness=0.12):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    p = mat.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = color
    _set_input(p, ["Metallic"], 1.0)
    _set_input(p, ["Roughness"], roughness)
    return mat

def create_black_material(name):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    p = mat.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (0.008, 0.008, 0.01, 1.0)
    _set_input(p, ["Roughness"], 0.35)
    return mat

diamond_mat = create_diamond_material()
platinum_mat = create_metal_material("Platinum", (0.72, 0.73, 0.75, 1.0), 0.1)
gold_mat = create_metal_material("RoseGold", (0.85, 0.6, 0.45, 1.0), 0.08)
black_mat = create_black_material("PlaqueBlack")
label_mat = create_metal_material("LabelSilver", (0.75, 0.75, 0.78, 1.0), 0.3)

# ----------------------------------------------------------------------
# 6. BUILD THE DIAL
# ----------------------------------------------------------------------
ring_root = bpy.data.objects.new("RingRoot", None)
scene.collection.objects.link(ring_root)

# center mirror disc (static hub the wheel spins around)
bpy.ops.mesh.primitive_cylinder_add(radius=RING_RADIUS * 0.6, depth=0.06,
                                     location=(0, 0, -0.06))
center_disc = bpy.context.active_object
center_disc.name = "CenterMirror"
center_disc.data.materials.append(gold_mat)

# outer bezel ring (rotates with the dial)
bpy.ops.mesh.primitive_torus_add(major_radius=RING_RADIUS + 0.4, minor_radius=0.05,
                                  major_segments=64, minor_segments=12)
bezel = bpy.context.active_object
bezel.name = "Bezel"
bezel.data.materials.append(platinum_mat)
bezel.parent = ring_root

# inner bezel ring
bpy.ops.mesh.primitive_torus_add(major_radius=RING_RADIUS - 0.55, minor_radius=0.035,
                                  major_segments=64, minor_segments=10)
bezel_in = bpy.context.active_object
bezel_in.name = "BezelInner"
bezel_in.data.materials.append(platinum_mat)
bezel_in.parent = ring_root

for i in range(N_SLOTS):
    angle = 2 * math.pi * i / N_SLOTS
    x = RING_RADIUS * math.cos(angle)
    y = RING_RADIUS * math.sin(angle)
    shape_name = SHAPE_NAMES[i % len(SHAPE_NAMES)]
    outline = SHAPES[shape_name]

    # black plaque
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, -0.03))
    pad = bpy.context.active_object
    pad.name = f"Plaque_{i}_{shape_name}"
    pad.scale = (0.75, 0.62, 0.02)
    pad.rotation_euler = (0, 0, angle)
    pad.data.materials.append(black_mat)
    pad.parent = ring_root

    # gem, uniform size regardless of cut
    gem = create_gem_mesh(f"Gem_{i}_{shape_name}", outline)
    gem.data.materials.append(diamond_mat)
    gem.scale = (GEM_SIZE, GEM_SIZE, GEM_SIZE)
    gem.location = (x, y, 0.02)
    gem.rotation_euler = (0, 0, angle)
    gem.parent = ring_root

    # label under the stone
    try:
        curve = bpy.data.curves.new(name=f"Label_{i}", type='FONT')
        curve.body = shape_name
        curve.size = 0.13
        curve.align_x = 'CENTER'
        curve.align_y = 'CENTER'
        label = bpy.data.objects.new(f"Label_{i}_{shape_name}", curve)
        label_radius = RING_RADIUS - 0.62
        lx = label_radius * math.cos(angle)
        ly = label_radius * math.sin(angle)
        label.location = (lx, ly, 0.001)
        label.rotation_euler = (0, 0, angle - math.pi / 2)
        label.data.materials.append(label_mat)
        scene.collection.objects.link(label)
        label.parent = ring_root
    except Exception:
        pass

# ----------------------------------------------------------------------
# 7. LIGHTING
# ----------------------------------------------------------------------
def add_area_light(name, location, rotation, size, energy, color=(1, 1, 1)):
    ld = bpy.data.lights.new(name, type='AREA')
    ld.shape = 'RECTANGLE'
    ld.size = size
    ld.size_y = size * 0.6
    ld.energy = energy
    ld.color = color
    obj = bpy.data.objects.new(name, ld)
    obj.location = location
    obj.rotation_euler = rotation
    scene.collection.objects.link(obj)
    return obj

add_area_light("KeyLight",  (2.0, -6.0, 5.0), (math.radians(55), 0, math.radians(20)), 3.0, 900)
add_area_light("FillLight", (-3.5, -4.0, 3.0), (math.radians(60), 0, math.radians(-35)), 4.0, 300, (0.9, 0.95, 1.0))
add_area_light("RimLight",  (0.0, 5.0, 4.0),   (math.radians(-60), 0, 0), 3.0, 600)
add_area_light("TopSparkle",(0.0, -2.0, 7.0),  (math.radians(90), 0, 0), 1.2, 500)

# ----------------------------------------------------------------------
# 8. CAMERA - close, long lens, shallow DOF, framing a near arc of stones
# ----------------------------------------------------------------------
focus_target = bpy.data.objects.new("FocusTarget", None)
focus_target.location = (0, -RING_RADIUS * 0.55, 0.15)
scene.collection.objects.link(focus_target)

bpy.ops.object.camera_add(location=(0.0, -RING_RADIUS * 1.15, 1.4),
                           rotation_euler=(math.radians(68), 0, 0))
camera = bpy.context.active_object
camera.name = "MainCamera"
camera.data.lens = 135
camera.data.dof.use_dof = True
camera.data.dof.aperture_fstop = 1.4
camera.data.dof.focus_object = focus_target
scene.camera = camera

track = camera.constraints.new(type='TRACK_TO')
track.target = focus_target
track.track_axis = 'TRACK_NEGATIVE_Z'
track.up_axis = 'UP_Y'

# ----------------------------------------------------------------------
# 9. ANIMATION - dial spins slowly, so stones scroll through the
#    focused arc from one side to the other
# ----------------------------------------------------------------------
ring_root.rotation_euler = (0, 0, 0)
ring_root.keyframe_insert(data_path="rotation_euler", index=2, frame=1)
ring_root.rotation_euler[2] = math.radians(ROTATION_DEGREES)
ring_root.keyframe_insert(data_path="rotation_euler", index=2, frame=TOTAL_FRAMES)

if ring_root.animation_data and ring_root.animation_data.action:
    for fc in ring_root.animation_data.action.fcurves:
        for kp in fc.keyframe_points:
            kp.interpolation = 'LINEAR'   # constant speed = mechanical dial feel

scene.frame_current = 1

print("Diamond dial scene built successfully.")
print(f"{N_SLOTS} stones cycling through shapes: {SHAPE_NAMES}")
print(f"Timeline: 1 - {TOTAL_FRAMES} frames @ {FPS}fps")
print("Press Spacebar to preview, or Ctrl+F12 to render the animation.")
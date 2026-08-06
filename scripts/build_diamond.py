"""
Shivam Jewels Diamond Dial v4 - 54 Unique Cuts Ring Generator
========================================================================
Generates a 3D Diamond Ring Showcase with 54 UNIQUE authentic diamond cut
geometries arranged in a continuous, densely packed circular bezel display.

Cut categories included:
  - Round & Old Cuts (Round Brilliant, Old European, Old Mine, Rose, Single, Eight, Portuguese, Swiss)
  - Fancy Brilliants (Princess, Cushion, Oval, Marquise, Trillion, Heart, Pear, Briolette, Star Cut)
  - Step Cuts (Emerald, Asscher, Radiant, Baguette, Hexagon, Octagon, Portrait Cut)
  - Boutique & Geometric (Kite, Shield, Lozenge, Trapezoid, Half Moon, Chandelier)

Outputs spec-compliant GLTF (.gltf) and binary GLB (.glb) models to assets/
"""

import json
import struct
import math
import base64
import os
import sys

def normalize(v):
    length = math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]) or 1.0
    return (v[0]/length, v[1]/length, v[2]/length)

def cross(v1, v2):
    return (
        v1[1]*v2[2] - v1[2]*v2[1],
        v1[2]*v2[0] - v1[0]*v2[2],
        v1[0]*v2[1] - v1[1]*v2[0]
    )

def sub(p1, p2):
    return (p1[0]-p2[0], p1[1]-p2[1], p1[2]-p2[2])

def transform_point(p, rot_z, trans_x, trans_y, trans_z, scale=1.0):
    x, y, z = p[0] * scale, p[1] * scale, p[2] * scale
    cos_t = math.cos(rot_z)
    sin_t = math.sin(rot_z)
    rx = x * cos_t - y * sin_t
    ry = x * sin_t + y * cos_t
    return (rx + trans_x, ry + trans_y, z + trans_z)

# ----------------------------------------------------------------------
# SHAPE OUTLINE GENERATORS
# ----------------------------------------------------------------------
def center_outline(pts):
    cx = sum(p[0] for p in pts) / len(pts)
    cy = sum(p[1] for p in pts) / len(pts)
    return [(x - cx, y - cy) for x, y in pts]

def normalize_outline(pts, target=0.5):
    maxd = max(math.hypot(x, y) for x, y in pts)
    return [(x * target / maxd, y * target / maxd) for x, y in pts] if maxd else pts

def finalize(pts):
    return normalize_outline(center_outline(pts))

def outline_round(seg=8):
    return [(math.cos(2*math.pi*i/seg), math.sin(2*math.pi*i/seg)) for i in range(seg)]

def outline_ngon(n, rot=0.0):
    return [(math.cos(2*math.pi*i/n + rot), math.sin(2*math.pi*i/n + rot)) for i in range(n)]

def outline_rect_cut(w=1.3, h=0.9, cut=0.3):
    if cut <= 0.001:
        return [(-w, -h), (w, -h), (w, h), (-w, h)]
    return [(-w+cut,-h),(w-cut,-h),(w,-h+cut),(w,h-cut),
            (w-cut,h),(-w+cut,h),(-w,h-cut),(-w,-h+cut)]

def outline_oval(rx=1.25, ry=0.9, seg=20):
    return [(rx*math.cos(2*math.pi*i/seg), ry*math.sin(2*math.pi*i/seg)) for i in range(seg)]

def outline_cushion(n_exp=4, aspect=1.0, seg=16):
    pts = []
    for i in range(seg):
        t = 2*math.pi*i/seg
        c, s = math.cos(t), math.sin(t)
        x = (1 if c >= 0 else -1) * (abs(c)**(2/n_exp))
        y = (1 if s >= 0 else -1) * (abs(s)**(2/n_exp)) * aspect
        pts.append((x, y))
    return pts

def outline_marquise(width=1.5, height=0.65, seg=16):
    pts = []
    for i in range(seg):
        t = 2*math.pi*i/seg
        c = math.cos(t)
        x = (1 if c >= 0 else -1) * (abs(c)**0.5) * width
        y = math.sin(t) * height
        pts.append((x, y))
    return pts

def outline_pear(width=1.0, height=1.0, seg=20):
    pts = []
    for i in range(seg):
        t = 2*math.pi*i/seg
        pts.append([math.sin(t)*width, -math.cos(t)*height])
    ys = [p[1] for p in pts]
    ymin, ymax = min(ys), max(ys)
    for p in pts:
        f = (p[1]-ymax)/(ymin-ymax)
        p[0] *= 1 - 0.82*(f**3)
    return [tuple(p) for p in pts]

def outline_heart(seg=24):
    pts = []
    for i in range(seg):
        t = 2*math.pi*i/seg
        x = 16*math.sin(t)**3
        y = 13*math.cos(t) - 5*math.cos(2*t) - 2*math.cos(3*t) - math.cos(4*t)
        pts.append((x, -y))
    return pts

def outline_trapezoid(w_top=1.0, w_bot=1.4, h=1.0):
    return [(-w_bot,-h),(w_bot,-h),(w_top,h),(-w_top,h)]

def outline_half_moon(r=1.0, seg=16):
    return [(r*math.cos(math.pi*i/seg), r*math.sin(math.pi*i/seg)) for i in range(seg+1)]

def outline_kite(w=0.9, h=1.4):
    return [(0,h),(w,0),(0,-h),(-w,0)]

def outline_star(n=6, r_out=1.0, r_in=0.5):
    pts = []
    for i in range(n*2):
        r = r_out if i % 2 == 0 else r_in
        t = math.pi*i/n
        pts.append((r*math.cos(t), r*math.sin(t)))
    return pts

# ----------------------------------------------------------------------
# 54 UNIQUE STONES DICTIONARY
# ----------------------------------------------------------------------
SHAPE_DEFS = {
    "Round Brilliant":     (finalize(outline_round(8)),                        "brilliant"),
    "Old European":         (finalize(outline_round(12)),                       "brilliant"),
    "Old Mine":             (finalize(outline_cushion(3.2, 0.92, 16)),          "brilliant"),
    "Rose Cut":             (finalize(outline_round(10)),                       "rose"),
    "Princess":             (finalize(outline_ngon(4, math.pi/4)),              "brilliant"),
    "French Cut":           (finalize(outline_rect_cut(0.9, 0.9, 0.25)),        "step"),
    "Magna Cut":            (finalize(outline_cushion(6, 1.0, 16)),             "brilliant"),
    "Cushion":              (finalize(outline_cushion(4, 1.0, 16)),             "brilliant"),
    "Antique Cushion":      (finalize(outline_cushion(2.4, 1.0, 16)),           "brilliant"),
    "Elongated Cushion":    (finalize(outline_cushion(4, 1.4, 16)),             "brilliant"),
    "Cushion Brilliant":    (finalize(outline_cushion(5, 1.1, 20)),             "brilliant"),
    "Oval":                 (finalize(outline_oval(1.25, 0.9, 20)),             "brilliant"),
    "Long Oval":            (finalize(outline_oval(1.5, 0.8, 20)),              "brilliant"),
    "Emerald":              (finalize(outline_rect_cut(1.35, 0.9, 0.35)),       "step"),
    "Square Emerald":       (finalize(outline_rect_cut(1.05, 1.05, 0.32)),      "step"),
    "Long Emerald":         (finalize(outline_rect_cut(1.7, 0.85, 0.3)),        "step"),
    "Asscher":              (finalize(outline_rect_cut(1.1, 1.1, 0.4)),         "step"),
    "Radiant":              (finalize(outline_rect_cut(1.2, 1.0, 0.28)),        "step"),
    "Square Radiant":       (finalize(outline_rect_cut(1.1, 1.1, 0.3)),         "step"),
    "Rectangular Radiant":  (finalize(outline_rect_cut(1.4, 0.95, 0.3)),        "step"),
    "Baguette":             (finalize(outline_rect_cut(1.8, 0.55, 0.0)),        "step"),
    "Tapered Baguette":     (finalize(outline_trapezoid(0.55, 0.9, 1.4)),       "step"),
    "Trapezoid":            (finalize(outline_trapezoid(0.7, 1.5, 1.0)),        "step"),
    "Calf's Head":          (finalize(outline_trapezoid(1.3, 0.8, 1.2)),        "step"),
    "Hexagon":              (finalize(outline_ngon(6, 0)),                      "step"),
    "Pentagon":             (finalize(outline_ngon(5, math.pi/2)),              "brilliant"),
    "Octagon":              (finalize(outline_ngon(8, math.pi/8)),              "step"),
    "Marquise":             (finalize(outline_marquise(1.5, 0.65, 16)),         "brilliant"),
    "Slim Marquise":        (finalize(outline_marquise(1.8, 0.5, 16)),          "brilliant"),
    "Wide Marquise":        (finalize(outline_marquise(1.3, 0.8, 16)),          "brilliant"),
    "Willow":               (finalize(outline_marquise(2.1, 0.42, 16)),         "brilliant"),
    "Navette":              (finalize(outline_marquise(1.65, 0.58, 16)),        "brilliant"),
    "Trillion":             (finalize(outline_ngon(3, math.pi/2)),              "brilliant"),
    "Shield":               (finalize(outline_trapezoid(1.4, 0.6, 1.1)),        "brilliant"),
    "Kite":                 (finalize(outline_kite(0.9, 1.4)),                  "brilliant"),
    "Lozenge":              (finalize(outline_kite(0.6, 1.6)),                  "brilliant"),
    "Epaulette":            (finalize(outline_trapezoid(1.1, 0.5, 1.3)),        "brilliant"),
    "Bullet":               (finalize(outline_half_moon(0.9, 10)),              "brilliant"),
    "Pear":                 (finalize(outline_pear(1.0, 1.0, 20)),              "brilliant"),
    "Modified Pear":        (finalize(outline_pear(0.85, 1.15, 20)),            "brilliant"),
    "Briolette":            (finalize(outline_pear(0.9, 1.3, 20)),              "brilliant"),
    "Heart":                (finalize(outline_heart(24)),                       "brilliant"),
    "Half Moon":            (finalize(outline_half_moon(1.0, 16)),              "brilliant"),
    "Star Cut":             (finalize(outline_star(6, 1.0, 0.55)),              "brilliant"),
    "Signature Round":      (finalize(outline_round(16)),                       "brilliant"),
    "Signature Cushion":    (finalize(outline_cushion(4.5, 1.0, 20)),           "brilliant"),
    "Portrait Cut":         (finalize(outline_rect_cut(1.0, 1.3, 0.15)),        "step"),
    "Flanders Cut":         (finalize(outline_cushion(3.5, 1.2, 16)),           "brilliant"),
    "Barion Cut":           (finalize(outline_rect_cut(1.15, 1.15, 0.22)),      "brilliant"),
    "Swiss Cut":            (finalize(outline_round(13)),                       "brilliant"),
    "Single Cut":           (finalize(outline_round(6)),                        "brilliant"),
    "Eight Cut":            (finalize(outline_round(7)),                        "brilliant"),
    "Portuguese Cut":       (finalize(outline_round(20)),                       "brilliant"),
    "Chandelier":           (finalize(outline_kite(1.0, 1.6)),                  "brilliant"),
}
SHAPE_NAMES = list(SHAPE_DEFS.keys())

# ----------------------------------------------------------------------
# GEM BUILDERS (Brilliant / Step / Rose)
# ----------------------------------------------------------------------
def midpoint_ring(outline, scale=1.0, z=0.0):
    n = len(outline)
    pts = []
    for i in range(n):
        x0, y0 = outline[i]
        x1, y1 = outline[(i + 1) % n]
        pts.append(((x0+x1)/2*scale, (y0+y1)/2*scale, z))
    return pts

def build_brilliant_cut_gem(outline, crown_height=0.35, pavilion_depth=0.75, table_scale=0.55, star_scale=0.82, lower_scale=0.68):
    n = len(outline)
    girdle = [(x, y, 0.0) for x, y in outline]
    star = midpoint_ring(outline, scale=star_scale, z=crown_height*0.5)
    table = [(x*table_scale, y*table_scale, crown_height) for x, y in outline]
    lower = midpoint_ring(outline, scale=lower_scale, z=-pavilion_depth*0.42)
    culet = (0.0, 0.0, -pavilion_depth)
    table_center = (0.0, 0.0, crown_height)

    raw_triangles = []
    for i in range(n):
        g0, g1 = girdle[i], girdle[(i+1)%n]
        s0, s1 = star[(i-1)%n], star[i]
        raw_triangles.append((g0, g1, s1))
        raw_triangles.append((s0, g0, s1))
    for i in range(n):
        t0, t1 = table[i], table[(i+1)%n]
        s0, s1 = star[(i-1)%n], star[i]
        raw_triangles.append((t0, t1, s1))
        raw_triangles.append((s0, t0, s1))
    for i in range(n):
        t0, t1 = table[i], table[(i+1)%n]
        raw_triangles.append((table_center, t0, t1))
    for i in range(n):
        g0, g1 = girdle[i], girdle[(i+1)%n]
        l0, l1 = lower[(i-1)%n], lower[i]
        raw_triangles.append((g1, g0, l1))
        raw_triangles.append((l1, g0, l0))
    for i in range(n):
        l0, l1 = lower[i], lower[(i+1)%n]
        raw_triangles.append((l0, l1, culet))
    return raw_triangles

def build_step_cut_gem(outline, crown_height=0.30, pavilion_depth=0.70, table_scale=0.55, culet_scale=0.18, tiers=2):
    n = len(outline)
    raw_triangles = []
    crown_rings = []
    for k in range(tiers+1):
        s = 1.0 - (1.0-table_scale)*(k/tiers)
        z = crown_height*(k/tiers)
        crown_rings.append([(x*s, y*s, z) for x, y in outline])
    for k in range(tiers):
        r0, r1 = crown_rings[k], crown_rings[k+1]
        for i in range(n):
            inxt = (i+1)%n
            raw_triangles.append((r0[i], r0[inxt], r1[inxt]))
            raw_triangles.append((r0[i], r1[inxt], r1[i]))
    table_center = (0.0, 0.0, crown_height)
    top_ring = crown_rings[-1]
    for i in range(n):
        raw_triangles.append((table_center, top_ring[i], top_ring[(i+1)%n]))

    pav_rings = []
    for k in range(tiers+1):
        s = 1.0 - (1.0-culet_scale)*(k/tiers)
        z = -pavilion_depth*(k/tiers)
        pav_rings.append([(x*s, y*s, z) for x, y in outline])
    for k in range(tiers):
        r0, r1 = pav_rings[k], pav_rings[k+1]
        for i in range(n):
            inxt = (i+1)%n
            raw_triangles.append((r0[inxt], r0[i], r1[i]))
            raw_triangles.append((r0[inxt], r1[i], r1[inxt]))
    culet_center = (0.0, 0.0, -pavilion_depth)
    bot_ring = pav_rings[-1]
    for i in range(n):
        raw_triangles.append((culet_center, bot_ring[(i+1)%n], bot_ring[i]))
    return raw_triangles

def build_rose_cut_gem(outline, dome_height=0.45, table_scale=0.15, tiers=3):
    n = len(outline)
    raw_triangles = []
    rings = [[(x, y, 0.0) for x, y in outline]]
    for k in range(1, tiers+1):
        s = 1.0 - (1.0-table_scale)*(k/tiers)
        z = dome_height*(k/tiers)
        rings.append([(x*s, y*s, z) for x, y in outline])
    for k in range(tiers):
        r0, r1 = rings[k], rings[k+1]
        for i in range(n):
            inxt = (i+1)%n
            raw_triangles.append((r0[i], r0[inxt], r1[inxt]))
            raw_triangles.append((r0[i], r1[inxt], r1[i]))
    apex = (0.0, 0.0, dome_height)
    top_ring = rings[-1]
    for i in range(n):
        raw_triangles.append((apex, top_ring[i], top_ring[(i+1)%n]))
    flat_back_center = (0.0, 0.0, 0.0)
    for i in range(n):
        raw_triangles.append((flat_back_center, rings[0][(i+1)%n], rings[0][i]))
    return raw_triangles

def build_single_gem(shape_name):
    outline, style = SHAPE_DEFS[shape_name]
    if style == "step":
        return build_step_cut_gem(outline)
    if style == "rose":
        return build_rose_cut_gem(outline)
    return build_brilliant_cut_gem(outline)

# ----------------------------------------------------------------------
# BEZEL TORUS MESH GENERATOR
# ----------------------------------------------------------------------
def build_torus_ring(major_radius=1.5, minor_radius=0.03, seg_major=48, seg_minor=12):
    raw_triangles = []
    for i in range(seg_major):
        u0 = 2 * math.pi * i / seg_major
        u1 = 2 * math.pi * (i + 1) / seg_major
        for j in range(seg_minor):
            v0 = 2 * math.pi * j / seg_minor
            v1 = 2 * math.pi * (j + 1) / seg_minor

            def torus_pt(u, v):
                x = (major_radius + minor_radius * math.cos(v)) * math.cos(u)
                y = (major_radius + minor_radius * math.cos(v)) * math.sin(u)
                z = minor_radius * math.sin(v)
                return (x, y, z)

            p00 = torus_pt(u0, v0)
            p10 = torus_pt(u1, v0)
            p11 = torus_pt(u1, v1)
            p01 = torus_pt(u0, v1)

            raw_triangles.append((p00, p10, p11))
            raw_triangles.append((p00, p11, p01))
    return raw_triangles

# ----------------------------------------------------------------------
# MAIN GENERATOR: DIAMOND DIAL SHOWCASE RING
# ----------------------------------------------------------------------
def generate_diamond_ring_showcase(output_gltf="assets/model.gltf", output_glb="assets/model.glb"):
    ring_radius = 1.35
    gem_size = 0.16
    n_slots = len(SHAPE_NAMES)  # 54

    diamond_triangles = []
    metal_triangles = []
    plaque_triangles = []

    # 1. Bezel Ring Tubes (Platinum outer and inner framing rings)
    outer_bezel = build_torus_ring(major_radius=ring_radius + 0.14, minor_radius=0.018, seg_major=64)
    inner_bezel = build_torus_ring(major_radius=ring_radius - 0.14, minor_radius=0.015, seg_major=64)
    metal_triangles.extend(outer_bezel)
    metal_triangles.extend(inner_bezel)

    # 2. Place 54 Unique Gems & Black Plaque Pads around the ring
    for i, shape_name in enumerate(SHAPE_NAMES):
        angle = 2 * math.pi * i / n_slots
        gx = ring_radius * math.cos(angle)
        gy = ring_radius * math.sin(angle)

        # Single gem 3D triangles
        gem_tris = build_single_gem(shape_name)
        for tri in gem_tris:
            p1 = transform_point(tri[0], rot_z=angle, trans_x=gx, trans_y=gy, trans_z=0.01, scale=gem_size)
            p2 = transform_point(tri[1], rot_z=angle, trans_x=gx, trans_y=gy, trans_z=0.01, scale=gem_size)
            p3 = transform_point(tri[2], rot_z=angle, trans_x=gx, trans_y=gy, trans_z=0.01, scale=gem_size)
            diamond_triangles.append((p1, p2, p3))

        # Black plaque pad under gem
        w_pad, h_pad, d_pad = gem_size * 0.95, gem_size * 0.95, 0.008
        pad_pts = [
            (-w_pad, -h_pad, -d_pad), (w_pad, -h_pad, -d_pad), (w_pad, h_pad, -d_pad), (-w_pad, h_pad, -d_pad),
            (-w_pad, -h_pad, 0.0),    (w_pad, -h_pad, 0.0),    (w_pad, h_pad, 0.0),    (-w_pad, h_pad, 0.0)
        ]
        # Box faces
        pad_faces = [
            (0, 1, 2), (0, 2, 3), # Bottom
            (4, 6, 5), (4, 7, 6), # Top
            (0, 4, 5), (0, 5, 1), # Front
            (2, 6, 7), (2, 7, 3), # Back
            (0, 3, 7), (0, 7, 4), # Left
            (1, 5, 6), (1, 6, 2)  # Right
        ]
        for f in pad_faces:
            p1 = transform_point(pad_pts[f[0]], rot_z=angle, trans_x=gx, trans_y=gy, trans_z=-0.005)
            p2 = transform_point(pad_pts[f[1]], rot_z=angle, trans_x=gx, trans_y=gy, trans_z=-0.005)
            p3 = transform_point(pad_pts[f[2]], rot_z=angle, trans_x=gx, trans_y=gy, trans_z=-0.005)
            plaque_triangles.append((p1, p2, p3))

    # Process all triangles and build GLTF multi-primitive buffers
    all_mesh_groups = [
        ("DiamondMesh", diamond_triangles, 0),  # Material 0: Diamond
        ("MetalMesh",   metal_triangles,   1),  # Material 1: Platinum
        ("PlaqueMesh",  plaque_triangles,  2)   # Material 2: Black Plaque
    ]

    unique_vertices = []
    unique_normals = []
    unique_uvs = []
    indices_by_primitive = [[], [], []]

    min_bounds = [float('inf'), float('inf'), float('inf')]
    max_bounds = [float('-inf'), float('-inf'), float('-inf')]

    for mat_idx, (_, tris, _) in enumerate(all_mesh_groups):
        for tri in tris:
            p1, p2, p3 = tri
            v1 = sub(p2, p1)
            v2 = sub(p3, p1)
            norm = normalize(cross(v1, v2))

            # Outward normal orientation check
            centroid = ((p1[0]+p2[0]+p3[0])/3.0, (p1[1]+p2[1]+p3[1])/3.0, (p1[2]+p2[2]+p3[2])/3.0)
            if (norm[0]*centroid[0] + norm[1]*centroid[1] + norm[2]*centroid[2]) < 0:
                norm = (-norm[0], -norm[1], -norm[2])
                p2, p3 = p3, p2

            base_idx = len(unique_vertices)
            for p in (p1, p2, p3):
                unique_vertices.append(p)
                unique_normals.append(norm)
                u = 0.5 + p[0] * 0.5
                v = 0.5 + p[1] * 0.5
                unique_uvs.append((u, v))

                for c in range(3):
                    min_bounds[c] = min(min_bounds[c], p[c])
                    max_bounds[c] = max(max_bounds[c], p[c])

            indices_by_primitive[mat_idx].extend([base_idx, base_idx + 1, base_idx + 2])

    pos_buffer = bytearray()
    norm_buffer = bytearray()
    uv_buffer = bytearray()
    idx_buffer = bytearray()

    for p in unique_vertices:
        pos_buffer.extend(struct.pack('<fff', p[0], p[1], p[2]))

    for n in unique_normals:
        norm_buffer.extend(struct.pack('<fff', n[0], n[1], n[2]))

    for uv in unique_uvs:
        uv_buffer.extend(struct.pack('<ff', uv[0], uv[1]))

    prim_index_offsets = []
    prim_index_lengths = []
    current_idx_offset = 0

    for prim_indices in indices_by_primitive:
        start_offset = len(idx_buffer)
        for idx in prim_indices:
            idx_buffer.extend(struct.pack('<H', idx))
        
        # 4-byte padding per accessor
        pad = (4 - (len(idx_buffer) % 4)) % 4
        idx_buffer.extend(b'\x00' * pad)

        prim_index_offsets.append(start_offset)
        prim_index_lengths.append(len(prim_indices))

    def pad4(buf):
        pad = (4 - (len(buf) % 4)) % 4
        buf.extend(b'\x00' * pad)
        return len(buf)

    idx_len = pad4(idx_buffer)
    pos_len = pad4(pos_buffer)
    norm_len = pad4(norm_buffer)
    uv_len = pad4(uv_buffer)

    idx_offset = 0
    pos_offset = idx_offset + idx_len
    norm_offset = pos_offset + pos_len
    uv_offset = norm_offset + norm_len
    total_bin_len = uv_offset + uv_len

    bin_buffer = idx_buffer + pos_buffer + norm_buffer + uv_buffer
    b64_bin = base64.b64encode(bin_buffer).decode('ascii')
    data_uri = f"data:application/octet-stream;base64,{b64_bin}"

    # GLTF dictionary with 3 materials & primitives
    primitives_list = []
    accessors_list = []
    buffer_views_list = []

    # BufferView 0: Indices
    buffer_views_list.append({
        "buffer": 0, "byteOffset": idx_offset, "byteLength": len(idx_buffer), "target": 34963
    })
    # BufferView 1: Positions
    buffer_views_list.append({
        "buffer": 0, "byteOffset": pos_offset, "byteLength": len(pos_buffer), "target": 34962
    })
    # BufferView 2: Normals
    buffer_views_list.append({
        "buffer": 0, "byteOffset": norm_offset, "byteLength": len(norm_buffer), "target": 34962
    })
    # BufferView 3: UVs
    buffer_views_list.append({
        "buffer": 0, "byteOffset": uv_offset, "byteLength": len(uv_buffer), "target": 34962
    })

    # Accessors 0, 1, 2 for Index primitives
    for i in range(3):
        accessors_list.append({
            "bufferView": 0,
            "byteOffset": prim_index_offsets[i],
            "componentType": 5123,
            "count": prim_index_lengths[i],
            "type": "SCALAR",
            "max": [len(unique_vertices) - 1],
            "min": [0]
        })

    # Accessor 3: Position VEC3
    accessors_list.append({
        "bufferView": 1,
        "byteOffset": 0,
        "componentType": 5126,
        "count": len(unique_vertices),
        "type": "VEC3",
        "max": max_bounds,
        "min": min_bounds
    })
    # Accessor 4: Normal VEC3
    accessors_list.append({
        "bufferView": 2,
        "byteOffset": 0,
        "componentType": 5126,
        "count": len(unique_normals),
        "type": "VEC3"
    })
    # Accessor 5: UV VEC2
    accessors_list.append({
        "bufferView": 3,
        "byteOffset": 0,
        "componentType": 5126,
        "count": len(unique_uvs),
        "type": "VEC2"
    })

    # Primitives mapping to Material 0 (Diamond), Material 1 (Metal), Material 2 (Black Plaque)
    for i in range(3):
        primitives_list.append({
            "indices": i,
            "attributes": {
                "POSITION": 3,
                "NORMAL": 4,
                "TEXCOORD_0": 5
            },
            "material": i
        })

    base_gltf_dict = {
        "asset": {"version": "2.0", "generator": "ShivamJewels54UniqueCutsDiamondRingGenerator"},
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "DiamondRingShowcaseNode"}],
        "meshes": [{
            "name": "DiamondRingShowcaseMesh",
            "primitives": primitives_list
        }],
        "materials": [
            {
                "name": "AuthenticDiamondMaterial",
                "pbrMetallicRoughness": {
                    "baseColorFactor": [0.95, 0.98, 1.0, 1.0],
                    "metallicFactor": 0.15,
                    "roughnessFactor": 0.02
                },
                "emissiveFactor": [0.2, 0.35, 0.5],
                "doubleSided": True
            },
            {
                "name": "PlatinumBezelMaterial",
                "pbrMetallicRoughness": {
                    "baseColorFactor": [0.75, 0.78, 0.82, 1.0],
                    "metallicFactor": 0.9,
                    "roughnessFactor": 0.1
                },
                "doubleSided": True
            },
            {
                "name": "BlackPlaqueMaterial",
                "pbrMetallicRoughness": {
                    "baseColorFactor": [0.02, 0.02, 0.03, 1.0],
                    "metallicFactor": 0.1,
                    "roughnessFactor": 0.4
                },
                "doubleSided": True
            }
        ],
        "accessors": accessors_list,
        "bufferViews": buffer_views_list
    }

    # 1. Output GLTF file
    gltf_dict = json.loads(json.dumps(base_gltf_dict))
    gltf_dict["buffers"] = [{
        "uri": data_uri,
        "byteLength": total_bin_len
    }]

    os.makedirs(os.path.dirname(output_gltf), exist_ok=True)
    with open(output_gltf, 'w', encoding='utf-8') as f:
        json.dump(gltf_dict, f, indent=2)
    print(f"Generated 54-Cut Diamond Ring Showcase GLTF at {output_gltf}")

    # 2. Output GLB file
    glb_gltf_dict = json.loads(json.dumps(base_gltf_dict))
    glb_gltf_dict["buffers"] = [{
        "byteLength": total_bin_len
    }]

    json_bytes = json.dumps(glb_gltf_dict, separators=(',', ':')).encode('utf-8')
    json_pad = (4 - (len(json_bytes) % 4)) % 4
    json_bytes += b' ' * json_pad

    total_glb_size = 12 + 8 + len(json_bytes) + 8 + len(bin_buffer)

    glb_bytes = bytearray()
    glb_bytes.extend(struct.pack('<I', 0x46544C67))  # magic "glTF"
    glb_bytes.extend(struct.pack('<I', 2))           # version 2
    glb_bytes.extend(struct.pack('<I', total_glb_size))

    # Chunk 0: JSON
    glb_bytes.extend(struct.pack('<I', len(json_bytes)))
    glb_bytes.extend(struct.pack('<I', 0x4E4F534A))
    glb_bytes.extend(json_bytes)

    # Chunk 1: BIN
    glb_bytes.extend(struct.pack('<I', len(bin_buffer)))
    glb_bytes.extend(struct.pack('<I', 0x004E4942))
    glb_bytes.extend(bin_buffer)

    with open(output_glb, 'wb') as f:
        f.write(glb_bytes)
    print(f"Generated 54-Cut Diamond Ring Showcase GLB at {output_glb}")

if __name__ == "__main__":
    generate_diamond_ring_showcase()

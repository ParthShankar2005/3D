"""
Shivam Jewels Multi-Cut Pro-Grade Diamond GLTF & GLB Model Generator
======================================================================
Generates authentic diamond cuts matching gemological structure specifications:
  - ROUND: Classic 57-Facet Round Brilliant Cut
  - EMERALD / ASSCHER: Concentric Step Cut with flat culet
  - PRINCESS / FANCY: Multi-tier brilliant cut on custom shape outlines

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

def outline_round(seg=8):
    """8-point outline producing 57-facet round brilliant."""
    return [(math.cos(2 * math.pi * i / seg), math.sin(2 * math.pi * i / seg)) for i in range(seg)]

def outline_square():
    return [(-1.0, -1.0), (1.0, -1.0), (1.0, 1.0), (-1.0, 1.0)]

def outline_octagon_rect(w=1.2, h=0.85, cut=0.3):
    return [(-w+cut, -h), (w-cut, -h), (w, -h+cut), (w, h-cut),
            (w-cut, h), (-w+cut, h), (-w, h-cut), (-w, -h+cut)]

def midpoint_ring(outline, scale=1.0, z=0.0):
    n = len(outline)
    pts = []
    for i in range(n):
        x0, y0 = outline[i]
        x1, y1 = outline[(i + 1) % n]
        mx = (x0 + x1) / 2.0 * scale
        my = (y0 + y1) / 2.0 * scale
        pts.append((mx, my, z))
    return pts

def build_authentic_brilliant_gem(outline=None, crown_height=0.35, pavilion_depth=0.75, table_scale=0.55, star_scale=0.82, lower_scale=0.68):
    if outline is None:
        outline = outline_round(8)
    n = len(outline)

    girdle = [(x, y, 0.0) for x, y in outline]
    star = midpoint_ring(outline, scale=star_scale, z=crown_height * 0.5)
    table = [(x * table_scale, y * table_scale, crown_height) for x, y in outline]
    lower = midpoint_ring(outline, scale=lower_scale, z=-pavilion_depth * 0.42)
    culet = (0.0, 0.0, -pavilion_depth)
    table_center = (0.0, 0.0, crown_height)

    raw_triangles = []

    # Crown Band 1: Girdle <-> Star
    for i in range(n):
        g0, g1 = girdle[i], girdle[(i + 1) % n]
        s0, s1 = star[(i - 1) % n], star[i]
        raw_triangles.append((g0, g1, s1))
        raw_triangles.append((s0, g0, s1))

    # Crown Band 2: Star <-> Table
    for i in range(n):
        t0, t1 = table[i], table[(i + 1) % n]
        s0, s1 = star[(i - 1) % n], star[i]
        raw_triangles.append((t0, t1, s1))
        raw_triangles.append((s0, t0, s1))

    # Table Facet
    for i in range(n):
        t0, t1 = table[i], table[(i + 1) % n]
        raw_triangles.append((table_center, t0, t1))

    # Pavilion Band 1: Girdle <-> Lower
    for i in range(n):
        g0, g1 = girdle[i], girdle[(i + 1) % n]
        l0, l1 = lower[(i - 1) % n], lower[i]
        raw_triangles.append((g1, g0, l1))
        raw_triangles.append((l1, g0, l0))

    # Pavilion Band 2: Lower <-> Culet
    for i in range(n):
        l0, l1 = lower[i], lower[(i + 1) % n]
        raw_triangles.append((l0, l1, culet))

    return raw_triangles

def build_authentic_step_cut_gem(outline=None, crown_height=0.30, pavilion_depth=0.70, table_scale=0.55, culet_scale=0.18, tiers=2):
    """Emerald/Asscher true step cut construction."""
    if outline is None:
        outline = outline_octagon_rect()
    n = len(outline)

    raw_triangles = []

    crown_rings = []
    for k in range(tiers + 1):
        s = 1.0 - (1.0 - table_scale) * (k / tiers)
        z = crown_height * (k / tiers)
        crown_rings.append([(x * s, y * s, z) for x, y in outline])

    for k in range(tiers):
        r0, r1 = crown_rings[k], crown_rings[k + 1]
        for i in range(n):
            i_next = (i + 1) % n
            raw_triangles.append((r0[i], r0[i_next], r1[i_next]))
            raw_triangles.append((r0[i], r1[i_next], r1[i]))

    # Flat table center
    table_center = (0.0, 0.0, crown_height)
    top_ring = crown_rings[-1]
    for i in range(n):
        raw_triangles.append((table_center, top_ring[i], top_ring[(i + 1) % n]))

    # Pavilion rings
    pav_rings = []
    for k in range(tiers + 1):
        s = 1.0 - (1.0 - culet_scale) * (k / tiers)
        z = -pavilion_depth * (k / tiers)
        pav_rings.append([(x * s, y * s, z) for x, y in outline])

    for k in range(tiers):
        r0, r1 = pav_rings[k], pav_rings[k + 1]
        for i in range(n):
            i_next = (i + 1) % n
            raw_triangles.append((r0[i_next], r0[i], r1[i]))
            raw_triangles.append((r0[i_next], r1[i], r1[i_next]))

    # Flat culet bottom
    culet_center = (0.0, 0.0, -pavilion_depth)
    bot_ring = pav_rings[-1]
    for i in range(n):
        raw_triangles.append((culet_center, bot_ring[(i + 1) % n], bot_ring[i]))

    return raw_triangles

def generate_diamond_gltf_glb(cut_style="round", output_gltf="assets/model.gltf", output_glb="assets/model.glb"):
    if cut_style.lower() == "emerald":
        raw_triangles = build_authentic_step_cut_gem(outline_octagon_rect())
    elif cut_style.lower() == "princess":
        raw_triangles = build_authentic_brilliant_gem(outline_square())
    else:
        raw_triangles = build_authentic_brilliant_gem(outline_round(8))

    unique_vertices = []
    unique_normals = []
    unique_uvs = []
    indices = []

    min_bounds = [float('inf'), float('inf'), float('inf')]
    max_bounds = [float('-inf'), float('-inf'), float('-inf')]

    for tri in raw_triangles:
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

        indices.extend([base_idx, base_idx + 1, base_idx + 2])

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

    for idx in indices:
        idx_buffer.extend(struct.pack('<H', idx))

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

    base_gltf_dict = {
        "asset": {"version": "2.0", "generator": f"ShivamJewelsAuthentic{cut_style.capitalize()}DiamondGenerator"},
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "AuthenticDiamondNode"}],
        "meshes": [{
            "name": "AuthenticDiamondMesh",
            "primitives": [{
                "indices": 0,
                "attributes": {
                    "POSITION": 1,
                    "NORMAL": 2,
                    "TEXCOORD_0": 3
                },
                "material": 0
            }]
        }],
        "materials": [{
            "name": "AuthenticDiamondMaterial",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.95, 0.98, 1.0, 1.0],
                "metallicFactor": 0.15,
                "roughnessFactor": 0.02
            },
            "emissiveFactor": [0.2, 0.35, 0.5],
            "doubleSided": True
        }],
        "accessors": [
            {
                "bufferView": 0,
                "byteOffset": 0,
                "componentType": 5123,
                "count": len(indices),
                "type": "SCALAR",
                "max": [len(unique_vertices) - 1],
                "min": [0]
            },
            {
                "bufferView": 1,
                "byteOffset": 0,
                "componentType": 5126,
                "count": len(unique_vertices),
                "type": "VEC3",
                "max": max_bounds,
                "min": min_bounds
            },
            {
                "bufferView": 2,
                "byteOffset": 0,
                "componentType": 5126,
                "count": len(unique_normals),
                "type": "VEC3"
            },
            {
                "bufferView": 3,
                "byteOffset": 0,
                "componentType": 5126,
                "count": len(unique_uvs),
                "type": "VEC2"
            }
        ],
        "bufferViews": [
            {
                "buffer": 0,
                "byteOffset": idx_offset,
                "byteLength": len(idx_buffer),
                "target": 34963
            },
            {
                "buffer": 0,
                "byteOffset": pos_offset,
                "byteLength": len(pos_buffer),
                "target": 34962
            },
            {
                "buffer": 0,
                "byteOffset": norm_offset,
                "byteLength": len(norm_buffer),
                "target": 34962
            },
            {
                "buffer": 0,
                "byteOffset": uv_offset,
                "byteLength": len(uv_buffer),
                "target": 34962
            }
        ]
    }

    gltf_dict = json.loads(json.dumps(base_gltf_dict))
    gltf_dict["buffers"] = [{
        "uri": data_uri,
        "byteLength": total_bin_len
    }]

    os.makedirs(os.path.dirname(output_gltf), exist_ok=True)
    with open(output_gltf, 'w', encoding='utf-8') as f:
        json.dump(gltf_dict, f, indent=2)
    print(f"Generated Authentic {cut_style.capitalize()} Diamond GLTF at {output_gltf}")

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
    print(f"Generated Spec-Compliant Authentic {cut_style.capitalize()} Diamond GLB at {output_glb}")

if __name__ == "__main__":
    style = "round"
    if len(sys.argv) > 1:
        style = sys.argv[1]
    generate_diamond_gltf_glb(style)

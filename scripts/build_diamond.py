"""
Shivam Jewels Diamond Dial / Carousel Ring Scene Exporter
=========================================================
Generates a 3D Diamond Carousel Ring Scene GLTF & GLB model for WebAR natively in pure Python.
Features a circular ring of 12 multi-cut gemstones (Round, Princess, Cushion, Oval, Emerald,
Asscher, Marquise, Trillion, Heart, Pear) set in a metallic bezel ring.
"""

import json
import struct
import math
import base64
import os

# ----------------------------------------------------------------------
# 0. 2D SHAPE OUTLINES
# ----------------------------------------------------------------------
def center_outline(pts):
    cx = sum(p[0] for p in pts) / len(pts)
    cy = sum(p[1] for p in pts) / len(pts)
    return [(x - cx, y - cy) for x, y in pts]

def normalize_outline(pts, target=0.18):
    maxd = max(math.hypot(x, y) for x, y in pts)
    if maxd == 0:
        return pts
    f = target / maxd
    return [(x * f, y * f) for x, y in pts]

def finalize(pts):
    return normalize_outline(center_outline(pts))

def outline_round(seg=20):
    return [(math.cos(2*math.pi*i/seg), math.sin(2*math.pi*i/seg)) for i in range(seg)]

def outline_square():
    return [(-1,-1),(1,-1),(1,1),(-1,1)]

def outline_octagon_rect(w=1.2, h=0.85, cut=0.35):
    return [(-w+cut,-h),(w-cut,-h),(w,-h+cut),(w,h-cut),
            (w-cut,h),(-w+cut,h),(-w,h-cut),(-w,-h+cut)]

def outline_oval(seg=20):
    return [(1.2*math.cos(2*math.pi*i/seg), 0.85*math.sin(2*math.pi*i/seg)) for i in range(seg)]

def outline_cushion(n_exp=4, seg=20):
    pts = []
    for i in range(seg):
        t = 2 * math.pi * i / seg
        c, s = math.cos(t), math.sin(t)
        x = (1 if c >= 0 else -1) * (abs(c)) ** (2 / n_exp)
        y = (1 if s >= 0 else -1) * (abs(s)) ** (2 / n_exp)
        pts.append((x, y))
    return pts

def outline_marquise(seg=20):
    pts = []
    for i in range(seg):
        t = 2 * math.pi * i / seg
        c = math.cos(t)
        x = (1 if c >= 0 else -1) * (abs(c) ** 0.5) * 1.4
        y = math.sin(t) * 0.6
        pts.append((x, y))
    return pts

def outline_trillion():
    return [(0, 1.1), (0.95, -0.55), (-0.95, -0.55)]

def outline_heart(seg=24):
    pts = []
    for i in range(seg):
        t = 2 * math.pi * i / seg
        x = 16 * math.sin(t) ** 3
        y = 13*math.cos(t) - 5*math.cos(2*t) - 2*math.cos(3*t) - math.cos(4*t)
        pts.append((x, -y))
    return pts

def outline_pear(seg=24):
    pts = []
    for i in range(seg):
        t = 2 * math.pi * i / seg
        x = math.sin(t)
        y = -math.cos(t)
        pts.append([x, y])
    ys = [p[1] for p in pts]
    ymin, ymax = min(ys), max(ys)
    for p in pts:
        f = (p[1] - ymax) / (ymin - ymax)
        taper = 1 - 0.8 * (f ** 3)
        p[0] *= taper
    return [tuple(p) for p in pts]

SHAPES = [
    finalize(outline_round()),
    finalize(outline_square()),
    finalize(outline_cushion()),
    finalize(outline_oval()),
    finalize(outline_octagon_rect(1.2, 0.85, 0.35)),
    finalize(outline_marquise()),
    finalize(outline_trillion()),
    finalize(outline_heart()),
    finalize(outline_pear()),
]

# ----------------------------------------------------------------------
# 1. GENERATE MESH GEOMETRIES
# ----------------------------------------------------------------------
def build_diamond_carousel_model(output_gltf="assets/model.gltf", output_glb="assets/model.glb"):
    unique_vertices = []
    unique_normals = []
    unique_uvs = []
    indices = []

    # 1. Build Bezel Ring (Outer Torus Ring)
    ring_radius = 0.68
    ring_tube = 0.032
    r_segs = 32
    t_segs = 12

    for i in range(r_segs):
        a1 = 2 * math.pi * i / r_segs
        a2 = 2 * math.pi * (i + 1) / r_segs
        c1, s1 = math.cos(a1), math.sin(a1)
        c2, s2 = math.cos(a2), math.sin(a2)

        for j in range(t_segs):
            b1 = 2 * math.pi * j / t_segs
            b2 = 2 * math.pi * (j + 1) / t_segs
            cb1, sb1 = math.cos(b1), math.sin(b1)
            cb2, sb2 = math.cos(b2), math.sin(b2)

            p1 = ((ring_radius + ring_tube * cb1) * c1, ring_tube * sb1, (ring_radius + ring_tube * cb1) * s1)
            p2 = ((ring_radius + ring_tube * cb1) * c2, ring_tube * sb1, (ring_radius + ring_tube * cb1) * s2)
            p3 = ((ring_radius + ring_tube * cb2) * c2, ring_tube * sb2, (ring_radius + ring_tube * cb2) * s2)
            p4 = ((ring_radius + ring_tube * cb2) * c1, ring_tube * sb2, (ring_radius + ring_tube * cb2) * s1)

            # Normal calculation for torus
            n1 = (cb1 * c1, sb1, cb1 * s1)
            n2 = (cb1 * c2, sb1, cb1 * s2)
            n3 = (cb2 * c2, sb2, cb2 * s2)
            n4 = (cb2 * c1, sb2, cb2 * s1)

            base_idx = len(unique_vertices)
            unique_vertices.extend([p1, p2, p3, p4])
            unique_normals.extend([n1, n2, n3, n4])
            unique_uvs.extend([(0, 0), (1, 0), (1, 1), (0, 1)])
            indices.extend([base_idx, base_idx + 1, base_idx + 2, base_idx, base_idx + 2, base_idx + 3])

    # 2. Build 12 Gemstones in a Circular Ring
    num_gems = 12
    table_scale = 0.55
    crown_h = 0.10
    pavilion_d = 0.22

    for k in range(num_gems):
        g_angle = 2 * math.pi * k / num_gems
        gx = ring_radius * math.cos(g_angle)
        gz = ring_radius * math.sin(g_angle)
        gy = 0.03

        outline = SHAPES[k % len(SHAPES)]
        n = len(outline)

        # Rotate gem to face outward along ring radius
        rot = g_angle

        def transform(x, y, z):
            # Rotate in XZ plane around gem center
            rx = x * math.cos(rot) - z * math.sin(rot)
            rz = x * math.sin(rot) + z * math.cos(rot)
            return (gx + rx, gy + y, gz + rz)

        table_center = transform(0.0, crown_h, 0.0)
        apex = transform(0.0, -pavilion_d, 0.0)

        girdle = [transform(x, 0.0, z) for x, z in outline]
        table = [transform(x * table_scale, crown_h, z * table_scale) for x, z in outline]

        raw_faces = []
        for i in range(n):
            nxt = (i + 1) % n
            raw_faces.append((table_center, table[i], table[nxt]))
            raw_faces.append((table[i], girdle[i], table[nxt]))
            raw_faces.append((table[nxt], girdle[i], girdle[nxt]))
            raw_faces.append((girdle[i], apex, girdle[nxt]))

        for tri in raw_faces:
            p1, p2, p3 = tri
            v1 = (p2[0]-p1[0], p2[1]-p1[1], p2[2]-p1[2])
            v2 = (p3[0]-p1[0], p3[1]-p1[1], p3[2]-p1[2])
            nx = v1[1]*v2[2] - v1[2]*v2[1]
            ny = v1[2]*v2[0] - v1[0]*v2[2]
            nz = v1[0]*v2[1] - v1[1]*v2[0]
            len_n = math.sqrt(nx*nx + ny*ny + nz*nz) or 1.0
            norm = (nx/len_n, ny/len_n, nz/len_n)

            base_idx = len(unique_vertices)
            for p in (p1, p2, p3):
                unique_vertices.append(p)
                unique_normals.append(norm)
                u = 0.5 + p[0] * 0.5
                v = 0.5 + p[2] * 0.5
                unique_uvs.append((u, v))

            indices.extend([base_idx, base_idx + 1, base_idx + 2])

    # Pack Binary Buffers
    pos_buffer = bytearray()
    norm_buffer = bytearray()
    uv_buffer = bytearray()
    idx_buffer = bytearray()

    min_bounds = [float('inf'), float('inf'), float('inf')]
    max_bounds = [float('-inf'), float('-inf'), float('-inf')]

    for p in unique_vertices:
        pos_buffer.extend(struct.pack('<fff', p[0], p[1], p[2]))
        for c in range(3):
            min_bounds[c] = min(min_bounds[c], p[c])
            max_bounds[c] = max(max_bounds[c], p[c])

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

    # GLTF JSON Structure
    gltf_dict = {
        "asset": {"version": "2.0", "generator": "ShivamJewelsDiamondDialCarouselGenerator"},
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "DiamondDialNode"}],
        "meshes": [{
            "name": "DiamondDialMesh",
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
            "name": "PureCrystalDiamondMaterial",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.92, 0.97, 1.0, 0.95],
                "metallicFactor": 0.25,
                "roughnessFactor": 0.01
            },
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
        ],
        "buffers": [{
            "uri": data_uri,
            "byteLength": total_bin_len
        }]
    }

    os.makedirs(os.path.dirname(output_gltf), exist_ok=True)
    with open(output_gltf, 'w', encoding='utf-8') as f:
        json.dump(gltf_dict, f, indent=2)
    print(f"Generated Diamond Dial Carousel GLTF at {output_gltf}")

    json_bytes = json.dumps(gltf_dict, separators=(',', ':')).encode('utf-8')
    json_pad = (4 - (len(json_bytes) % 4)) % 4
    json_bytes += b' ' * json_pad

    total_glb_size = 12 + 8 + len(json_bytes) + 8 + len(bin_buffer)

    glb_bytes = bytearray()
    glb_bytes.extend(struct.pack('<I', 0x46544C67))
    glb_bytes.extend(struct.pack('<I', 2))
    glb_bytes.extend(struct.pack('<I', total_glb_size))

    glb_bytes.extend(struct.pack('<I', len(json_bytes)))
    glb_bytes.extend(struct.pack('<I', 0x4E4F534A))
    glb_bytes.extend(json_bytes)

    glb_bytes.extend(struct.pack('<I', len(bin_buffer)))
    glb_bytes.extend(struct.pack('<I', 0x004E4942))
    glb_bytes.extend(bin_buffer)

    with open(output_glb, 'wb') as f:
        f.write(glb_bytes)
    print(f"Generated Diamond Dial Carousel GLB at {output_glb}")

if __name__ == "__main__":
    build_diamond_carousel_model()
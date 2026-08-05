"""
Shivam Jewels Pro-Grade Diamond GLTF & GLB Model Generator
============================================================
Generates the exact 57-Facet Pro-Grade Round Brilliant Diamond model using
the user's precise vertex and face matrix definitions in pure Python.
"""

import json
import struct
import math
import base64
import os

def build_user_exact_diamond(output_gltf="assets/model.gltf", output_glb="assets/model.glb"):
    segments = 16
    ang = (2 * math.pi) / segments

    raw_verts = [
        (0.0, 0.0, -0.85),  # 0: Culet (Bottom Point)
    ]

    # Lower Pavilion, Pavilion, Girdle Lower, Girdle Upper, Crown, Table
    for i in range(segments): raw_verts.append((0.35 * math.cos(i * ang), 0.35 * math.sin(i * ang), -0.5))
    for i in range(segments): raw_verts.append((0.75 * math.cos((i + 0.5) * ang), 0.75 * math.sin((i + 0.5) * ang), -0.2))
    for i in range(segments): raw_verts.append((1.0 * math.cos(i * ang), 1.0 * math.sin(i * ang), -0.02))
    for i in range(segments): raw_verts.append((1.0 * math.cos(i * ang), 1.0 * math.sin(i * ang), 0.02))
    for i in range(segments): raw_verts.append((0.70 * math.cos((i + 0.5) * ang), 0.70 * math.sin((i + 0.5) * ang), 0.28))
    for i in range(segments): raw_verts.append((0.50 * math.cos(i * ang), 0.50 * math.sin(i * ang), 0.42))

    raw_faces = []
    for i in range(segments):
        nxt = (i + 1) % segments
        raw_faces.append([0, nxt + 1, i + 1])
        raw_faces.append([i + 1, nxt + 1, nxt + 17])
        raw_faces.append([i + 1, nxt + 17, i + 17])
        raw_faces.append([i + 17, nxt + 17, nxt + 33])
        raw_faces.append([i + 17, nxt + 33, i + 33])
        raw_faces.append([i + 33, nxt + 33, nxt + 49])
        raw_faces.append([i + 33, nxt + 49, i + 49])
        raw_faces.append([i + 49, nxt + 49, nxt + 65])
        raw_faces.append([i + 49, nxt + 65, i + 65])
        raw_faces.append([i + 65, nxt + 65, i + 81])
        raw_faces.append([nxt + 65, nxt + 81, i + 81])

    # Table center vertex
    table_center_idx = len(raw_verts)
    raw_verts.append((0.0, 0.0, 0.42))
    for i in range(segments):
        nxt = (i + 1) % segments
        raw_faces.append([table_center_idx, i + 81, nxt + 81])

    unique_vertices = []
    unique_normals = []
    unique_uvs = []
    indices = []

    for face in raw_faces:
        p1 = raw_verts[face[0]]
        p2 = raw_verts[face[1]]
        p3 = raw_verts[face[2]]

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
            v = 0.5 + p[1] * 0.5
            unique_uvs.append((u, v))

        indices.extend([base_idx, base_idx + 1, base_idx + 2])

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

    # Base GLTF structure
    base_gltf_dict = {
        "asset": {"version": "2.0", "generator": "ShivamJewelsUserExactDiamondGenerator"},
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "DiamondNode"}],
        "meshes": [{
            "name": "DiamondMesh",
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
                "baseColorFactor": [0.85, 0.95, 1.0, 1.0],
                "metallicFactor": 0.2,
                "roughnessFactor": 0.05
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
        ]
    }

    # 1. Output GLTF file with inline base64 data URI buffer
    gltf_dict = json.loads(json.dumps(base_gltf_dict))
    gltf_dict["buffers"] = [{
        "uri": data_uri,
        "byteLength": total_bin_len
    }]

    os.makedirs(os.path.dirname(output_gltf), exist_ok=True)
    with open(output_gltf, 'w', encoding='utf-8') as f:
        json.dump(gltf_dict, f, indent=2)
    print(f"Generated User Exact Diamond GLTF at {output_gltf}")

    # 2. Output GLB file (spec requires NO uri in buffers[0] for internal BIN chunk)
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
    print(f"Generated Spec-Compliant Diamond GLB at {output_glb}")

if __name__ == "__main__":
    build_user_exact_diamond()
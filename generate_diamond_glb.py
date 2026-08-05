import json
import struct
import math
import base64
import os

def build_58_facet_diamond(output_gltf="assets/model.gltf", output_glb="assets/model.glb"):
    # 58-Facet Classic Round Brilliant Cut Diamond Geometry
    N = 8  # 8-fold symmetry (8 crown mains, 8 star facets, 16 upper girdle facets, 8 pavilion mains)
    
    table_y = 0.54
    table_r = 0.42
    
    star_y = 0.38
    star_r = 0.68
    
    girdle_top_y = 0.14
    girdle_bot_y = 0.08
    girdle_r = 0.90
    
    pavilion_mid_y = -0.38
    pavilion_mid_r = 0.46
    
    culet_y = -0.82

    unique_vertices = []
    unique_normals = []
    unique_uvs = []
    indices = []

    def add_facet(p1, p2, p3):
        v1 = (p2[0]-p1[0], p2[1]-p1[1], p2[2]-p1[2])
        v2 = (p3[0]-p1[0], p3[1]-p1[1], p3[2]-p1[2])
        nx = v1[1]*v2[2] - v1[2]*v2[1]
        ny = v1[2]*v2[0] - v1[0]*v2[2]
        nz = v1[0]*v2[1] - v1[1]*v2[0]
        len_n = math.sqrt(nx*nx + ny*ny + nz*nz) or 1.0
        n = (nx/len_n, ny/len_n, nz/len_n)

        base_idx = len(unique_vertices)
        for p in (p1, p2, p3):
            unique_vertices.append(p)
            unique_normals.append(n)
            u = 0.5 + p[0] * 0.5
            v = 0.5 + p[2] * 0.5
            unique_uvs.append((u, v))

        indices.extend([base_idx, base_idx + 1, base_idx + 2])

    table_center = (0.0, table_y, 0.0)
    culet = (0.0, culet_y, 0.0)

    # Key ring coordinates
    table_ring = []
    star_ring = []
    girdle_top_ring = []
    girdle_top_mid_ring = []
    girdle_bot_ring = []
    pavilion_mid_ring = []

    for i in range(N):
        a_main = 2 * math.pi * i / N
        a_half = 2 * math.pi * (i + 0.5) / N
        a_quarter1 = 2 * math.pi * (i + 0.25) / N
        a_quarter3 = 2 * math.pi * (i + 0.75) / N

        table_ring.append((table_r * math.cos(a_main), table_y, table_r * math.sin(a_main)))
        star_ring.append((star_r * math.cos(a_half), star_y, star_r * math.sin(a_half)))

        girdle_top_ring.append((girdle_r * math.cos(a_main), girdle_top_y, girdle_r * math.sin(a_main)))
        girdle_top_mid_ring.append((girdle_r * math.cos(a_half), girdle_top_y, girdle_r * math.sin(a_half)))

        girdle_bot_ring.append((girdle_r * math.cos(a_main), girdle_bot_y, girdle_r * math.sin(a_main)))
        pavilion_mid_ring.append((pavilion_mid_r * math.cos(a_half), pavilion_mid_y, pavilion_mid_r * math.sin(a_half)))

    # 1. Octagonal Table Top (8 facets)
    for i in range(N):
        next_i = (i + 1) % N
        add_facet(table_center, table_ring[i], table_ring[next_i])

    # 2. Crown Star & Kite Facets (16 facets)
    for i in range(N):
        next_i = (i + 1) % N
        add_facet(table_ring[i], star_ring[i], table_ring[next_i])
        add_facet(table_ring[i], girdle_top_ring[i], star_ring[i])
        add_facet(star_ring[i], girdle_top_ring[i], girdle_top_mid_ring[i])
        add_facet(star_ring[i], girdle_top_mid_ring[i], girdle_top_ring[next_i])

    # 3. Girdle Facets (16 facets)
    for i in range(N):
        next_i = (i + 1) % N
        add_facet(girdle_top_ring[i], girdle_bot_ring[i], girdle_top_mid_ring[i])
        add_facet(girdle_top_mid_ring[i], girdle_bot_ring[i], girdle_bot_ring[next_i])

    # 4. Pavilion Mains & Lower Girdle Facets (16 facets)
    for i in range(N):
        next_i = (i + 1) % N
        add_facet(girdle_bot_ring[i], pavilion_mid_ring[i], girdle_bot_ring[next_i])
        add_facet(girdle_bot_ring[i], culet, pavilion_mid_ring[i])
        add_facet(pavilion_mid_ring[i], culet, girdle_bot_ring[next_i])

    # Pack Buffers
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

    # Pure Crystal Diamond PBR Material Specification
    gltf_dict = {
        "asset": {"version": "2.0", "generator": "ShivamJewelsBrilliantDiamondGenerator"},
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
                "baseColorFactor": [0.92, 0.97, 1.0, 0.95],
                "metallicFactor": 0.1,
                "roughnessFactor": 0.0
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
    print(f"Generated 58-Facet Brilliant Cut Diamond GLTF at {output_gltf}")

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
    print(f"Generated 58-Facet Brilliant Cut Diamond GLB at {output_glb}")

if __name__ == "__main__":
    build_58_facet_diamond()

import json
import struct
import math
import os

def build_diamond_glb(output_path="assets/model.glb"):
    num_sides = 12
    table_y = 0.55
    table_r = 0.45
    girdle_y = 0.15
    girdle_r = 0.85
    culet_y = -0.75
    
    facet_triangles = []
    
    def add_triangle(p1, p2, p3):
        # Compute face normal
        v1 = [p2[0]-p1[0], p2[1]-p1[1], p2[2]-p1[2]]
        v2 = [p3[0]-p1[0], p3[1]-p1[1], p3[2]-p1[2]]
        nx = v1[1]*v2[2] - v1[2]*v2[1]
        ny = v1[2]*v2[0] - v1[0]*v2[2]
        nz = v1[0]*v2[1] - v1[1]*v2[0]
        length = math.sqrt(nx*nx + ny*ny + nz*nz) or 1.0
        n = (nx/length, ny/length, nz/length)
        facet_triangles.append((p1, p2, p3, n))

    table_center = (0.0, table_y, 0.0)
    table_ring = []
    girdle_ring = []
    mid_ring = []
    
    mid_y = (table_y + girdle_y) / 2 + 0.08
    mid_r = (table_r + girdle_r) / 2 + 0.05
    
    for i in range(num_sides):
        angle = 2 * math.pi * i / num_sides
        table_ring.append((table_r * math.cos(angle), table_y, table_r * math.sin(angle)))
        girdle_ring.append((girdle_r * math.cos(angle), girdle_y, girdle_r * math.sin(angle)))

        angle_mid = 2 * math.pi * (i + 0.5) / num_sides
        mid_ring.append((mid_r * math.cos(angle_mid), mid_y, mid_r * math.sin(angle_mid)))

    culet = (0.0, culet_y, 0.0)

    # 1. Top Table Facets (Flat top center)
    for i in range(num_sides):
        next_i = (i + 1) % num_sides
        add_triangle(table_center, table_ring[i], table_ring[next_i])

    # 2. Crown Slanted Facets
    for i in range(num_sides):
        next_i = (i + 1) % num_sides
        add_triangle(table_ring[i], mid_ring[i], table_ring[next_i])
        add_triangle(table_ring[i], girdle_ring[i], mid_ring[i])
        add_triangle(mid_ring[i], girdle_ring[i], girdle_ring[next_i])
        add_triangle(table_ring[next_i], mid_ring[i], girdle_ring[next_i])

    # 3. Pavilion Facets (Conical bottom tapering to pointed culet)
    for i in range(num_sides):
        next_i = (i + 1) % num_sides
        add_triangle(girdle_ring[i], culet, girdle_ring[next_i])

    # Flatten mesh data into binary buffers
    pos_buffer = bytearray()
    norm_buffer = bytearray()

    min_bounds = [float('inf'), float('inf'), float('inf')]
    max_bounds = [float('-inf'), float('-inf'), float('-inf')]

    vertex_count = 0
    for p1, p2, p3, n in facet_triangles:
        for p in (p1, p2, p3):
            vertex_count += 1
            pos_buffer.extend(struct.pack('<fff', p[0], p[1], p[2]))
            norm_buffer.extend(struct.pack('<fff', n[0], n[1], n[2]))

            for c in range(3):
                min_bounds[c] = min(min_bounds[c], p[c])
                max_bounds[c] = max(max_bounds[c], p[c])

    # Build GLTF JSON Structure
    pos_bytes = len(pos_buffer)
    norm_bytes = len(norm_buffer)
    total_bin_bytes = pos_bytes + norm_bytes

    gltf_dict = {
        "asset": {"version": "2.0", "generator": "ShivamJewelsDiamondGenerator"},
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "ShivamJewelsDiamond"}],
        "meshes": [{
            "name": "DiamondMesh",
            "primitives": [{
                "attributes": {
                    "POSITION": 0,
                    "NORMAL": 1
                },
                "material": 0
            }]
        }],
        "materials": [{
            "name": "DiamondCyanGem",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.65, 0.92, 1.0, 0.9],
                "metallicFactor": 0.1,
                "roughnessFactor": 0.05
            },
            "doubleSided": True
        }],
        "accessors": [
            {
                "bufferView": 0,
                "byteOffset": 0,
                "componentType": 5126, # FLOAT
                "count": vertex_count,
                "type": "VEC3",
                "max": max_bounds,
                "min": min_bounds
            },
            {
                "bufferView": 1,
                "byteOffset": 0,
                "componentType": 5126, # FLOAT
                "count": vertex_count,
                "type": "VEC3"
            }
        ],
        "bufferViews": [
            {
                "buffer": 0,
                "byteOffset": 0,
                "byteLength": pos_bytes,
                "target": 34962
            },
            {
                "buffer": 0,
                "byteOffset": pos_bytes,
                "byteLength": norm_bytes,
                "target": 34962
            }
        ],
        "buffers": [{
            "byteLength": total_bin_bytes
        }]
    }

    json_bytes = json.dumps(gltf_dict, separators=(',', ':')).encode('utf-8')
    # Pad JSON with spaces to 4-byte boundary
    json_pad = (4 - (len(json_bytes) % 4)) % 4
    json_bytes += b' ' * json_pad

    # Combined BIN buffer
    bin_buffer = pos_buffer + norm_buffer
    bin_pad = (4 - (len(bin_buffer) % 4)) % 4
    bin_buffer += b'\x00' * bin_pad

    # GLB Header (12 bytes) + Chunk 0 JSON (8 + json_bytes) + Chunk 1 BIN (8 + bin_bytes)
    total_glb_size = 12 + 8 + len(json_bytes) + 8 + len(bin_buffer)

    glb_bytes = bytearray()
    # Header: Magic, Version, Total Length
    glb_bytes.extend(struct.pack('<I', 0x46544C67)) # 'glTF'
    glb_bytes.extend(struct.pack('<I', 2))
    glb_bytes.extend(struct.pack('<I', total_glb_size))

    # Chunk 0 (JSON): Length, Type (0x4E4F534A)
    glb_bytes.extend(struct.pack('<I', len(json_bytes)))
    glb_bytes.extend(struct.pack('<I', 0x4E4F534A))
    glb_bytes.extend(json_bytes)

    # Chunk 1 (BIN): Length, Type (0x004E4942)
    glb_bytes.extend(struct.pack('<I', len(bin_buffer)))
    glb_bytes.extend(struct.pack('<I', 0x004E4942))
    glb_bytes.extend(bin_buffer)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'wb') as f:
        f.write(glb_bytes)
    print(f"Generated 3D Diamond GLB model ({len(glb_bytes)} bytes) at {output_path}")

if __name__ == "__main__":
    build_diamond_glb()

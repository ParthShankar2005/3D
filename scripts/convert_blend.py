"""
Blender .blend to .glb Automatic Converter Script
==================================================
Converts any Blender .blend file directly into a web-ready .glb file
using Blender in background headless mode.
"""

import os
import sys
import subprocess
import glob

def find_blender():
    # Check if blender is in PATH
    try:
        res = subprocess.run(["blender", "--version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if res.returncode == 0:
            return "blender"
    except Exception:
        pass

    # Standard Windows install locations
    common_paths = [
        r"C:\Program Files\Blender Foundation\Blender*\blender.exe",
        r"C:\Program Files\Blender Foundation\Blender\blender.exe",
        r"C:\Program Files (x86)\Blender Foundation\Blender*\blender.exe",
        os.path.expanduser(r"~\AppData\Local\Programs\Blender Foundation\Blender*\blender.exe"),
    ]
    for pattern in common_paths:
        matches = glob.glob(pattern)
        if matches:
            return matches[-1] # Return latest installed version

    return None

def convert_blend_to_glb(blend_path="assets/model.blend", output_glb="assets/model.glb"):
    if not os.path.exists(blend_path):
        print(f"[ERROR] Could not find blend file at '{blend_path}'")
        return False

    blender_exe = find_blender()
    if not blender_exe:
        print("[INFO] Blender installation not detected in standard system paths.")
        print("\nTo export manually inside Blender UI:")
        print("   1. Open your .blend model in Blender")
        print("   2. Click File -> Export -> glTF 2.0 (.glb/.gltf)")
        print("   3. Select Format: 'glTF Binary (.glb)'")
        print(f"   4. Save destination: '{output_glb}'")
        return False

    print(f"[FOUND] Blender path: {blender_exe}")
    print(f"[CONVERTING] '{blend_path}' -> '{output_glb}'...")

    # Python command to execute inside Blender
    py_expr = (
        "import bpy; "
        f"bpy.ops.export_scene.gltf(filepath=r'{os.path.abspath(output_glb)}', export_format='GLB', export_apply=True)"
    )

    cmd = [
        blender_exe,
        "-b", os.path.abspath(blend_path),
        "--python-expr", py_expr
    ]

    try:
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if result.returncode == 0 and os.path.exists(output_glb):
            print(f"[SUCCESS] Created '{output_glb}' successfully ({os.path.getsize(output_glb)} bytes)")
            return True
        else:
            print(f"[FAILED] Conversion failed. Blender output:\n{result.stderr or result.stdout}")
            return False
    except Exception as e:
        print(f"[ERROR] Execution error: {e}")
        return False

if __name__ == "__main__":
    blend_input = sys.argv[1] if len(sys.argv) > 1 else "assets/model.blend"
    glb_output = sys.argv[2] if len(sys.argv) > 2 else "assets/model.glb"
    convert_blend_to_glb(blend_input, glb_output)

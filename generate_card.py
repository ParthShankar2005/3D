import os
import sys
import subprocess

# Ensure required libraries are installed
try:
    import qrcode
except ImportError:
    print("Installing 'qrcode' library...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "qrcode[pil]"])
    import qrcode

try:
    from PIL import Image
except ImportError:
    print("Installing 'pillow' library...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow"])
    from PIL import Image

def generate_qr_code(url, fill_color="#000000", back_color="#ffffff"):
    """Generates a high-quality QR code image targeting the given URL."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=3,
    )
    qr.add_data(url)
    qr.make(fit=True)
    
    # Generate the image (RGBA for flexibility)
    qr_img = qr.make_image(fill_color=fill_color, back_color=back_color).convert("RGBA")
    return qr_img

def stitch_qr_onto_card(base_image_path, qr_img, output_path):
    """
    Automates the process of merging a QR code image perfectly centered 
    inside the bottom golden frame of the Shivam Jewels base card.
    """
    if not os.path.exists(base_image_path):
        raise FileNotFoundError(f"Base template not found at {base_image_path}")
        
    base_img = Image.open(base_image_path).convert("RGBA")
    
    # Target size of 230px fits beautifully inside the 318x286px inner frame box
    target_qr_size = 230
    qr_img_resized = qr_img.resize((target_qr_size, target_qr_size), Image.Resampling.LANCZOS)
    
    # Create an overlay layer to preserve alpha transparency
    overlay = Image.new("RGBA", base_img.size, (0, 0, 0, 0))
    
    # Coordinates calculated via edge detection:
    # Outer frame: X=[378, 696], Y=[1018, 1304]
    # To center a 230x230 QR:
    # pos_x = 378 + (318 - 230) // 2 = 422
    # pos_y = 1018 + (286 - 230) // 2 = 1046
    pos_x = 422
    pos_y = 1046
    
    overlay.paste(qr_img_resized, (pos_x, pos_y))
    
    # Composite design and save as high-quality print ready JPEG
    final_card = Image.alpha_composite(base_img, overlay).convert("RGB")
    final_card.save(output_path, "JPEG", quality=95)
    print(f"Success! Compiled card with QR code saved to: {output_path}")

if __name__ == "__main__":
    # URL pointing to the user's live custom subdomain WebAR portal
    target_url = "https://3d.shivamai.studio/"
    
    print(f"Generating QR Code for: {target_url}")
    qr_code_image = generate_qr_code(target_url)
    
    stitch_qr_onto_card(
        base_image_path="Invitation card.png",
        qr_img=qr_code_image,
        output_path="shivam_jewels_print_ready_card.jpg"
    )

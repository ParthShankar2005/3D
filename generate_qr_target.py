import os
import qrcode
from PIL import Image

def create_simple_clean_qr(url="https://sjar.vercel.app", output_path="assets/target.png"):
    # Generate high quality clean QR code
    qr = qrcode.QRCode(
        version=4,
        error_correction=qrcode.constants.ERROR_CORRECT_H,  # High error correction for rich feature points
        box_size=20,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)
    
    # Render pure black & white QR image
    qr_img = qr.make_image(fill_color="black", back_color="white").convert('RGB')
    
    # Scale to 1024x1024 high resolution
    qr_img = qr_img.resize((1024, 1024), Image.NEAREST)
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    qr_img.save(output_path, "PNG", quality=100)
    print(f"Clean QR code created successfully at {output_path}")

if __name__ == "__main__":
    create_simple_clean_qr()

import os
import qrcode
from PIL import Image, ImageDraw, ImageFont

def create_ar_qr_target(url="https://3d.shivamai.studio", output_path="assets/target.png"):
    # Target size 1024x1024 for high resolution feature tracking & crisp QR scanning
    width, height = 1024, 1024
    img = Image.new('RGB', (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    # 1. Outer Dark Geometric Border Frame (provides strong edge features)
    draw.rectangle([16, 16, width - 16, height - 16], outline=(15, 23, 42), width=16)
    draw.rectangle([36, 36, width - 36, height - 36], outline=(6, 182, 212), width=6)
    
    # Grid lines in border margins for feature point enrichment
    for offset in range(50, 1000, 40):
        # Top and bottom ticks
        draw.line([(offset, 16), (offset, 36)], fill=(15, 23, 42), width=3)
        draw.line([(offset, 988), (offset, 1008)], fill=(15, 23, 42), width=3)
        # Left and right ticks
        draw.line([(16, offset), (36, offset)], fill=(15, 23, 42), width=3)
        draw.line([(988, offset), (1008, offset)], fill=(15, 23, 42), width=3)

    # 2. Four Corner High-Contrast Alignment Crosshairs (MindAR keypoint anchors)
    corners = [(96, 96), (width - 96, 96), (96, height - 96), (width - 96, height - 96)]
    for cx, cy in corners:
        # Concentric circles and crosshair lines
        draw.ellipse([cx - 45, cy - 45, cx + 45, cy + 45], fill=(15, 23, 42))
        draw.ellipse([cx - 32, cy - 32, cx + 32, cy + 32], fill=(255, 255, 255))
        draw.ellipse([cx - 20, cy - 20, cx + 20, cy + 20], fill=(6, 182, 212))
        draw.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], fill=(15, 23, 42))
        # Crosshair extending ticks
        draw.line([(cx - 60, cy), (cx + 60, cy)], fill=(15, 23, 42), width=4)
        draw.line([(cx, cy - 60), (cx, cy + 60)], fill=(15, 23, 42), width=4)

    # 3. Top Banner & Header Text
    # Draw dark background header block for text features
    draw.rectangle([180, 50, width - 180, 120], fill=(15, 23, 42))
    draw.rectangle([184, 54, width - 184, 116], outline=(6, 182, 212), width=3)
    
    try:
        font_large = ImageFont.truetype("arial.ttf", 36)
        font_sub = ImageFont.truetype("arial.ttf", 22)
        font_bold = ImageFont.truetype("arialbd.ttf", 26)
    except IOError:
        font_large = font_sub = font_bold = ImageFont.load_default()

    # Draw header text
    draw.text((width // 2, 70), "3D WebAR TARGET", fill=(255, 255, 255), font=font_large, anchor="mm")
    draw.text((width // 2, 102), "SCAN TO LAUNCH AR EXPERIENCE", fill=(6, 182, 212), font=font_sub, anchor="mm")

    # 4. Generate Crisp, Scannable QR Code
    qr = qrcode.QRCode(
        version=4,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=12,
        border=3,
    )
    qr.add_data(url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color=(15, 23, 42), back_color=(255, 255, 255)).convert('RGB')
    
    # Scale QR image to ~540x540
    qr_size = 540
    qr_img = qr_img.resize((qr_size, qr_size), Image.NEAREST)
    
    # Position QR code in center of canvas
    qr_x = (width - qr_size) // 2
    qr_y = (height - qr_size) // 2
    
    # Draw dark border container for QR code
    draw.rectangle([qr_x - 12, qr_y - 12, qr_x + qr_size + 12, qr_y + qr_size + 12], fill=(15, 23, 42))
    draw.rectangle([qr_x - 6, qr_y - 6, qr_x + qr_size + 6, qr_y + qr_size + 6], fill=(255, 255, 255))
    
    # Paste QR code onto canvas
    img.paste(qr_img, (qr_x, qr_y))

    # 5. Side Feature Pattern Bands (Left & Right) to increase 6DoF tracking density
    # Dot matrix and checker pattern arrays along sides
    for side_x in [75, width - 115]:
        for y_pos in range(200, 800, 40):
            # Alternating squares & circles
            if (y_pos // 40) % 2 == 0:
                draw.rectangle([side_x, y_pos, side_x + 30, y_pos + 30], fill=(15, 23, 42))
                draw.rectangle([side_x + 6, y_pos + 6, side_x + 24, y_pos + 24], fill=(6, 182, 212))
            else:
                draw.ellipse([side_x, y_pos, side_x + 30, y_pos + 30], fill=(99, 102, 241))
                draw.ellipse([side_x + 8, y_pos + 8, side_x + 22, y_pos + 22], fill=(255, 255, 255))

    # 6. Bottom Banner & Instructions
    draw.rectangle([140, height - 130, width - 140, height - 50], fill=(15, 23, 42))
    draw.rectangle([144, height - 126, width - 144, height - 54], outline=(99, 102, 241), width=3)
    
    draw.text((width // 2, height - 100), url, fill=(6, 182, 212), font=font_bold, anchor="mm")
    draw.text((width // 2, height - 72), "1. Scan QR with Camera  ➔  2. Point Camera at Target", fill=(255, 255, 255), font=font_sub, anchor="mm")

    # Save final target image
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, "PNG", quality=100)
    print(f"Target PNG created successfully at {output_path}")

if __name__ == "__main__":
    create_ar_qr_target()

import os
from PIL import Image, ImageDraw, ImageFont

def generate_invitation_card(
    border_path="assets/Border of card.png",
    logo_path="assets/shivam_logo.png",
    qr_path="assets/target.png",
    output_path="assets/invitation_card.png"
):
    print("Generating Shivam Jewels Invitation Card using Python...")

    # Load border image to determine dimensions
    if os.path.exists(border_path):
        border_img = Image.open(border_path).convert("RGBA")
        width, height = border_img.size
    else:
        width, height = 1080, 1500
        border_img = None

    print(f"Canvas resolution: {width}x{height}")

    # 1. Create luxury dark navy background canvas (#0a1124)
    canvas = Image.new("RGBA", (width, height), (10, 17, 36, 255))

    # Add radial lighting gradient effect in center
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    center_x, center_y = width // 2, height // 2
    max_r = max(width, height) // 1.2
    
    for r in range(int(max_r), 0, -20):
        alpha = int(28 * (1 - r / max_r))
        overlay_draw.ellipse(
            [center_x - r, center_y - r, center_x + r, center_y + r],
            fill=(30, 58, 108, alpha)
        )
    canvas = Image.alpha_composite(canvas, overlay)
    draw = ImageDraw.Draw(canvas)

    # 2. Paste Border of card.png
    if border_img:
        canvas = Image.alpha_composite(canvas, border_img)
        draw = ImageDraw.Draw(canvas)

    # 3. Load & Process Shivam Logo (Convert dark text to bright white/silver)
    if os.path.exists(logo_path):
        logo_img = Image.open(logo_path).convert("RGBA")
        logo_data = logo_img.getdata()
        new_logo_data = []
        for item in logo_data:
            if item[3] > 20: # Visible pixel
                new_logo_data.append((255, 255, 255, item[3]))
            else:
                new_logo_data.append((0, 0, 0, 0))
        logo_img.putdata(new_logo_data)

        # Scale logo to ~54% width of canvas
        logo_w = int(width * 0.54)
        aspect = logo_img.height / logo_img.width
        logo_h = int(logo_w * aspect)
        logo_resized = logo_img.resize((logo_w, logo_h), Image.Resampling.LANCZOS)

        # Paste logo at top section
        logo_x = (width - logo_w) // 2
        logo_y = int(height * 0.12)
        canvas.paste(logo_resized, (logo_x, logo_y), logo_resized)

    # 4. Load & Process QR target code
    if os.path.exists(qr_path):
        qr_img = Image.open(qr_path).convert("RGBA")

        # Create a sleek rounded white card backing container for the QR code
        qr_size = int(width * 0.44)
        qr_x = (width - qr_size) // 2
        qr_y = int(height * 0.38)

        pad = int(width * 0.035)
        bg_box = [qr_x - pad, qr_y - pad, qr_x + qr_size + pad, qr_y + qr_size + pad]
        
        # Outer glow border
        draw.rounded_rectangle(
            [bg_box[0]-4, bg_box[1]-4, bg_box[2]+4, bg_box[3]+4],
            radius=20,
            fill=(56, 189, 248, 140)
        )
        # Inner solid white card
        draw.rounded_rectangle(
            bg_box,
            radius=16,
            fill=(255, 255, 255, 255)
        )

        qr_resized = qr_img.resize((qr_size, qr_size), Image.Resampling.LANCZOS)
        canvas.paste(qr_resized, (qr_x, qr_y), qr_resized)

    # 5. Add Typography & Text Annotations
    try:
        font_sub = ImageFont.truetype("arial.ttf", int(height * 0.020))
        font_title = ImageFont.truetype("arial.ttf", int(height * 0.026))
        font_bold = ImageFont.truetype("arialbd.ttf", int(height * 0.022))
        font_small = ImageFont.truetype("arial.ttf", int(height * 0.016))
    except Exception:
        font_sub = font_title = font_bold = font_small = ImageFont.load_default()

    # Header invitation text below logo
    header_text = "YOU ARE CORDIALLY INVITED TO"
    bbox = draw.textbbox((0, 0), header_text, font=font_small)
    tw = bbox[2] - bbox[0]
    draw.text(((width - tw) // 2, int(height * 0.26)), header_text, fill=(186, 230, 253, 255), font=font_small)

    title_text = "WEBAR 3D EXHIBITION"
    bbox = draw.textbbox((0, 0), title_text, font=font_title)
    tw = bbox[2] - bbox[0]
    draw.text(((width - tw) // 2, int(height * 0.30)), title_text, fill=(255, 255, 255, 255), font=font_title)

    # Instruction below QR Code
    scan_instruction = "SCAN QR CODE WITH CAMERA"
    bbox = draw.textbbox((0, 0), scan_instruction, font=font_bold)
    tw = bbox[2] - bbox[0]
    draw.text(((width - tw) // 2, int(height * 0.74)), scan_instruction, fill=(56, 189, 248, 255), font=font_bold)

    sub_instruction = "To Reveal Interactive 3D Diamond Experience"
    bbox = draw.textbbox((0, 0), sub_instruction, font=font_sub)
    tw = bbox[2] - bbox[0]
    draw.text(((width - tw) // 2, int(height * 0.79)), sub_instruction, fill=(226, 232, 240, 255), font=font_sub)

    footer_text = "SHIVAM JEWELS  •  SJAR.VERCEL.APP"
    bbox = draw.textbbox((0, 0), footer_text, font=font_small)
    tw = bbox[2] - bbox[0]
    draw.text(((width - tw) // 2, int(height * 0.88)), footer_text, fill=(148, 163, 184, 255), font=font_small)

    # 6. Save final high-res PNG image
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    canvas_rgb = Image.new("RGB", canvas.size, (10, 17, 36))
    canvas_rgb.paste(canvas, mask=canvas.split()[3])
    canvas_rgb.save(output_path, "PNG", quality=100)
    
    # Save second copy as Shivam_Jewels_Invitation_Card.png
    alt_output = os.path.join(os.path.dirname(output_path), "Shivam_Jewels_Invitation_Card.png")
    canvas_rgb.save(alt_output, "PNG", quality=100)

    print(f"Successfully generated invitation card at:\n- {output_path}\n- {alt_output}")

if __name__ == "__main__":
    generate_invitation_card()

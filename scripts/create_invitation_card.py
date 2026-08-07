import os
from PIL import Image, ImageDraw, ImageFont

def generate_invitation_cards(
    border_path="assets/Border of card.png",
    logo_path="assets/shivam_logo.png",
    qr_path="assets/target.png",
    output_card="assets/Shivam_Jewels_Invitation_Card.png",
    output_shape="assets/Shivam_Jewels_Card_Shape.png"
):
    print("Generating High-Definition Shivam Jewels Target Reference Cards...")

    width, height = 1080, 1500

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

    # 2. Resize and paste Border of card.png
    if os.path.exists(border_path):
        border_img = Image.open(border_path).convert("RGBA")
        border_resized = border_img.resize((width, height), Image.Resampling.LANCZOS)
        canvas = Image.alpha_composite(canvas, border_resized)
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

        # Scale logo to ~65% width of canvas
        logo_w = int(width * 0.65)
        aspect = logo_img.height / logo_img.width
        logo_h = int(logo_w * aspect)
        logo_resized = logo_img.resize((logo_w, logo_h), Image.Resampling.LANCZOS)

        # Paste logo at top section
        logo_x = (width - logo_w) // 2
        logo_y = int(height * 0.08)
        canvas.paste(logo_resized, (logo_x, logo_y), logo_resized)

    # 4. Add Typography & Text Annotations
    try:
        font_sub = ImageFont.truetype("arial.ttf", int(height * 0.020))
        font_title = ImageFont.truetype("arial.ttf", int(height * 0.026))
        font_bold = ImageFont.truetype("arialbd.ttf", int(height * 0.022))
        font_small = ImageFont.truetype("arial.ttf", int(height * 0.016))
    except Exception:
        font_sub = font_title = font_bold = font_small = ImageFont.load_default()

    header_text = "YOU ARE CORDIALLY INVITED TO"
    bbox = draw.textbbox((0, 0), header_text, font=font_small)
    tw = bbox[2] - bbox[0]
    draw.text(((width - tw) // 2, int(height * 0.26)), header_text, fill=(186, 230, 253, 255), font=font_small)

    title_text = "WEBAR 3D EXHIBITION"
    bbox = draw.textbbox((0, 0), title_text, font=font_title)
    tw = bbox[2] - bbox[0]
    draw.text(((width - tw) // 2, int(height * 0.30)), title_text, fill=(255, 255, 255, 255), font=font_title)

    scan_instruction = "SCAN CARD WITH CAMERA"
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

    # -------------------------------------------------------------------
    # SAVE IMAGE 1: SHAPE-ONLY CARD REFERENCE (WITHOUT QR CODE BOX)
    # Used for compiling targets.mind so MindAR feature points are extracted
    # ONLY from logo, border & line art (NEVER from QR code box)!
    # -------------------------------------------------------------------
    os.makedirs(os.path.dirname(output_shape), exist_ok=True)
    canvas_shape_rgb = Image.new("RGB", canvas.size, (10, 17, 36))
    canvas_shape_rgb.paste(canvas, mask=canvas.split()[3])
    canvas_shape_rgb.save(output_shape, "PNG", quality=100)
    print(f"Successfully generated Card Shape Target at: {output_shape}")

    # -------------------------------------------------------------------
    # SAVE IMAGE 2: FULL INVITATION CARD (WITH QR CODE BOX)
    # Printed invitation card image containing the QR code matrix
    # -------------------------------------------------------------------
    if os.path.exists(qr_path):
        qr_img = Image.open(qr_path).convert("RGBA")

        qr_size = int(width * 0.46)
        qr_x = (width - qr_size) // 2
        qr_y = int(height * 0.38)

        pad = int(width * 0.035)
        bg_box = [qr_x - pad, qr_y - pad, qr_x + qr_size + pad, qr_y + qr_size + pad]
        
        draw.rounded_rectangle(
            [bg_box[0]-6, bg_box[1]-6, bg_box[2]+6, bg_box[3]+6],
            radius=24,
            fill=(56, 189, 248, 160)
        )
        draw.rounded_rectangle(
            bg_box,
            radius=20,
            fill=(255, 255, 255, 255)
        )

        qr_resized = qr_img.resize((qr_size, qr_size), Image.Resampling.LANCZOS)
        canvas.paste(qr_resized, (qr_x, qr_y), qr_resized)

    canvas_full_rgb = Image.new("RGB", canvas.size, (10, 17, 36))
    canvas_full_rgb.paste(canvas, mask=canvas.split()[3])
    canvas_full_rgb.save(output_card, "PNG", quality=100)
    print(f"Successfully generated Full Invitation Card at: {output_card}")

if __name__ == "__main__":
    generate_invitation_cards()

from PIL import Image
import os

def crop_target():
    img_path = "shivam_jewels_print_ready_card.jpg"
    if not os.path.exists(img_path):
        print(f"Error: {img_path} not found.")
        return

    img = Image.open(img_path)
    width, height = img.size
    print(f"Loaded image: {img_path} ({width}x{height})")

    # The QR code and rays are horizontally centered (X = 50%)
    # and located in the lower region (around Y = 70% from the top)
    cx = width // 2
    cy = int(height * 0.69)

    # Size of the crop box (capture the QR code and the outer circular dashed guide)
    # The rays extend to about 45% of the card's width
    crop_size = int(width * 0.46)
    half_size = crop_size // 2

    # Define crop bounding box [left, top, right, bottom]
    box = [
        max(0, cx - half_size),
        max(0, cy - half_size),
        min(width, cx + half_size),
        min(height, cy + half_size)
    ]

    cropped_img = img.crop(box)
    output_path = "shivam_jewels_rays_target.png"
    cropped_img.save(output_path, "PNG")
    print(f"Successfully cropped target image saved as: {output_path} ({cropped_img.width}x{cropped_img.height})")

if __name__ == "__main__":
    crop_target()

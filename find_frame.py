from PIL import Image

def find_gold_frame(image_path):
    img = Image.open(image_path).convert("RGB")
    width, height = img.size
    print(f"Image dimensions: {width}x{height}")
    
    # We look for gold-ish pixels. Gold in RGB is around R > 180, G > 140, B < 100
    # Let's search in the bottom third of the image (height * 2/3 to height)
    start_y = int(height * 0.6)
    
    gold_pixels = []
    for y in range(start_y, height):
        for x in range(width):
            r, g, b = img.getpixel((x, y))
            # Gold color detection threshold
            if r > 180 and g > 130 and b < 110:
                gold_pixels.append((x, y))
                
    if not gold_pixels:
        print("No gold pixels detected. Let's dump coordinates and sample RGB values from the bottom.")
        # Print sample colors along the vertical center line in the bottom area
        center_x = width // 2
        for y in range(int(height * 0.7), height, 20):
            print(f"y={y}: {img.getpixel((center_x, y))}")
        return None
        
    # Get bounding box of all gold pixels in the bottom region
    xs = [p[0] for p in gold_pixels]
    ys = [p[1] for p in gold_pixels]
    
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    
    print(f"Detected gold region: X=[{min_x}, {max_x}] (width={max_x - min_x}), Y=[{min_y}, {max_y}] (height={max_y - min_y})")
    
    # Let's find the empty space inside the gold region (inner frame)
    # The gold frame has a border. Let's sample colors inside this box to find the frame center.
    print(f"Suggested QR code center: X={(min_x + max_x) // 2}, Y={(min_y + max_y) // 2}")
    
if __name__ == "__main__":
    find_gold_frame("Invitation card.png")

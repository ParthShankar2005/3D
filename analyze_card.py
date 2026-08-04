from PIL import Image
import numpy as np

def analyze_card_structure(image_path):
    img = Image.open(image_path).convert("L") # Convert to grayscale
    w, h = img.size
    
    # Analyze the bottom portion of the image
    bottom_start_y = int(h * 0.6)
    bottom_img = img.crop((0, bottom_start_y, w, h))
    arr = np.array(bottom_img)
    
    # Calculate row-wise and column-wise averages
    row_avgs = np.mean(arr, axis=1)
    col_avgs = np.mean(arr, axis=0)
    
    # Let's print out the row averages and column averages to find the frame
    # A white frame/box will have a high average compared to a dark background
    print("Row averages in bottom part (every 10 pixels):")
    for idx, avg in enumerate(row_avgs[::10]):
        y_coord = bottom_start_y + idx * 10
        print(f"y={y_coord}: avg={avg:.2f}")
        
    print("\nColumn averages (every 10 pixels):")
    for idx, avg in enumerate(col_avgs[::10]):
        x_coord = idx * 10
        print(f"x={x_coord}: avg={avg:.2f}")

if __name__ == "__main__":
    analyze_card_structure("Invitation card.png")

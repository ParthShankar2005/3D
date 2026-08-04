from PIL import Image, ImageFilter
import numpy as np

def find_rectangular_frame(image_path):
    img = Image.open(image_path).convert("L")
    w, h = img.size
    
    # Focus on the bottom half of the image
    bottom_start_y = int(h * 0.5)
    bottom_img = img.crop((0, bottom_start_y, w, h))
    
    # Run a simple edge detection filter
    edges = bottom_img.filter(ImageFilter.FIND_EDGES)
    arr = np.array(edges)
    
    # We want to find a box. A box has horizontal and vertical lines.
    # Let's project the edges horizontally and vertically
    horizontal_proj = np.sum(arr, axis=1)
    vertical_proj = np.sum(arr, axis=0)
    
    # Find local maxima (lines)
    threshold_h = np.max(horizontal_proj) * 0.4
    threshold_v = np.max(vertical_proj) * 0.4
    
    candidate_ys = [bottom_start_y + i for i, val in enumerate(horizontal_proj) if val > threshold_h]
    candidate_xs = [i for i, val in enumerate(vertical_proj) if val > threshold_v]
    
    print("Candidate Y-lines (relative to full image):", candidate_ys)
    print("Candidate X-lines:", candidate_xs)

if __name__ == "__main__":
    find_rectangular_frame("Invitation card.png")

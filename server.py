import os
from typing import Optional
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3

# Initialize FastAPI App
app = FastAPI(
    title="Shivam Jewels WebAR RSVP & Guest Greeting API",
    description="Backend API to handle personalized greetings and guest RSVPs for the 80th Independence Day Invitation.",
    version="1.0.0"
)

# Enable CORS so the WebAR frontend (running on GitHub Pages or Vercel) can make API calls
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your GitHub Pages/Vercel domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_FILE = "guests.db"

# Database initialization
def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS guests (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            greeting TEXT NOT NULL,
            rsvp_status TEXT DEFAULT 'PENDING', -- PENDING, ATTENDING, DECLINED
            scan_count INTEGER DEFAULT 0,
            last_scanned TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

init_db()

# Pydantic Schemas
class GuestCreate(BaseModel):
    id: str  # Unique slug/ID (e.g., "parth-shankar")
    name: str
    greeting: str

class RSVPUpdate(BaseModel):
    status: str # ATTENDING or DECLINED

# Helper to get DB connection
def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

# --- API ENDPOINTS ---

@app.post("/api/guests", status_code=201, summary="Register a new guest with a personalized greeting")
def create_guest(guest: GuestCreate, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    try:
        cursor.execute(
            "INSERT INTO guests (id, name, greeting) VALUES (?, ?, ?)",
            (guest.id.lower().strip(), guest.name, guest.greeting)
        )
        db.commit()
        return {"status": "success", "message": f"Guest {guest.name} registered successfully."}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Guest ID already exists")

@app.get("/api/welcome/{guest_id}", summary="Get personalized greeting and log the card scan")
def get_greeting(guest_id: str, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    # Update scan count and return greeting
    cursor.execute(
        "UPDATE guests SET scan_count = scan_count + 1, last_scanned = datetime('now') WHERE id = ?",
        (guest_id.lower().strip(),)
    )
    db.commit()
    
    cursor.execute("SELECT id, name, greeting, rsvp_status, scan_count FROM guests WHERE id = ?", (guest_id.lower().strip(),))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Guest not found")
        
    return dict(row)

@app.post("/api/rsvp/{guest_id}", summary="Submit RSVP response")
def submit_rsvp(guest_id: str, rsvp: RSVPUpdate, db: sqlite3.Connection = Depends(get_db)):
    status = rsvp.status.upper()
    if status not in ["ATTENDING", "DECLINED"]:
        raise HTTPException(status_code=400, detail="Invalid RSVP status. Must be ATTENDING or DECLINED.")
        
    cursor = db.cursor()
    cursor.execute("SELECT id FROM guests WHERE id = ?", (guest_id.lower().strip(),))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Guest not found")
        
    cursor.execute(
        "UPDATE guests SET rsvp_status = ? WHERE id = ?",
        (status, guest_id.lower().strip())
    )
    db.commit()
    return {"status": "success", "rsvp_status": status}

@app.get("/api/dashboard", summary="Administrator dashboard metrics")
def get_dashboard(db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    
    # Total guests
    cursor.execute("SELECT COUNT(*) FROM guests")
    total = cursor.fetchone()[0]
    
    # RSVPs
    cursor.execute("SELECT COUNT(*) FROM guests WHERE rsvp_status = 'ATTENDING'")
    attending = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM guests WHERE rsvp_status = 'DECLINED'")
    declined = cursor.fetchone()[0]
    
    # Scanned cards
    cursor.execute("SELECT COUNT(*) FROM guests WHERE scan_count > 0")
    scanned = cursor.fetchone()[0]
    
    cursor.execute("SELECT id, name, rsvp_status, scan_count, last_scanned FROM guests ORDER BY last_scanned DESC LIMIT 20")
    recent_scans = [dict(row) for row in cursor.fetchall()]
    
    return {
        "total_guests": total,
        "attending": attending,
        "declined": declined,
        "scanned_cards": scanned,
        "recent_scans": recent_scans
    }

if __name__ == "__main__":
    import uvicorn
    # Pre-populate sample guest for demonstration
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("INSERT OR IGNORE INTO guests (id, name, greeting) VALUES (?, ?, ?)", 
                   ("vip-guest", "Mr. Shankar", "We are deeply honored to invite you to celebrate 80 years of Indian Independence and Shivam Jewels' legacy of fine diamonds."))
    conn.commit()
    conn.close()
    
    print("Starting FastAPI Backend Server on port 8080...")
    uvicorn.run(app, host="0.0.0.0", port=8080)

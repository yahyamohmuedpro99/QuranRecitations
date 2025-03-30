from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import random

# Import models, schemas, and database functions using relative paths
from .database import get_db, create_db_tables, SessionLocal # Use relative import
from .models import Juz, Surah, Recitation # Use relative import
from .schemas.surah import SurahInfo, SurahListResponse, SurahBase # Use relative import
from .schemas.recitation import RecitationCreate, RecitationResponse # Use relative import
from .schemas.general import JuzData, SurahData, RandomResponse # Use relative import

app = FastAPI(title="Quran Recitations API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables on startup (optional, can be handled by Alembic/migrations)
# Consider moving this to a separate script or using a migration tool like Alembic
# For simplicity during development, we can call it here.
# create_db_tables()


# API endpoints
# Removed the root API endpoint to allow serving index.html at "/"

# --- Juz Endpoints ---
@app.get("/juz/{juz_id}", response_model=JuzData)
def get_juz_details(juz_id: int, db: Session = Depends(get_db)):
    juz = db.query(Juz).filter(Juz.number == juz_id).options(
        joinedload(Juz.surahs),
        joinedload(Juz.recitations).joinedload(Recitation.surah) # Load surah for recitation if exists
    ).first()
    if not juz:
        raise HTTPException(status_code=404, detail="Juz not found")

    # Prepare SurahInfo list
    surah_infos = []
    if juz.surahs:
        for s in juz.surahs:
            # Fetch full surah details if needed, or assume they are loaded
            # For simplicity, we map directly if fields exist
             surah_infos.append(SurahInfo(
                 id=s.id,
                 number=s.number,
                 name=s.name,
                 name_arabic=s.name_arabic,
                 translation_en=getattr(s, 'translation_en', None), # Use getattr for safety
                 verses_count=getattr(s, 'verses_count', None)
             ))

    # Prepare RecitationResponse list
    recitation_responses = []
    if juz.recitations:
        recitation_responses = [RecitationResponse.from_orm(r) for r in juz.recitations]


    return JuzData(surahs=surah_infos, recitations=recitation_responses)


# --- Surah Endpoints ---
@app.get("/surahs", response_model=List[SurahListResponse])
def get_surah_list(db: Session = Depends(get_db)):
    surahs = db.query(Surah).order_by(Surah.number).all()
    # Return id, name, and name_arabic
    return [{"id": s.id, "name": s.name, "name_arabic": s.name_arabic} for s in surahs]


@app.get("/surah/{surah_id}", response_model=SurahData)
def get_surah_details(surah_id: int, db: Session = Depends(get_db)):
    surah = db.query(Surah).filter(Surah.id == surah_id).options(
        joinedload(Surah.recitations).joinedload(Recitation.surah) # Eager load recitations and their surahs
    ).first()
    if not surah:
        raise HTTPException(status_code=404, detail="Surah not found")

    surah_info = SurahInfo.from_orm(surah)
    recitation_responses = [RecitationResponse.from_orm(r) for r in surah.recitations]

    return SurahData(info=surah_info, recitations=recitation_responses)


# --- Recitation Endpoints ---
@app.post("/recitations", response_model=RecitationResponse, status_code=201)
def add_recitation(recitation: RecitationCreate, db: Session = Depends(get_db)):
    if not recitation.surah_id and not recitation.juz_id:
         raise HTTPException(status_code=400, detail="Either surah_id or juz_id must be provided")
    if recitation.surah_id and recitation.juz_id:
         raise HTTPException(status_code=400, detail="Provide either surah_id or juz_id, not both")

    # Check if Surah or Juz exists
    if recitation.surah_id:
        surah = db.query(Surah).filter(Surah.id == recitation.surah_id).first()
        if not surah:
            raise HTTPException(status_code=404, detail=f"Surah with id {recitation.surah_id} not found")
    if recitation.juz_id:
        juz = db.query(Juz).filter(Juz.number == recitation.juz_id).first() # Assuming juz_id from frontend is the number
        if not juz:
             raise HTTPException(status_code=404, detail=f"Juz with number {recitation.juz_id} not found")
        # Use the actual Juz ID from the database if found
        db_juz_id = juz.id
    else:
        db_juz_id = None

    # Check if URL already exists
    existing_recitation = db.query(Recitation).filter(Recitation.url == recitation.url).first()
    if existing_recitation:
        raise HTTPException(status_code=409, detail="التلاوة موجودة مسبقًا") # "Recitation already exists" in Arabic

    db_recitation = Recitation(
        url=recitation.url,
        reciter_name=recitation.reciter_name,
        surah_id=recitation.surah_id,
        juz_id=db_juz_id # Use the fetched Juz ID
    )
    db.add(db_recitation)
    db.commit()
    db.refresh(db_recitation)
    # Eager load surah relationship for the response if it exists
    if db_recitation.surah_id:
        db.refresh(db_recitation, attribute_names=['surah'])

    return RecitationResponse.from_orm(db_recitation)

# New endpoint for most liked recitations
@app.get("/recitations/most-liked", response_model=List[RecitationResponse])
def get_most_liked_recitations(limit: int = 50, db: Session = Depends(get_db)): # Add optional limit
    recitations = db.query(Recitation).options(
        joinedload(Recitation.surah), # Eager load related data for context
        joinedload(Recitation.juz)
    ).order_by(Recitation.likes.desc()).limit(limit).all()
    return [RecitationResponse.from_orm(r) for r in recitations]


@app.post("/recitations/{recitation_id}/like", response_model=RecitationResponse)
def like_recitation(recitation_id: int, db: Session = Depends(get_db)):
    recitation = db.query(Recitation).filter(Recitation.id == recitation_id).options(
        joinedload(Recitation.surah), # Eager load related data for response
        joinedload(Recitation.juz)
    ).first()
    if not recitation:
        raise HTTPException(status_code=404, detail="Recitation not found")

    recitation.likes += 1
    db.commit()
    db.refresh(recitation)
    # No need to refresh relationships again if already eager loaded

    return RecitationResponse.from_orm(recitation)

# --- Search Endpoint ---
@app.get("/recitations/search", response_model=List[RecitationResponse])
def search_recitations(q: str, db: Session = Depends(get_db)):
    if not q:
        return [] # Return empty list if query is empty

    search_term = f"%{q.lower()}%" # Prepare for case-insensitive partial matching

    # Query recitations matching reciter name, URL, or associated Surah name/arabic name
    recitations = db.query(Recitation).outerjoin(Surah).options(
        joinedload(Recitation.surah), # Eager load related data
        joinedload(Recitation.juz)
    ).filter(
        Recitation.reciter_name.ilike(search_term) |
        Recitation.url.ilike(search_term) |
        Surah.name.ilike(search_term) |
        Surah.name_arabic.ilike(search_term)
        # Note: Searching by Juz number directly isn't included here,
        # but Juz recitations can be found via reciter/url.
    ).order_by(Recitation.likes.desc()).limit(50).all() # Limit results

    return [RecitationResponse.from_orm(r) for r in recitations]


# --- Random Endpoint ---
# Updated to return a single random recitation
@app.get("/random", response_model=RecitationResponse)
def get_random_recitation(db: Session = Depends(get_db)):
    recitation_count = db.query(Recitation).count()
    if recitation_count == 0:
        raise HTTPException(status_code=404, detail="No recitations found in the database")

    random_offset = random.randint(0, recitation_count - 1)
    random_recitation = db.query(Recitation).options(
        joinedload(Recitation.surah), # Eager load surah if it's a surah recitation
        joinedload(Recitation.juz)    # Eager load juz if it's a juz recitation
    ).offset(random_offset).first()

    if not random_recitation:
         # Should not happen if count > 0, but handle defensively
         raise HTTPException(status_code=500, detail="Could not retrieve random recitation")

    # Use the existing RecitationResponse schema
    return RecitationResponse.from_orm(random_recitation)


# --- Static Files Serving ---
# Define the path to the frontend directory relative to this backend script
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
static_dir = os.path.join(frontend_dir) # Base directory for static files

# Serve index.html for the root path explicitly BEFORE mounting static files
@app.get("/", response_class=FileResponse, include_in_schema=False)
async def serve_index_at_root():
    index_path = os.path.join(frontend_dir, "index.html")
    if not os.path.exists(index_path):
        raise HTTPException(status_code=404, detail="Frontend index.html not found")
    return FileResponse(index_path)

# Mount static files (like CSS, JS) - this should be done near the end
# This handles requests like /src/main.js, /styles/main.css
if os.path.isdir(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static_frontend_assets") # Mount under /static
else:
     print(f"Warning: Frontend directory not found at {static_dir}. Static file serving disabled.")

# Catch-all route for SPA routing - MUST BE LAST
# Serve index.html for any path not caught by API routes or static files mount
@app.get("/{full_path:path}", response_class=FileResponse, include_in_schema=False)
async def serve_spa_catch_all(full_path: str):
    index_path = os.path.join(frontend_dir, "index.html")
    if not os.path.exists(index_path):
        raise HTTPException(status_code=404, detail="Frontend index.html not found")
    return FileResponse(index_path)


# Run the application
if __name__ == "__main__":
    import uvicorn
    # Ensure reload is False or handled carefully in production
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000) # Reference app correctly for uvicorn

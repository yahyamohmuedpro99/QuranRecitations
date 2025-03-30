from pydantic import BaseModel
from typing import Optional
from .surah import SurahBase # Import SurahBase for relationship

# --- Base Models ---
class RecitationBase(BaseModel):
    url: str
    reciter_name: str

# --- Request Models ---
class RecitationCreate(RecitationBase):
    surah_id: Optional[int] = None
    juz_id: Optional[int] = None
    # Frontend might send 'type', but backend expects surah_id or juz_id

# --- Response Models ---
class RecitationResponse(RecitationBase):
    id: int
    likes: int
    surah_id: Optional[int]
    juz_id: Optional[int] = None
    surah: Optional[SurahBase] = None # Include basic Surah info if available

    class Config:
        from_attributes = True # Changed from orm_mode for Pydantic v2

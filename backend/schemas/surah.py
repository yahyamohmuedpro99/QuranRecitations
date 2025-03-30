from pydantic import BaseModel
from typing import Optional, List

# --- Base Models ---
class SurahBase(BaseModel):
    id: int
    number: int
    name: str
    name_arabic: Optional[str] = None

    class Config:
        from_attributes = True # Changed from orm_mode for Pydantic v2

class SurahInfo(SurahBase): # For detailed Surah view
    translation_en: Optional[str] = None
    verses_count: Optional[int] = None

# --- Response Models ---
class SurahListResponse(BaseModel):
    id: int
    name: str
    name_arabic: Optional[str] = None # Add Arabic name

# Forward references will be handled later if needed for complex relationships
# For now, keep RecitationResponse definition separate

from pydantic import BaseModel
from typing import List
from .surah import SurahInfo
from .recitation import RecitationResponse

class JuzData(BaseModel):
    surahs: List[SurahInfo] = []
    recitations: List[RecitationResponse] = []

class SurahData(BaseModel):
    info: SurahInfo
    recitations: List[RecitationResponse] = []

class RandomResponse(BaseModel):
    type: str # 'juz' or 'surah'
    id: int

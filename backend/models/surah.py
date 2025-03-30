from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base

class Surah(Base):
    __tablename__ = "surah"
    id = Column(Integer, primary_key=True, index=True)
    number = Column(Integer, unique=True, index=True)
    name = Column(String, index=True)
    name_arabic = Column(String)
    translation_en = Column(String) # Added for Surah info
    verses_count = Column(Integer) # Added for Surah info
    juz_id = Column(Integer, ForeignKey("juz.id"))
    juz = relationship("Juz", back_populates="surahs")
    recitations = relationship("Recitation", back_populates="surah")

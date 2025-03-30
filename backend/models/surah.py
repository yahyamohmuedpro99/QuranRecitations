from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from .base import Base, surah_juz_association # Import the association table

class Surah(Base):
    __tablename__ = "surah"
    id = Column(Integer, primary_key=True, index=True)
    number = Column(Integer, unique=True, index=True)
    name = Column(String, index=True)
    name_arabic = Column(String)
    translation_en = Column(String) # Added for Surah info
    verses_count = Column(Integer) # Added for Surah info
    # Removed juz_id and direct juz relationship

    # Many-to-Many relationship with Juz
    juzs = relationship(
        "Juz",
        secondary=surah_juz_association,
        back_populates="surahs"
    )
    recitations = relationship("Recitation", back_populates="surah")

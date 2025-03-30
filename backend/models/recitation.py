from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base

class Recitation(Base):
    __tablename__ = "recitation"
    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, unique=True, index=True, nullable=False) # Added unique, index, nullable
    reciter_name = Column(String, index=True) # Added index for potential searching
    likes = Column(Integer, default=0, nullable=False) # Added nullable=False
    surah_id = Column(Integer, ForeignKey("surah.id"))
    juz_id = Column(Integer, ForeignKey("juz.id"))
    surah = relationship("Surah", back_populates="recitations")
    juz = relationship("Juz", back_populates="recitations")

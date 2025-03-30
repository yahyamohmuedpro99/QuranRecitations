from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base

class Recitation(Base):
    __tablename__ = "recitation"
    id = Column(Integer, primary_key=True, index=True)
    url = Column(String)
    reciter_name = Column(String)
    likes = Column(Integer, default=0)
    surah_id = Column(Integer, ForeignKey("surah.id"))
    juz_id = Column(Integer, ForeignKey("juz.id"))
    surah = relationship("Surah", back_populates="recitations")
    juz = relationship("Juz", back_populates="recitations")

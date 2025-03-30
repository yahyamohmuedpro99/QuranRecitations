from sqlalchemy import Column, Integer
from sqlalchemy.orm import relationship
from .base import Base

class Juz(Base):
    __tablename__ = "juz"
    id = Column(Integer, primary_key=True, index=True)
    number = Column(Integer, unique=True, index=True)
    surahs = relationship("Surah", back_populates="juz")
    recitations = relationship("Recitation", back_populates="juz")

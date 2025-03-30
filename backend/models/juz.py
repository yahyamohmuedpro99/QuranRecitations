from sqlalchemy import Column, Integer
from sqlalchemy.orm import relationship
from .base import Base, surah_juz_association # Import the association table

class Juz(Base):
    __tablename__ = "juz"
    id = Column(Integer, primary_key=True, index=True)
    number = Column(Integer, unique=True, index=True)

    # Many-to-Many relationship with Surah
    surahs = relationship(
        "Surah",
        secondary=surah_juz_association,
        back_populates="juzs" # Matches the relationship name in Surah model
    )
    recitations = relationship("Recitation", back_populates="juz")

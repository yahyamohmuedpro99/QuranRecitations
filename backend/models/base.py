from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Table, Column, Integer, ForeignKey

Base = declarative_base()

# Association Table for Surah <-> Juz Many-to-Many relationship
surah_juz_association = Table(
    'surah_juz_association', Base.metadata,
    Column('surah_id', Integer, ForeignKey('surah.id'), primary_key=True),
    Column('juz_id', Integer, ForeignKey('juz.id'), primary_key=True)
)

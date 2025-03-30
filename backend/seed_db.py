import json
import os
from sqlalchemy.orm import Session
# Use relative imports as it's inside the 'backend' package
from .database import SessionLocal, engine, create_db_tables
from .models import Base, Juz, Surah, Recitation

# Define the path to the surah.json file relative to this script's directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SURAH_JSON_PATH = os.path.join(BASE_DIR, 'surah.json')

def seed_database():
    print("Dropping existing tables (if any) and creating new ones...")
    # Drop all tables defined in Base metadata (use with caution in production)
    Base.metadata.drop_all(bind=engine)
    # Create tables defined in Base metadata
    create_db_tables()
    print("Tables created.")

    db: Session = SessionLocal()
    try:
        print("Seeding Juz data...")
        juz_objects = {}
        for i in range(1, 31):
            juz = Juz(number=i)
            db.add(juz)
            juz_objects[i] = juz
        db.commit() # Commit Juz first to get IDs
        print("Juz data seeded.")

        print(f"Loading Surah data from {SURAH_JSON_PATH}...")
        if not os.path.exists(SURAH_JSON_PATH):
            print(f"Error: {SURAH_JSON_PATH} not found.")
            return

        with open(SURAH_JSON_PATH, 'r', encoding='utf-8') as f:
            surahs_data = json.load(f)

        print("Seeding Surah data...")
        surah_objects = {}
        for surah_data in surahs_data:
            # Extract Juz number from the first entry in the 'juz' array
            juz_instance = None
            if 'juz' in surah_data and isinstance(surah_data['juz'], list) and len(surah_data['juz']) > 0:
                first_juz_info = surah_data['juz'][0]
                if 'index' in first_juz_info:
                    try:
                        juz_num_str = first_juz_info['index']
                        juz_num = int(juz_num_str) # Convert Juz index string to int
                        juz_instance = juz_objects.get(juz_num)
                    except (ValueError, TypeError):
                        print(f"Warning: Could not parse Juz number '{first_juz_info.get('index')}' for Surah '{surah_data.get('title', 'N/A')}'")

            # Map JSON keys to SQLAlchemy model fields
            try:
                surah_number = int(surah_data['index']) # Convert Surah index string to int
                surah = Surah(
                    number=surah_number,
                    name=surah_data['title'], # Use 'title' for name
                    name_arabic=surah_data.get('titleAr', ''), # Use 'titleAr' for Arabic name
                    translation_en=surah_data.get('translation_en'), # Get translation if exists, else None
                    verses_count=surah_data.get('count', 0), # Use 'count' for verses_count
                    juz=juz_instance # Assign the relationship to the first Juz found
                )
                db.add(surah)
                surah_objects[surah.number] = surah # Store for linking recitations
            except KeyError as e:
                 print(f"Error processing Surah data: Missing key {e} in record {surah_data}")
            except ValueError:
                 print(f"Error processing Surah data: Could not convert index '{surah_data.get('index')}' to integer for Surah '{surah_data.get('title', 'N/A')}'")

        db.commit() # Commit Surahs
        print("Surah data seeded.")

        # Example: Add a sample recitation (replace with actual data loading if needed)
        print("Seeding sample Recitation data...")
        if 1 in surah_objects: # Check if Surah 1 (Al-Fatiha) exists
             recitation1 = Recitation(
                 url="https://example.com/recitation/al-fatiha.mp3",
                 reciter_name="Example Reciter",
                 surah=surah_objects[1], # Link to Surah Al-Fatiha
                 juz=juz_objects.get(1) # Link to Juz 1
             )
             db.add(recitation1)
             db.commit()
             print("Sample Recitation data seeded.")
        else:
             print("Surah 1 not found, skipping sample recitation seeding.")


        print("Database seeding completed successfully.")

    except Exception as e:
        print(f"An error occurred during seeding: {e}")
        db.rollback()
    finally:
        db.close()
        print("Database session closed.")

if __name__ == "__main__":
    seed_database()

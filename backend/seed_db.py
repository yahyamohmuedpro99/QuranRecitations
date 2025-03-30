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

        print("Seeding Surah data and Juz relationships...")
        surah_objects = {}
        for surah_data in surahs_data:
            try:
                surah_number = int(surah_data['index']) # Convert Surah index string to int
                surah = Surah(
                    number=surah_number,
                    name=surah_data['title'], # Use 'title' for name
                    name_arabic=surah_data.get('titleAr', ''), # Use 'titleAr' for Arabic name
                    translation_en=surah_data.get('translation_en'), # Get translation if exists, else None
                    verses_count=surah_data.get('count', 0) # Use 'count' for verses_count
                    # Don't assign juz directly here anymore
                )

                # Handle Many-to-Many relationship with Juz
                if 'juz' in surah_data and isinstance(surah_data['juz'], list):
                    for juz_info in surah_data['juz']:
                        if 'index' in juz_info:
                            try:
                                juz_num_str = juz_info['index']
                                juz_num = int(juz_num_str)
                                juz_instance = juz_objects.get(juz_num)
                                if juz_instance:
                                    surah.juzs.append(juz_instance) # Append Juz object to the relationship list
                                else:
                                     print(f"Warning: Juz number {juz_num} not found for Surah '{surah.name}'")
                            except (ValueError, TypeError):
                                print(f"Warning: Could not parse Juz number '{juz_info.get('index')}' for Surah '{surah.name}'")

                db.add(surah)
                surah_objects[surah.number] = surah # Store for linking recitations (if needed later)

            except KeyError as e:
                 print(f"Error processing Surah data: Missing key {e} in record {surah_data}")
            except ValueError:
                 print(f"Error processing Surah data: Could not convert index '{surah_data.get('index')}' to integer for Surah '{surah_data.get('title', 'N/A')}'")

        db.commit() # Commit Surahs and the association table entries
        print("Surah data and Juz relationships seeded.")


        db.commit()
        print("Sample Recitation data seeded.")
        # --- End Sample Recitations ---


        print("Database seeding completed successfully.")

    except Exception as e:
        print(f"An error occurred during seeding: {e}")
        db.rollback()
    finally:
        db.close()
        print("Database session closed.")

if __name__ == "__main__":
    seed_database()

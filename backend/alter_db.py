import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL:
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        cursor.execute("ALTER TABLE incidents ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending'")
        conn.commit()
        print("Successfully added status column.")
    except Exception as e:
        print("Error:", e)
    finally:
        if 'conn' in locals():
            conn.close()

from sqlalchemy import create_engine, text
from app.database import DATABASE_URL

def migrate():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE annotations ADD COLUMN note TEXT"))
            print("Added 'note' column to annotations table.")
        except Exception as e:
            print(f"Migration might have already run or failed: {e}")

if __name__ == "__main__":
    migrate()

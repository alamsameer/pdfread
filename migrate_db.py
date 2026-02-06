import sqlite3

db_path = 'docs.db'
print(f"Migrating {db_path}...")

try:
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    
    # Check if columns exist
    c.execute("PRAGMA table_info(annotations)")
    columns = [row[1] for row in c.fetchall()]
    
    if 'font_size' not in columns:
        print("Adding font_size column...")
        c.execute("ALTER TABLE annotations ADD COLUMN font_size VARCHAR")
    else:
        print("font_size column already exists.")

    if 'font_style' not in columns:
        print("Adding font_style column...")
        c.execute("ALTER TABLE annotations ADD COLUMN font_style VARCHAR")
    else:
        print("font_style column already exists.")
        
    conn.commit()
    conn.close()
    print("Migration complete.")
    
except Exception as e:
    print(f"Error: {e}")

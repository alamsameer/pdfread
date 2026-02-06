import sqlite3

db_path = 'docs.db'
print(f"Migrating {db_path} for Image Support...")

try:
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    
    # Check if columns exist
    c.execute("PRAGMA table_info(blocks)")
    columns = [row[1] for row in c.fetchall()]
    
    if 'block_type' not in columns:
        print("Adding block_type column...")
        c.execute("ALTER TABLE blocks ADD COLUMN block_type VARCHAR DEFAULT 'text'")
    else:
        print("block_type column already exists.")

    if 'image_path' not in columns:
        print("Adding image_path column...")
        c.execute("ALTER TABLE blocks ADD COLUMN image_path VARCHAR")
    else:
        print("image_path column already exists.")
        
    conn.commit()
    conn.close()
    print("Migration complete.")
    
except Exception as e:
    print(f"Error: {e}")

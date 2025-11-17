import sqlite3
import os

DATABASE_NAME = 'assistant.db'
DATABASE_PATH = os.path.join(os.path.dirname(__file__), DATABASE_NAME)

def init_db():
    print(f"Initializing database at: {DATABASE_PATH}")
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()

        # Read schema.sql and execute it
        schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
        with open(schema_path, 'r') as f:
            schema_script = f.read()
        cursor.executescript(schema_script)

        conn.commit()
        print("Database initialized successfully.")
    except sqlite3.Error as e:
        print(f"An error occurred during database initialization: {e}")
    finally:
        if conn:
            conn.close()

def get_db_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row # Access columns by name
    return conn

if __name__ == '__main__':
    # This allows running 'python database.py' to initialize the DB manually
    print("Running DB initialization directly...")
    init_db()

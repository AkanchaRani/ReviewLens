import sqlite3
from contextlib import closing
from pathlib import Path

from .schema import Analysis


class Cache:
    def __init__(self, path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with closing(sqlite3.connect(self.path)) as connection, connection:
            connection.execute("CREATE TABLE IF NOT EXISTS analyses (key TEXT PRIMARY KEY, value TEXT NOT NULL)")

    def get(self, key):
        with closing(sqlite3.connect(self.path)) as connection:
            row = connection.execute("SELECT value FROM analyses WHERE key = ?", (key,)).fetchone()
        return Analysis.model_validate_json(row[0]) if row else None

    def put(self, key, analysis):
        with closing(sqlite3.connect(self.path)) as connection, connection:
            connection.execute("INSERT OR REPLACE INTO analyses VALUES (?, ?)", (key, analysis.model_dump_json()))

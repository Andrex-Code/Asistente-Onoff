import json
import os
import sqlite3
from contextlib import contextmanager

BASE_DIR = os.path.dirname(__file__)
STORAGE_DIR = os.getenv("APP_STORAGE_DIR", os.path.join(BASE_DIR, "storage"))
UPLOADS_DIR = os.path.join(STORAGE_DIR, "uploads")
DB_PATH = os.path.join(STORAGE_DIR, "app.db")

LEGACY_DOCS_PATH = os.path.join(STORAGE_DIR, "documents.json")
LEGACY_CONFIG_PATH = os.path.join(STORAGE_DIR, "config.json")


def ensure_storage_dirs():
    os.makedirs(STORAGE_DIR, exist_ok=True)
    os.makedirs(UPLOADS_DIR, exist_ok=True)


@contextmanager
def get_connection():
    ensure_storage_dirs()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with get_connection() as conn:
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                stored_filename TEXT,
                total_chunks INTEGER NOT NULL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS topics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id TEXT NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                position INTEGER NOT NULL,
                FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS chunks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id TEXT NOT NULL,
                chunk_text TEXT NOT NULL,
                position INTEGER NOT NULL,
                FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                full_name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1,
                can_upload INTEGER NOT NULL DEFAULT 0,
                can_edit_documents INTEGER NOT NULL DEFAULT 0,
                can_delete_documents INTEGER NOT NULL DEFAULT 0,
                can_manage_users INTEGER NOT NULL DEFAULT 0,
                can_use_chat INTEGER NOT NULL DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login_at DATETIME
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                expires_at INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )

    _migrate_legacy_files_if_needed()


def _migrate_legacy_files_if_needed():
    with get_connection() as conn:
        existing_docs = conn.execute("SELECT COUNT(*) AS c FROM documents").fetchone()["c"]
        existing_settings = conn.execute("SELECT COUNT(*) AS c FROM settings").fetchone()["c"]

        if existing_docs == 0 and os.path.exists(LEGACY_DOCS_PATH):
            with open(LEGACY_DOCS_PATH, "r", encoding="utf-8") as f:
                legacy_documents = json.load(f)
            for doc in legacy_documents:
                doc_id = doc.get("id")
                filename = doc.get("filename", "documento.pdf")
                chunks = doc.get("chunks", [])
                topics = doc.get("topics", [])
                if not doc_id:
                    continue
                conn.execute(
                    "INSERT OR REPLACE INTO documents (id, filename, stored_filename, total_chunks) VALUES (?, ?, ?, ?)",
                    (doc_id, filename, None, len(chunks)),
                )
                conn.execute("DELETE FROM chunks WHERE document_id = ?", (doc_id,))
                conn.execute("DELETE FROM topics WHERE document_id = ?", (doc_id,))
                conn.executemany(
                    "INSERT INTO chunks (document_id, chunk_text, position) VALUES (?, ?, ?)",
                    [(doc_id, (chunk or "").strip(), idx) for idx, chunk in enumerate(chunks) if (chunk or "").strip()],
                )
                conn.executemany(
                    "INSERT INTO topics (document_id, title, content, position) VALUES (?, ?, ?, ?)",
                    [
                        (doc_id, (topic.get("title") or "").strip(), (topic.get("content") or "").strip(), idx)
                        for idx, topic in enumerate(topics)
                        if (topic.get("title") or "").strip() and (topic.get("content") or "").strip()
                    ],
                )

        if existing_settings == 0 and os.path.exists(LEGACY_CONFIG_PATH):
            with open(LEGACY_CONFIG_PATH, "r", encoding="utf-8") as f:
                legacy_config = json.load(f)
            for key, value in legacy_config.items():
                conn.execute(
                    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
                    (str(key), json.dumps(value, ensure_ascii=False)),
                )

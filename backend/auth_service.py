import os
import secrets
import time
from typing import Dict, Optional

import bcrypt

from db_service import get_connection, init_db

TOKEN_DURATION = 60 * 60 * 8  # 8 horas


def _admin_email() -> str:
    return os.getenv("ADMIN_EMAIL", "admin@admin.com").strip().lower()


def _admin_name() -> str:
    return os.getenv("ADMIN_NAME", "Administrador").strip() or "Administrador"


def _admin_password() -> str:
    return os.getenv("ADMIN_PASSWORD", "123456")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except Exception:
        return False


def bootstrap_admin_user():
    init_db()
    email = _admin_email()
    with get_connection() as conn:
        existing = conn.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1").fetchone()
        if existing:
            return
        conn.execute(
            """
            INSERT INTO users (
                email, full_name, password_hash, role, is_active,
                can_upload, can_edit_documents, can_delete_documents, can_manage_users, can_use_chat
            ) VALUES (?, ?, ?, 'admin', 1, 1, 1, 1, 1, 1)
            """,
            (email, _admin_name(), hash_password(_admin_password())),
        )


def _row_to_user(row) -> Dict:
    return {
        "id": row["id"],
        "email": row["email"],
        "full_name": row["full_name"],
        "role": row["role"],
        "is_active": bool(row["is_active"]),
        "permissions": {
            "can_upload": bool(row["can_upload"]),
            "can_edit_documents": bool(row["can_edit_documents"]),
            "can_delete_documents": bool(row["can_delete_documents"]),
            "can_manage_users": bool(row["can_manage_users"]),
            "can_use_chat": bool(row["can_use_chat"]),
        },
        "created_at": row["created_at"],
        "last_login_at": row["last_login_at"],
    }


def get_user_by_email(email: str):
    init_db()
    with get_connection() as conn:
        return conn.execute(
            """
            SELECT id, email, full_name, password_hash, role, is_active, can_upload,
                   can_edit_documents, can_delete_documents, can_manage_users, can_use_chat,
                   created_at, last_login_at
            FROM users
            WHERE lower(email) = lower(?)
            """,
            (email.strip(),),
        ).fetchone()


def get_user_by_id(user_id: int):
    init_db()
    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT id, email, full_name, role, is_active, can_upload,
                   can_edit_documents, can_delete_documents, can_manage_users, can_use_chat,
                   created_at, last_login_at
            FROM users WHERE id = ?
            """,
            (user_id,),
        ).fetchone()
        return _row_to_user(row) if row else None


def create_token(user_id: int) -> str:
    token = secrets.token_hex(32)
    expires_at = int(time.time()) + TOKEN_DURATION
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
            (token, user_id, expires_at),
        )
    return token


def remove_token(token: str):
    with get_connection() as conn:
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))


def authenticate_user(email: str, password: str):
    row = get_user_by_email(email)
    if not row:
        return None
    if not bool(row["is_active"]):
        return None
    if not verify_password(password, row["password_hash"]):
        return None

    with get_connection() as conn:
        conn.execute(
            "UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?",
            (row["id"],),
        )

    user = get_user_by_id(row["id"])
    token = create_token(row["id"])
    return {"token": token, "user": user}


def validate_token(token: str):
    if not token:
        return None
    now = int(time.time())
    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT s.user_id, s.expires_at,
                   u.id, u.email, u.full_name, u.role, u.is_active, u.can_upload,
                   u.can_edit_documents, u.can_delete_documents, u.can_manage_users, u.can_use_chat,
                   u.created_at, u.last_login_at
            FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.token = ?
            """,
            (token,),
        ).fetchone()
        if not row:
            return None
        if row["expires_at"] < now or not bool(row["is_active"]):
            conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
            return None
    return _row_to_user(row)


def list_users():
    init_db()
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, email, full_name, role, is_active, can_upload,
                   can_edit_documents, can_delete_documents, can_manage_users, can_use_chat,
                   created_at, last_login_at
            FROM users
            ORDER BY created_at DESC, id DESC
            """
        ).fetchall()
    return [_row_to_user(row) for row in rows]


def _normalize_role(role: str) -> str:
    role_value = (role or "").strip().lower()
    if role_value not in {"admin", "asesor"}:
        return "asesor"
    return role_value


def _permissions_for_role(role: str, permissions: Optional[Dict] = None) -> Dict[str, bool]:
    if role == "admin":
        return {
            "can_upload": True,
            "can_edit_documents": True,
            "can_delete_documents": True,
            "can_manage_users": True,
            "can_use_chat": True,
        }

    permissions = permissions or {}
    return {
        "can_upload": bool(permissions.get("can_upload", False)),
        "can_edit_documents": bool(permissions.get("can_edit_documents", False)),
        "can_delete_documents": bool(permissions.get("can_delete_documents", False)),
        "can_manage_users": False,
        "can_use_chat": bool(permissions.get("can_use_chat", True)),
    }


def create_user(email: str, full_name: str, password: str, role: str, is_active: bool, permissions: Optional[Dict] = None):
    init_db()
    role_value = _normalize_role(role)
    perms = _permissions_for_role(role_value, permissions)
    with get_connection() as conn:
        exists = conn.execute("SELECT id FROM users WHERE lower(email) = lower(?)", (email.strip(),)).fetchone()
        if exists:
            raise ValueError("Ya existe un usuario con ese email.")

        conn.execute(
            """
            INSERT INTO users (
                email, full_name, password_hash, role, is_active,
                can_upload, can_edit_documents, can_delete_documents, can_manage_users, can_use_chat
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                email.strip().lower(),
                full_name.strip(),
                hash_password(password),
                role_value,
                1 if is_active else 0,
                1 if perms["can_upload"] else 0,
                1 if perms["can_edit_documents"] else 0,
                1 if perms["can_delete_documents"] else 0,
                1 if perms["can_manage_users"] else 0,
                1 if perms["can_use_chat"] else 0,
            ),
        )
        user_id = conn.execute("SELECT last_insert_rowid() AS id").fetchone()["id"]
    return get_user_by_id(user_id)


def update_user(user_id: int, full_name: str, role: str, is_active: bool, permissions: Optional[Dict] = None):
    init_db()
    role_value = _normalize_role(role)
    perms = _permissions_for_role(role_value, permissions)
    with get_connection() as conn:
        row = conn.execute("SELECT id, role FROM users WHERE id = ?", (user_id,)).fetchone()
        if not row:
            raise ValueError("Usuario no encontrado.")

        if row["role"] == "admin" and role_value != "admin":
            admin_count = conn.execute("SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND is_active = 1").fetchone()["c"]
            if admin_count <= 1:
                raise ValueError("No puedes dejar el sistema sin un admin activo.")

        conn.execute(
            """
            UPDATE users
            SET full_name = ?, role = ?, is_active = ?,
                can_upload = ?, can_edit_documents = ?, can_delete_documents = ?,
                can_manage_users = ?, can_use_chat = ?
            WHERE id = ?
            """,
            (
                full_name.strip(),
                role_value,
                1 if is_active else 0,
                1 if perms["can_upload"] else 0,
                1 if perms["can_edit_documents"] else 0,
                1 if perms["can_delete_documents"] else 0,
                1 if perms["can_manage_users"] else 0,
                1 if perms["can_use_chat"] else 0,
                user_id,
            ),
        )

        if not is_active:
            conn.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))

    return get_user_by_id(user_id)


def update_user_password(user_id: int, new_password: str):
    init_db()
    with get_connection() as conn:
        row = conn.execute("SELECT id FROM users WHERE id = ?", (user_id,)).fetchone()
        if not row:
            raise ValueError("Usuario no encontrado.")
        conn.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (hash_password(new_password), user_id),
        )
        conn.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))

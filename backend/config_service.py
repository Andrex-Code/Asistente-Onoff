import json

from db_service import get_connection, init_db

DEFAULT_CONFIG = {"chatbot_enabled": False}


def load_config():
    """Carga la configuracion desde SQLite."""
    init_db()
    config = DEFAULT_CONFIG.copy()
    with get_connection() as conn:
        rows = conn.execute("SELECT key, value FROM settings").fetchall()
        for row in rows:
            try:
                config[row["key"]] = json.loads(row["value"])
            except Exception:
                config[row["key"]] = row["value"]
    return config


def save_config(config):
    """Guarda la configuracion en SQLite."""
    init_db()
    with get_connection() as conn:
        for key, value in config.items():
            conn.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
                (str(key), json.dumps(value, ensure_ascii=False)),
            )


def update_config(chatbot_enabled):
    """Actualiza el estado del chatbot."""
    config = load_config()
    config["chatbot_enabled"] = chatbot_enabled
    save_config(config)
    return config

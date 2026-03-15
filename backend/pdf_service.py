import json
import os
import re
import uuid
from pypdf import PdfReader

from db_service import UPLOADS_DIR, get_connection, init_db

CHUNK_SIZE = 500  # palabras por chunk


def extract_text_from_pdf(file_bytes):
    """Extrae todo el texto de un archivo PDF preservando saltos de linea."""
    reader = PdfReader(file_bytes)
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n\n"
    return text.strip()


def _normalize_text(text):
    """Normaliza saltos de linea excesivos del PDF a maximo doble salto."""
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _is_numbered_heading(line):
    """Detecta lineas que son encabezados numerados: '1. Titulo', '2.- Titulo', etc."""
    stripped = line.strip()
    if not stripped:
        return False
    return bool(re.match(r"^\d+[\.\)\-]+\s+\S", stripped))


def extract_topics(text):
    """Extrae secciones/temas del texto basandose en encabezados numerados."""
    text = _normalize_text(text)
    lines = text.split("\n")

    topics = []
    current_title = None
    current_lines = []

    for raw_line in lines:
        line = raw_line.strip()

        if _is_numbered_heading(line):
            if current_title is not None:
                content = "\n".join(current_lines).strip()
                if content:
                    topics.append({
                        "title": current_title,
                        "content": content,
                    })
            current_title = line
            current_lines = []
        else:
            if current_title is not None:
                current_lines.append(raw_line)

    if current_title is not None:
        content = "\n".join(current_lines).strip()
        if content:
            topics.append({
                "title": current_title,
                "content": content,
            })

    if not topics:
        lines_clean = [l.strip() for l in text.split("\n") if l.strip()]
        if lines_clean:
            title = lines_clean[0][:60] + ("..." if len(lines_clean[0]) > 60 else "")
            topics.append({
                "title": title,
                "content": "\n".join(lines_clean[1:]) if len(lines_clean) > 1 else lines_clean[0],
            })

    return topics


def split_into_chunks(text, chunk_size=CHUNK_SIZE):
    """Divide el texto en fragmentos de N palabras preservando parrafos."""
    text = _normalize_text(text)
    paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
    chunks = []
    current_paragraphs = []
    current_word_count = 0

    for para in paragraphs:
        para_word_count = len(para.split())

        if current_word_count + para_word_count > chunk_size and current_paragraphs:
            chunks.append("\n\n".join(current_paragraphs))
            current_paragraphs = []
            current_word_count = 0

        current_paragraphs.append(para)
        current_word_count += para_word_count

    if current_paragraphs:
        chunks.append("\n\n".join(current_paragraphs))

    return chunks


def _clean_topics(topics):
    clean_topics = []
    for topic in topics or []:
        title = str(topic.get("title", "")).strip()
        content = str(topic.get("content", "")).strip()
        if not title or not content:
            continue
        clean_topics.append(
            {
                "title": title,
                "content": content,
            }
        )
    return clean_topics


def _save_document(doc_id, filename, stored_filename, topics):
    safe_filename = os.path.basename(filename).strip() or "documento"
    clean_topics = _clean_topics(topics)
    if not clean_topics:
        return None

    full_text = "\n\n".join(
        f'{topic["title"]}\n\n{topic["content"]}' for topic in clean_topics
    )
    chunks = split_into_chunks(full_text)

    with get_connection() as conn:
        conn.execute(
            "INSERT INTO documents (id, filename, stored_filename, total_chunks) VALUES (?, ?, ?, ?)",
            (doc_id, safe_filename, stored_filename, len(chunks)),
        )
        conn.executemany(
            "INSERT INTO chunks (document_id, chunk_text, position) VALUES (?, ?, ?)",
            [(doc_id, chunk, idx) for idx, chunk in enumerate(chunks)],
        )
        conn.executemany(
            "INSERT INTO topics (document_id, title, content, position) VALUES (?, ?, ?, ?)",
            [(doc_id, topic["title"], topic["content"], idx) for idx, topic in enumerate(clean_topics)],
        )

    return {
        "id": doc_id,
        "filename": safe_filename,
        "total_chunks": len(chunks),
        "total_topics": len(clean_topics),
    }


def load_documents():
    """Carga documentos desde SQLite incluyendo chunks y topics."""
    init_db()
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT id, filename, stored_filename, total_chunks FROM documents ORDER BY created_at DESC, id DESC"
        ).fetchall()
        documents = []
        for row in rows:
            chunks = conn.execute(
                "SELECT chunk_text FROM chunks WHERE document_id = ? ORDER BY position ASC",
                (row["id"],),
            ).fetchall()
            topics = conn.execute(
                "SELECT title, content FROM topics WHERE document_id = ? ORDER BY position ASC",
                (row["id"],),
            ).fetchall()
            documents.append(
                {
                    "id": row["id"],
                    "filename": row["filename"],
                    "stored_filename": row["stored_filename"],
                    "total_chunks": row["total_chunks"],
                    "chunks": [c["chunk_text"] for c in chunks],
                    "topics": [{"title": t["title"], "content": t["content"]} for t in topics],
                }
            )
        return documents


def process_pdf(file_bytes, filename, original_bytes=None):
    """Procesa un PDF: extrae texto, divide en chunks, extrae temas y guarda en SQLite."""
    init_db()
    text = extract_text_from_pdf(file_bytes)
    if not text:
        return None

    topics = extract_topics(text)
    doc_id = str(uuid.uuid4())
    safe_filename = os.path.basename(filename)
    stored_filename = f"{doc_id}.pdf"
    stored_path = os.path.join(UPLOADS_DIR, stored_filename)

    if original_bytes:
        with open(stored_path, "wb") as f:
            f.write(original_bytes)

    return _save_document(doc_id, safe_filename, stored_filename if original_bytes else None, topics)


def process_structured_payload(file_bytes, filename):
    """Procesa un archivo JSON con documentos y temas estructurados."""
    init_db()

    try:
        payload = json.loads(file_bytes.decode("utf-8"))
    except UnicodeDecodeError as exc:
        raise ValueError("El archivo JSON debe estar codificado en UTF-8.") from exc
    except json.JSONDecodeError as exc:
        raise ValueError("El archivo JSON no tiene un formato valido.") from exc

    if isinstance(payload, dict):
        documents = payload.get("documents")
        if documents is None:
            documents = [payload]
    elif isinstance(payload, list):
        documents = payload
    else:
        raise ValueError("El JSON debe ser un objeto o una lista de documentos.")

    created_documents = []
    for idx, raw_doc in enumerate(documents, start=1):
        if not isinstance(raw_doc, dict):
            continue
        doc_filename = str(
            raw_doc.get("filename")
            or raw_doc.get("name")
            or f"{os.path.splitext(os.path.basename(filename))[0]}-{idx}"
        ).strip()
        topics = raw_doc.get("topics")
        if not isinstance(topics, list):
            continue
        created = _save_document(str(uuid.uuid4()), doc_filename, None, topics)
        if created:
            created_documents.append(created)

    if not created_documents:
        raise ValueError(
            "No se encontraron documentos validos. Usa el formato: {'documents':[{'filename':'...','topics':[{'title':'...','content':'...'}]}]}."
        )

    return {
        "documents": created_documents,
        "total_documents": len(created_documents),
        "total_topics": sum(doc["total_topics"] for doc in created_documents),
    }


def create_structured_document(filename, topics):
    """Crea un documento estructurado manualmente desde el panel de administracion."""
    init_db()
    created = _save_document(str(uuid.uuid4()), filename, None, topics)
    if not created:
        raise ValueError("Debes ingresar un nombre de documento y al menos un tema valido.")
    return created


def get_all_topics():
    """Retorna todos los temas de todos los documentos."""
    documents = load_documents()
    all_topics = []
    for doc in documents:
        for topic in doc.get("topics", []):
            if topic.get("title"):
                all_topics.append({
                    "document_id": doc["id"],
                    "filename": doc["filename"],
                    "title": topic["title"],
                    "content": topic["content"],
                })
    return all_topics


def delete_document(doc_id):
    """Elimina un documento por su ID. Retorna True si se elimino."""
    init_db()
    with get_connection() as conn:
        row = conn.execute(
            "SELECT stored_filename FROM documents WHERE id = ?",
            (doc_id,),
        ).fetchone()
        if not row:
            return False
        conn.execute("DELETE FROM chunks WHERE document_id = ?", (doc_id,))
        conn.execute("DELETE FROM topics WHERE document_id = ?", (doc_id,))
        conn.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
        stored_filename = row["stored_filename"]
        if stored_filename:
            stored_path = os.path.join(UPLOADS_DIR, stored_filename)
            if os.path.exists(stored_path):
                os.remove(stored_path)
    return True


def get_document_by_id(doc_id):
    """Retorna un documento por ID o None si no existe."""
    init_db()
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, filename, stored_filename, total_chunks FROM documents WHERE id = ?",
            (doc_id,),
        ).fetchone()
        if not row:
            return None
        chunks = conn.execute(
            "SELECT chunk_text FROM chunks WHERE document_id = ? ORDER BY position ASC",
            (doc_id,),
        ).fetchall()
        topics = conn.execute(
            "SELECT title, content FROM topics WHERE document_id = ? ORDER BY position ASC",
            (doc_id,),
        ).fetchall()
        return {
            "id": row["id"],
            "filename": row["filename"],
            "stored_filename": row["stored_filename"],
            "total_chunks": row["total_chunks"],
            "chunks": [c["chunk_text"] for c in chunks],
            "topics": [{"title": t["title"], "content": t["content"]} for t in topics],
        }


def update_document_topics(doc_id, topics):
    """Actualiza los topics de un documento y recalcula chunks."""
    init_db()
    clean_topics = []
    for topic in topics:
        title = topic.get("title", "").strip()
        content = topic.get("content", "").strip()
        if not title or not content:
            continue
        clean_topics.append(
            {
                "title": title,
                "content": content,
            }
        )

    if not clean_topics:
        return None

    with get_connection() as conn:
        current = conn.execute(
            "SELECT id, filename, stored_filename FROM documents WHERE id = ?",
            (doc_id,),
        ).fetchone()
        if not current:
            return None

        full_text = "\n\n".join(
            f'{topic["title"]}\n\n{topic["content"]}' for topic in clean_topics
        )
        chunks = split_into_chunks(full_text)

        conn.execute("DELETE FROM chunks WHERE document_id = ?", (doc_id,))
        conn.execute("DELETE FROM topics WHERE document_id = ?", (doc_id,))
        conn.executemany(
            "INSERT INTO chunks (document_id, chunk_text, position) VALUES (?, ?, ?)",
            [(doc_id, chunk, idx) for idx, chunk in enumerate(chunks)],
        )
        conn.executemany(
            "INSERT INTO topics (document_id, title, content, position) VALUES (?, ?, ?, ?)",
            [(doc_id, topic["title"], topic["content"], idx) for idx, topic in enumerate(clean_topics)],
        )
        conn.execute(
            "UPDATE documents SET total_chunks = ? WHERE id = ?",
            (len(chunks), doc_id),
        )

    return get_document_by_id(doc_id)

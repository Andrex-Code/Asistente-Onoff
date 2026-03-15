import json
import os
from typing import List, Dict, Any

from db_service import STORAGE_DIR
from pdf_service import load_documents

INDEX_PATH = os.path.join(STORAGE_DIR, "faiss.index")
META_PATH = os.path.join(STORAGE_DIR, "faiss_meta.json")

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIM = 1536


def _get_faiss_and_np():
    try:
        import faiss  # type: ignore
        import numpy as np  # type: ignore
    except Exception as exc:
        raise RuntimeError("Dependencias de IA no instaladas. Instala faiss-cpu y openai.") from exc
    return faiss, np


def _get_client():
    try:
        from openai import OpenAI
    except Exception as exc:
        raise RuntimeError("Dependencias de IA no instaladas. Instala faiss-cpu y openai.") from exc
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY no esta configurada.")
    return OpenAI(api_key=api_key)


def _ensure_storage():
    os.makedirs(STORAGE_DIR, exist_ok=True)


def _write_empty_index():
    """Crea un indice vacio para evitar errores cuando aun no existen documentos."""
    faiss, _ = _get_faiss_and_np()
    _ensure_storage()
    index = faiss.IndexFlatIP(EMBEDDING_DIM)
    faiss.write_index(index, INDEX_PATH)
    with open(META_PATH, "w", encoding="utf-8") as f:
        json.dump([], f, ensure_ascii=False, indent=2)


def _load_index_and_meta():
    """Carga indice y metadata, validando que ambos tengan la misma cantidad de entradas."""
    faiss, _ = _get_faiss_and_np()
    if not os.path.exists(INDEX_PATH) or not os.path.exists(META_PATH):
        return None, None

    index = faiss.read_index(INDEX_PATH)
    with open(META_PATH, "r", encoding="utf-8") as f:
        metadata = json.load(f)

    if index.ntotal != len(metadata):
        return None, None

    return index, metadata


def _embed_texts(texts: List[str]):
    """Genera embeddings en lotes para reducir llamadas y costo de red."""
    faiss, np = _get_faiss_and_np()
    client = _get_client()
    vectors: List[List[float]] = []
    batch_size = 64

    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        response = client.embeddings.create(model=EMBEDDING_MODEL, input=batch)
        vectors.extend(item.embedding for item in response.data)

    arr = np.array(vectors, dtype=np.float32)
    faiss.normalize_L2(arr)
    return arr


def rebuild_vector_store(documents: List[Dict[str, Any]]):
    """Reconstruye por completo el indice FAISS usando todos los chunks actuales."""
    faiss, _ = _get_faiss_and_np()
    _ensure_storage()

    records = []
    for doc in documents:
        for chunk in doc.get("chunks", []):
            chunk_text = (chunk or "").strip()
            if not chunk_text:
                continue
            records.append(
                {
                    "document_id": doc.get("id"),
                    "filename": doc.get("filename", ""),
                    "chunk_text": chunk_text,
                }
            )

    if not records:
        _write_empty_index()
        return {"total_chunks_indexed": 0}

    chunk_texts = [record["chunk_text"] for record in records]
    vectors = _embed_texts(chunk_texts)

    # Se usa similitud coseno via inner product despues de normalizar vectores.
    index = faiss.IndexFlatIP(vectors.shape[1])
    index.add(vectors)

    faiss.write_index(index, INDEX_PATH)
    with open(META_PATH, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    return {"total_chunks_indexed": len(records)}


def ensure_vector_store_ready():
    """Si el indice aun no existe, lo crea a partir del estado actual de documentos."""
    index, metadata = _load_index_and_meta()
    if index is not None and metadata is not None:
        return

    documents = load_documents()
    rebuild_vector_store(documents)


def search_similar_chunks(query: str, top_k: int = 3):
    """Busca los chunks mas cercanos semanticamente a la consulta del usuario."""
    _, _ = _get_faiss_and_np()
    ensure_vector_store_ready()
    index, metadata = _load_index_and_meta()
    if index is None or metadata is None or index.ntotal == 0:
        return []

    query = (query or "").strip()
    if not query:
        return []

    query_vector = _embed_texts([query])
    scores, indices = index.search(query_vector, top_k)

    results = []
    for score, idx in zip(scores[0], indices[0]):
        if idx < 0 or idx >= len(metadata):
            continue
        row = metadata[idx]
        results.append(
            {
                "document_id": row.get("document_id"),
                "filename": row.get("filename"),
                "chunk_text": row.get("chunk_text"),
                "score": float(score),
            }
        )
    return results

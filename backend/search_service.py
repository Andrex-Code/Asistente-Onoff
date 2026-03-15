from pdf_service import load_documents
import unicodedata

MAX_RESULTS = 10


def _normalize_for_search(text):
    text = unicodedata.normalize("NFD", text.lower().strip())
    return "".join(ch for ch in text if unicodedata.category(ch) != "Mn")


def search_topics(query):
    """Busca coincidencias ignorando mayusculas y tildes."""
    normalized_query = _normalize_for_search(query)
    if not normalized_query:
        return []

    documents = load_documents()
    results = []

    for doc in documents:
        for topic in doc.get("topics", []):
            title = topic.get("title", "")
            content = topic.get("content", "")
            full_text = _normalize_for_search(title + " " + content)

            if normalized_query in full_text:
                results.append({
                    "document_id": doc["id"],
                    "filename": doc["filename"],
                    "title": title,
                    "content": content,
                })
                if len(results) >= MAX_RESULTS:
                    return results

    return results

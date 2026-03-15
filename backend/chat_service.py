import os

from config_service import load_config
from vector_store import search_similar_chunks

CHAT_MODEL = "gpt-4o-mini"
NO_INFO_RESPONSE = "No encontré información en el manual sobre ese tema."


def _get_client():
    try:
        from openai import OpenAI
    except Exception as exc:
        raise RuntimeError("Dependencias de IA no instaladas. Instala faiss-cpu y openai.") from exc
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY no esta configurada.")
    return OpenAI(api_key=api_key)


def _build_context(chunks):
    """Construye el contexto con trazabilidad de la fuente para cada fragmento."""
    context_parts = []
    for i, chunk in enumerate(chunks, start=1):
        filename = chunk.get("filename") or "Documento sin nombre"
        chunk_text = chunk.get("chunk_text") or ""
        context_parts.append(f"[Fuente {i} - {filename}]\n{chunk_text}")
    return "\n\n".join(context_parts)


def answer_question(message: str):
    """Responde una pregunta usando solo los fragmentos recuperados del indice vectorial."""
    config = load_config()
    if not config.get("chatbot_enabled", False):
        raise PermissionError("El chatbot esta desactivado.")

    clean_message = (message or "").strip()
    if not clean_message:
        raise ValueError("El mensaje no puede estar vacio.")

    chunks = search_similar_chunks(clean_message, top_k=3)
    if not chunks:
        return {"answer": NO_INFO_RESPONSE, "sources": []}

    context = _build_context(chunks)
    client = _get_client()

    system_prompt = (
        "Responde únicamente usando la información proporcionada. "
        "Si no encuentras información, responde: "
        "No encontré información en el manual sobre ese tema."
    )

    user_prompt = (
        f"Contexto:\n{context}\n\n"
        f"Pregunta del usuario:\n{clean_message}\n\n"
        "Entrega una respuesta breve y clara en español."
    )

    response = client.chat.completions.create(
        model=CHAT_MODEL,
        temperature=0.1,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )

    answer = response.choices[0].message.content.strip() if response.choices else ""
    if not answer:
        answer = NO_INFO_RESPONSE

    sources = [{"document_id": c["document_id"], "filename": c["filename"]} for c in chunks]
    return {"answer": answer, "sources": sources}

import io
import os
from typing import Dict, List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

from auth_service import (
    authenticate_user,
    bootstrap_admin_user,
    list_users,
    remove_token,
    update_user,
    update_user_password,
    validate_token,
    create_user,
)
from chat_service import answer_question
from config_service import load_config, update_config
from db_service import init_db
from pdf_service import (
    create_structured_document,
    delete_document,
    get_all_topics,
    get_document_by_id,
    load_documents,
    process_pdf,
    process_structured_payload,
    update_document_topics,
)
from search_service import search_topics
from vector_store import rebuild_vector_store

load_dotenv()


def _cors_origins():
    """Permite configurar multiples origenes desde .env separados por comas."""
    raw = os.getenv("CORS_ORIGINS", "*").strip()
    if not raw:
        return ["*"]
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


app = FastAPI(title="Asistente ONOFF - Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()
    bootstrap_admin_user()


class SearchRequest(BaseModel):
    query: str


class ConfigRequest(BaseModel):
    chatbot_enabled: bool


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ChatRequest(BaseModel):
    message: str


class TopicUpdateRequest(BaseModel):
    title: str
    content: str


class DocumentTopicsUpdateRequest(BaseModel):
    topics: List[TopicUpdateRequest]


class StructuredDocumentCreateRequest(BaseModel):
    filename: str = Field(min_length=3, max_length=180)
    topics: List[TopicUpdateRequest]


class UserPermissions(BaseModel):
    can_upload: bool = False
    can_edit_documents: bool = False
    can_delete_documents: bool = False
    can_use_chat: bool = True


class UserCreateRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=6, max_length=120)
    role: str = "asesor"
    is_active: bool = True
    permissions: Optional[UserPermissions] = None


class UserUpdateRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    role: str = "asesor"
    is_active: bool = True
    permissions: Optional[UserPermissions] = None


class UserPasswordRequest(BaseModel):
    new_password: str = Field(min_length=6, max_length=120)


def _extract_token(authorization: str) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No autorizado. Inicie sesion.")
    return authorization.replace("Bearer ", "").strip()


def require_user(authorization: str = Header(None)):
    """Valida sesion y retorna el usuario actual."""
    token = _extract_token(authorization)
    user = validate_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Sesion expirada. Inicie sesion nuevamente.")
    return user


def require_admin(authorization: str = Header(None)):
    """Restringe el acceso a cuentas administradoras."""
    user = require_user(authorization)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="No tiene permisos de administrador.")
    return user


def require_permission(permission_key: str, authorization: str = Header(None)):
    """Permite a admin todo y al asesor solo la accion habilitada en sus permisos."""
    user = require_user(authorization)
    if user["role"] == "admin":
        return user
    if not user["permissions"].get(permission_key, False):
        raise HTTPException(status_code=403, detail="No tiene permisos para esta accion.")
    return user


@app.get("/health")
async def health():
    return {"ok": True}


@app.post("/auth/login")
async def login(request: LoginRequest):
    session = authenticate_user(request.email, request.password)
    if not session:
        raise HTTPException(status_code=401, detail="Email o contrasena incorrectos.")
    return {"message": "Inicio de sesion exitoso", **session}


@app.post("/auth/logout")
async def logout(authorization: str = Header(None)):
    token = _extract_token(authorization)
    remove_token(token)
    return {"message": "Sesion cerrada"}


@app.get("/auth/verify")
async def verify(authorization: str = Header(None)):
    user = require_user(authorization)
    return {"valid": True, "user": user}


@app.get("/users")
async def get_users(authorization: str = Header(None)):
    require_admin(authorization)
    return {"users": list_users()}


@app.post("/users")
async def create_user_endpoint(request: UserCreateRequest, authorization: str = Header(None)):
    require_admin(authorization)
    try:
        user = create_user(
            email=request.email,
            full_name=request.full_name,
            password=request.password,
            role=request.role,
            is_active=request.is_active,
            permissions=request.permissions.model_dump() if request.permissions else None,
        )
        return {"message": "Usuario creado correctamente.", "user": user}
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))


@app.put("/users/{user_id}")
async def update_user_endpoint(user_id: int, request: UserUpdateRequest, authorization: str = Header(None)):
    require_admin(authorization)
    try:
        user = update_user(
            user_id=user_id,
            full_name=request.full_name,
            role=request.role,
            is_active=request.is_active,
            permissions=request.permissions.model_dump() if request.permissions else None,
        )
        return {"message": "Usuario actualizado correctamente.", "user": user}
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))


@app.put("/users/{user_id}/password")
async def update_user_password_endpoint(user_id: int, request: UserPasswordRequest, authorization: str = Header(None)):
    require_admin(authorization)
    try:
        update_user_password(user_id=user_id, new_password=request.new_password)
        return {"message": "Contrasena actualizada correctamente."}
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))


@app.get("/topics")
async def get_topics(authorization: str = Header(None)):
    require_user(authorization)
    topics = get_all_topics()
    return {"topics": topics}


@app.post("/search")
async def search(request: SearchRequest, authorization: str = Header(None)):
    require_user(authorization)
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="La consulta no puede estar vacia.")
    results = search_topics(request.query)
    return {"query": request.query, "total_results": len(results), "results": results}


@app.get("/config")
async def get_config(authorization: str = Header(None)):
    require_user(authorization)
    config = load_config()
    return config


@app.post("/chat")
async def chat(request: ChatRequest, authorization: str = Header(None)):
    user = require_user(authorization)
    if user["role"] != "admin" and not user["permissions"].get("can_use_chat", False):
        raise HTTPException(status_code=403, detail="No tiene permiso para usar el chat.")

    try:
        result = answer_question(request.message)
        return result
    except PermissionError as err:
        raise HTTPException(status_code=403, detail=str(err))
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    except RuntimeError as err:
        raise HTTPException(status_code=500, detail=str(err))


@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...), authorization: str = Header(None)):
    require_permission("can_upload", authorization)

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF.")

    contents = await file.read()
    file_bytes = io.BytesIO(contents)

    result = process_pdf(file_bytes, file.filename, original_bytes=contents)
    if result is None:
        raise HTTPException(status_code=400, detail="No se pudo extraer texto del PDF.")
    try:
        # El indice vectorial se reconstruye despues de cada cambio para mantener las respuestas actualizadas.
        rebuild_vector_store(load_documents())
    except Exception as err:
        delete_document(result["id"])
        raise HTTPException(status_code=500, detail=f"No se pudo indexar el PDF en FAISS: {str(err)}")

    return {"message": "PDF procesado correctamente", "document": result}


@app.post("/upload-structured")
async def upload_structured_file(file: UploadFile = File(...), authorization: str = Header(None)):
    require_permission("can_upload", authorization)

    if not file.filename.lower().endswith(".json"):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos JSON.")

    contents = await file.read()

    try:
        result = process_structured_payload(contents, file.filename)
        rebuild_vector_store(load_documents())
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"No se pudo procesar el archivo estructurado: {str(err)}")

    return {"message": "Archivo estructurado procesado correctamente", **result}


@app.post("/documents/structured")
async def create_structured_document_endpoint(
    request: StructuredDocumentCreateRequest,
    authorization: str = Header(None),
):
    require_permission("can_upload", authorization)

    try:
        document = create_structured_document(
            filename=request.filename,
            topics=[topic.model_dump() for topic in request.topics],
        )
        rebuild_vector_store(load_documents())
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"No se pudo crear el documento estructurado: {str(err)}")

    return {"message": "Documento estructurado creado correctamente", "document": document}


@app.get("/documents")
async def get_documents(authorization: str = Header(None)):
    require_user(authorization)
    documents = load_documents()
    summary = [
        {
            "id": doc["id"],
            "filename": doc["filename"],
            "total_chunks": doc["total_chunks"],
        }
        for doc in documents
    ]
    return {"documents": summary}


@app.get("/documents/{doc_id}")
async def get_document(doc_id: str, authorization: str = Header(None)):
    require_user(authorization)
    doc = get_document_by_id(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")
    return {
        "id": doc["id"],
        "filename": doc["filename"],
        "total_chunks": doc["total_chunks"],
        "topics": doc.get("topics", []),
    }


@app.put("/documents/{doc_id}/topics")
async def set_document_topics(doc_id: str, request: DocumentTopicsUpdateRequest, authorization: str = Header(None)):
    require_permission("can_edit_documents", authorization)
    updated = update_document_topics(doc_id, [topic.model_dump() for topic in request.topics])
    if updated is None:
        raise HTTPException(status_code=400, detail="No se pudo actualizar el documento.")
    rebuild_vector_store(load_documents())
    return {
        "message": "Documento actualizado correctamente",
        "document": {
            "id": updated["id"],
            "filename": updated["filename"],
            "total_chunks": updated["total_chunks"],
            "total_topics": len(updated.get("topics", [])),
        },
    }


@app.delete("/documents/{doc_id}")
async def remove_document(doc_id: str, authorization: str = Header(None)):
    require_permission("can_delete_documents", authorization)
    deleted = delete_document(doc_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")
    rebuild_vector_store(load_documents())
    return {"message": "Documento eliminado correctamente"}


@app.post("/config")
async def set_config(request: ConfigRequest, authorization: str = Header(None)):
    require_admin(authorization)
    config = update_config(request.chatbot_enabled)
    return config

# Arquitectura del Proyecto

## Vision general

El sistema tiene dos capas:

- `frontend`: interfaz de usuario en React
- `backend`: API FastAPI con autenticacion, procesamiento documental y chatbot

## Backend

Archivos principales:

- `main.py`: expone endpoints y reglas de acceso
- `auth_service.py`: autenticacion, sesiones y usuarios
- `pdf_service.py`: procesamiento de PDF y documentos estructurados
- `search_service.py`: busqueda textual por temas
- `vector_store.py`: embeddings, FAISS e indice semantico
- `chat_service.py`: construye contexto y consulta el modelo
- `db_service.py`: SQLite y rutas de persistencia
- `config_service.py`: configuracion del sistema

## Persistencia

SQLite almacena:

- usuarios
- sesiones
- documentos
- temas
- fragmentos
- configuracion

Sistema de archivos almacena:

- PDFs originales
- indice FAISS
- metadata del indice

## Flujo de carga documental

1. Se sube un PDF o JSON estructurado.
2. El backend crea temas y fragmentos.
3. Se guarda el documento en SQLite.
4. Se reconstruye el indice FAISS.

## Flujo del chatbot

1. El usuario hace una pregunta.
2. Se buscan fragmentos similares en FAISS.
3. Se arma un contexto con fuentes.
4. Se consulta OpenAI.
5. Se devuelve respuesta y fuentes.

## Frontend

Rutas principales:

- `Home`: busqueda y consulta principal
- `AdminPage`: gestion de documentos, chatbot y usuarios
- `AboutPage`: explicacion del producto
- `LoginPage`: autenticacion

## Decisiones actuales

- despliegue orientado a entorno local o LAN
- persistencia simple y portable con SQLite
- control de acceso del lado servidor
- modelo de conocimiento orientado a temas, no solo a documentos completos

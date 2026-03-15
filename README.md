# Asistente ONOFF

Aplicacion interna para centralizar conocimiento operativo, buscar informacion rapidamente y apoyar a los asesores con un chatbot basado en contenido interno.

## Resumen

El proyecto fue pensado para empresa y hoy funciona como una base de conocimiento local con:

- login obligatorio
- roles y permisos
- carga de PDFs
- importacion de JSON estructurado
- creacion manual de documentos estructurados
- busqueda por temas
- chatbot con OpenAI usando contexto interno
- persistencia local en SQLite y FAISS

## Stack

- `frontend`: React + Vite
- `backend`: FastAPI
- `database`: SQLite
- `vector search`: FAISS
- `LLM / embeddings`: OpenAI

## Estructura del repositorio

```text
Asistente-Onoff/
├── backend/
├── frontend/
├── docs/
├── start-all.bat
├── start-backend.bat
├── start-frontend.bat
└── README.md
```

## Documentacion disponible

- Revision tecnica: [GUIA_REVISION_TI.md](/c:/Users/pipev/OneDrive/Escritorio/Asistente-Onoff/docs/GUIA_REVISION_TI.md)
- Instalacion local en empresa: [INSTALACION_LOCAL_EMPRESA.md](/c:/Users/pipev/OneDrive/Escritorio/Asistente-Onoff/docs/INSTALACION_LOCAL_EMPRESA.md)
- Arquitectura del sistema: [ARQUITECTURA.md](/c:/Users/pipev/OneDrive/Escritorio/Asistente-Onoff/docs/ARQUITECTURA.md)
- Estado funcional actual: [ESTADO_ACTUAL_PROYECTO.txt](/c:/Users/pipev/OneDrive/Escritorio/Asistente-Onoff/ESTADO_ACTUAL_PROYECTO.txt)

## Requisitos

- Python 3.11 o superior
- Node.js 20 o superior
- acceso a internet para instalar dependencias
- `OPENAI_API_KEY` valida si se usara chatbot / embeddings

## Configuracion rapida

### Backend

```powershell
cd backend
copy .env.example .env
```

Variables principales:

- `OPENAI_API_KEY`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_NAME`
- `CORS_ORIGINS`
- `APP_STORAGE_DIR` opcional pero recomendado

### Frontend

```powershell
cd frontend
copy .env.example .env
```

Uso local en el mismo PC:

```env
VITE_API_URL=http://localhost:8000
```

## Ejecucion

### Opcion 0: preparacion automatica del PC

- Ejecuta [setup-local.bat](/c:/Users/pipev/OneDrive/Escritorio/Asistente-Onoff/setup-local.bat)
- Este script:
  - verifica Python y Node.js
  - crea `backend/.env` y `frontend/.env` si no existen
  - crea el entorno virtual del backend
  - instala dependencias del backend y frontend

### Opcion 1: scripts .bat

- [start-all.bat](/c:/Users/pipev/OneDrive/Escritorio/Asistente-Onoff/start-all.bat)
- [start-backend.bat](/c:/Users/pipev/OneDrive/Escritorio/Asistente-Onoff/start-backend.bat)
- [start-frontend.bat](/c:/Users/pipev/OneDrive/Escritorio/Asistente-Onoff/start-frontend.bat)

### Opcion 2: manual

Backend:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

Frontend:

```powershell
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

## URLs

- Frontend local: `http://localhost:5173`
- Backend local: `http://localhost:8000`
- Healthcheck backend: `http://localhost:8000/health`

## Carga de conocimiento

El panel administrativo soporta:

- PDFs
- JSON estructurado
- formulario manual de documentos estructurados

Plantilla base:

- [knowledge_template.json](/c:/Users/pipev/OneDrive/Escritorio/Asistente-Onoff/backend/knowledge_template.json)

Formato esperado:

```json
{
  "documents": [
    {
      "filename": "Nombre del proceso o manual",
      "topics": [
        {
          "title": "Titulo del tema",
          "content": "Procedimiento, reglas, excepciones, mensajes sugeridos y notas."
        }
      ]
    }
  ]
}
```

## Persistencia

Se almacenan:

- base SQLite
- archivos PDF originales
- indice FAISS
- metadata del indice

Si no se define `APP_STORAGE_DIR`, se usan rutas dentro de `backend/storage`.

## Seguridad actual

- autenticacion obligatoria
- sesiones con expiracion
- roles y permisos
- validacion de permisos en backend

## Backup

- Script disponible: [backup-storage.bat](/c:/Users/pipev/OneDrive/Escritorio/Asistente-Onoff/backup-storage.bat)
- Script PowerShell: [backup-storage.ps1](/c:/Users/pipev/OneDrive/Escritorio/Asistente-Onoff/backup-storage.ps1)

## Notas para revision de TI

- El proyecto esta preparado para correr primero en un solo PC.
- Para uso compartido por LAN, TI debe encargarse de IP, firewall y puertos.
- Se recomienda mover `APP_STORAGE_DIR` fuera del repo a una carpeta fija y respaldable.
- Guia rapida para preparar un PC nuevo: [PREPARAR_PC_EMPRESA.txt](/c:/Users/pipev/OneDrive/Escritorio/Asistente-Onoff/PREPARAR_PC_EMPRESA.txt)

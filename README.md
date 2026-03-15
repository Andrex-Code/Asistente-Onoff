# Asistente ONOFF (Local Empresa)

Proyecto dividido en:
- `frontend`: React + Vite
- `backend`: FastAPI + SQLite + FAISS

## Estado actual

- Login obligatorio para toda la app (admin y asesor).
- Roles y permisos granulares:
  - `admin`: control total.
  - `asesor`: permisos configurables (`can_upload`, `can_edit_documents`, `can_delete_documents`, `can_use_chat`).
- Admin puede gestionar usuarios desde el panel:
  - crear cuenta,
  - activar/desactivar,
  - cambiar rol,
  - asignar permisos,
  - cambiar contrasena.
- Persistencia local real:
  - SQLite (`app.db`)
  - PDFs en disco (`uploads`)
  - indice FAISS en disco.

## Configurar backend

```powershell
cd backend
copy .env.example .env
```

Edita `backend/.env`:
- `OPENAI_API_KEY`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_NAME`
- `CORS_ORIGINS`
- `APP_STORAGE_DIR`

Instalar y ejecutar:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Configurar frontend

```powershell
cd frontend
copy .env.example .env
```

En `frontend/.env` define:
- `VITE_API_URL=http://IP_DEL_PC_SERVIDOR:8000`

Instalar y ejecutar:

```powershell
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

## Acceso en red local (LAN)

- Frontend: `http://IP_DEL_PC_SERVIDOR:5173`
- Backend API: `http://IP_DEL_PC_SERVIDOR:8000`

Permitir puertos `5173` y `8000` en Windows Firewall.

## Inicio rapido

- Ejecuta [start-all.bat](/c:/Users/pipev/OneDrive/Escritorio/Asistente-Onoff/start-all.bat) para levantar backend y frontend en ventanas separadas.
- Si prefieres por separado, usa [start-backend.bat](/c:/Users/pipev/OneDrive/Escritorio/Asistente-Onoff/start-backend.bat) y [start-frontend.bat](/c:/Users/pipev/OneDrive/Escritorio/Asistente-Onoff/start-frontend.bat).

## Carga de conocimiento

- El panel admin ahora acepta:
  - PDFs para extraer contenido automaticamente.
  - JSON estructurado para mantener una base mas consistente.
- Plantilla sugerida: [knowledge_template.json](/c:/Users/pipev/OneDrive/Escritorio/Asistente-Onoff/backend/knowledge_template.json)
- Formato esperado:

```json
{
  "documents": [
    {
      "filename": "Nombre del proceso o manual",
      "topics": [
        {
          "title": "Titulo del tema",
          "content": "Procedimiento, reglas, mensajes aprobados, pasos y notas."
        }
      ]
    }
  ]
}
```

- Recomendacion de organizacion:
  - 1 documento por proceso o politica.
  - 1 tema por duda frecuente o paso operativo.
  - incluir siempre pasos, restricciones, excepciones y mensaje sugerido al asesor.

## Persistencia y respaldo

No se pierde informacion al reiniciar si conservas `APP_STORAGE_DIR`.
Respaldar periodicamente esa carpeta (`app.db`, `uploads`, `faiss.index`, `faiss_meta.json`).

## Backup automatico

- Ejecuta [backup-storage.bat](/c:/Users/pipev/OneDrive/Escritorio/Asistente-Onoff/backup-storage.bat).
- El backup se genera en `backups\` como archivo `.zip` con fecha y hora.

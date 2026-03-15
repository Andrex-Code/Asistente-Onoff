# Instalacion Local en un PC de Empresa

## Requisitos

- Windows
- Python 3.11 o superior
- Node.js 20 o superior
- acceso a internet para instalar dependencias y para OpenAI

## 1. Copiar el proyecto

Copiar la carpeta completa del proyecto al PC donde se va a revisar o ejecutar.

## 2. Configurar backend

Desde la carpeta `backend`:

```powershell
copy .env.example .env
```

Editar `backend/.env` y definir:

- `OPENAI_API_KEY`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_NAME`
- `CORS_ORIGINS`

Opcional recomendado:

- `APP_STORAGE_DIR=C:\AsistenteOnoffData`

## 3. Configurar frontend

Desde la carpeta `frontend`:

```powershell
copy .env.example .env
```

Si se usara solo en el mismo PC:

```env
VITE_API_URL=http://localhost:8000
```

Si TI luego lo publica en LAN:

```env
VITE_API_URL=http://IP_DEL_PC_SERVIDOR:8000
```

## 4. Arranque rapido

Desde la raiz del proyecto:

- `start-backend.bat`
- `start-frontend.bat`
- o `start-all.bat`

## 5. Verificacion basica

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000/health`

La respuesta esperada del backend es:

```json
{"ok": true}
```

## 6. Credenciales iniciales

La cuenta admin se crea a partir de las variables:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_NAME`

## 7. Persistencia

El sistema guarda:

- SQLite
- archivos subidos
- indice FAISS

Todo eso se conserva en `APP_STORAGE_DIR` o, si no se configura, dentro de `backend/storage`.

## 8. Recomendaciones para TI

- mover `APP_STORAGE_DIR` a una ruta fija y respaldable
- crear backup periodico
- dejar documentado Python y Node instalados
- validar politica de antivirus sobre la carpeta de datos

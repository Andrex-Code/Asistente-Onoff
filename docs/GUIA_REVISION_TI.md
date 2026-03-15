# Guia de Revision para TI

Este documento resume lo necesario para que el equipo de tecnologia revise el proyecto sin depender del contexto de desarrollo original.

## Objetivo del sistema

Asistente ONOFF centraliza informacion operativa interna para asesores. Permite:

- buscar temas y procesos rapidamente
- consultar un chatbot apoyado en contenido interno
- cargar documentos en PDF
- importar conocimiento estructurado en JSON
- crear documentos estructurados directamente desde el panel administrativo

## Stack tecnico

- Frontend: React + Vite
- Backend: FastAPI
- Base de datos local: SQLite
- Busqueda semantica: FAISS + OpenAI embeddings
- Chatbot: OpenAI chat completions

## Estructura relevante

- `frontend/`: aplicacion web
- `backend/`: API, autenticacion, procesamiento documental y persistencia
- `backend/storage/`: datos persistentes generados en ejecucion
- `docs/`: guias para instalacion y arquitectura
- `start-all.bat`: arranque rapido de frontend y backend

## Variables de entorno

Backend:

- `OPENAI_API_KEY`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_NAME`
- `CORS_ORIGINS`
- `APP_STORAGE_DIR` opcional pero recomendado

Frontend:

- `VITE_API_URL`

## Flujo funcional resumido

1. El admin inicia sesion.
2. Carga PDFs o informacion estructurada.
3. El backend extrae temas y fragmentos.
4. El sistema reconstruye el indice vectorial FAISS.
5. Los asesores buscan temas o preguntan al chatbot.

## Seguridad actual

- Login obligatorio para toda la aplicacion.
- Roles: `admin` y `asesor`.
- Permisos granulares por usuario.
- Validacion de permisos en backend para subida, edicion, borrado y uso del chat.

## Consideraciones para despliegue local en empresa

- El proyecto fue pensado para correr inicialmente en un PC interno.
- Si se va a compartir por LAN, TI debe gestionar puertos y firewall.
- Para persistencia estable se recomienda configurar `APP_STORAGE_DIR` en una carpeta fija fuera del repo.
- No se deben versionar `.env`, bases de datos ni archivos subidos.

## Lo primero que deberia revisar TI

- configuracion de `backend/.env`
- configuracion de `frontend/.env`
- que Python y Node.js esten instalados
- acceso a internet del backend para OpenAI
- ubicacion de almacenamiento persistente
- politica de backup para SQLite, uploads e indice FAISS

# Mantenimiento Basico

## Archivos que normalmente se editan

- `backend/.env`
- `frontend/.env`
- documentos cargados desde la interfaz

## Archivos que TI no deberia editar manualmente salvo necesidad puntual

- `backend/storage/app.db`
- `backend/storage/faiss.index`
- `backend/storage/faiss_meta.json`

Si se usa `APP_STORAGE_DIR`, esos archivos existiran en la ruta configurada.

## Cuando se actualiza el indice FAISS

El indice se reconstruye automaticamente cuando:

- se sube un PDF
- se importa un JSON estructurado
- se crea un documento estructurado manualmente
- se editan temas de un documento
- se elimina un documento

## Verificaciones utiles

Backend:

```powershell
http://localhost:8000/health
```

Frontend:

```powershell
http://localhost:5173
```

## Si el chatbot no responde

Revisar:

- `OPENAI_API_KEY`
- conectividad a internet del PC
- que el chatbot este activado desde el panel
- que el usuario tenga `can_use_chat`

## Si no aparecen resultados

Revisar:

- que existan documentos cargados
- que el indice FAISS se haya generado
- que el documento tenga temas y fragmentos validos

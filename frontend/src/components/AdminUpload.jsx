import React, { useRef, useState } from 'react'
import { API_URL } from '../api.js'

const styles = {
  container: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    padding: '24px 28px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '6px',
  },
  description: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '16px',
    lineHeight: '1.5',
  },
  dropZone: {
    border: '2px dashed #d1d5db',
    borderRadius: '10px',
    padding: '28px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backgroundColor: '#fafafa',
  },
  dropText: {
    fontSize: '13px',
    color: '#6b7280',
  },
  dropLink: {
    color: '#16a34a',
    fontWeight: 600,
    cursor: 'pointer',
  },
  status: {
    fontSize: '13px',
    color: '#6b7280',
    marginTop: '12px',
    textAlign: 'center',
  },
  error: {
    fontSize: '13px',
    color: '#dc2626',
    marginTop: '12px',
    textAlign: 'center',
  },
}

function AdminUpload({ onUploaded, authHeaders, canUpload = true }) {
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')
  const [isError, setIsError] = useState(false)

  const getUploadConfig = (file) => {
    const extension = (file?.name || '').toLowerCase()
    if (extension.endsWith('.json')) {
      return {
        endpoint: 'upload-structured',
      }
    }

    return {
      endpoint: 'upload-pdf',
    }
  }

  const handleUpload = async (file) => {
    if (!file || !canUpload) return

    const isPdf = file.name.toLowerCase().endsWith('.pdf')
    const isJson = file.name.toLowerCase().endsWith('.json')
    if (!isPdf && !isJson) {
      setMsg('Solo puedes subir archivos PDF o JSON.')
      setIsError(true)
      return
    }

    const uploadConfig = getUploadConfig(file)

    setUploading(true)
    setMsg('Subiendo...')
    setIsError(false)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`${API_URL}/${uploadConfig.endpoint}`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        setMsg(err.detail || 'No se pudo subir el archivo.')
        setIsError(true)
        return
      }

      const data = await res.json()
      if (data.document) {
        setMsg(`"${data.document.filename}" procesado (${data.document.total_chunks} fragmentos, ${data.document.total_topics} temas)`)
      } else {
        setMsg(`${data.total_documents} documentos estructurados procesados (${data.total_topics} temas en total)`)
      }
      setIsError(false)
      onUploaded()
    } catch {
      setMsg('Error de conexion con el servidor')
      setIsError(true)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div style={styles.container}>
      <p style={styles.title}>Archivos de Documentacion</p>
      <p style={styles.description}>
        Sube PDFs o un JSON estructurado para mantener la base de conocimiento ordenada.
      </p>
      <input
        type="file"
        accept=".pdf,.json"
        ref={fileRef}
        onChange={(e) => handleUpload(e.target.files[0])}
        style={{ display: 'none' }}
      />
      <div
        style={styles.dropZone}
        onClick={() => !uploading && canUpload && fileRef.current.click()}
        onDrop={(e) => {
          e.preventDefault()
          handleUpload(e.dataTransfer.files[0])
        }}
        onDragOver={(e) => e.preventDefault()}
      >
        <p style={styles.dropText}>
          {uploading
            ? 'Subiendo archivo...'
            : canUpload
              ? <>Arrastra un PDF o JSON aqui o <span style={styles.dropLink}>haz clic para subir</span></>
              : 'No tienes permiso para subir archivos.'}
        </p>
      </div>
      {msg && <p style={isError ? styles.error : styles.status}>{msg}</p>}
    </div>
  )
}

export default AdminUpload

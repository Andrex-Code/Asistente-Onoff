import React, { useState } from 'react'
import { API_URL } from '../api.js'

const styles = {
  list: { display: 'flex', flexDirection: 'column', gap: '10px' },
  item: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  itemInfo: { display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 },
  itemText: { display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 },
  filename: { fontSize: '14px', fontWeight: 600, color: '#374151', wordBreak: 'break-word' },
  meta: { fontSize: '12px', color: '#9ca3af' },
  actions: { display: 'flex', gap: '8px', flexShrink: 0 },
  btn: {
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#374151',
    padding: '6px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  deleteBtn: { color: '#dc2626', borderColor: '#fecaca' },
  editor: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  topicCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: { fontSize: '12px', color: '#6b7280', fontWeight: 600 },
  input: {
    width: '100%',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    padding: '8px 10px',
    fontSize: '13px',
    fontFamily: 'inherit',
  },
  textarea: {
    width: '100%',
    minHeight: '110px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    padding: '8px 10px',
    fontSize: '13px',
    lineHeight: 1.45,
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  status: { fontSize: '12px', color: '#16a34a' },
  error: { fontSize: '12px', color: '#dc2626' },
  empty: { fontSize: '13px', color: '#9ca3af', textAlign: 'center', padding: '16px 0' },
}

function AdminDocumentList({ documents, onDeleted, authHeaders, onUpdated, canEdit = true, canDelete = true }) {
  const [editingDocId, setEditingDocId] = useState(null)
  const [topics, setTopics] = useState([])
  const [loadingEditor, setLoadingEditor] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [isError, setIsError] = useState(false)

  const handleDelete = async (docId) => {
    if (!canDelete) return
    try {
      const res = await fetch(`${API_URL}/documents/${docId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (res.ok) {
        onDeleted()
      } else {
        const err = await res.json()
        setMsg(err.detail || 'No se pudo eliminar.')
        setIsError(true)
      }
    } catch {
      setMsg('Error de conexion con el servidor.')
      setIsError(true)
    }
  }

  const openEditor = async (docId) => {
    if (!canEdit) return
    if (editingDocId === docId) {
      setEditingDocId(null)
      setTopics([])
      setMsg('')
      return
    }

    setLoadingEditor(true)
    setMsg('')
    setIsError(false)

    try {
      const res = await fetch(`${API_URL}/documents/${docId}`, {
        headers: authHeaders(),
      })
      if (!res.ok) {
        setMsg('No fue posible cargar el documento.')
        setIsError(true)
        return
      }

      const data = await res.json()
      setEditingDocId(docId)
      setTopics(data.topics || [])
    } catch {
      setMsg('Error de conexion con el servidor.')
      setIsError(true)
    } finally {
      setLoadingEditor(false)
    }
  }

  const updateTopic = (index, field, value) => {
    setTopics((prev) =>
      prev.map((topic, i) => (i === index ? { ...topic, [field]: value } : topic))
    )
  }

  const saveTopics = async () => {
    if (!editingDocId || saving || !canEdit) return
    setSaving(true)
    setMsg('')
    setIsError(false)

    try {
      const res = await fetch(`${API_URL}/documents/${editingDocId}/topics`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ topics }),
      })
      if (!res.ok) {
        const err = await res.json()
        setMsg(err.detail || 'No fue posible guardar los cambios.')
        setIsError(true)
        return
      }
      setMsg('Cambios guardados correctamente.')
      if (onUpdated) onUpdated()
    } catch {
      setMsg('Error de conexion con el servidor.')
      setIsError(true)
    } finally {
      setSaving(false)
    }
  }

  if (documents.length === 0) {
    return <p style={styles.empty}>No hay documentos cargados aun.</p>
  }

  return (
    <div style={styles.list}>
      {documents.map((doc) => {
        const isEditing = editingDocId === doc.id
        return (
          <div key={doc.id} style={styles.item}>
            <div style={styles.row}>
              <div style={styles.itemInfo}>
                <div style={styles.itemText}>
                  <span style={styles.filename}>{doc.filename}</span>
                  <span style={styles.meta}>{doc.total_chunks} fragmentos</span>
                </div>
              </div>

              <div style={styles.actions}>
                {canEdit && (
                  <button style={styles.btn} onClick={() => openEditor(doc.id)} disabled={loadingEditor}>
                    {isEditing ? 'Cerrar' : 'Editar texto'}
                  </button>
                )}
                {canDelete && (
                  <button style={{ ...styles.btn, ...styles.deleteBtn }} onClick={() => handleDelete(doc.id)}>
                    Eliminar
                  </button>
                )}
              </div>
            </div>

            {isEditing && canEdit && (
              <div style={styles.editor}>
                {topics.map((topic, index) => (
                  <div key={`${doc.id}-${index}`} style={styles.topicCard}>
                    <label style={styles.label}>Titulo del tema</label>
                    <input
                      style={styles.input}
                      value={topic.title || ''}
                      onChange={(e) => updateTopic(index, 'title', e.target.value)}
                    />
                    <label style={styles.label}>Contenido</label>
                    <textarea
                      style={styles.textarea}
                      value={topic.content || ''}
                      onChange={(e) => updateTopic(index, 'content', e.target.value)}
                    />
                  </div>
                ))}
                <div style={styles.actions}>
                  <button style={styles.btn} onClick={saveTopics} disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
      {msg && <p style={isError ? styles.error : styles.status}>{msg}</p>}
    </div>
  )
}

export default AdminDocumentList

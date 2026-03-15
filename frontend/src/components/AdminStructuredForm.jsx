import React, { useState } from 'react'
import { API_URL } from '../api.js'

const emptyTopic = () => ({ title: '', content: '' })

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
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '14px',
  },
  label: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: 600,
  },
  input: {
    width: '100%',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '13px',
    fontFamily: 'inherit',
  },
  textarea: {
    width: '100%',
    minHeight: '110px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '13px',
    lineHeight: 1.5,
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  topicCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    padding: '14px',
    marginBottom: '12px',
    backgroundColor: '#fafafa',
  },
  topicHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    marginBottom: '10px',
  },
  topicTitle: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#1f2937',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginTop: '6px',
  },
  btn: {
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#374151',
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  primaryBtn: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
    color: '#ffffff',
  },
  deleteBtn: {
    color: '#dc2626',
    borderColor: '#fecaca',
  },
  hint: {
    fontSize: '12px',
    color: '#6b7280',
  },
  status: {
    fontSize: '13px',
    color: '#16a34a',
    marginTop: '12px',
  },
  error: {
    fontSize: '13px',
    color: '#dc2626',
    marginTop: '12px',
  },
}

function AdminStructuredForm({ onCreated, authHeaders, canUpload = true }) {
  const [filename, setFilename] = useState('')
  const [topics, setTopics] = useState([emptyTopic()])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [isError, setIsError] = useState(false)

  const updateTopic = (index, field, value) => {
    setTopics((prev) => prev.map((topic, i) => (i === index ? { ...topic, [field]: value } : topic)))
  }

  const addTopic = () => {
    setTopics((prev) => [...prev, emptyTopic()])
  }

  const removeTopic = (index) => {
    setTopics((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  const resetForm = () => {
    setFilename('')
    setTopics([emptyTopic()])
  }

  const handleSubmit = async () => {
    if (!canUpload || saving) return

    const cleanTopics = topics
      .map((topic) => ({
        title: topic.title.trim(),
        content: topic.content.trim(),
      }))
      .filter((topic) => topic.title && topic.content)

    if (!filename.trim()) {
      setMsg('Debes escribir un nombre para el documento.')
      setIsError(true)
      return
    }

    if (cleanTopics.length === 0) {
      setMsg('Agrega al menos un tema con titulo y contenido.')
      setIsError(true)
      return
    }

    setSaving(true)
    setMsg('')
    setIsError(false)

    try {
      const res = await fetch(`${API_URL}/documents/structured`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          filename: filename.trim(),
          topics: cleanTopics,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setMsg(data.detail || 'No se pudo crear el documento.')
        setIsError(true)
        return
      }

      setMsg(`"${data.document.filename}" creado con ${data.document.total_topics} temas.`)
      setIsError(false)
      resetForm()
      if (onCreated) onCreated()
    } catch {
      setMsg('Error de conexion con el servidor.')
      setIsError(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={styles.container}>
      <p style={styles.title}>Crear conocimiento estructurado</p>
      <p style={styles.description}>
        Registra un proceso, politica o guia directamente desde el panel para que quede organizado por temas.
      </p>

      <div style={styles.field}>
        <label style={styles.label}>Nombre del documento o proceso</label>
        <input
          style={styles.input}
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          placeholder="Ejemplo: Proceso de devoluciones"
          disabled={!canUpload || saving}
        />
      </div>

      {topics.map((topic, index) => (
        <div key={`topic-${index}`} style={styles.topicCard}>
          <div style={styles.topicHeader}>
            <span style={styles.topicTitle}>Tema {index + 1}</span>
            <button
              type="button"
              style={{ ...styles.btn, ...styles.deleteBtn }}
              onClick={() => removeTopic(index)}
              disabled={!canUpload || saving || topics.length === 1}
            >
              Quitar
            </button>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Titulo del tema</label>
            <input
              style={styles.input}
              value={topic.title}
              onChange={(e) => updateTopic(index, 'title', e.target.value)}
              placeholder="Ejemplo: Cuando aplica una devolucion"
              disabled={!canUpload || saving}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Contenido</label>
            <textarea
              style={styles.textarea}
              value={topic.content}
              onChange={(e) => updateTopic(index, 'content', e.target.value)}
              placeholder="Incluye pasos, restricciones, excepciones y mensaje sugerido al asesor."
              disabled={!canUpload || saving}
            />
          </div>
        </div>
      ))}

      <p style={styles.hint}>
        Sugerencia: separa cada duda frecuente en un tema distinto para que la busqueda y el chatbot respondan mejor.
      </p>

      <div style={styles.actions}>
        <button type="button" style={styles.btn} onClick={addTopic} disabled={!canUpload || saving}>
          Agregar tema
        </button>
        <button
          type="button"
          style={{ ...styles.btn, ...styles.primaryBtn }}
          onClick={handleSubmit}
          disabled={!canUpload || saving}
        >
          {saving ? 'Guardando...' : 'Crear documento'}
        </button>
      </div>

      {msg && <p style={isError ? styles.error : styles.status}>{msg}</p>}
    </div>
  )
}

export default AdminStructuredForm

import React, { useEffect, useRef, useState } from 'react'
import { API_URL } from '../api.js'
import { useAuth } from '../AuthContext.jsx'

const styles = {
  floatingBtn: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: '58px',
    height: '58px',
    borderRadius: '50%',
    backgroundColor: '#15803d',
    color: '#ffffff',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    boxShadow: '0 8px 22px rgba(21,128,61,0.35)',
    zIndex: 1200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  panel: {
    position: 'fixed',
    right: '20px',
    bottom: '92px',
    width: '360px',
    height: '530px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #d1d5db',
    boxShadow: '0 16px 36px rgba(0,0,0,0.18)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    zIndex: 1200,
    transformOrigin: 'bottom right',
    animation: 'chatOpen 0.24s ease',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    background: 'linear-gradient(135deg, #14532d 0%, #15803d 100%)',
    color: '#ffffff',
  },
  titleWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  title: {
    fontSize: '15px',
    fontWeight: 700,
  },
  subtitle: {
    fontSize: '11px',
    opacity: 0.9,
  },
  closeBtn: {
    border: 'none',
    backgroundColor: 'rgba(255,255,255,0.16)',
    color: '#ffffff',
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  body: {
    flex: 1,
    padding: '14px 12px',
    backgroundColor: '#f0fdf4',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  bubbleAssistant: {
    alignSelf: 'flex-start',
    maxWidth: '82%',
    backgroundColor: '#ffffff',
    border: '1px solid #dcfce7',
    borderRadius: '14px 14px 14px 4px',
    padding: '9px 11px',
    fontSize: '13px',
    lineHeight: 1.4,
    color: '#1f2937',
    whiteSpace: 'pre-wrap',
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    maxWidth: '82%',
    backgroundColor: '#15803d',
    color: '#ffffff',
    borderRadius: '14px 14px 4px 14px',
    padding: '9px 11px',
    fontSize: '13px',
    lineHeight: 1.4,
    whiteSpace: 'pre-wrap',
  },
  disabledWrap: {
    margin: 'auto 0',
    textAlign: 'center',
    backgroundColor: '#ffffff',
    border: '1px solid #dcfce7',
    borderRadius: '12px',
    padding: '18px 14px',
    color: '#6b7280',
    fontSize: '13px',
    lineHeight: 1.45,
  },
  inputRow: {
    display: 'flex',
    gap: '8px',
    padding: '10px',
    borderTop: '1px solid #dcfce7',
    backgroundColor: '#ffffff',
  },
  input: {
    flex: 1,
    border: '1px solid #d1d5db',
    borderRadius: '12px',
    padding: '10px 12px',
    fontSize: '13px',
    outline: 'none',
  },
  sendBtn: {
    border: 'none',
    borderRadius: '12px',
    padding: '0 14px',
    backgroundColor: '#15803d',
    color: '#ffffff',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: '12px',
  },
  loaderBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    border: '1px solid #dcfce7',
    borderRadius: '14px 14px 14px 4px',
    padding: '9px 11px',
    color: '#6b7280',
    fontSize: '12px',
  },
}

const keyframes = `
@keyframes chatOpen {
  0% { opacity: 0; transform: scale(0.93) translateY(12px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
`

function ChatWidget({ enabled }) {
  const { authHeaders } = useAuth()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hola. Soy el asistente ONOFF. ¿En qué proceso necesitas ayuda?' },
  ])
  const endRef = useRef(null)

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loading, open])

  const sendMessage = async () => {
    const message = input.trim()
    if (!message || !enabled || loading) return

    setMessages((prev) => [...prev, { role: 'user', text: message }])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ message }),
      })

      if (!res.ok) {
        const err = await res.json()
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: err.detail || 'No fue posible obtener respuesta.' },
        ])
        return
      }

      const data = await res.json()
      setMessages((prev) => [...prev, { role: 'assistant', text: data.answer || 'Sin respuesta.' }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Error de conexión con el servidor.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = (e) => {
    e.preventDefault()
    sendMessage()
  }

  if (!open) {
    return (
      <>
        <style>{keyframes}</style>
        <button
          style={styles.floatingBtn}
          onClick={() => setOpen(true)}
          title="Abrir asistente"
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.07)'
            e.currentTarget.style.boxShadow = '0 10px 26px rgba(21,128,61,0.45)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = '0 8px 22px rgba(21,128,61,0.35)'
          }}
        >
          💬
        </button>
      </>
    )
  }

  return (
    <>
      <style>{keyframes}</style>
      <section style={styles.panel}>
        <header style={styles.header}>
          <div style={styles.titleWrap}>
            <span style={styles.title}>Asistente ONOFF</span>
            <span style={styles.subtitle}>{enabled ? 'En línea' : 'Desactivado'}</span>
          </div>
          <button style={styles.closeBtn} onClick={() => setOpen(false)} title="Cerrar">
            ×
          </button>
        </header>

        <div style={styles.body}>
          {!enabled ? (
            <div style={styles.disabledWrap}>
              El chatbot está desactivado temporalmente.
              <br />
              Contacta al administrador para activarlo.
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div
                  key={`${msg.role}-${idx}`}
                  style={msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant}
                >
                  {msg.text}
                </div>
              ))}
              {loading && <div style={styles.loaderBubble}>Escribiendo...</div>}
              <div ref={endRef} />
            </>
          )}
        </div>

        <form style={styles.inputRow} onSubmit={onSubmit}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={enabled ? 'Escribe tu pregunta...' : 'Asistente desactivado'}
            disabled={!enabled || loading}
            style={{
              ...styles.input,
              backgroundColor: enabled ? '#ffffff' : '#f3f4f6',
              cursor: enabled ? 'text' : 'not-allowed',
            }}
          />
          <button
            type="submit"
            disabled={!enabled || loading || !input.trim()}
            style={{
              ...styles.sendBtn,
              backgroundColor: enabled && input.trim() ? '#15803d' : '#9ca3af',
              cursor: enabled && input.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Enviar
          </button>
        </form>
      </section>
    </>
  )
}

export default ChatWidget

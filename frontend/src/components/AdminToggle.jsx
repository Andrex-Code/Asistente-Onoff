import React from 'react'

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
    marginBottom: '20px',
    lineHeight: '1.5',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #f3f4f6',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  switchArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  badge: {
    fontSize: '12px',
    fontWeight: 600,
    padding: '2px 10px',
    borderRadius: '10px',
  },
  switchTrack: {
    width: '48px',
    height: '26px',
    borderRadius: '13px',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
    position: 'relative',
    flexShrink: 0,
  },
  switchThumb: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    position: 'absolute',
    top: '3px',
    transition: 'left 0.3s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  },
  note: {
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '14px',
    fontStyle: 'italic',
  },
}

function AdminToggle({ enabled, onToggle }) {
  return (
    <div style={styles.container}>
      <p style={styles.title}>Estado del Chatbot</p>
      <p style={styles.description}>
        Configura el estado del Chatbot interno. Si está desactivado, no aparecerá en el asistente web.
      </p>
      <div style={styles.row}>
        <span style={styles.label}>Chatbot Activado</span>
        <div style={styles.switchArea}>
          <span style={{
            ...styles.badge,
            backgroundColor: enabled ? '#dcfce7' : '#fee2e2',
            color: enabled ? '#16a34a' : '#dc2626',
          }}>
            {enabled ? 'ON' : 'OFF'}
          </span>
          <div
            style={{ ...styles.switchTrack, backgroundColor: enabled ? '#16a34a' : '#d1d5db' }}
            onClick={onToggle}
          >
            <div style={{ ...styles.switchThumb, left: enabled ? '25px' : '3px' }} />
          </div>
        </div>
      </div>
      <p style={styles.note}>
        {enabled
          ? 'El chatbot está activo y visible para los usuarios.'
          : 'El chatbot está desactivado. No se mostrará en el asistente web.'}
      </p>
    </div>
  )
}

export default AdminToggle

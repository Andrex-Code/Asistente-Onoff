import React from 'react'

const styles = {
  container: {
    width: '100%',
  },
  backBtn: {
    backgroundColor: 'transparent',
    color: '#16a34a',
    border: 'none',
    padding: '0',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  title: {
    fontSize: '17px',
    fontWeight: 700,
    color: '#1a3c2a',
    marginBottom: '4px',
  },
  filename: {
    fontSize: '12px',
    color: '#9ca3af',
    marginBottom: '16px',
  },
  divider: {
    height: '1px',
    backgroundColor: '#f3f4f6',
    margin: '0 0 16px 0',
  },
  content: {
    fontSize: '14px',
    lineHeight: '1.8',
    color: '#374151',
    whiteSpace: 'pre-line',
  },
}

function TopicDetail({ topic, onBack }) {
  const cleanTitle = topic.title.replace(/^\d+[\.\)\-]+\s*/, '')

  return (
    <div style={styles.container}>
      <button
        style={styles.backBtn}
        onClick={onBack}
        onMouseEnter={(e) => (e.target.style.textDecoration = 'underline')}
        onMouseLeave={(e) => (e.target.style.textDecoration = 'none')}
      >
        ← Volver a temas
      </button>
      <div style={styles.card}>
        <h2 style={styles.title}>{cleanTitle}</h2>
        <p style={styles.filename}>Fuente: {topic.filename}</p>
        <div style={styles.divider} />
        <p style={styles.content}>{topic.content}</p>
      </div>
    </div>
  )
}

export default TopicDetail

import React from 'react'

const styles = {
  container: {
    width: '100%',
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '12px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '12px 16px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  chevron: {
    color: '#9ca3af',
    fontSize: '16px',
    flexShrink: 0,
  },
  empty: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: '13px',
    padding: '12px 0',
  },
}

function TopicList({ topics, onTopicClick }) {
  if (!topics || topics.length === 0) {
    return (
      <div style={styles.container}>
        <p style={styles.title}>Temas Comunes:</p>
        <p style={styles.empty}>Sube un PDF desde Admin para ver los temas.</p>
      </div>
    )
  }

  // Clean title: remove leading number + dot (e.g. "1. Anulación" -> "Anulación de Factura")
  const cleanTitle = (title) => title.replace(/^\d+[\.\)\-]+\s*/, '')

  return (
    <div style={styles.container}>
      <p style={styles.title}>Temas Comunes:</p>
      <div style={styles.grid}>
        {topics.map((topic, i) => (
          <div
            key={i}
            style={styles.card}
            onClick={() => onTopicClick(topic)}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#16a34a'
              e.currentTarget.style.backgroundColor = '#f0fdf4'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb'
              e.currentTarget.style.backgroundColor = '#ffffff'
            }}
          >
            <span>{cleanTitle(topic.title)}</span>
            <span style={styles.chevron}>›</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TopicList

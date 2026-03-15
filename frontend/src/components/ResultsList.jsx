import React, { useState } from 'react'

const styles = {
  container: {
    width: '100%',
  },
  header: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    backgroundColor: '#dcfce7',
    color: '#16a34a',
    fontSize: '12px',
    fontWeight: 600,
    padding: '2px 10px',
    borderRadius: '10px',
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    marginBottom: '10px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  cardTitleArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1a3c2a',
  },
  cardPreview: {
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: '1.4',
  },
  chevron: {
    fontSize: '18px',
    color: '#9ca3af',
    transition: 'transform 0.2s',
    flexShrink: 0,
    marginLeft: '12px',
  },
  cardBody: {
    padding: '0 18px 16px 18px',
    borderTop: '1px solid #f3f4f6',
  },
  content: {
    fontSize: '14px',
    lineHeight: '1.8',
    color: '#374151',
    whiteSpace: 'pre-line',
    paddingTop: '12px',
  },
  filename: {
    fontSize: '11px',
    color: '#9ca3af',
    marginTop: '10px',
  },
  noResults: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: '14px',
    padding: '24px 0',
  },
}

function ResultCard({ result }) {
  const [expanded, setExpanded] = useState(false)

  const preview = result.content.split('\n').filter(l => l.trim())[0] || ''
  const previewText = preview.length > 100 ? preview.slice(0, 100) + '...' : preview

  return (
    <div style={styles.card}>
      <div
        style={styles.cardHeader}
        onClick={() => setExpanded(!expanded)}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
      >
        <div style={styles.cardTitleArea}>
          <span style={styles.cardTitle}>{result.title}</span>
          {!expanded && <span style={styles.cardPreview}>{previewText}</span>}
        </div>
        <span style={{ ...styles.chevron, transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
          ›
        </span>
      </div>
      {expanded && (
        <div style={styles.cardBody}>
          <p style={styles.content}>{result.content}</p>
          <p style={styles.filename}>Fuente: {result.filename}</p>
        </div>
      )}
    </div>
  )
}

function ResultsList({ results, query }) {
  if (!query) return null

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span>Resultados de búsqueda:</span>
        {results.length > 0 && <span style={styles.badge}>{results.length} encontrados</span>}
      </div>
      {results.length === 0 ? (
        <p style={styles.noResults}>
          No se encontraron coincidencias para "{query}". Intenta con otro término.
        </p>
      ) : (
        results.map((r, i) => <ResultCard key={i} result={r} />)
      )}
    </div>
  )
}

export default ResultsList

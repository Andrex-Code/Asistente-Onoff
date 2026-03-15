import React, { useState } from 'react'

const styles = {
  container: {
    width: '100%',
  },
  label: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '8px',
    display: 'block',
  },
  form: {
    display: 'flex',
    gap: '10px',
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
    backgroundColor: '#ffffff',
  },
  button: {
    padding: '12px 28px',
    backgroundColor: '#1a3c2a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    whiteSpace: 'nowrap',
  },
}

function SearchBar({ onSearch }) {
  const [query, setQuery] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (query.trim()) {
      onSearch(query.trim())
    }
  }

  return (
    <div style={styles.container}>
      <label style={styles.label}>Buscar Información:</label>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          placeholder="Escribe un tema o función..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={styles.input}
          onFocus={(e) => (e.target.style.borderColor = '#16a34a')}
          onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
        />
        <button
          type="submit"
          style={styles.button}
          onMouseEnter={(e) => (e.target.style.backgroundColor = '#15803d')}
          onMouseLeave={(e) => (e.target.style.backgroundColor = '#1a3c2a')}
        >
          Buscar
        </button>
      </form>
    </div>
  )
}

export default SearchBar

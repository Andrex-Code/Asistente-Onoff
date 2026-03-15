import React, { useEffect, useState } from 'react'
import ChatWidget from '../components/ChatWidget.jsx'
import { API_URL } from '../api.js'
import { useAuth } from '../AuthContext.jsx'
import onoffLogo from '../../onoff_logo.jpg'

const palette = {
  forest: '#18492E',
  leaf: '#41A52B',
  mint: '#DDF3D8',
  cloud: '#F6FBF5',
  cream: '#FFFDFC',
  ink: '#163022',
  slate: '#5F6F68',
  line: '#D7E7D2',
}

const styles = {
  page: {
    paddingTop: '56px',
    minHeight: '100vh',
    background:
      'radial-gradient(circle at top left, rgba(65,165,43,0.14), transparent 24%), linear-gradient(180deg, #f7fbf6 0%, #eef6ee 48%, #f8fafc 100%)',
  },
  main: {
    maxWidth: '1120px',
    margin: '0 auto',
    padding: '26px 24px 56px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  hero: {
    borderRadius: '28px',
    padding: '26px',
    background: 'linear-gradient(135deg, #153A25 0%, #1C4B2F 55%, #41A52B 100%)',
    boxShadow: '0 24px 50px rgba(22, 48, 34, 0.16)',
    color: '#ffffff',
  },
  heroTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginBottom: '14px',
  },
  logo: {
    width: '64px',
    height: '64px',
    objectFit: 'cover',
    borderRadius: '18px',
    backgroundColor: '#ffffff',
    padding: '6px',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '7px 11px',
    borderRadius: '999px',
    backgroundColor: 'rgba(255,255,255,0.12)',
    color: '#E9F7E6',
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: '10px',
  },
  title: {
    fontSize: 'clamp(30px, 4vw, 46px)',
    lineHeight: 1.02,
    fontWeight: 800,
    letterSpacing: '-0.04em',
    maxWidth: '760px',
  },
  subtitle: {
    marginTop: '10px',
    maxWidth: '700px',
    fontSize: '15px',
    lineHeight: 1.7,
    color: 'rgba(243, 252, 241, 0.92)',
  },
  searchPanel: {
    marginTop: '18px',
    padding: '18px',
    borderRadius: '24px',
    backgroundColor: 'rgba(255,255,255,0.14)',
    border: '1px solid rgba(255,255,255,0.14)',
    backdropFilter: 'blur(10px)',
  },
  searchLabel: {
    fontSize: '12px',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#DCFCE7',
    marginBottom: '10px',
  },
  searchForm: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    gap: '10px',
  },
  searchInput: {
    width: '100%',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: '18px',
    padding: '18px 18px',
    fontSize: '16px',
    outline: 'none',
    backgroundColor: '#ffffff',
    color: palette.ink,
  },
  searchButton: {
    border: 'none',
    borderRadius: '18px',
    padding: '0 22px',
    backgroundColor: palette.cream,
    color: palette.forest,
    fontSize: '14px',
    fontWeight: 800,
    cursor: 'pointer',
    minWidth: '132px',
  },
  quickRow: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    marginTop: '12px',
  },
  chip: {
    border: '1px solid rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#ffffff',
    borderRadius: '999px',
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.45fr) minmax(260px, 0.7fr)',
    gap: '20px',
    alignItems: 'start',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    border: `1px solid ${palette.line}`,
    borderRadius: '24px',
    padding: '22px',
    boxShadow: '0 14px 32px rgba(22, 48, 34, 0.06)',
  },
  sectionKicker: {
    fontSize: '11px',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: palette.leaf,
    marginBottom: '8px',
  },
  sectionTitle: {
    fontSize: '26px',
    fontWeight: 800,
    color: palette.ink,
    marginBottom: '10px',
    lineHeight: 1.15,
  },
  sectionText: {
    fontSize: '14px',
    lineHeight: 1.7,
    color: palette.slate,
  },
  message: {
    marginTop: '16px',
    padding: '13px 15px',
    borderRadius: '16px',
    fontSize: '14px',
    lineHeight: 1.6,
  },
  error: {
    backgroundColor: '#FEF2F2',
    color: '#B91C1C',
    border: '1px solid #FECACA',
  },
  loading: {
    backgroundColor: '#F0FDF4',
    color: palette.forest,
    border: `1px solid ${palette.line}`,
  },
  resultList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    marginTop: '18px',
  },
  resultCard: {
    padding: '18px',
    borderRadius: '20px',
    backgroundColor: '#ffffff',
    border: `1px solid ${palette.line}`,
  },
  resultTitle: {
    fontSize: '17px',
    fontWeight: 800,
    color: palette.ink,
    marginBottom: '8px',
  },
  resultText: {
    fontSize: '14px',
    lineHeight: 1.75,
    color: palette.slate,
    whiteSpace: 'pre-line',
  },
  resultMeta: {
    marginTop: '10px',
    fontSize: '12px',
    color: '#7A8B82',
  },
  detailBack: {
    border: 'none',
    backgroundColor: 'transparent',
    color: palette.leaf,
    fontSize: '13px',
    fontWeight: 800,
    cursor: 'pointer',
    marginBottom: '14px',
    padding: 0,
  },
  detailTitle: {
    fontSize: '28px',
    lineHeight: 1.1,
    color: palette.ink,
    fontWeight: 800,
  },
  detailSource: {
    marginTop: '10px',
    fontSize: '12px',
    color: '#7A8B82',
  },
  detailBody: {
    marginTop: '18px',
    paddingTop: '18px',
    borderTop: `1px solid ${palette.line}`,
    fontSize: '15px',
    lineHeight: 1.85,
    color: palette.slate,
    whiteSpace: 'pre-line',
  },
  topicsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '12px',
    marginTop: '18px',
  },
  topicCard: {
    padding: '16px',
    borderRadius: '20px',
    backgroundColor: '#ffffff',
    border: `1px solid ${palette.line}`,
    cursor: 'pointer',
  },
  topicTitle: {
    fontSize: '15px',
    fontWeight: 800,
    color: palette.ink,
    marginBottom: '6px',
  },
  topicText: {
    fontSize: '13px',
    lineHeight: 1.65,
    color: palette.slate,
  },
  topicMeta: {
    marginTop: '10px',
    fontSize: '12px',
    color: '#7A8B82',
    fontWeight: 700,
  },
  sideStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  miniStatGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '10px',
    marginTop: '14px',
  },
  miniStat: {
    padding: '14px',
    borderRadius: '18px',
    backgroundColor: palette.cloud,
    border: `1px solid ${palette.line}`,
  },
  miniValue: {
    fontSize: '22px',
    fontWeight: 800,
    color: palette.ink,
  },
  miniLabel: {
    marginTop: '4px',
    fontSize: '12px',
    lineHeight: 1.55,
    color: palette.slate,
  },
  assistantBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '7px 11px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 800,
    marginBottom: '10px',
  },
  helperList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '12px',
  },
  helperItem: {
    padding: '12px 14px',
    borderRadius: '16px',
    backgroundColor: palette.cloud,
    border: `1px solid ${palette.line}`,
    fontSize: '13px',
    lineHeight: 1.65,
    color: palette.slate,
  },
}

const cleanTitle = (title = '') => title.replace(/^\d+[\.\)\-]+\s*/, '').trim()
const previewText = (text = '', limit = 120) => (text.length > limit ? `${text.slice(0, limit)}...` : text)

function Home() {
  const { authHeaders, hasPermission } = useAuth()
  const [results, setResults] = useState([])
  const [query, setQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [chatbotEnabled, setChatbotEnabled] = useState(false)
  const [topics, setTopics] = useState([])
  const [documents, setDocuments] = useState([])
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [isCompact, setIsCompact] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 940 : false))

  useEffect(() => {
    fetchConfig()
    fetchTopics()
    fetchDocuments()
  }, [])

  useEffect(() => {
    const onResize = () => setIsCompact(window.innerWidth < 940)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API_URL}/config`, { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        setChatbotEnabled(data.chatbot_enabled)
      }
    } catch {}
  }

  const fetchTopics = async () => {
    try {
      const res = await fetch(`${API_URL}/topics`, { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        setTopics(data.topics || [])
      }
    } catch {}
  }

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_URL}/documents`, { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        setDocuments(data.documents || [])
      }
    } catch {}
  }

  const handleSearch = async (searchQuery) => {
    const cleanQuery = searchQuery.trim()
    if (!cleanQuery) return

    setSelectedTopic(null)
    setQuery(cleanQuery)
    setSearchInput(cleanQuery)
    setLoading(true)
    setError('')
    setResults([])

    try {
      const res = await fetch(`${API_URL}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ query: cleanQuery }),
      })

      if (!res.ok) {
        const err = await res.json()
        setError(err.detail || 'Error en la busqueda.')
        return
      }

      const data = await res.json()
      setResults(data.results || [])
    } catch {
      setError('Error de conexion con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    handleSearch(searchInput)
  }

  const handleTopicClick = (topic) => {
    setSelectedTopic(topic)
    setQuery('')
    setResults([])
    setError('')
  }

  const featuredTopics = topics.slice(0, 6)
  const suggestedQueries = featuredTopics.slice(0, 4).map((topic) => cleanTitle(topic.title))
  const chatAvailable = chatbotEnabled && hasPermission('can_use_chat')

  return (
    <div style={styles.page}>
      <div style={styles.main}>
        <section style={styles.hero}>
          <div style={styles.heroTop}>
            <img src={onoffLogo} alt="Logo ONOFF" style={styles.logo} />
            <div>
              <div style={styles.badge}>Base de conocimiento ONOFF</div>
              <h1 style={styles.title}>Busca primero. Todo lo demas es apoyo.</h1>
            </div>
          </div>

          <p style={styles.subtitle}>
            El buscador es el punto principal de esta pantalla: escribe un proceso, una politica, un paso o una duda
            operativa y encuentra la informacion mas rapido.
          </p>

          <div style={styles.searchPanel}>
            <div style={styles.searchLabel}>Busqueda principal</div>
            <form
              style={{
                ...styles.searchForm,
                gridTemplateColumns: isCompact ? '1fr' : styles.searchForm.gridTemplateColumns,
              }}
              onSubmit={handleSearchSubmit}
            >
              <input
                id="home-search-input"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Ejemplo: devoluciones, escalamiento, garantia, mensaje al cliente"
                style={styles.searchInput}
              />
              <button type="submit" style={styles.searchButton}>
                Buscar
              </button>
            </form>

            <div style={styles.quickRow}>
              {suggestedQueries.map((item) => (
                <button key={item} type="button" style={styles.chip} onClick={() => handleSearch(item)}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section
          style={{
            ...styles.layout,
            gridTemplateColumns: isCompact ? '1fr' : styles.layout.gridTemplateColumns,
          }}
        >
          <div style={styles.card}>
            {loading && <div style={{ ...styles.message, ...styles.loading }}>Buscando informacion en la base...</div>}
            {error && <div style={{ ...styles.message, ...styles.error }}>{error}</div>}

            {selectedTopic ? (
              <div>
                <button style={styles.detailBack} onClick={() => setSelectedTopic(null)}>
                  Volver a destacados
                </button>
                <h2 style={styles.detailTitle}>{cleanTitle(selectedTopic.title)}</h2>
                <p style={styles.detailSource}>Fuente: {selectedTopic.filename}</p>
                <div style={styles.detailBody}>{selectedTopic.content}</div>
              </div>
            ) : query ? (
              <div>
                <div style={styles.sectionKicker}>Resultados</div>
                <h2 style={styles.sectionTitle}>Resultados para "{query}"</h2>
                <p style={styles.sectionText}>Aqui aparece el contenido encontrado por el buscador.</p>

                <div style={styles.resultList}>
                  {results.length === 0 && !loading ? (
                    <div style={styles.resultCard}>
                      <div style={styles.resultTitle}>Sin coincidencias</div>
                      <div style={styles.resultText}>
                        No encontramos resultados para esta consulta. Prueba con otro termino o usa uno de los accesos
                        rapidos.
                      </div>
                    </div>
                  ) : (
                    results.map((result, index) => (
                      <div key={`${result.document_id}-${index}`} style={styles.resultCard}>
                        <div style={styles.resultTitle}>{cleanTitle(result.title)}</div>
                        <div style={styles.resultText}>{result.content}</div>
                        <div style={styles.resultMeta}>Fuente: {result.filename}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div style={styles.sectionKicker}>Destacados</div>
                <h2 style={styles.sectionTitle}>Temas frecuentes para abrir con un clic</h2>
                <p style={styles.sectionText}>
                  Si todavia no tienes una consulta exacta, empieza por estos temas comunes.
                </p>

                <div
                  style={{
                    ...styles.topicsGrid,
                    gridTemplateColumns: isCompact ? '1fr' : styles.topicsGrid.gridTemplateColumns,
                  }}
                >
                  {featuredTopics.length === 0 ? (
                    <div style={styles.resultCard}>
                      <div style={styles.resultTitle}>No hay temas cargados</div>
                      <div style={styles.resultText}>
                        Sube contenido desde administracion para empezar a usar la base de conocimiento.
                      </div>
                    </div>
                  ) : (
                    featuredTopics.map((topic, index) => (
                      <button key={`${topic.document_id}-${index}`} type="button" style={styles.topicCard} onClick={() => handleTopicClick(topic)}>
                        <div style={styles.topicTitle}>{cleanTitle(topic.title)}</div>
                        <div style={styles.topicText}>{previewText(topic.content)}</div>
                        <div style={styles.topicMeta}>{topic.filename}</div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <aside style={styles.sideStack}>
            <div style={styles.card}>
              <div style={styles.sectionKicker}>Estado rapido</div>
              <h3 style={{ ...styles.sectionTitle, fontSize: '22px' }}>Resumen</h3>
              <div style={styles.miniStatGrid}>
                <div style={styles.miniStat}>
                  <div style={styles.miniValue}>{documents.length}</div>
                  <div style={styles.miniLabel}>documentos cargados</div>
                </div>
                <div style={styles.miniStat}>
                  <div style={styles.miniValue}>{topics.length}</div>
                  <div style={styles.miniLabel}>temas disponibles</div>
                </div>
                <div style={styles.miniStat}>
                  <div style={styles.miniValue}>{chatAvailable ? 'ON' : 'OFF'}</div>
                  <div style={styles.miniLabel}>estado del asistente</div>
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <div
                style={{
                  ...styles.assistantBadge,
                  backgroundColor: chatAvailable ? '#ECFCCB' : '#F3F4F6',
                  color: chatAvailable ? '#3F6212' : '#6B7280',
                }}
              >
                {chatAvailable ? 'Asistente disponible' : 'Asistente inactivo'}
              </div>
              <div style={{ ...styles.sectionTitle, fontSize: '22px', marginBottom: '8px' }}>Apoyo conversacional</div>
              <p style={styles.sectionText}>
                El bot sigue disponible como apoyo, pero el foco principal de esta pantalla es encontrar informacion con el buscador.
              </p>
              <div style={styles.helperList}>
                <div style={styles.helperItem}>Usa el chat para confirmar pasos, requisitos y excepciones.</div>
                <div style={styles.helperItem}>Si algo no queda claro, abre el tema fuente desde los resultados.</div>
              </div>
            </div>
          </aside>
        </section>
      </div>

      <ChatWidget enabled={chatAvailable} />
    </div>
  )
}

export default Home

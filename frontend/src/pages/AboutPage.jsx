import React from 'react'

const styles = {
  page: {
    paddingTop: '56px',
    minHeight: '100vh',
    background:
      'radial-gradient(circle at top left, rgba(22,163,74,0.16), transparent 32%), linear-gradient(180deg, #f6fbf7 0%, #eef5f1 48%, #f8fafc 100%)',
  },
  hero: {
    maxWidth: '1180px',
    margin: '0 auto',
    padding: '40px 24px 24px',
  },
  heroPanel: {
    overflow: 'hidden',
    position: 'relative',
    borderRadius: '28px',
    padding: '34px',
    background: 'linear-gradient(135deg, #163726 0%, #214d35 55%, #2b6a47 100%)',
    boxShadow: '0 24px 60px rgba(17, 24, 39, 0.18)',
    color: '#ffffff',
  },
  glow: {
    position: 'absolute',
    borderRadius: '999px',
    background: 'rgba(163, 230, 53, 0.16)',
    filter: 'blur(18px)',
  },
  heroGrid: {
    position: 'relative',
    zIndex: 1,
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.7fr) minmax(280px, 0.9fr)',
    gap: '24px',
    alignItems: 'stretch',
  },
  eyebrow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '999px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#d9f99d',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: '18px',
  },
  title: {
    fontSize: 'clamp(34px, 5vw, 56px)',
    lineHeight: 1.02,
    fontWeight: 800,
    letterSpacing: '-0.04em',
    maxWidth: '760px',
  },
  lead: {
    marginTop: '18px',
    maxWidth: '700px',
    fontSize: '17px',
    lineHeight: 1.75,
    color: 'rgba(240, 253, 244, 0.9)',
  },
  heroStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '12px',
    marginTop: '26px',
  },
  statCard: {
    borderRadius: '18px',
    padding: '16px 16px 18px',
    backgroundColor: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.1)',
    backdropFilter: 'blur(8px)',
  },
  statValue: {
    display: 'block',
    fontSize: '24px',
    fontWeight: 800,
    color: '#ffffff',
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '12px',
    lineHeight: 1.5,
    color: 'rgba(220, 252, 231, 0.86)',
  },
  summaryCard: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: '18px',
    borderRadius: '22px',
    padding: '24px',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))',
    border: '1px solid rgba(255,255,255,0.12)',
    minHeight: '100%',
  },
  summaryLabel: {
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#bbf7d0',
  },
  summaryTitle: {
    fontSize: '24px',
    lineHeight: 1.2,
    fontWeight: 700,
    marginTop: '10px',
  },
  summaryText: {
    marginTop: '12px',
    color: 'rgba(236, 253, 245, 0.88)',
    fontSize: '14px',
    lineHeight: 1.75,
  },
  bulletList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    listStyle: 'none',
    padding: 0,
  },
  bulletItem: {
    padding: '10px 12px',
    borderRadius: '14px',
    backgroundColor: 'rgba(15, 23, 42, 0.14)',
    color: '#f0fdf4',
    fontSize: '13px',
    lineHeight: 1.55,
  },
  main: {
    maxWidth: '1180px',
    margin: '0 auto',
    padding: '0 24px 56px',
    display: 'flex',
    flexDirection: 'column',
    gap: '22px',
  },
  sectionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
    gap: '22px',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    border: '1px solid rgba(209, 213, 219, 0.7)',
    borderRadius: '24px',
    padding: '26px',
    boxShadow: '0 16px 32px rgba(15, 23, 42, 0.06)',
    backdropFilter: 'blur(8px)',
  },
  wideCard: {
    gridColumn: 'span 7',
  },
  sideCard: {
    gridColumn: 'span 5',
  },
  fullCard: {
    gridColumn: '1 / -1',
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#15803d',
    marginBottom: '14px',
  },
  cardTitle: {
    fontSize: '28px',
    lineHeight: 1.15,
    fontWeight: 800,
    color: '#15261d',
    marginBottom: '12px',
  },
  cardText: {
    fontSize: '15px',
    lineHeight: 1.8,
    color: '#475569',
  },
  problemList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '12px',
    marginTop: '18px',
  },
  problemItem: {
    padding: '14px',
    borderRadius: '18px',
    background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
    border: '1px solid #e2e8f0',
  },
  problemNumber: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '999px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    fontSize: '13px',
    fontWeight: 800,
    marginBottom: '10px',
  },
  problemTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: '6px',
  },
  problemText: {
    fontSize: '13px',
    lineHeight: 1.65,
    color: '#64748b',
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  timelineItem: {
    padding: '14px 16px',
    borderRadius: '18px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
  },
  timelineStep: {
    fontSize: '12px',
    fontWeight: 800,
    color: '#15803d',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  timelineTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: '4px',
  },
  timelineText: {
    fontSize: '13px',
    lineHeight: 1.65,
    color: '#64748b',
  },
  capabilityGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: '14px',
    marginTop: '18px',
  },
  capabilityCard: {
    padding: '18px',
    borderRadius: '20px',
    background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
    border: '1px solid #e5e7eb',
  },
  capabilityTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: '8px',
  },
  capabilityText: {
    fontSize: '13px',
    lineHeight: 1.7,
    color: '#64748b',
  },
  closingPanel: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.2fr) minmax(280px, 0.8fr)',
    gap: '20px',
    alignItems: 'stretch',
  },
  closingBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '999px',
    backgroundColor: '#ecfccb',
    color: '#3f6212',
    fontSize: '12px',
    fontWeight: 700,
    marginBottom: '14px',
  },
  emphasis: {
    fontWeight: 700,
    color: '#163726',
  },
}

const challenges = [
  {
    title: 'Informacion dispersa',
    text: 'Los asesores suelen depender de varios archivos, mensajes y personas para resolver una sola duda.',
  },
  {
    title: 'Respuesta inconsistente',
    text: 'Cuando el conocimiento no esta centralizado, cada persona termina respondiendo con criterios distintos.',
  },
  {
    title: 'Busqueda lenta',
    text: 'Encontrar el paso correcto dentro de manuales largos o documentos desactualizados toma demasiado tiempo.',
  },
  {
    title: 'Curva de aprendizaje alta',
    text: 'Los nuevos integrantes tardan mas en operar cuando el conocimiento no tiene una estructura clara.',
  },
]

const workflow = [
  {
    step: '01',
    title: 'Cargar conocimiento',
    text: 'Se pueden subir PDFs, importar JSON estructurado o crear documentos por temas directamente desde el panel.',
  },
  {
    step: '02',
    title: 'Organizar por procesos y temas',
    text: 'Cada documento se divide en temas y fragmentos para facilitar edicion, busqueda y recuperacion contextual.',
  },
  {
    step: '03',
    title: 'Buscar o preguntar',
    text: 'El asesor puede localizar contenido rapido con busqueda o resolver dudas con apoyo del chatbot.',
  },
  {
    step: '04',
    title: 'Responder con mas seguridad',
    text: 'La operacion gana velocidad, consistencia y menos dependencia de memoria individual.',
  },
]

const capabilities = [
  {
    title: 'Base de conocimiento centralizada',
    text: 'Concentra procesos, politicas, guias y respuestas frecuentes en un solo lugar.',
  },
  {
    title: 'Busqueda semantica',
    text: 'Encuentra informacion relevante aunque el usuario no use exactamente las mismas palabras del documento.',
  },
  {
    title: 'Chatbot asistido por contenido interno',
    text: 'Responde con base en el material cargado, ideal para consultas operativas del dia a dia.',
  },
  {
    title: 'Permisos y administracion',
    text: 'Controla quien puede subir, editar, eliminar contenido o usar el asistente conversacional.',
  },
]

function AboutPage() {
  return (
    <div style={styles.page}>
      <section style={styles.hero}>
        <div style={styles.heroPanel}>
          <div style={{ ...styles.glow, width: '220px', height: '220px', top: '-50px', right: '-30px' }} />
          <div style={{ ...styles.glow, width: '180px', height: '180px', bottom: '-40px', left: '26%' }} />

          <div style={styles.heroGrid}>
            <div>
              <span style={styles.eyebrow}>Acerca del proyecto</span>
              <h1 style={styles.title}>
                Una base de conocimiento pensada para que el equipo encuentre respuestas sin perder tiempo.
              </h1>
              <p style={styles.lead}>
                Asistente ONOFF centraliza informacion operativa, la organiza por temas y la vuelve util para
                busqueda rapida y soporte conversacional. La meta no es solo guardar documentos: es convertirlos en
                una herramienta diaria para asesores, lideres y equipos de apoyo.
              </p>

              <div style={styles.heroStats}>
                <div style={styles.statCard}>
                  <span style={styles.statValue}>1 lugar</span>
                  <span style={styles.statLabel}>para concentrar procesos, politicas y respuestas frecuentes</span>
                </div>
                <div style={styles.statCard}>
                  <span style={styles.statValue}>3 formas</span>
                  <span style={styles.statLabel}>de cargar conocimiento: PDF, JSON estructurado o formulario manual</span>
                </div>
                <div style={styles.statCard}>
                  <span style={styles.statValue}>2 apoyos</span>
                  <span style={styles.statLabel}>para el asesor: busqueda directa y chatbot con contexto interno</span>
                </div>
              </div>
            </div>

            <aside style={styles.summaryCard}>
              <div>
                <span style={styles.summaryLabel}>Que resuelve</span>
                <h2 style={styles.summaryTitle}>Menos improvisacion. Mas claridad operativa.</h2>
                <p style={styles.summaryText}>
                  Cuando la informacion vive dispersa, las dudas simples se convierten en esperas, retrabajo y
                  respuestas inconsistentes. Esta plataforma busca que la respuesta correcta sea mas facil de encontrar
                  que preguntar varias veces.
                </p>
              </div>

              <ul style={styles.bulletList}>
                <li style={styles.bulletItem}>Ideal para procesos internos, politicas, flujos de atencion y guiones de apoyo.</li>
                <li style={styles.bulletItem}>Util para equipos que necesitan velocidad, consistencia y trazabilidad del conocimiento.</li>
                <li style={styles.bulletItem}>Escalable a medida que la empresa documenta mejor sus operaciones.</li>
              </ul>
            </aside>
          </div>
        </div>
      </section>

      <main style={styles.main}>
        <section style={styles.sectionGrid}>
          <article style={{ ...styles.card, ...styles.wideCard }}>
            <p style={styles.sectionTitle}>El problema</p>
            <h2 style={styles.cardTitle}>La informacion importante casi nunca falla por ausencia, sino por desorden.</h2>
            <p style={styles.cardText}>
              En muchas empresas el conocimiento existe, pero esta repartido entre manuales extensos, carpetas, chats,
              mensajes reenviados y personas que “se lo saben”. Eso vuelve lenta la operacion y hace que resolver una
              duda dependa demasiado de a quien se le pregunte.
            </p>

            <div style={styles.problemList}>
              {challenges.map((item, index) => (
                <div key={item.title} style={styles.problemItem}>
                  <span style={styles.problemNumber}>{index + 1}</span>
                  <h3 style={styles.problemTitle}>{item.title}</h3>
                  <p style={styles.problemText}>{item.text}</p>
                </div>
              ))}
            </div>
          </article>

          <aside style={{ ...styles.card, ...styles.sideCard }}>
            <p style={styles.sectionTitle}>Proposito</p>
            <h2 style={{ ...styles.cardTitle, fontSize: '24px' }}>Convertir documentos en decisiones utiles.</h2>
            <p style={styles.cardText}>
              El proyecto esta diseñado para que el conocimiento deje de ser solo archivo y se convierta en apoyo real
              para la operacion. Cada mejora del sistema apunta a una idea simple: <span style={styles.emphasis}>que el
              asesor encuentre la respuesta correcta de forma rapida, clara y confiable</span>.
            </p>
          </aside>
        </section>

        <section style={styles.sectionGrid}>
          <article style={{ ...styles.card, ...styles.sideCard }}>
            <p style={styles.sectionTitle}>Como funciona</p>
            <div style={styles.timeline}>
              {workflow.map((item) => (
                <div key={item.step} style={styles.timelineItem}>
                  <div style={styles.timelineStep}>Paso {item.step}</div>
                  <div style={styles.timelineTitle}>{item.title}</div>
                  <p style={styles.timelineText}>{item.text}</p>
                </div>
              ))}
            </div>
          </article>

          <article style={{ ...styles.card, ...styles.wideCard }}>
            <p style={styles.sectionTitle}>Capacidades actuales</p>
            <h2 style={styles.cardTitle}>Lo que hoy ya aporta la plataforma</h2>
            <p style={styles.cardText}>
              El sistema ya cubre los bloques esenciales para una primera version funcional dentro de una empresa:
              control de acceso, carga de contenido, organizacion por temas, recuperacion de informacion y soporte con
              IA sobre material interno.
            </p>

            <div style={styles.capabilityGrid}>
              {capabilities.map((item) => (
                <div key={item.title} style={styles.capabilityCard}>
                  <h3 style={styles.capabilityTitle}>{item.title}</h3>
                  <p style={styles.capabilityText}>{item.text}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section style={{ ...styles.card, ...styles.fullCard }}>
          <div style={styles.closingPanel}>
            <div>
              <span style={styles.closingBadge}>Vision de crecimiento</span>
              <h2 style={styles.cardTitle}>La mejor version de este proyecto no solo responde preguntas: ordena la operacion.</h2>
              <p style={styles.cardText}>
                A medida que la empresa consolide procesos en formatos mas estructurados, el valor del sistema crece.
                La plataforma puede convertirse en el punto de referencia para onboarding, consulta operativa,
                estandarizacion de respuestas y actualizacion continua del conocimiento interno.
              </p>
            </div>

            <div style={{ ...styles.capabilityCard, background: 'linear-gradient(180deg, #f0fdf4 0%, #ecfeff 100%)' }}>
              <h3 style={styles.capabilityTitle}>En una frase</h3>
              <p style={{ ...styles.capabilityText, fontSize: '14px', color: '#334155' }}>
                Asistente ONOFF busca que el conocimiento correcto llegue a la persona correcta en el momento correcto,
                sin depender de memoria, improvisacion o cadenas eternas de mensajes.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default AboutPage

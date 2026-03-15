import React, { useState } from 'react'
import { useAuth } from '../AuthContext.jsx'
import { useNavigate } from 'react-router-dom'

const styles = {
  wrapper: {
    paddingTop: '120px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    minHeight: '100vh',
    padding: '120px 24px 40px',
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    padding: '40px 36px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  },
  icon: {
    width: '48px',
    height: '48px',
    backgroundColor: '#f0fdf4',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    marginBottom: '20px',
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '28px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '6px',
    display: 'block',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '15px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
    marginBottom: '16px',
    boxSizing: 'border-box',
  },
  btn: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#16a34a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    marginTop: '8px',
  },
  error: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '16px',
  },
}

function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await login(email, password)
      navigate(data.user?.role === 'admin' ? '/admin' : '/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.icon}>*</div>
        <h1 style={styles.title}>Inicio de Sesion</h1>
        <p style={styles.subtitle}>Ingresa tus credenciales de usuario</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@empresa.com"
            style={styles.input}
            onFocus={(e) => (e.target.style.borderColor = '#16a34a')}
            onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
            required
          />

          <label style={styles.label}>Contrasena</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="******"
            style={styles.input}
            onFocus={(e) => (e.target.style.borderColor = '#16a34a')}
            onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
            required
          />

          <button
            type="submit"
            style={{
              ...styles.btn,
              opacity: loading ? 0.7 : 1,
            }}
            disabled={loading}
            onMouseEnter={(e) => (e.target.style.backgroundColor = '#15803d')}
            onMouseLeave={(e) => (e.target.style.backgroundColor = '#16a34a')}
          >
            {loading ? 'Ingresando...' : 'Iniciar Sesion'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default LoginPage

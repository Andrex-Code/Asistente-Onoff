import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../AuthContext.jsx'
import onoffLogo from '../../onoff_logo.jpg'

const styles = {
  header: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '56px',
    backgroundColor: '#1a3c2a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    zIndex: 1000,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    textDecoration: 'none',
  },
  logo: {
    width: '34px',
    height: '34px',
    objectFit: 'cover',
    borderRadius: '10px',
    backgroundColor: '#ffffff',
    padding: '3px',
  },
  brandText: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px',
  },
  brandBold: {
    color: '#ffffff',
    fontSize: '22px',
    fontWeight: 800,
    letterSpacing: '1px',
  },
  brandLight: {
    color: '#a3d9b1',
    fontSize: '16px',
    fontWeight: 400,
  },
  rightSide: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  link: {
    color: '#c8e6cf',
    textDecoration: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  linkActive: {
    color: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  userName: {
    color: '#e5f7ea',
    fontSize: '12px',
  },
  logoutBtn: {
    border: '1px solid rgba(255,255,255,0.25)',
    color: '#ffffff',
    background: 'transparent',
    borderRadius: '6px',
    padding: '5px 10px',
    fontSize: '12px',
    cursor: 'pointer',
  },
}

function Header() {
  const location = useLocation()
  const { token, isAdmin, user, logout, hasPermission } = useAuth()
  const canOpenAdmin =
    isAdmin ||
    hasPermission('can_upload') ||
    hasPermission('can_edit_documents') ||
    hasPermission('can_delete_documents')

  const isActive = (path) => location.pathname === path
  const linkStyle = (path) => ({
    ...styles.link,
    ...(isActive(path) ? styles.linkActive : {}),
  })

  return (
    <header style={styles.header}>
      <Link to={token ? '/' : '/login'} style={styles.brand}>
        <img src={onoffLogo} alt="Logo ONOFF" style={styles.logo} />
        <span style={styles.brandText}>
          <span style={styles.brandBold}>ONOFF</span>
          <span style={styles.brandLight}>Pereira</span>
        </span>
      </Link>
      <div style={styles.rightSide}>
        <nav style={styles.nav}>
          {token && <Link to="/" style={linkStyle('/')}>Inicio</Link>}
          {canOpenAdmin && <Link to="/admin" style={linkStyle('/admin')}>Gestion</Link>}
          <Link to="/acerca" style={linkStyle('/acerca')}>Acerca de</Link>
          {!token && <Link to="/login" style={linkStyle('/login')}>Login</Link>}
        </nav>
        {token && (
          <>
            <span style={styles.userName}>{user?.full_name || user?.email}</span>
            <button style={styles.logoutBtn} onClick={logout}>Salir</button>
          </>
        )}
      </div>
    </header>
  )
}

export default Header

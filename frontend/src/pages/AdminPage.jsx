import React, { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext.jsx'
import AdminToggle from '../components/AdminToggle.jsx'
import AdminStructuredForm from '../components/AdminStructuredForm.jsx'
import AdminUpload from '../components/AdminUpload.jsx'
import AdminDocumentList from '../components/AdminDocumentList.jsx'
import AdminUserManagement from '../components/AdminUserManagement.jsx'
import { API_URL } from '../api.js'

const styles = {
  page: {
    paddingTop: '56px',
    minHeight: '100vh',
    display: 'flex',
  },
  sidebar: {
    width: '230px',
    backgroundColor: '#ffffff',
    borderRight: '1px solid #e5e7eb',
    padding: '24px 0',
    flexShrink: 0,
    minHeight: 'calc(100vh - 56px)',
  },
  sidebarItem: {
    display: 'block',
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#6b7280',
    cursor: 'pointer',
    transition: 'all 0.15s',
    border: 'none',
    background: 'none',
    width: '100%',
    textAlign: 'left',
    borderLeft: '3px solid transparent',
  },
  sidebarItemActive: {
    color: '#1a3c2a',
    fontWeight: 600,
    backgroundColor: '#f0fdf4',
    borderLeftColor: '#16a34a',
  },
  content: {
    flex: 1,
    padding: '32px 36px',
    maxWidth: '980px',
  },
  topRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  pageTitle: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#1a3c2a',
  },
  logoutBtn: {
    backgroundColor: '#ffffff',
    color: '#dc2626',
    border: '1px solid #fecaca',
    padding: '7px 16px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '24px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
}

const tabs = [
  { id: 'docs', label: 'Base de conocimiento' },
  { id: 'chatbot', label: 'Gestion del Chatbot' },
  { id: 'users', label: 'Usuarios y Permisos' },
]

function AdminPage() {
  const { authHeaders, logout, isAdmin, hasPermission } = useAuth()
  const canManageDocs =
    isAdmin ||
    hasPermission('can_upload') ||
    hasPermission('can_edit_documents') ||
    hasPermission('can_delete_documents')
  const canManageUsers = isAdmin
  const canManageChatbot = isAdmin

  const availableTabs = tabs.filter((tab) => {
    if (tab.id === 'docs') return canManageDocs
    if (tab.id === 'chatbot') return canManageChatbot
    if (tab.id === 'users') return canManageUsers
    return false
  })

  const [activeTab, setActiveTab] = useState(availableTabs[0]?.id || 'docs')
  const [chatbotEnabled, setChatbotEnabled] = useState(false)
  const [documents, setDocuments] = useState([])
  const [users, setUsers] = useState([])

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API_URL}/config`, {
        headers: authHeaders(),
      })
      if (res.ok) {
        const data = await res.json()
        setChatbotEnabled(data.chatbot_enabled)
      }
    } catch {}
  }

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_URL}/documents`, {
        headers: authHeaders(),
      })
      if (res.ok) {
        const data = await res.json()
        setDocuments(data.documents)
      }
    } catch {}
  }

  const fetchUsers = async () => {
    if (!isAdmin) return
    try {
      const res = await fetch(`${API_URL}/users`, {
        headers: authHeaders(),
      })
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
    } catch {}
  }

  const handleToggle = async () => {
    const newValue = !chatbotEnabled
    try {
      const res = await fetch(`${API_URL}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ chatbot_enabled: newValue }),
      })
      if (res.ok) {
        setChatbotEnabled(newValue)
      }
    } catch {}
  }

  useEffect(() => {
    fetchConfig()
    fetchDocuments()
    fetchUsers()
  }, [])

  useEffect(() => {
    if (!availableTabs.find((t) => t.id === activeTab)) {
      setActiveTab(availableTabs[0]?.id || '')
    }
  }, [activeTab, availableTabs])

  if (!canManageDocs && !canManageUsers && !canManageChatbot) {
    return (
      <div style={{ ...styles.page, display: 'block', padding: '96px 24px' }}>
        <h2 style={styles.pageTitle}>Sin permisos de gestion</h2>
        <p style={styles.subtitle}>Tu cuenta no tiene permisos para administrar contenido.</p>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <nav style={styles.sidebar}>
        {availableTabs.map((tab) => (
          <button
            key={tab.id}
            style={{
              ...styles.sidebarItem,
              ...(activeTab === tab.id ? styles.sidebarItemActive : {}),
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div style={styles.content}>
        <div style={styles.topRow}>
          <h1 style={styles.pageTitle}>Panel de Administracion</h1>
          <button style={styles.logoutBtn} onClick={logout}>Cerrar sesion</button>
        </div>
        <p style={styles.subtitle}>
          {activeTab === 'docs' && 'Gestion de procesos, documentos y conocimiento estructurado'}
          {activeTab === 'chatbot' && 'Control del estado del chatbot'}
          {activeTab === 'users' && 'Cuentas, roles y permisos'}
        </p>

        <div style={styles.section}>
          {activeTab === 'docs' && canManageDocs && (
            <>
              <AdminStructuredForm
                onCreated={fetchDocuments}
                authHeaders={authHeaders}
                canUpload={isAdmin || hasPermission('can_upload')}
              />
              <AdminUpload
                onUploaded={fetchDocuments}
                authHeaders={authHeaders}
                canUpload={isAdmin || hasPermission('can_upload')}
              />
              <AdminDocumentList
                documents={documents}
                onDeleted={fetchDocuments}
                onUpdated={fetchDocuments}
                authHeaders={authHeaders}
                canEdit={isAdmin || hasPermission('can_edit_documents')}
                canDelete={isAdmin || hasPermission('can_delete_documents')}
              />
            </>
          )}
          {activeTab === 'chatbot' && canManageChatbot && (
            <AdminToggle enabled={chatbotEnabled} onToggle={handleToggle} />
          )}
          {activeTab === 'users' && canManageUsers && (
            <AdminUserManagement users={users} authHeaders={authHeaders} onReload={fetchUsers} />
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminPage

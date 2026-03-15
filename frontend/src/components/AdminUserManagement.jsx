import React, { useState } from 'react'
import { API_URL } from '../api.js'

const styles = {
  container: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#111827',
  },
  row: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  input: {
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '8px 10px',
    fontSize: '13px',
    minWidth: '160px',
  },
  select: {
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '8px 10px',
    fontSize: '13px',
    minWidth: '120px',
    backgroundColor: '#fff',
  },
  btn: {
    border: '1px solid #d1d5db',
    backgroundColor: '#fff',
    color: '#111827',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  primaryBtn: {
    backgroundColor: '#16a34a',
    color: '#fff',
    borderColor: '#16a34a',
  },
  card: {
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  label: {
    fontSize: '12px',
    color: '#6b7280',
  },
  small: {
    fontSize: '12px',
    color: '#6b7280',
  },
  statusOk: {
    fontSize: '12px',
    color: '#15803d',
  },
  statusErr: {
    fontSize: '12px',
    color: '#dc2626',
  },
}

const emptyCreate = {
  email: '',
  full_name: '',
  password: '',
  role: 'asesor',
  is_active: true,
  permissions: {
    can_upload: false,
    can_edit_documents: false,
    can_delete_documents: false,
    can_use_chat: true,
  },
}

function PermissionsEditor({ value, disabled, onChange }) {
  const setFlag = (key, checked) => onChange({ ...value, [key]: checked })

  return (
    <div style={styles.row}>
      <label style={styles.small}>
        <input type="checkbox" checked={value.can_upload} disabled={disabled} onChange={(e) => setFlag('can_upload', e.target.checked)} />
        {' '}Subir PDF
      </label>
      <label style={styles.small}>
        <input type="checkbox" checked={value.can_edit_documents} disabled={disabled} onChange={(e) => setFlag('can_edit_documents', e.target.checked)} />
        {' '}Editar documentos
      </label>
      <label style={styles.small}>
        <input type="checkbox" checked={value.can_delete_documents} disabled={disabled} onChange={(e) => setFlag('can_delete_documents', e.target.checked)} />
        {' '}Eliminar documentos
      </label>
      <label style={styles.small}>
        <input type="checkbox" checked={value.can_use_chat} disabled={disabled} onChange={(e) => setFlag('can_use_chat', e.target.checked)} />
        {' '}Usar chat
      </label>
    </div>
  )
}

function AdminUserManagement({ users, authHeaders, onReload }) {
  const [form, setForm] = useState(emptyCreate)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [isError, setIsError] = useState(false)

  const showMsg = (text, error = false) => {
    setMsg(text)
    setIsError(error)
  }

  const createAccount = async () => {
    try {
      const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        showMsg(data.detail || 'No se pudo crear el usuario.', true)
        return
      }
      setForm(emptyCreate)
      showMsg('Usuario creado correctamente.')
      onReload()
    } catch {
      showMsg('Error de conexion al crear usuario.', true)
    }
  }

  const startEdit = (user) => {
    setEditingId(user.id)
    setNewPassword('')
    setEditForm({
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
      permissions: { ...user.permissions },
    })
  }

  const saveEdit = async () => {
    if (!editingId || !editForm) return
    try {
      const res = await fetch(`${API_URL}/users/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(editForm),
      })
      const data = await res.json()
      if (!res.ok) {
        showMsg(data.detail || 'No se pudo actualizar el usuario.', true)
        return
      }
      showMsg('Usuario actualizado.')
      setEditingId(null)
      setEditForm(null)
      onReload()
    } catch {
      showMsg('Error de conexion al actualizar usuario.', true)
    }
  }

  const resetPassword = async () => {
    if (!editingId || !newPassword.trim()) return
    try {
      const res = await fetch(`${API_URL}/users/${editingId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ new_password: newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        showMsg(data.detail || 'No se pudo actualizar la contrasena.', true)
        return
      }
      showMsg('Contrasena actualizada.')
      setNewPassword('')
    } catch {
      showMsg('Error de conexion al actualizar contrasena.', true)
    }
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Gestion de Usuarios</h2>

      <div style={styles.card}>
        <div style={styles.label}>Crear nueva cuenta</div>
        <div style={styles.row}>
          <input style={styles.input} placeholder="Nombre completo" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <input style={styles.input} placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input style={styles.input} placeholder="Contrasena inicial" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <select style={styles.select} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="asesor">Asesor</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div style={styles.row}>
          <label style={styles.small}>
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            {' '}Cuenta activa
          </label>
        </div>
        <PermissionsEditor
          value={form.permissions}
          disabled={form.role === 'admin'}
          onChange={(permissions) => setForm({ ...form, permissions })}
        />
        <div>
          <button style={{ ...styles.btn, ...styles.primaryBtn }} onClick={createAccount}>Crear usuario</button>
        </div>
      </div>

      {users.map((user) => {
        const isEditing = editingId === user.id
        return (
          <div key={user.id} style={styles.card}>
            <div style={styles.row}>
              <div>
                <div><strong>{user.full_name}</strong> ({user.role})</div>
                <div style={styles.small}>{user.email}</div>
                <div style={styles.small}>
                  Estado: {user.is_active ? 'Activo' : 'Inactivo'} | Ultimo ingreso: {user.last_login_at || 'Nunca'}
                </div>
              </div>
              {!isEditing && <button style={styles.btn} onClick={() => startEdit(user)}>Editar</button>}
            </div>

            {isEditing && editForm && (
              <>
                <div style={styles.row}>
                  <input style={styles.input} value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
                  <select style={styles.select} value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                    <option value="asesor">Asesor</option>
                    <option value="admin">Admin</option>
                  </select>
                  <label style={styles.small}>
                    <input type="checkbox" checked={editForm.is_active} onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })} />
                    {' '}Cuenta activa
                  </label>
                </div>
                <PermissionsEditor
                  value={editForm.permissions}
                  disabled={editForm.role === 'admin'}
                  onChange={(permissions) => setEditForm({ ...editForm, permissions })}
                />
                <div style={styles.row}>
                  <input
                    style={styles.input}
                    type="password"
                    placeholder="Nueva contrasena"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button style={styles.btn} onClick={resetPassword}>Cambiar contrasena</button>
                </div>
                <div style={styles.row}>
                  <button style={{ ...styles.btn, ...styles.primaryBtn }} onClick={saveEdit}>Guardar cambios</button>
                  <button style={styles.btn} onClick={() => { setEditingId(null); setEditForm(null) }}>Cancelar</button>
                </div>
              </>
            )}
          </div>
        )
      })}

      {msg && <div style={isError ? styles.statusErr : styles.statusOk}>{msg}</div>}
    </div>
  )
}

export default AdminUserManagement

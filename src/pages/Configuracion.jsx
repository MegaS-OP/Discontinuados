import { useState } from 'react';
import { useUsers } from '../context/UserContext';
import { useApp } from '../context/AppContext';
import { ROL_COLORS } from '../data/users';

const ML_GREEN = '#0F6E56';
const BORDER = '0.5px solid #D3D1C7';
const BG_SEC = '#F1EFE8';

export default function Configuracion() {
  const { users, currentUser, addUser, removeUser, updateUser } = useUsers();
  const { data, removeBulkProducts } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ nombre: '', rol: 'Editor' });
  const [error, setError] = useState('');

  const isAdmin = currentUser?.rol === 'Admin';

  const handleSubmit = () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    if (editingId) {
      updateUser(editingId, form);
    } else {
      addUser(form.nombre.trim(), form.rol);
    }
    setForm({ nombre: '', rol: 'Editor' });
    setShowForm(false);
    setEditingId(null);
    setError('');
  };

  const startEdit = (user) => {
    setForm({ nombre: user.nombre, rol: user.rol });
    setEditingId(user.id);
    setShowForm(true);
  };

  const cancel = () => {
    setForm({ nombre: '', rol: 'Editor' });
    setShowForm(false);
    setEditingId(null);
    setError('');
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: BORDER, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: '#1A1A1A' }}>Configuración</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

        {/* Sección usuarios */}
        <div style={{ background: '#fff', border: BORDER, borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '12px 16px', borderBottom: BORDER, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: BG_SEC }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A' }}>Usuarios con acceso</div>
              <div style={{ fontSize: 11, color: '#5F5E5A', marginTop: 2 }}>
                Cada usuario se identifica al ingresar a la app. Sus acciones quedan registradas.
              </div>
            </div>
            {isAdmin && (
              <button
                onClick={() => { setShowForm(true); setEditingId(null); setForm({ nombre: '', rol: 'Editor' }); }}
                style={{ background: ML_GREEN, color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
              >
                + Agregar usuario
              </button>
            )}
          </div>

          {/* Form inline */}
          {showForm && (
            <div style={{ padding: '12px 16px', borderBottom: BORDER, background: '#FAFAF8' }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#1A1A1A', marginBottom: 10 }}>
                {editingId ? 'Editar usuario' : 'Nuevo usuario'}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <label style={{ fontSize: 11, color: '#5F5E5A', display: 'block', marginBottom: 4 }}>Nombre completo</label>
                  <input
                    autoFocus
                    value={form.nombre}
                    onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    placeholder="Ej: María González"
                    style={{ width: '100%', border: BORDER, borderRadius: 6, padding: '6px 10px', fontSize: 12, background: '#fff', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#5F5E5A', display: 'block', marginBottom: 4 }}>Rol</label>
                  <select
                    value={form.rol}
                    onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value }))}
                    style={{ border: BORDER, borderRadius: 6, padding: '6px 10px', fontSize: 12, background: '#fff', outline: 'none', cursor: 'pointer' }}
                  >
                    <option>Admin</option>
                    <option>Editor</option>
                    <option>Viewer</option>
                  </select>
                </div>
                <button onClick={handleSubmit} style={{ background: ML_GREEN, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                  {editingId ? 'Guardar' : 'Agregar'}
                </button>
                <button onClick={cancel} style={{ background: 'none', border: BORDER, borderRadius: 6, padding: '6px 14px', fontSize: 12, color: '#5F5E5A', cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
              {error && <p style={{ fontSize: 11, color: '#C0392B', marginTop: 6 }}>{error}</p>}
            </div>
          )}

          {/* Users list */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: BG_SEC }}>
                <th style={{ padding: '8px 16px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#5F5E5A', borderBottom: BORDER }}>Usuario</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#5F5E5A', borderBottom: BORDER }}>Rol</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#5F5E5A', borderBottom: BORDER }}>Permisos</th>
                {isAdmin && <th style={{ padding: '8px 12px', borderBottom: BORDER }}></th>}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: BORDER }}>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: u.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 600, color: '#fff', flexShrink: 0,
                      }}>
                        {u.initials}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, color: '#1A1A1A' }}>{u.nombre}</div>
                        {u.id === currentUser?.id && (
                          <div style={{ fontSize: 10, color: ML_GREEN }}>← Sesión actual</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 500,
                      background: u.color + '20',
                      color: u.color,
                    }}>
                      {u.rol}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 11, color: '#5F5E5A' }}>
                    {u.rol === 'Admin' && 'Gestión total + usuarios'}
                    {u.rol === 'Editor' && 'Ver + editar hitos + comentarios'}
                    {u.rol === 'Viewer' && 'Solo lectura'}
                  </td>
                  {isAdmin && (
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => startEdit(u)}
                          style={{ border: BORDER, background: '#fff', borderRadius: 6, padding: '3px 10px', fontSize: 11, color: '#5F5E5A', cursor: 'pointer' }}
                        >
                          Editar
                        </button>
                        {u.id !== currentUser?.id && (
                          <button
                            onClick={() => removeUser(u.id)}
                            style={{ border: '0.5px solid #FACACA', background: '#FFF5F5', borderRadius: 6, padding: '3px 10px', fontSize: 11, color: '#C0392B', cursor: 'pointer' }}
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Roles info */}
        <div style={{ background: '#fff', border: BORDER, borderRadius: 8, padding: '14px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A', marginBottom: 10 }}>Descripción de roles</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { rol: 'Admin', color: ROL_COLORS.Admin, desc: 'Acceso total. Puede agregar, editar y eliminar productos y usuarios.' },
              { rol: 'Editor', color: ROL_COLORS.Editor, desc: 'Puede editar hitos, agregar comentarios y avanzar etapas.' },
              { rol: 'Viewer', color: ROL_COLORS.Viewer, desc: 'Solo puede ver el dashboard y el detalle de productos.' },
            ].map((r) => (
              <div key={r.rol} style={{ background: BG_SEC, borderRadius: 6, padding: '10px 12px' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: r.color, marginBottom: 4 }}>{r.rol}</div>
                <div style={{ fontSize: 11, color: '#5F5E5A', lineHeight: 1.4 }}>{r.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {isAdmin && (
          <div style={{ background: '#fff', border: '0.5px solid #FACACA', borderRadius: 8, padding: '14px 16px', marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A', marginBottom: 6 }}>Zona de riesgo</div>
            <div style={{ fontSize: 11, color: '#5F5E5A', marginBottom: 10 }}>
              Elimina los {data.products.filter((p) => /^CU-000\d{3}$/.test(p.id)).length} productos cargados masivamente (carga inicial), conservando solo los agregados manualmente. Esta acción no se puede deshacer.
            </div>
            <button
              onClick={() => {
                if (window.confirm('¿Seguro que querés eliminar todos los productos cargados masivamente? Esta acción no se puede deshacer.')) {
                  removeBulkProducts();
                }
              }}
              style={{ border: '0.5px solid #FACACA', background: '#FFF5F5', borderRadius: 6, padding: '6px 14px', fontSize: 12, color: '#C0392B', cursor: 'pointer', fontWeight: 500 }}
            >
              Eliminar productos cargados masivamente
            </button>
          </div>
        )}

        {!isAdmin && (
          <p style={{ fontSize: 11, color: '#5F5E5A', marginTop: 12, textAlign: 'center' }}>
            Solo los usuarios con rol <strong>Admin</strong> pueden gestionar usuarios.
          </p>
        )}
      </div>
    </div>
  );
}

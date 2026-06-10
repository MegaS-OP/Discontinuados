import { useUsers } from '../context/UserContext';

const ML_GREEN = '#0F6E56';
const BORDER = '0.5px solid #D3D1C7';

export default function LoginScreen() {
  const { users, login } = useUsers();

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F1EFE8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff',
        border: BORDER,
        borderRadius: 12,
        padding: '32px 28px',
        width: 340,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{
            width: 36, height: 36,
            background: ML_GREEN,
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg viewBox="0 0 20 20" width={18} height={18} fill="white">
              <path d="M10 2L3 7v11h5v-5h4v5h5V7L10 2z" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>Megalabs</div>
            <div style={{ fontSize: 11, color: '#5F5E5A' }}>Discontinuados Corporativos</div>
          </div>
        </div>

        <p style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A', marginBottom: 6 }}>¿Quién sos?</p>
        <p style={{ fontSize: 11, color: '#5F5E5A', marginBottom: 16 }}>
          Seleccioná tu usuario para registrar tus acciones en la app.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => login(user.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px',
                border: BORDER,
                borderRadius: 8,
                background: '#fff',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#F8F7F4'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
            >
              <div style={{
                width: 32, height: 32,
                borderRadius: '50%',
                background: user.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 600, color: '#fff',
                flexShrink: 0,
              }}>
                {user.initials}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A' }}>{user.nombre}</div>
                <div style={{ fontSize: 10, color: '#5F5E5A' }}>{user.rol}</div>
              </div>
            </button>
          ))}
        </div>

        {users.length === 0 && (
          <p style={{ fontSize: 12, color: '#5F5E5A', textAlign: 'center', padding: '16px 0' }}>
            No hay usuarios configurados. Un administrador debe agregar usuarios primero.
          </p>
        )}
      </div>
    </div>
  );
}

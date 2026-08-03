import { useUsers } from '../context/UserContext';

const BORDER = '0.5px solid rgba(0,150,65,0.15)';

export default function LoginScreen() {
  const { users, login } = useUsers();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #004F3A 0%, #006B52 55%, #009982 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Círculos decorativos de fondo */}
      <div style={{
        position: 'absolute', top: -100, right: -100,
        width: 500, height: 500, borderRadius: '50%',
        background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -150, left: -80,
        width: 400, height: 400, borderRadius: '50%',
        background: 'rgba(120,215,33,0.07)', pointerEvents: 'none',
      }} />

      <div style={{
        background: '#fff',
        borderRadius: 16,
        width: 360,
        boxShadow: '0 20px 60px rgba(0,79,58,0.25)',
        overflow: 'hidden',
        position: 'relative', zIndex: 1,
      }}>
        {/* Card header con degradado */}
        <div style={{
          padding: '24px 24px 20px',
          background: 'linear-gradient(160deg, #004F3A 0%, #009982 100%)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -40, right: -40,
            width: 160, height: 160, borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)', pointerEvents: 'none',
          }} />
          <div style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)',
            marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{
              display: 'inline-block', width: 7, height: 7,
              background: '#78D721', borderRadius: '50%',
              boxShadow: '0 0 0 2px rgba(120,215,33,0.25)',
            }} />
            S&OP Global · Megalabs
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            Discontinuados<br />Corporativos
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 5 }}>
            Proceso PROC-SC-DISC-001 v3.0
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '22px 24px' }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: '#4E6358', marginBottom: 14 }}>
            ¿Quién sos?
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => login(user.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 14px',
                  border: BORDER,
                  borderRadius: 10,
                  background: '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.12s, border-color 0.12s, transform 0.1s',
                  fontFamily: 'inherit',
                  width: '100%',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#F0F5F2';
                  e.currentTarget.style.borderColor = '#009641';
                  e.currentTarget.style.transform = 'translateX(2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#fff';
                  e.currentTarget.style.borderColor = 'rgba(0,150,65,0.15)';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <div style={{
                  width: 36, height: 36,
                  borderRadius: '50%',
                  background: user.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: '#fff',
                  flexShrink: 0,
                }}>
                  {user.initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1A2B25' }}>{user.nombre}</div>
                  <div style={{ fontSize: 10, color: '#6B7F76' }}>{user.rol}</div>
                </div>
                <span style={{ color: '#9DB5A8', fontSize: 16 }}>›</span>
              </button>
            ))}
          </div>

          {users.length === 0 && (
            <p style={{ fontSize: 12, color: '#6B7F76', textAlign: 'center', padding: '16px 0' }}>
              No hay usuarios configurados.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

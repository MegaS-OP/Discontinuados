import { useUsers } from '../context/UserContext';

const ML_GREEN = '#009641';
const ML_GREEN_LIGHT = '#E6F5ED';
const BORDER = '0.5px solid rgba(0,150,65,0.15)';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
  { id: 'list', label: 'Discontinuados', icon: '⬡', badge: true },
  { id: 'comparativa', label: 'Comparativa', icon: '⇅' },
  { id: 'reports', label: 'Reportes', icon: '▤' },
  { id: 'history', label: 'Historial', icon: '↺' },
  { id: 'settings', label: 'Configuración', icon: '⚙' },
];

const CLICKABLE = ['dashboard', 'list', 'comparativa', 'reports', 'settings'];

export default function Sidebar({ activeView, onNavigate, productCount }) {
  const { currentUser, logout } = useUsers();

  return (
    <div style={{
      width: 200,
      background: '#fff',
      borderRight: BORDER,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      height: '100%',
    }}>
      {/* Header con degradado de marca */}
      <div style={{
        padding: '22px 18px 20px',
        background: 'linear-gradient(160deg, #003D2E 0%, #006B52 60%, #009982 100%)',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: -40, right: -40,
          width: 130, height: 130, borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -20, left: -20,
          width: 80, height: 80, borderRadius: '50%',
          background: 'rgba(120,215,33,0.08)',
          pointerEvents: 'none',
        }} />
        <div style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)',
          marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{
            display: 'inline-block', width: 8, height: 8,
            background: '#78D721', borderRadius: '50%',
            boxShadow: '0 0 0 3px rgba(120,215,33,0.2)',
          }} />
          S&OP Global
        </div>
        <div style={{ fontSize: 19, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
          Megalabs
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 4, letterSpacing: '0.02em' }}>
          Discontinuados Corp.
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '6px 0', overflowY: 'auto' }}>
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          const isClickable = CLICKABLE.includes(item.id);
          return (
            <div
              key={item.id}
              onClick={() => isClickable && onNavigate(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 16px',
                cursor: isClickable ? 'pointer' : 'default',
                fontSize: 12.5,
                color: isActive ? ML_GREEN : '#4E6358',
                fontWeight: isActive ? 600 : 400,
                background: isActive ? ML_GREEN_LIGHT : 'transparent',
                borderLeft: isActive ? `2px solid ${ML_GREEN}` : '2px solid transparent',
                transition: 'background 0.12s, color 0.12s',
                opacity: isClickable ? 1 : 0.35,
              }}
              onMouseEnter={(e) => { if (!isActive && isClickable) e.currentTarget.style.background = '#E8F0EC'; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: 15, lineHeight: 1, width: 20, textAlign: 'center' }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && productCount > 0 && (
                <span style={{ background: ML_GREEN, color: 'white', borderRadius: 10, fontSize: 10, fontWeight: 600, padding: '1px 7px' }}>
                  {productCount}
                </span>
              )}
            </div>
          );
        })}
      </nav>

      {/* Current user */}
      {currentUser && (
        <div style={{ padding: '10px 14px', borderTop: BORDER, background: '#F0F5F2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: currentUser.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {currentUser.initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1A2B25', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser.nombre}</div>
              <div style={{ fontSize: 10, color: '#6B7F76' }}>{currentUser.rol}</div>
            </div>
          </div>
          <button
            onClick={logout}
            style={{ marginTop: 7, width: '100%', border: BORDER, background: '#fff', borderRadius: 6, padding: '4px', fontSize: 11, color: '#4E6358', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Cambiar usuario
          </button>
        </div>
      )}
    </div>
  );
}

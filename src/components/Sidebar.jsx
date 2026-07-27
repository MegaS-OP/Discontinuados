import { useUsers } from '../context/UserContext';

const ML_GREEN = '#0F6E56';
const ML_GREEN_LIGHT = '#E1F5EE';
const BORDER = '0.5px solid #D3D1C7';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
  { id: 'list', label: 'Discontinuados', icon: '⬡', badge: true },
  { id: 'cambios', label: 'Abastecimiento CEAM', icon: '⇄' },
  { id: 'comparativa', label: 'Comparativa', icon: '⇅' },
  { id: 'reports', label: 'Reportes', icon: '▤' },
  { id: 'history', label: 'Historial', icon: '↺' },
  { id: 'settings', label: 'Configuración', icon: '⚙' },
];

const CLICKABLE = ['dashboard', 'list', 'cambios', 'comparativa', 'reports', 'settings'];

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
      {/* Logo */}
      <div style={{ padding: '16px', borderBottom: BORDER, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, background: ML_GREEN, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg viewBox="0 0 20 20" width={16} height={16} fill="white">
            <path d="M10 2L3 7v11h5v-5h4v5h5V7L10 2z" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A', lineHeight: 1.2 }}>Megalabs</div>
          <div style={{ fontSize: 10, color: '#5F5E5A', lineHeight: 1.2 }}>S&OP Global</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 0' }}>
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          const isClickable = CLICKABLE.includes(item.id);
          return (
            <div
              key={item.id}
              onClick={() => isClickable && onNavigate(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 16px',
                cursor: isClickable ? 'pointer' : 'default',
                fontSize: 13,
                color: isActive ? ML_GREEN : '#5F5E5A',
                fontWeight: isActive ? 500 : 400,
                background: isActive ? ML_GREEN_LIGHT : 'transparent',
                borderRight: isActive ? `2px solid ${ML_GREEN}` : '2px solid transparent',
                transition: 'background 0.15s',
                opacity: isClickable ? 1 : 0.4,
              }}
              onMouseEnter={(e) => { if (!isActive && isClickable) e.currentTarget.style.background = '#F8F7F4'; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && productCount > 0 && (
                <span style={{ background: ML_GREEN, color: 'white', borderRadius: 10, fontSize: 10, padding: '1px 6px' }}>
                  {productCount}
                </span>
              )}
            </div>
          );
        })}
      </nav>

      {/* Current user */}
      {currentUser && (
        <div style={{ padding: '10px 14px', borderTop: BORDER }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: currentUser.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 600, color: '#fff', flexShrink: 0,
            }}>
              {currentUser.initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#1A1A1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser.nombre}</div>
              <div style={{ fontSize: 10, color: '#5F5E5A' }}>{currentUser.rol}</div>
            </div>
          </div>
          <button
            onClick={logout}
            style={{ marginTop: 6, width: '100%', border: BORDER, background: 'none', borderRadius: 6, padding: '4px', fontSize: 11, color: '#5F5E5A', cursor: 'pointer' }}
          >
            Cambiar usuario
          </button>
        </div>
      )}
    </div>
  );
}

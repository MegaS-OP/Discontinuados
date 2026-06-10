import { useState } from 'react';
import { useUsers } from '../context/UserContext';

const ML_GREEN = '#0F6E56';
const BORDER = '0.5px solid #D3D1C7';

const inputStyle = {
  border: BORDER, borderRadius: 6, padding: '8px 10px',
  fontSize: 13, background: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box',
};

export default function LoginScreen() {
  const { login, loginError } = useUsers();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password) return;
    setSubmitting(true);
    await login(email.trim(), password);
    setSubmitting(false);
  };

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

        <p style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A', marginBottom: 6 }}>Iniciar sesión</p>
        <p style={{ fontSize: 11, color: '#5F5E5A', marginBottom: 16 }}>
          Ingresá con tu usuario corporativo para registrar tus acciones en la app.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: '#5F5E5A', display: 'block', marginBottom: 4 }}>Email</label>
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="nombre@megalabs.com"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#5F5E5A', display: 'block', marginBottom: 4 }}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          {loginError && (
            <p style={{ fontSize: 11, color: '#C0392B', margin: 0 }}>{loginError}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              background: ML_GREEN, color: '#fff', border: 'none', borderRadius: 6,
              padding: '9px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              opacity: submitting ? 0.7 : 1, marginTop: 4,
            }}
          >
            {submitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </div>

        <p style={{ fontSize: 10, color: '#9B9895', marginTop: 16, textAlign: 'center' }}>
          ¿No tenés cuenta? Pedile a un administrador que te la cree.
        </p>
      </div>
    </div>
  );
}

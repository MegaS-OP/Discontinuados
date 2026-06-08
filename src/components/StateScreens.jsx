const ML_GREEN = '#0F6E56';

export function LoadingScreen({ message = 'Cargando...' }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <div
        style={{
          width: 32,
          height: 32,
          border: `3px solid #F1EFE8`,
          borderTop: `3px solid ${ML_GREEN}`,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ fontSize: 13, color: '#5F5E5A' }}>{message}</p>
    </div>
  );
}

export function ErrorScreen({ message }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 24 }}>⚠️</div>
      <p style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A' }}>Error al conectar con SharePoint</p>
      <p style={{ fontSize: 12, color: '#5F5E5A', maxWidth: 360, textAlign: 'center' }}>{message}</p>
      <p style={{ fontSize: 11, color: '#9B9895', marginTop: 8 }}>
        Verificá que la lista <strong>MGL_Discontinuados</strong> exista en el sitio SharePoint configurado.
      </p>
    </div>
  );
}

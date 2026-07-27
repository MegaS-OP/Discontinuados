export default function Cambios() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff' }}>
      <iframe
        src="/cambios.html"
        title="Seguimiento de Cambios"
        style={{ flex: 1, width: '100%', height: '100%', border: 'none' }}
      />
    </div>
  );
}

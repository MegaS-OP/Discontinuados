export default function Cambios() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff' }}>
      <iframe
        src="/cambios.html"
        title="Seguimiento de Abastecimiento CEAM"
        style={{ flex: 1, width: '100%', height: '100%', border: 'none' }}
      />
    </div>
  );
}

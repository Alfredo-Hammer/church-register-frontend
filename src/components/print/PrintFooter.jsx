export default function PrintFooter({ church, generatedLabel }) {
  const today = new Date().toLocaleDateString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const location = [church?.city, church?.country].filter(Boolean).join(', ');

  const contacts = [
    church?.address && { icon: '📍', text: church.address + (location ? ` · ${location}` : '') },
    church?.phone   && { icon: '📞', text: church.phone },
    church?.email   && { icon: '✉',  text: church.email },
    church?.website && { icon: '🌐', text: church.website },
  ].filter(Boolean);

  return (
    <div style={{ marginTop: 'auto' }}>
      {/* Separador degradado */}
      <div style={{ height: 3, background: 'linear-gradient(90deg, #4f46e5, #818cf8, transparent)' }} />

      {/* Contacto + generado — todo en una sola fila compacta */}
      <div style={{
        padding: '10px 28px',
        background: '#f9fafb',
        borderRadius: '0 0 8px 8px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        flexWrap: 'wrap', gap: '6px 20px',
      }}>
        {/* Datos de contacto */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 16px', flex: 1 }}>
          {contacts.map((c, i) => (
            <span key={i} style={{
              fontSize: 10, color: '#4b5563', fontFamily: 'Arial, sans-serif',
              display: 'flex', alignItems: 'center', gap: 3,
            }}>
              <span>{c.icon}</span>
              <span>{c.text}</span>
            </span>
          ))}
        </div>

        {/* Generado */}
        <p style={{ fontSize: 10, color: '#9ca3af', margin: 0, fontFamily: 'Arial, sans-serif', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {church?.name || 'Iglesia'}
          {generatedLabel ? ` · ${generatedLabel}` : ''}
          {' · '}{today}
        </p>
      </div>
    </div>
  );
}

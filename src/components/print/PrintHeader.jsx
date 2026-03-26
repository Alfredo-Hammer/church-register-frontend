export default function PrintHeader({ church, documentTitle, documentMeta, documentNote }) {
  const churchName   = church?.name        || 'Iglesia';
  const denomination = church?.denomination;
  const pastorName   = church?.pastorName;
  const logoUrl      = church?.logoUrl;

  const initials = churchName
    .split(' ').filter(Boolean).slice(0, 2)
    .map((w) => w[0].toUpperCase()).join('');

  return (
    <div style={{ borderTop: '4px solid #4f46e5', borderRadius: '8px 8px 0 0', overflow: 'hidden' }}>

      {/* Fila: logo + nombre + sello */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 28px', borderBottom: '1px solid #e5e7eb',
      }}>
        {/* Logo */}
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={`Logo ${churchName}`}
            style={{ width: 52, height: 52, objectFit: 'contain', borderRadius: 8, flexShrink: 0 }}
          />
        ) : (
          <div style={{
            width: 52, height: 52, borderRadius: 10, flexShrink: 0,
            background: '#eef2ff', border: '2px solid #c7d2fe',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#4f46e5', fontFamily: 'Arial, sans-serif', lineHeight: 1 }}>
              {initials || '✝'}
            </span>
          </div>
        )}

        {/* Nombre e info */}
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: '#1e1b4b', letterSpacing: 0.3, lineHeight: 1.2 }}>
            {churchName}
          </h1>
          {denomination && (
            <p style={{ fontSize: 11, color: '#6366f1', margin: '2px 0 0', fontFamily: 'Arial, sans-serif' }}>
              {denomination}
            </p>
          )}
          {pastorName && (
            <p style={{ fontSize: 11, color: '#6b7280', margin: '1px 0 0', fontFamily: 'Arial, sans-serif' }}>
              Pastor: {pastorName}
            </p>
          )}
        </div>

        {/* Sello decorativo */}
        <div style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          border: '2px solid #c7d2fe',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          lineHeight: 1,
        }}>
          <span style={{ fontSize: 18, color: '#6366f1', lineHeight: 1, display: 'block' }}>✝</span>
        </div>
      </div>

      {/* Título del documento */}
      {documentTitle && (
        <div style={{ padding: '12px 28px', background: '#f5f3ff', borderBottom: '2px solid #e0e7ff' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#1e1b4b', textTransform: 'uppercase', letterSpacing: 1, lineHeight: 1.2 }}>
            {documentTitle}
          </h2>
          {documentMeta && (
            <p style={{ fontSize: 12, color: '#4b5563', margin: '4px 0 0', fontFamily: 'Arial, sans-serif', textTransform: 'capitalize' }}>
              {documentMeta}
            </p>
          )}
          {documentNote && (
            <p style={{ fontSize: 11, color: '#6b7280', margin: '3px 0 0', fontStyle: 'italic', fontFamily: 'Arial, sans-serif' }}>
              {documentNote}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

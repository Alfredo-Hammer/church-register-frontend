import { Dialog, DialogContent, DialogHeader, DialogFooter } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Loader2, Download } from "lucide-react";

// ── Constantes de diseño ──────────────────────────────────────────────────────

const NAVY  = '#0d1f3c';
const GOLD  = '#b8933a';
const CREAM = '#fdf8f0';

function parseDate(d) {
  return new Date(String(d).slice(0, 10) + 'T00:00:00');
}

function dateRange(start, end) {
  const opts = { day: 'numeric', month: 'long', year: 'numeric' };
  const s = parseDate(start).toLocaleDateString('es', opts);
  if (String(start).slice(0, 10) === String(end).slice(0, 10)) return s;
  return `${s} – ${parseDate(end).toLocaleDateString('es', opts)}`;
}

// ── Template del certificado (renderizado como React JSX) ─────────────────────

function Corner({ pos }) {
  const style = {
    position: 'absolute', width: 28, height: 28,
    ...(pos.includes('top')    ? { top: 28 }    : { bottom: 28 }),
    ...(pos.includes('left')   ? { left: 28 }   : { right: 28 }),
    borderTop:    pos.includes('top')  ? `2px solid ${GOLD}` : undefined,
    borderBottom: pos.includes('bot')  ? `2px solid ${GOLD}` : undefined,
    borderLeft:   pos.includes('left') ? `2px solid ${GOLD}` : undefined,
    borderRight:  pos.includes('right')? `2px solid ${GOLD}` : undefined,
  };
  return <div style={style} />;
}

export function CertificateTemplate({ conference, registration, church }) {
  const logo       = church?.logoUrl   || null;
  const churchName = church?.name      || '';
  const pastor     = church?.pastorName|| null;
  const phone      = church?.phone     || null;

  return (
    <div style={{
      width: 1056, height: 816,
      background: CREAM,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', boxSizing: 'border-box',
      padding: '44px 90px',
      border: `12px solid ${NAVY}`,
      fontFamily: 'Georgia, "Times New Roman", serif',
    }}>
      {/* Borde interior dorado */}
      <div style={{ position: 'absolute', inset: 20, border: `2px solid ${GOLD}`, pointerEvents: 'none' }} />

      {/* Ornamentos de esquina */}
      <Corner pos="top-left"   />
      <Corner pos="top-right"  />
      <Corner pos="bot-left"   />
      <Corner pos="bot-right"  />

      {/* Cruz de fondo */}
      <div style={{
        position: 'absolute', fontSize: 380, color: 'rgba(13,31,60,0.04)',
        top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        lineHeight: 1, pointerEvents: 'none', userSelect: 'none',
      }}>✝</div>

      {/* Contenido */}
      <div style={{ position: 'relative', textAlign: 'center', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* ── Cabecera de iglesia ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 14 }}>
          {logo && (
            <img src={logo} alt={churchName} style={{
              width: 64, height: 64, objectFit: 'contain', borderRadius: '50%',
              border: `2px solid ${GOLD}`, flexShrink: 0,
            }} />
          )}
          <div style={{ textAlign: logo ? 'left' : 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: NAVY, lineHeight: 1.2 }}>{churchName}</div>
            {pastor && (
              <div style={{ fontSize: 11, color: '#4a5568', fontFamily: 'Arial, sans-serif', marginTop: 2 }}>
                Pr. {pastor}
              </div>
            )}
            {phone && (
              <div style={{ fontSize: 11, color: '#718096', fontFamily: 'Arial, sans-serif' }}>{phone}</div>
            )}
          </div>
        </div>

        {/* Separador */}
        <div style={{ width: 240, height: 1, background: GOLD, marginBottom: 14 }} />

        {/* Label */}
        <div style={{
          fontSize: 9, fontWeight: 700, letterSpacing: 5,
          textTransform: 'uppercase', color: GOLD,
          fontFamily: 'Arial, sans-serif', marginBottom: 10,
        }}>
          Certificado de Participación
        </div>

        {/* Intro */}
        <div style={{ fontSize: 13, color: '#4a5568', fontStyle: 'italic', marginBottom: 10 }}>
          Se certifica con honor que
        </div>

        {/* Nombre */}
        <div style={{ fontSize: 50, fontWeight: 700, color: NAVY, lineHeight: 1.1, marginBottom: 12 }}>
          {registration.full_name}
        </div>

        {/* Participó en */}
        <div style={{ fontSize: 13, color: '#4a5568', fontStyle: 'italic', marginBottom: 6 }}>
          participó en la
        </div>

        {/* Conferencia */}
        <div style={{ fontSize: 22, fontWeight: 700, color: NAVY, marginBottom: 4 }}>
          {conference.name}
        </div>

        {conference.theme && (
          <div style={{ fontSize: 12, fontStyle: 'italic', color: '#4a5568', marginBottom: 3 }}>
            "{conference.theme}"
          </div>
        )}

        {conference.theme_verse && (
          <div style={{ fontSize: 10, color: GOLD, fontStyle: 'italic', fontFamily: 'Arial, sans-serif', marginBottom: 14 }}>
            {conference.theme_verse}
          </div>
        )}

        {/* Fechas */}
        <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 11, color: '#718096', marginBottom: 26, letterSpacing: 0.5 }}>
          {dateRange(conference.start_date, conference.end_date)}
          {conference.location        && ` · ${conference.location}`}
          {registration.origin_church && ` · ${registration.origin_church}`}
        </div>

        {/* Firmas */}
        <div style={{ display: 'flex', gap: 80, justifyContent: 'center', width: '100%' }}>
          {[['Firma del Pastor', pastor ? `Pr. ${pastor}` : null], ['Sello de la Iglesia', null]].map(([label, sub]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              {sub && (
                <div style={{ fontSize: 11, color: NAVY, fontFamily: 'Georgia, serif', marginBottom: 4 }}>{sub}</div>
              )}
              <div style={{ width: 200, height: 1, background: '#718096', margin: '0 auto 6px' }} />
              <div style={{ fontSize: 9, color: '#4a5568', fontFamily: 'Arial, sans-serif', textTransform: 'uppercase', letterSpacing: 2 }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Separador inferior */}
        <div style={{ width: 240, height: 1, background: GOLD, marginTop: 18 }} />
      </div>
    </div>
  );
}

// ── Dialog de vista previa ────────────────────────────────────────────────────

const SCALE = 0.52;
const PW = Math.round(1056 * SCALE); // ~549 px
const PH = Math.round(816  * SCALE); // ~424 px

export function CertificatePreviewDialog({
  open, onClose, conference, registration, church, onDownload, downloading,
}) {
  if (!conference || !registration) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        onClose={onClose}
        className="max-w-3xl p-0 bg-slate-900 border-slate-700 overflow-hidden"
      >
        <DialogHeader className="px-6 pt-5 pb-0">
          <h2 className="text-base font-semibold text-white">Vista previa del certificado</h2>
          <p className="text-xs text-slate-400 mt-0.5">{registration.full_name}</p>
        </DialogHeader>

        {/* Preview escalado */}
        <div className="bg-slate-950 mx-6 my-4 flex justify-center items-center rounded-lg overflow-hidden"
          style={{ height: PH + 16 }}>
          <div style={{ width: PW, height: PH, overflow: 'hidden', borderRadius: 3, boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
            <div style={{ transformOrigin: 'top left', transform: `scale(${SCALE})`, width: 1056, height: 816 }}>
              <CertificateTemplate
                conference={conference}
                registration={registration}
                church={church}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 pb-5">
          <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">
            Cancelar
          </Button>
          <Button
            disabled={downloading}
            onClick={onDownload}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-60"
          >
            {downloading
              ? <Loader2 size={14} className="animate-spin" />
              : <Download size={14} />}
            Descargar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

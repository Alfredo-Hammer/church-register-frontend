import {Dialog, DialogContent, DialogHeader, DialogFooter} from "@/components/ui/Dialog";
import {Button} from "@/components/ui/Button";
import {Loader2, Download} from "lucide-react";
import {QRCodeSVG} from "qrcode.react";

// Misma paleta que el certificado, para que ambos documentos se vean de la
// misma familia visual.
const NAVY = "#0d1f3c";
const GOLD = "#b8933a";
const CREAM = "#fdf8f0";

function parseDate(d) {
  return new Date(String(d).slice(0, 10) + "T00:00:00");
}
function dateRange(start, end) {
  const opts = {day: "numeric", month: "long"};
  const s = parseDate(start).toLocaleDateString("es", opts);
  if (String(start).slice(0, 10) === String(end).slice(0, 10)) return s;
  return `${s} – ${parseDate(end).toLocaleDateString("es", opts)}, ${parseDate(end).getFullYear()}`;
}

/**
 * Gafete: tarjeta que el asistente porta durante la conferencia. El QR
 * codifica check_in_token — un identificador propio para marcar asistencia,
 * DISTINTO del id del inscrito — así que perder o fotografiar el gafete no
 * revela nada útil sobre el registro salvo lo impreso a simple vista.
 *
 * No es lo mismo que CertificateTemplate: aquel es un diploma que se entrega
 * al terminar, este se lleva puesto durante el evento y se escanea en cada
 * puerta de salón.
 */
// Grupos etarios distintos de "adulto" llevan una franja de color en el
// gafete: útil de un vistazo para el equipo en la puerta (p. ej. dirigir a
// un niño al área infantil sin tener que leer letra pequeña).
const AGE_TAG = {
  NIÑO:  {label: "NIÑO",  bg: "#c0392b"},
  JOVEN: {label: "JOVEN", bg: "#1d6f8c"},
};

export function BadgeTemplate({conference, registration, church}) {
  const churchName = church?.name || "";
  const logo = church?.logoUrl || null;
  const photo = registration.photo_url || null;
  const ageTag = AGE_TAG[registration.age_group] || null;

  return (
    <div
      style={{
        width: 384,
        height: 576,
        background: CREAM,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        boxSizing: "border-box",
        padding: "24px 24px 28px",
        border: `6px solid ${NAVY}`,
        fontFamily: "Georgia, \"Times New Roman\", serif",
        position: "relative",
      }}
    >
      {ageTag && (
        <div style={{
          position: "absolute", top: 14, right: 14, background: ageTag.bg, color: "#fff",
          fontFamily: "Arial, sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 1,
          padding: "3px 9px", borderRadius: 999,
        }}>
          {ageTag.label}
        </div>
      )}

      {/* Cabecera de iglesia */}
      <div style={{display: "flex", flexDirection: "column", alignItems: "center", gap: 6}}>
        {logo && (
          <img
            src={logo}
            alt={churchName}
            style={{width: 32, height: 32, objectFit: "contain", borderRadius: "50%", border: `2px solid ${GOLD}`}}
          />
        )}
        <div style={{fontSize: 12, fontWeight: 700, color: NAVY, textAlign: "center"}}>{churchName}</div>
      </div>

      <div style={{width: 160, height: 1, background: GOLD, margin: "12px 0"}} />

      {/* Foto del asistente: lo primero que identifica a la persona */}
      <div style={{
        width: 108, height: 108, borderRadius: "50%", overflow: "hidden",
        border: `3px solid ${GOLD}`, background: "#e8e2d4",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        {photo
          ? <img src={photo} alt="" style={{width: "100%", height: "100%", objectFit: "cover"}} />
          : <span style={{fontFamily: "Arial, sans-serif", fontSize: 34, fontWeight: 700, color: NAVY}}>
              {registration.full_name?.charAt(0)?.toUpperCase()}
            </span>}
      </div>

      <div style={{
        fontSize: 8, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase",
        color: GOLD, fontFamily: "Arial, sans-serif", marginTop: 10,
      }}>
        Gafete de Participante
      </div>

      {/* Nombre: lo central del gafete, debe leerse a distancia */}
      <div style={{
        marginTop: 10, fontSize: 24, fontWeight: 700, color: NAVY,
        textAlign: "center", lineHeight: 1.15, wordBreak: "break-word",
      }}>
        {registration.full_name}
      </div>

      {registration.origin_church && (
        <div style={{marginTop: 4, fontSize: 12, color: "#4a5568", fontFamily: "Arial, sans-serif", textAlign: "center"}}>
          {registration.origin_church}
        </div>
      )}

      {/* QR: separado del resto para que el equipo lo escanee sin taparlo */}
      <div style={{marginTop: "auto", marginBottom: 16, background: "#fff", padding: 10, borderRadius: 8}}>
        <QRCodeSVG value={registration.check_in_token || ""} size={116} level="M" />
      </div>

      <div style={{width: 160, height: 1, background: GOLD, marginBottom: 10}} />

      <div style={{fontSize: 13, fontWeight: 700, color: NAVY, textAlign: "center", lineHeight: 1.2}}>
        {conference.name}
      </div>
      <div style={{fontSize: 10, color: "#718096", fontFamily: "Arial, sans-serif", marginTop: 2}}>
        {dateRange(conference.start_date, conference.end_date)}
        {conference.location ? ` · ${conference.location}` : ""}
      </div>
    </div>
  );
}

const SCALE = 0.72;
const PW = Math.round(384 * SCALE);
const PH = Math.round(576 * SCALE);

export function BadgePreviewDialog({open, onClose, conference, registration, church, onDownload, downloading}) {
  if (!conference || !registration) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent onClose={onClose} className="max-w-md p-0 bg-card border-border overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-0">
          <h2 className="text-base font-semibold text-foreground">Vista previa del gafete</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{registration.full_name}</p>
        </DialogHeader>

        <div
          className="bg-muted mx-6 my-4 flex justify-center items-center rounded-lg overflow-hidden"
          style={{height: PH + 16}}
        >
          <div style={{width: PW, height: PH, overflow: "hidden", borderRadius: 3, boxShadow: "0 4px 24px rgba(0,0,0,0.6)"}}>
            <div style={{transformOrigin: "top left", transform: `scale(${SCALE})`, width: 384, height: 576}}>
              <BadgeTemplate conference={conference} registration={registration} church={church} />
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 pb-5">
          <Button variant="ghost" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            Cancelar
          </Button>
          <Button
            disabled={downloading}
            onClick={onDownload}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-60"
          >
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Descargar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

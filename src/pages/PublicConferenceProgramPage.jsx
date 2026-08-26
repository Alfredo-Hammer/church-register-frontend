import {useEffect, useState} from "react";
import {useParams} from "react-router-dom";
import {Church, MapPin, Calendar, Ban, Loader2, User, BookOpen} from "lucide-react";
import {accentClasses} from "@/utils/sessionTypeColors";

// Programa completo de una conferencia, público y sin límite de ítems —
// pensada para compartir con oradores o el público en general (link o QR
// desde ConferenceDetailPage), a diferencia de /pantalla/:token que es la
// pantalla del salón: un día a la vez, enfocada en "qué está pasando ahora".
// Por eso usa fetch crudo en vez del cliente axios de la app: ese adjunta el
// token de sesión de quien esté logeado en este navegador y no aplica aquí.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const fmtFecha = (iso) =>
  new Date(iso.slice(0, 10) + "T12:00:00").toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const fmtDiaCorto = (iso) => {
  const d = new Date(iso.slice(0, 10) + "T12:00:00");
  return d.toLocaleDateString("es-ES", {day: "numeric", month: "short"});
};

const to12h = (time24) => {
  if (!time24) return null;
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "p. m." : "a. m.";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
};

const localDateString = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function PublicConferenceProgramPage() {
  const {token} = useParams();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [data, setData] = useState(null);
  const [activeDayId, setActiveDayId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/public/conference/${token}/program`);
        if (!res.ok) {
          setNotFound(true);
        } else {
          const body = await res.json();
          setData(body);
          // Si alguno de los días coincide con hoy, arranca ahí — si no,
          // el primer día es lo más útil por defecto.
          const today = localDateString();
          const match = body.days.find((d) => d.date === today);
          setActiveDayId((match || body.days[0])?.id ?? null);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="surface-public min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="surface-public min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-background p-4">
        <div className="text-center max-w-sm">
          <Ban className="w-10 h-10 mx-auto mb-4 text-muted-foreground opacity-40" />
          <h1 className="text-lg font-bold text-foreground mb-1">Link no válido</h1>
          <p className="text-sm text-muted-foreground">
            Este link de programa no existe o ya no está disponible.
          </p>
        </div>
      </div>
    );
  }

  const {church, conference, days} = data;
  const activeDay = days.find((d) => d.id === activeDayId) || days[0];

  return (
    <div className="surface-public min-h-screen bg-gradient-to-br from-background via-muted to-background p-4 pb-10">
      <div className="w-full max-w-2xl mx-auto">
        {/* Encabezado: iglesia anfitriona + conferencia */}
        <div className="text-center mb-6 pt-4">
          {church.logoUrl ? (
            <img
              src={church.logoUrl}
              alt={church.name}
              className="w-16 h-16 rounded-2xl object-cover mx-auto mb-3 shadow-lg"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mx-auto mb-3 shadow-lg">
              <Church className="w-7 h-7 text-white" />
            </div>
          )}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {church.name}
          </p>
          <h1 className="text-2xl font-bold text-foreground mt-1">{conference.name}</h1>
          {(conference.theme || conference.themeVerse) && (
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
              {[conference.theme, conference.themeVerse].filter(Boolean).join(" · ")}
            </p>
          )}
          <div className="flex items-center justify-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {fmtFecha(conference.startDate)} – {fmtFecha(conference.endDate)}
            </span>
            {conference.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {conference.location}
              </span>
            )}
          </div>
        </div>

        {/* Selector de día — solo si hay más de uno */}
        {days.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
            {days.map((d) => (
              <button
                key={d.id}
                onClick={() => setActiveDayId(d.id)}
                className={`shrink-0 flex flex-col items-center px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  d.id === activeDay?.id
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-card border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Día {d.dayNumber}</span>
                <span className={`text-[10px] font-normal capitalize ${d.id === activeDay?.id ? "text-blue-100" : "opacity-70"}`}>
                  {fmtDiaCorto(d.date)}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Programa del día activo */}
        {!activeDay || activeDay.sessions.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-xl">
            <Calendar className="w-8 h-8 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground text-sm">Todavía no hay sesiones programadas para este día.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeDay.sessions.map((s) => (
              <div key={s.id} className="bg-card border border-border rounded-2xl p-4 shadow-xl flex items-start gap-4">
                <div className={`w-1 self-stretch rounded-full ${accentClasses(s.type?.color)} shrink-0`} />
                <div className="w-20 shrink-0 pt-0.5">
                  <p className="text-sm font-bold text-foreground tabular-nums leading-tight">
                    {to12h(s.timeStart) || "—"}
                  </p>
                  {s.timeEnd && (
                    <p className="text-[11px] text-muted-foreground tabular-nums">a {to12h(s.timeEnd)}</p>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {s.type?.label && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {s.type.label}
                    </span>
                  )}
                  <p className="text-base font-semibold text-foreground mt-0.5">{s.title}</p>
                  {(s.speaker || s.scriptureRef) && (
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {s.speaker && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 shrink-0" /> {s.speaker}
                        </span>
                      )}
                      {s.scriptureRef && (
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3 shrink-0" /> {s.scriptureRef}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

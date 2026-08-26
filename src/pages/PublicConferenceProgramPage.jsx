import {useEffect, useState} from "react";
import {useParams} from "react-router-dom";
import {Church, MapPin, Calendar, Ban, Loader2, User, BookOpen, Share2, Check, FileDown} from "lucide-react";
import {accentClasses} from "@/utils/sessionTypeColors";
import {buildConferenceProgramBooklet} from "@/utils/reportPrint";

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

// buildConferenceProgramBooklet espera el mismo shape snake_case que ya usa
// ConferenceDetailPage (getConferenceById, autenticado) — este endpoint
// público responde en camelCase (mismo criterio que el resto de las rutas
// públicas de la app), así que hay que traducir antes de armar el librillo.
// `notes` queda fuera a propósito: el endpoint público nunca lo incluye
// (son apuntes internos de organización, ver publicDisplayController).
function toBookletShape(data, token) {
  return {
    conference: {
      name: data.conference.name,
      theme: data.conference.theme,
      theme_verse: data.conference.themeVerse,
      location: data.conference.location,
      start_date: data.conference.startDate,
      end_date: data.conference.endDate,
      // Sin esto el librillo omite el QR de la contraportada en silencio
      // (buildConferenceProgramBooklet lo salta si falta, no tira error) —
      // acá ya lo tenemos gratis: es el mismo token de la URL de esta página.
      public_token: token,
    },
    days: data.days.map((d) => ({
      day_number: d.dayNumber,
      day_date: d.date,
      sessions: d.sessions.map((s) => ({
        title: s.title,
        time_start: s.timeStart,
        time_end: s.timeEnd,
        speaker: s.speaker,
        scripture_ref: s.scriptureRef,
        type: s.type,
      })),
    })),
  };
}

export default function PublicConferenceProgramPage() {
  const {token} = useParams();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [data, setData] = useState(null);
  const [activeDayId, setActiveDayId] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [descargando, setDescargando] = useState(false);

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

  const compartir = async () => {
    const shareData = {
      title: data ? `Programa · ${data.conference.name}` : "Programa de la conferencia",
      text: data ? `Programa completo de ${data.conference.name}` : undefined,
      url: window.location.href,
    };
    // navigator.share no existe en todos los navegadores (sobre todo
    // escritorio) — si falta, se cae a copiar el link, que es lo que la
    // gente termina haciendo de todos modos para pegarlo en un chat.
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Cancelado por la persona o falló — se cae a copiar el link igual.
      }
    }
    try {
      await navigator.clipboard.writeText(shareData.url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      /* el navegador negó el permiso; no hay nada más que hacer */
    }
  };

  const descargarLibrillo = async () => {
    if (!data) return;
    setDescargando(true);
    // Se abre la pestaña ANTES de esperar el QR del librillo: si se abriera
    // después del await, el navegador ya no la asocia con el clic de la
    // persona y puede bloquearla como popup.
    const win = window.open("", "_blank");
    try {
      const {conference, days} = toBookletShape(data, token);
      const html = await buildConferenceProgramBooklet(conference, days, data.church);
      if (win) {
        win.document.write(html);
        win.document.close();
      }
    } finally {
      setDescargando(false);
    }
  };

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

        {/* Compartir / descargar — acciones sobre el link en sí, no sobre
            un día en particular, por eso van antes del selector de día. */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={compartir}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground hover:border-blue-500 transition-colors"
          >
            {copiado
              ? <Check className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              : <Share2 className="w-4 h-4" />}
            {copiado ? "Link copiado" : "Compartir"}
          </button>
          <button
            onClick={descargarLibrillo}
            disabled={descargando}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground hover:border-blue-500 transition-colors disabled:opacity-50"
          >
            {descargando
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <FileDown className="w-4 h-4" />}
            Descargar programa
          </button>
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

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Generado con Congrega — Sistema de Control Eclesiástico
        </p>
      </div>
    </div>
  );
}

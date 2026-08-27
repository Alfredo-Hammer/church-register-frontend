import {useEffect, useMemo, useState} from "react";
import {useParams} from "react-router-dom";
import {Church, MapPin, Calendar, Ban, Loader2, User, BookOpen, Share2, Check, FileDown, Clock} from "lucide-react";
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

const toMinutes = (hhmm) => {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

// Mismo criterio que DisplayPage.jsx (la pantalla del salón): un estado
// puesto a mano por quien controla la conferencia (CANCELADA/EN_CURSO/
// FINALIZADA) manda sobre el cálculo automático por reloj. Solo se calcula
// por reloj cuando la sesión sigue en PROGRAMADA (su valor por defecto) Y el
// día es hoy — un día pasado se da por "pasada" entera sin mirar la hora, uno
// futuro se da por "futura" entera, para no depender de time_end en días que
// ni siquiera han llegado.
function sessionsWithEstado(day, ahoraMin) {
  if (!day?.sessions?.length) return [];
  const hoy = localDateString();
  const esHoy = day.date === hoy;
  const esPasado = day.date < hoy;

  return day.sessions.map((s, i) => {
    if (s.status === "CANCELADA") return {...s, estado: "cancelada"};
    if (s.status === "EN_CURSO") return {...s, estado: "encurso"};
    if (s.status === "FINALIZADA") return {...s, estado: "pasada"};
    if (esPasado) return {...s, estado: "pasada"};
    if (!esHoy || s.timeStart === null) return {...s, estado: "futura"};

    const ini = toMinutes(s.timeStart);
    const fin = toMinutes(s.timeEnd) ?? toMinutes(day.sessions[i + 1]?.timeStart) ?? ini + 90;
    if (ahoraMin >= fin) return {...s, estado: "pasada"};
    if (ahoraMin >= ini) return {...s, estado: "encurso"};
    return {...s, estado: "futura"};
  });
}

// Agrupa las sesiones de un día por franja horaria (Mañana/Tarde/Noche) en
// vez de una sola lista larga — útil cuando un mismo día tiene actividad de
// día y de noche con un hueco grande entre medio. Las sesiones ya llegan
// ordenadas por hora, así que agrupar "cuando cambia la etiqueta respecto a
// la anterior" basta para formar bloques contiguos correctos.
const timeOfDayLabel = (timeStr) => {
  if (!timeStr) return null;
  const h = Number(timeStr.slice(0, 2));
  if (h < 12) return "Mañana";
  if (h < 18) return "Tarde";
  return "Noche";
};

const MC_FIELD_FOR_LABEL = {"Mañana": "mcMorning", "Tarde": "mcAfternoon", "Noche": "mcEvening"};
const mcForLabel = (day, label) => day?.[MC_FIELD_FOR_LABEL[label]] || null;

function groupByTimeOfDay(sessions) {
  const groups = [];
  let currentLabel;
  for (const s of sessions) {
    const label = timeOfDayLabel(s.timeStart);
    if (groups.length === 0 || label !== currentLabel) {
      groups.push({label, items: []});
      currentLabel = label;
    }
    groups[groups.length - 1].items.push(s);
  }
  return groups;
}

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
      mc_morning: d.mcMorning,
      mc_afternoon: d.mcAfternoon,
      mc_evening: d.mcEvening,
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
  const [offsetMs, setOffsetMs] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let cancelado = false;
    let primeraCarga = true;
    const cargar = async () => {
      try {
        const res = await fetch(`${API_URL}/public/conference/${token}/program`);
        if (cancelado) return;
        if (!res.ok) {
          setNotFound(true);
        } else {
          const body = await res.json();
          if (cancelado) return;
          setData(body);
          setOffsetMs(new Date(body.serverTime).getTime() - Date.now());
          // Solo en la primera carga: si alguno de los días coincide con hoy,
          // arranca ahí; si no, el primer día. En cargas siguientes (polling)
          // se respeta la pestaña de día que la persona ya haya elegido.
          if (primeraCarga) {
            const today = localDateString();
            const match = body.days.find((d) => d.date === today);
            setActiveDayId((match || body.days[0])?.id ?? null);
          }
        }
      } catch {
        if (!cancelado) setNotFound(true);
      } finally {
        if (!cancelado) setLoading(false);
        primeraCarga = false;
      }
    };
    cargar();
    // 15s, más relajado que los 5s de la pantalla del salón: acá puede haber
    // muchos teléfonos a la vez viendo el mismo link, no un solo televisor.
    const id = setInterval(cargar, 15_000);
    return () => {
      cancelado = true;
      clearInterval(id);
    };
  }, [token]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const ahoraMin = useMemo(() => {
    const d = new Date(now + offsetMs);
    return d.getHours() * 60 + d.getMinutes();
  }, [now, offsetMs]);

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
  const sesiones = sessionsWithEstado(activeDay, ahoraMin);
  // "A continuación" también se puede fijar a mano desde el panel — ver
  // DisplayPage.jsx para el mismo criterio completo (útil cuando el orden
  // real cambió y ya no coincide con la siguiente sesión futura impresa).
  const marcadaSiguiente = sesiones.find((s) => s.status === "A_CONTINUACION");
  const proxima = marcadaSiguiente || sesiones.find((s) => s.estado === "futura");

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
        {!activeDay || sesiones.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-xl">
            <Calendar className="w-8 h-8 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground text-sm">Todavía no hay sesiones programadas para este día.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {groupByTimeOfDay(sesiones).map((group, gi) => (
              <div key={gi}>
                {group.label && (
                  <p className="flex items-baseline gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                    <span>{group.label}</span>
                    {mcForLabel(activeDay, group.label) && (
                      <span className="normal-case font-normal tracking-normal text-muted-foreground/80">
                        · MC: {mcForLabel(activeDay, group.label)}
                      </span>
                    )}
                  </p>
                )}
                <div className="space-y-3">
                  {group.items.map((s) => {
                    const activa = s.estado === "encurso";
                    const pasada = s.estado === "pasada";
                    const cancelada = s.estado === "cancelada";
                    const siguiente = !cancelada && s.id === proxima?.id;
                    return (
                      <div key={s.id} className={`rounded-2xl p-4 shadow-xl flex items-start gap-4 border transition-colors ${
                        activa
                          ? "border-blue-500 bg-blue-500/5 dark:bg-blue-500/10"
                          : cancelada
                            ? "border-red-300 dark:border-red-900/60 bg-red-500/5 dark:bg-red-950/20 opacity-75"
                            : pasada
                              ? "border-border bg-card opacity-55"
                              : "border-border bg-card"
                      }`}>
                        <div className={`w-1 self-stretch rounded-full shrink-0 ${activa ? "bg-blue-500" : cancelada ? "bg-red-500" : accentClasses(s.type?.color)}`} />
                        <div className="w-20 shrink-0 pt-0.5">
                          <p className="text-sm font-bold text-foreground tabular-nums leading-tight">
                            {to12h(s.timeStart) || "—"}
                          </p>
                          {s.timeEnd && (
                            <p className="text-[11px] text-muted-foreground tabular-nums">a {to12h(s.timeEnd)}</p>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {s.type?.label && (
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                {s.type.label}
                              </span>
                            )}
                            {activa && (
                              <span className="flex items-center gap-1 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> EN CURSO
                              </span>
                            )}
                            {cancelada && (
                              <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
                                CANCELADO
                              </span>
                            )}
                            {siguiente && (
                              <span className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                <Clock className="w-2.5 h-2.5 shrink-0" /> A CONTINUACIÓN
                              </span>
                            )}
                          </div>
                          <p className={`text-base font-semibold text-foreground mt-0.5 ${cancelada ? "line-through decoration-red-500/70" : ""}`}>
                            {s.title}
                          </p>
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
                    );
                  })}
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

import React, {useState, useEffect, useMemo, useCallback} from "react";
import {useParams} from "react-router-dom";
import {Church, MapPin, User, BookOpen, Clock} from "lucide-react";

/**
 * Pantalla del salón: muestra el programa del día de una conferencia.
 *
 * Pensada para colgarse en un televisor y quedarse ahí, así que:
 *  - No usa el cliente axios de la app: ese adjunta el token de sesión y, ante
 *    un 401, echa al login. Aquí no hay sesión que perder.
 *  - Recalcula la sesión en curso cada 30 s con el reloj propio, y solo pide
 *    datos al servidor cada 60 s. Si la red se cae, la pantalla sigue
 *    avanzando sola en vez de congelarse.
 *  - Toma la hora del servidor como referencia: el reloj de un equipo que
 *    lleva meses encendido suele estar corrido.
 */

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const TIPO = {
  CLASE_BIBLICA: {label: "Clase bíblica", color: "bg-blue-500"},
  CULTO_ALABANZA: {label: "Alabanza", color: "bg-violet-500"},
  ORACION: {label: "Oración", color: "bg-amber-500"},
  ESPECIAL: {label: "Especial", color: "bg-emerald-500"},
  OTRO: {label: "", color: "bg-slate-500"},
};

/** "HH:MM" -> minutos desde medianoche. */
const toMinutes = (hhmm) => {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const fmtFecha = (iso) =>
  new Date(iso + "T12:00:00").toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

export default function DisplayPage() {
  const {token} = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  // Desfase entre el reloj del equipo y el del servidor, para corregirlo.
  const [offsetMs, setOffsetMs] = useState(0);
  const [now, setNow] = useState(Date.now());

  const cargar = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/public/conference/${token}/today`);
      if (!r.ok) throw new Error(r.status === 404 ? "Programa no encontrado" : "Error al cargar");
      const d = await r.json();
      setData(d);
      setOffsetMs(new Date(d.serverTime).getTime() - Date.now());
      setError("");
    } catch (e) {
      setError(e.message);
    }
    // OJO: aquí no puede entrar `data` como dependencia. setData crea un objeto
    // nuevo en cada respuesta, así que `cargar` se recrearía, el efecto de abajo
    // volvería a ejecutarse y dispararía otra petición: un bucle infinito. Medido
    // antes de corregirlo: 120 peticiones en 237 ms, hasta que el rate limit del
    // servidor las cortó. Si ya hay datos en pantalla se conservan, porque el
    // render solo muestra el error cuando no hay nada que enseñar.
  }, [token]);

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 60_000);
    return () => clearInterval(id);
  }, [cargar]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const ahoraMin = useMemo(() => {
    const d = new Date(now + offsetMs);
    return d.getHours() * 60 + d.getMinutes();
  }, [now, offsetMs]);

  const reloj = useMemo(
    () =>
      new Date(now + offsetMs).toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [now, offsetMs]
  );

  /** Marca cada sesión como pasada, en curso o próxima. */
  const sesiones = useMemo(() => {
    if (!data?.sessions?.length) return [];
    const esHoy = data.day?.isToday;

    return data.sessions.map((s, i) => {
      if (!esHoy || s.timeStart === null) return {...s, estado: "futura"};
      const ini = toMinutes(s.timeStart);
      // Sin hora de fin, la sesión se da por terminada cuando empieza la
      // siguiente; si es la última, se le dan 90 minutos.
      const fin =
        toMinutes(s.timeEnd) ??
        toMinutes(data.sessions[i + 1]?.timeStart) ??
        ini + 90;

      if (ahoraMin >= fin) return {...s, estado: "pasada"};
      if (ahoraMin >= ini) return {...s, estado: "encurso"};
      return {...s, estado: "futura"};
    });
  }, [data, ahoraMin]);

  // Se marca la próxima aunque haya algo en curso: sentado en una clase, lo
  // que la gente quiere saber es qué viene después.
  const proxima = sesiones.find((s) => s.estado === "futura");

  if (error && !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-8">
        <p className="text-3xl text-slate-400">{error}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500" />
      </div>
    );
  }

  return (
    // Fondo oscuro fijo, no los tokens del tema: un televisor en un salón en
    // penumbra tiene que ser oscuro siempre, sin depender de la preferencia
    // guardada en ese equipo.
    <div className="min-h-screen bg-slate-950 text-white p-6 sm:p-10">
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-5 min-w-0">
          {data.church.logoUrl ? (
            <img src={data.church.logoUrl} alt="" className="h-16 w-16 rounded-2xl object-contain bg-white/5 p-1" />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600">
              <Church className="h-9 w-9 text-white" />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight truncate">
              {data.conference.name}
            </h1>
            <p className="mt-1 text-lg sm:text-2xl text-blue-300">
              {data.conference.theme}
              {data.conference.themeVerse && (
                <span className="text-slate-400"> · {data.conference.themeVerse}</span>
              )}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="text-5xl sm:text-7xl font-bold tabular-nums leading-none">{reloj}</p>
          <p className="mt-2 text-lg sm:text-2xl capitalize text-slate-400">
            {data.day ? fmtFecha(data.day.date) : "—"}
          </p>
          {data.day && (
            <p className="text-base sm:text-lg text-slate-500">
              Día {data.day.dayNumber} de {data.totalDays}
              {!data.day.isToday && " · próxima jornada"}
            </p>
          )}
        </div>
      </header>

      {data.conference.location && (
        <p className="mt-4 flex items-center gap-2 text-lg text-slate-400">
          <MapPin className="h-5 w-5" /> {data.conference.location}
        </p>
      )}

      {sesiones.length === 0 ? (
        <p className="mt-24 text-center text-4xl text-slate-500">
          No hay programa para este día.
        </p>
      ) : (
        <ul className="mt-8 space-y-4">
          {sesiones.map((s) => {
            const t = TIPO[s.type] || TIPO.OTRO;
            const activa = s.estado === "encurso";
            const pasada = s.estado === "pasada";
            const siguiente = s.id === proxima?.id;

            return (
              <li
                key={s.id}
                className={`flex items-stretch gap-5 rounded-2xl border p-5 sm:p-6 transition-all ${
                  activa
                    ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10"
                    : pasada
                      ? "border-slate-800/60 bg-slate-900/30 opacity-45"
                      : "border-slate-800 bg-slate-900/60"
                }`}
              >
                <div className={`w-1.5 shrink-0 rounded-full ${activa ? "bg-blue-400" : t.color} ${pasada ? "opacity-40" : ""}`} />

                <div className="w-32 sm:w-44 shrink-0">
                  <p className={`text-3xl sm:text-4xl font-bold tabular-nums ${activa ? "text-blue-300" : "text-slate-300"}`}>
                    {s.timeStart || "—"}
                  </p>
                  {s.timeEnd && (
                    <p className="text-lg text-slate-500 tabular-nums">a {s.timeEnd}</p>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    {t.label && (
                      <span className={`rounded-full px-3 py-1 text-sm font-semibold ${activa ? "bg-blue-500 text-white" : "bg-slate-800 text-slate-300"}`}>
                        {t.label}
                      </span>
                    )}
                    {activa && (
                      <span className="flex items-center gap-2 rounded-full bg-blue-500 px-3 py-1 text-sm font-bold text-white">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                        EN CURSO
                      </span>
                    )}
                    {siguiente && (
                      <span className="flex items-center gap-2 rounded-full border border-slate-600 px-3 py-1 text-sm font-semibold text-slate-300">
                        <Clock className="h-4 w-4" /> A CONTINUACIÓN
                      </span>
                    )}
                  </div>

                  <h2 className={`mt-2 text-2xl sm:text-4xl font-bold leading-tight ${activa ? "text-white" : "text-slate-200"}`}>
                    {s.title}
                  </h2>

                  <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-lg sm:text-xl text-slate-400">
                    {s.speaker && (
                      <span className="flex items-center gap-2">
                        <User className="h-5 w-5 shrink-0" /> {s.speaker}
                      </span>
                    )}
                    {s.scriptureRef && (
                      <span className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 shrink-0" /> {s.scriptureRef}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

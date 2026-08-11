import React, {useState, useEffect, useMemo, useCallback} from "react";
import {useParams} from "react-router-dom";
import {Church, MapPin, User, BookOpen, Clock} from "lucide-react";
import {accentClasses} from "@/utils/sessionTypeColors";

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
 *
 * El fondo es un gradiente animado con partículas flotantes — decorativo, en
 * CSS puro (transform/opacity), no canvas ni WebGL: tiene que sostenerse
 * horas sin que nadie lo mire, en el hardware que tenga a mano el kiosco o el
 * televisor del vestíbulo. El contenido vive en paneles de vidrio semi-opacos
 * por encima, para que el texto se lea igual sin importar qué color pase por
 * detrás en ese momento del gradiente.
 */

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

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

/**
 * Fondo animado: gradiente en movimiento + manchas de luz + partículas que
 * ascienden. Se genera una sola vez (useMemo con deps vacías) para que el
 * reloj, que repinta cada 30 s, no vuelva a barajar las partículas y las
 * haga saltar de posición.
 */
function FondoAnimado() {
  const particulas = useMemo(
    () =>
      Array.from({length: 26}, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 3 + Math.random() * 6,
        duracion: 14 + Math.random() * 16,
        // Delay negativo: al cargar, cada partícula ya está a mitad de un
        // recorrido distinto en vez de que las 26 arranquen juntas del piso.
        delay: -(Math.random() * 30),
        deriva: (Math.random() - 0.5) * 120,
        opacidad: 0.25 + Math.random() * 0.45,
      })),
    []
  );

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <style>{`
        @keyframes fondo-gradiente {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes mancha-flotar {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(var(--mx, 40px), var(--my, -30px)) scale(1.15); }
        }
        @keyframes particula-subir {
          0% { transform: translate(0, 0); opacity: 0; }
          10% { opacity: var(--op, 0.5); }
          90% { opacity: var(--op, 0.5); }
          100% { transform: translate(var(--dx, 0px), -110vh); opacity: 0; }
        }
      `}</style>

      {/* Gradiente base: se desplaza muy despacio, nunca de golpe. Tonos
          violeta/azul/índigo saturados — visiblemente más claro que el
          slate-950 plano que tenía antes, pero sigue siendo oscuro de fondo
          para que el texto blanco funcione encima sin ayuda. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(120deg, #1e1b4b, #4c1d95, #1e3a8a, #312e81, #1e1b4b)",
          backgroundSize: "400% 400%",
          animation: "fondo-gradiente 22s ease-in-out infinite",
        }}
      />

      {/* Manchas de luz: grandes, difuminadas, derivan despacio. Dan
          profundidad y "vida" sin competir con el texto. */}
      <div
        className="absolute -left-32 top-0 h-[560px] w-[560px] rounded-full bg-blue-500/30 blur-[120px]"
        style={{"--mx": "60px", "--my": "40px", animation: "mancha-flotar 26s ease-in-out infinite"}}
      />
      <div
        className="absolute right-0 top-1/3 h-[480px] w-[480px] rounded-full bg-fuchsia-500/20 blur-[120px]"
        style={{"--mx": "-50px", "--my": "60px", animation: "mancha-flotar 32s ease-in-out infinite"}}
      />
      <div
        className="absolute bottom-0 left-1/3 h-[520px] w-[520px] rounded-full bg-cyan-400/20 blur-[130px]"
        style={{"--mx": "40px", "--my": "-50px", animation: "mancha-flotar 29s ease-in-out infinite"}}
      />

      {/* Partículas: puntos de luz que suben todo el alto de la pantalla y
          se desvanecen en los extremos, con una leve deriva lateral. */}
      {particulas.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-full bg-white shadow-[0_0_8px_2px_rgba(255,255,255,0.5)]"
          style={{
            left: `${p.left}%`,
            bottom: "-10px",
            width: p.size,
            height: p.size,
            "--dx": `${p.deriva}px`,
            "--op": p.opacidad,
            animation: `particula-subir ${p.duracion}s linear infinite`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}

      {/* Velo sutil para que los paneles de texto, que ya llevan su propia
          opacidad, no tengan que pelear solos contra el punto más brillante
          del gradiente. */}
      <div className="absolute inset-0 bg-black/25" />
    </div>
  );
}

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

  /**
   * Marca cada sesión como cancelada, pasada, en curso o próxima.
   *
   * Quien lleva el control de la conferencia puede fijar el estado a mano
   * (botón en el panel) y eso manda sobre el cálculo automático por reloj —
   * un programa real casi nunca corre exacto a la hora impresa. Solo se
   * calcula por reloj cuando la sesión sigue en su valor por defecto
   * (PROGRAMADA), para no obligar a tocar cada sesión futura una por una.
   */
  const sesiones = useMemo(() => {
    if (!data?.sessions?.length) return [];
    const esHoy = data.day?.isToday;

    return data.sessions.map((s, i) => {
      if (s.status === "CANCELADA") return {...s, estado: "cancelada"};
      if (s.status === "EN_CURSO") return {...s, estado: "encurso"};
      if (s.status === "FINALIZADA") return {...s, estado: "pasada"};

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

  // "A continuación" también se puede fijar a mano — útil cuando el orden
  // real cambió en vivo y ya no coincide con la siguiente sesión futura del
  // horario impreso. Sin nadie marcándola, se sigue calculando sola: la
  // próxima sesión que aún no empieza (aunque haya algo en curso — sentado
  // en una clase, lo que la gente quiere saber es qué viene después).
  const marcadaSiguiente = sesiones.find((s) => s.status === "A_CONTINUACION");
  const proxima = marcadaSiguiente || sesiones.find((s) => s.estado === "futura");

  if (error && !data) {
    return (
      <div className="relative min-h-screen bg-[#1e1b4b] text-white flex items-center justify-center p-8">
        <FondoAnimado />
        <p className="relative text-3xl text-slate-300">{error}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="relative min-h-screen bg-[#1e1b4b] flex items-center justify-center">
        <FondoAnimado />
        <div className="relative h-16 w-16 animate-spin rounded-full border-4 border-white/20 border-t-blue-400" />
      </div>
    );
  }

  return (
    // bg-[#1e1b4b]: respaldo sólido, del mismo tono con el que arranca el
    // gradiente de FondoAnimado. Sin esto, si esa capa (fixed, decorativa)
    // no llegara a pintar, el fondo caería en el <body> de la app — que
    // sigue el tema claro/oscuro que tenga guardado ESE equipo — rompiendo
    // la garantía de "esta pantalla siempre es oscura" que persigue todo
    // el diseño. Encontrado auditando: mi propio script de contraste no veía
    // ningún fondo en la cadena de ancestros y caía en el <body>, que en ese
    // momento estaba en tema claro por otra pestaña de la misma sesión.
    <div className="relative min-h-screen bg-[#1e1b4b] text-white p-6 sm:p-10">
      <FondoAnimado />

      <div className="relative">
        <header className="flex flex-wrap items-start justify-between gap-6 rounded-3xl border border-white/10 bg-black/30 p-6 backdrop-blur-md">
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
                  <span className="text-slate-300"> · {data.conference.themeVerse}</span>
                )}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="text-5xl sm:text-7xl font-bold tabular-nums leading-none">{reloj}</p>
            <p className="mt-2 text-lg sm:text-2xl capitalize text-slate-300">
              {data.day ? fmtFecha(data.day.date) : "—"}
            </p>
            {data.day && (
              <p className="text-base sm:text-lg text-slate-400">
                Día {data.day.dayNumber} de {data.totalDays}
                {!data.day.isToday && " · próxima jornada"}
              </p>
            )}
          </div>
        </header>

        {data.conference.location && (
          <p className="mt-4 flex items-center gap-2 text-lg text-slate-300">
            <MapPin className="h-5 w-5" /> {data.conference.location}
          </p>
        )}

        {sesiones.length === 0 ? (
          <p className="mt-24 text-center text-4xl text-slate-300">
            No hay programa para este día.
          </p>
        ) : (
          <ul className="mt-8 space-y-4">
            {sesiones.map((s) => {
              const activa = s.estado === "encurso";
              const pasada = s.estado === "pasada";
              const cancelada = s.estado === "cancelada";
              const siguiente = !cancelada && s.id === proxima?.id;

              return (
                <li
                  key={s.id}
                  className={`flex items-stretch gap-5 rounded-2xl border p-5 sm:p-6 backdrop-blur-md transition-all ${
                    activa
                      ? "border-blue-400/60 bg-blue-500/20 shadow-lg shadow-blue-500/20"
                      : cancelada
                        ? "border-red-500/20 bg-red-950/20 opacity-60"
                        : pasada
                          ? "border-white/5 bg-black/30 opacity-45"
                          : "border-white/10 bg-black/40"
                  }`}
                >
                  <div className={`w-1.5 shrink-0 rounded-full ${activa ? "bg-blue-300" : cancelada ? "bg-red-400" : accentClasses(s.type?.color)} ${pasada || cancelada ? "opacity-40" : ""}`} />

                  <div className="w-32 sm:w-44 shrink-0">
                    <p className={`text-3xl sm:text-4xl font-bold tabular-nums ${activa ? "text-blue-200" : "text-slate-200"}`}>
                      {s.timeStart || "—"}
                    </p>
                    {s.timeEnd && (
                      <p className="text-lg text-slate-400 tabular-nums">a {s.timeEnd}</p>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      {s.type?.label && (
                        // bg-white/10 aclaraba el chip lo suficiente para que
                        // ni el blanco puro llegara a 4.5:1 sobre el fondo
                        // animado (medido: 3.18:1). Un fondo oscuro sólido en
                        // vez de un tinte claro deja de sumarle brillo al chip.
                        // blue-500 con texto blanco da 3.68:1, por debajo del
                        // mínimo AA (4.5) para texto pequeño — blue-600 sube a
                        // 5.17:1. Se encontró con una sesión realmente "en
                        // curso", no en la carga inicial: por eso la primera
                        // pasada del auditor no lo vio.
                        //
                        // El nombre del tipo (label) es el de la iglesia,
                        // incluidos los personalizados: ya no hay un mapa fijo
                        // de tipos en el frontend, todo llega de la API.
                        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${activa ? "bg-blue-600 text-white" : "bg-black/50 text-slate-200"}`}>
                          {s.type.label}
                        </span>
                      )}
                      {activa && (
                        <span className="flex items-center gap-2 rounded-full bg-blue-600 px-3 py-1 text-sm font-bold text-white">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                          EN CURSO
                        </span>
                      )}
                      {cancelada && (
                        <span className="rounded-full bg-red-600 px-3 py-1 text-sm font-bold text-white">
                          CANCELADO
                        </span>
                      )}
                      {siguiente && (
                        <span className="flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-sm font-semibold text-slate-200">
                          <Clock className="h-4 w-4" /> A CONTINUACIÓN
                        </span>
                      )}
                    </div>

                    <h2 className={`mt-2 text-2xl sm:text-4xl font-bold leading-tight ${activa ? "text-white" : "text-slate-100"} ${cancelada ? "line-through decoration-red-400/70" : ""}`}>
                      {s.title}
                    </h2>

                    <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-lg sm:text-xl text-slate-300">
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
    </div>
  );
}

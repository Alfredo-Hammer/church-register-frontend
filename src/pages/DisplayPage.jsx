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
 *  - Recalcula la sesión en curso cada 30 s con el reloj propio, y pide datos
 *    al servidor cada 5 s. Quien controla la conferencia normalmente está
 *    lejos del televisor — cambia el estado de una sesión desde su celular y
 *    no hay forma de "refrescar la pantalla" a mano, así que el margen para
 *    que se entere solo tiene el tamaño de este intervalo. Si la red se cae,
 *    la pantalla sigue avanzando sola con el reloj en vez de congelarse.
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

// Agrupa sesiones consecutivas por franja horaria (Mañana/Tarde/Noche) —
// útil cuando un mismo día tiene actividad de día y de noche con un hueco
// grande entre medio, en vez de una sola lista larga sin cortes.
const timeOfDayLabel = (hhmm) => {
  if (!hhmm) return null;
  const h = Number(hhmm.slice(0, 2));
  if (h < 12) return "Mañana";
  if (h < 18) return "Tarde";
  return "Noche";
};

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

/**
 * Pantalla "en blanco" (bienvenida / receso / entre días / cierre) —
 * reemplaza la lista de sesiones por completo en varios momentos donde no
 * tiene sentido mostrarla:
 *  - "paused": alguien del staff forzó "en receso" a mano desde el panel
 *    (receso no planeado, o uno que se extendió). Manda sobre todo lo demás.
 *  - "break": la sesión en curso ahora mismo está marcada como receso
 *    (misma marca de "no requiere asistencia" que ya usa el staff para
 *    recesos/comidas en el programa) — automático, por reloj.
 *  - "before": el día activo todavía no llegó (antes de que arranque la
 *    conferencia, o un hueco entre jornadas sin nada programado hoy).
 *  - "between": la jornada de hoy ya terminó (todas sus sesiones quedaron
 *    en pasada/cancelada) pero queda otro día — se adelanta su programa.
 *  - "finished": hoy terminó y no queda ningún día después.
 */
function IdleScreen({mode, church, conference, day, totalDays, sessions, loadingPreview, message}) {
  const hasList = (mode === "before" || mode === "between") && !loadingPreview && sessions?.length > 0;

  // Con lista de sesiones: encabezado angosto + la lista ocupando casi toda
  // la pantalla — en un televisor real, la marca grande centrada de antes
  // dejaba la lista chica y arrinconada abajo. Sin lista (bienvenida vacía,
  // receso, cierre, cargando): mantiene el diseño centrado de siempre, no
  // hay nada más que mostrar.
  if (hasList) {
    return (
      <div className="relative flex h-full min-h-[85vh] flex-col gap-3 sm:gap-5 lg:gap-7">
        <div className="flex items-center gap-3 sm:gap-4 lg:gap-5 shrink-0 rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md px-3 py-2.5 sm:px-5 sm:py-4 lg:px-7 lg:py-5">
          {church.logoUrl ? (
            <img src={church.logoUrl} alt="" className="h-9 w-9 sm:h-14 sm:w-14 lg:h-16 lg:w-16 rounded-xl object-contain bg-white/5 p-1 shrink-0" />
          ) : (
            <span className="flex h-9 w-9 sm:h-14 sm:w-14 lg:h-16 lg:w-16 items-center justify-center rounded-xl bg-blue-600 shrink-0">
              <Church className="h-5 w-5 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-white" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[9px] sm:text-xs lg:text-sm uppercase tracking-[0.15em] text-blue-300 font-semibold truncate">
              {church.name}
            </p>
            <h1 className="text-base sm:text-2xl lg:text-4xl font-bold tracking-tight truncate">
              {conference.name}
            </h1>
          </div>
          {day && (
            <div className="text-right shrink-0">
              <p className="text-[9px] sm:text-xs lg:text-sm uppercase tracking-[0.1em] text-slate-400 font-semibold">
                {mode === "between" ? "Nos vemos mañana" : "Bienvenido"}
              </p>
              <p className="text-sm sm:text-xl lg:text-3xl font-bold capitalize leading-tight">{fmtFecha(day.date)}</p>
              <p className="text-[9px] sm:text-xs lg:text-sm text-slate-400">Día {day.dayNumber} de {totalDays}</p>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 flex flex-col gap-2 sm:gap-3 lg:gap-4 overflow-hidden">
          {groupByTimeOfDay(sessions.slice(0, 6)).map((group, gi) => (
            <div key={gi} className="flex-1 min-h-0 flex flex-col gap-2 sm:gap-3 lg:gap-4">
              {group.label && (
                <p className="shrink-0 text-[9px] sm:text-sm lg:text-base font-bold uppercase tracking-[0.15em] text-blue-300/80 px-1">
                  {group.label}
                </p>
              )}
              {group.items.map((s) => (
                <div key={s.id} className="flex flex-1 items-center gap-3 sm:gap-6 lg:gap-8 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 sm:px-8 sm:py-5 lg:px-12 lg:py-6 text-left backdrop-blur-md">
                  <div className="w-16 sm:w-28 lg:w-36 shrink-0">
                    <p className="text-base sm:text-3xl lg:text-5xl font-bold tabular-nums text-blue-200 leading-tight">
                      {s.timeStart || "—"}
                    </p>
                    {s.timeEnd && (
                      <p className="text-[10px] sm:text-sm lg:text-lg text-slate-400 tabular-nums">a {s.timeEnd}</p>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {s.type?.label && (
                      <span className="inline-flex items-center gap-1.5 text-[9px] sm:text-sm lg:text-base font-semibold uppercase tracking-wide text-slate-300">
                        <span className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full ${accentClasses(s.type.color)}`} />
                        {s.type.label}
                      </span>
                    )}
                    <p className="mt-0.5 sm:mt-1 text-sm sm:text-2xl lg:text-4xl font-bold text-slate-100 truncate">
                      {s.title}
                    </p>
                    {(s.speaker || s.scriptureRef) && (
                      <div className="mt-0.5 sm:mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] sm:text-base lg:text-xl text-slate-400">
                        {s.speaker && (
                          <span className="flex items-center gap-1.5">
                            <User className="h-2.5 w-2.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 shrink-0" /> {s.speaker}
                          </span>
                        )}
                        {s.scriptureRef && (
                          <span className="flex items-center gap-1.5">
                            <BookOpen className="h-2.5 w-2.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 shrink-0" /> {s.scriptureRef}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[85vh] flex-col items-center justify-center gap-4 sm:gap-6 lg:gap-8 px-4 py-8 text-center">
      {church.logoUrl ? (
        <img src={church.logoUrl} alt="" className="h-24 w-24 sm:h-36 sm:w-36 lg:h-52 lg:w-52 rounded-3xl object-contain bg-white/5 p-2" />
      ) : (
        <span className="flex h-24 w-24 sm:h-36 sm:w-36 lg:h-52 lg:w-52 items-center justify-center rounded-3xl bg-blue-600">
          <Church className="h-12 w-12 sm:h-20 sm:w-20 lg:h-28 lg:w-28 text-white" />
        </span>
      )}

      <div>
        <p className="text-[10px] sm:text-sm lg:text-lg uppercase tracking-[0.2em] text-blue-300 font-semibold">
          {church.name}
        </p>
        <h1 className="mt-1 text-xl sm:text-3xl lg:text-6xl font-bold tracking-tight">
          {conference.name}
        </h1>
        {(conference.theme || conference.themeVerse) && (
          <p className="mt-1 text-xs sm:text-base lg:text-2xl text-blue-300">
            {[conference.theme, conference.themeVerse].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      <div className="rounded-2xl lg:rounded-3xl border border-white/10 bg-black/30 backdrop-blur-md px-5 py-4 sm:px-10 sm:py-6 lg:px-14 lg:py-9">
        {mode === "finished" ? (
          <>
            <p className="text-base sm:text-2xl lg:text-4xl font-bold">Gracias por acompañarnos</p>
            <p className="mt-1 text-xs sm:text-base lg:text-xl text-slate-300">La conferencia ha finalizado</p>
          </>
        ) : mode === "paused" || mode === "break" ? (
          <>
            <p className="text-[10px] sm:text-sm lg:text-lg uppercase tracking-[0.15em] text-blue-300 font-semibold">
              En receso
            </p>
            <p className="mt-1 text-base sm:text-2xl lg:text-4xl font-bold">{message}</p>
          </>
        ) : loadingPreview ? (
          <div className="flex items-center gap-2.5 sm:gap-3 text-slate-300">
            <span className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 animate-spin rounded-full border-2 border-white/20 border-t-blue-400" />
            <span className="text-xs sm:text-base lg:text-xl">Preparando el programa...</span>
          </div>
        ) : (
          <>
            <p className="text-[10px] sm:text-sm lg:text-lg uppercase tracking-[0.15em] text-slate-400 font-semibold">
              {mode === "between" ? "Nos vemos mañana" : "Bienvenido"}
            </p>
            {day && (
              <>
                <p className="mt-1 text-base sm:text-2xl lg:text-4xl font-bold capitalize">{fmtFecha(day.date)}</p>
                <p className="mt-1 text-[10px] sm:text-sm lg:text-lg text-slate-400">
                  Día {day.dayNumber} de {totalDays}
                </p>
              </>
            )}
          </>
        )}
      </div>
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
  // Programa del día siguiente, para la pantalla "entre días" — solo se
  // pide cuando la jornada de hoy ya terminó (ver efecto más abajo).
  const [preview, setPreview] = useState(null);

  // Fecha de HOY según el reloj del dispositivo que tiene la pantalla
  // delante (el televisor del salón), no la del servidor. El backend corre
  // en un VPS que casi seguro está en UTC — sin esto, cualquier iglesia en
  // América quedaría "un día adelantada" apenas pasaran unas horas de la
  // tarde (ej. 8pm hora del Este ya es medianoche UTC), y el "día activo"
  // saltaría al siguiente aunque la sesión de esta noche siga en curso.
  const localDateString = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const cargar = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/public/conference/${token}/today?date=${localDateString()}`);
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
    const id = setInterval(cargar, 5_000);
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

  // Hoy "terminó" cuando ya tiene sesiones y ninguna sigue futura/en curso.
  // Antes de que llegue la primera sesión del día esto es false (no vale
  // confundir "no ha empezado" con "ya acabó").
  const todayDone =
    !!data?.day?.isToday &&
    sesiones.length > 0 &&
    sesiones.every((s) => s.estado === "pasada" || s.estado === "cancelada");

  const nextDay = useMemo(() => {
    if (!todayDone || !data?.days?.length) return null;
    return data.days.find((d) => d.date > data.day.date) || null;
  }, [todayDone, data]);

  // Se pide aparte del `cargar()` de arriba porque ese siempre trae el día
  // "activo" (hoy); este trae el día SIGUIENTE, solo cuando hace falta.
  useEffect(() => {
    if (!nextDay) return;
    let cancelado = false;
    const pedir = () => {
      fetch(`${API_URL}/public/conference/${token}/today?date=${nextDay.date}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d && !cancelado) setPreview(d);
        })
        .catch(() => {});
    };
    pedir();
    const id = setInterval(pedir, 10_000);
    return () => {
      cancelado = true;
      clearInterval(id);
    };
  }, [nextDay?.date, token]);

  // Sesión en curso ahora mismo marcada como receso — misma marca
  // ("no requiere asistencia") que ya usa el staff en el programa para
  // recesos/comidas, reusada acá para no inventar un campo nuevo.
  const breakSession = sesiones.find((s) => s.estado === "encurso" && s.takesAttendance === false);

  // Orden de prioridad: pausa manual > receso automático (sesión) >
  // bienvenida/entre-días/cierre > lista normal.
  // "before": el día activo (el que ya trajo `cargar()`) todavía no es hoy.
  // "between"/"finished": hoy ya terminó, con o sin día siguiente.
  const idleMode = data?.displayPaused
    ? "paused"
    : breakSession
      ? "break"
      : data && !data.day?.isToday
        ? "before"
        : todayDone
          ? (nextDay ? "between" : "finished")
          : null;

  const idleMessage =
    idleMode === "paused"
      ? data?.displayPauseMessage || "Volvemos pronto"
      : idleMode === "break"
        ? breakSession.timeEnd
          ? `${breakSession.title} · Volvemos a las ${breakSession.timeEnd}`
          : breakSession.title
        : undefined;

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
    <div className="relative min-h-screen bg-[#1e1b4b] text-white p-3 sm:p-6 lg:p-10">
      <FondoAnimado />

      <div className="relative">
        {idleMode ? (
          <IdleScreen
            mode={idleMode}
            church={data.church}
            conference={data.conference}
            day={idleMode === "between" ? preview?.day : data.day}
            totalDays={data.totalDays}
            sessions={idleMode === "between" ? preview?.sessions : sesiones}
            loadingPreview={idleMode === "between" && !preview}
            message={idleMessage}
          />
        ) : (
        <>
        <header className="flex flex-wrap items-start justify-between gap-3 sm:gap-6 rounded-2xl lg:rounded-3xl border border-white/10 bg-black/30 p-3 sm:p-5 lg:p-6 backdrop-blur-md">
          <div className="flex items-center gap-3 sm:gap-5 min-w-0">
            {data.church.logoUrl ? (
              <img src={data.church.logoUrl} alt="" className="h-9 w-9 sm:h-12 sm:w-12 lg:h-16 lg:w-16 rounded-xl lg:rounded-2xl object-contain bg-white/5 p-1 shrink-0" />
            ) : (
              <span className="flex h-9 w-9 sm:h-12 sm:w-12 lg:h-16 lg:w-16 items-center justify-center rounded-xl lg:rounded-2xl bg-blue-600 shrink-0">
                <Church className="h-5 w-5 sm:h-7 sm:w-7 lg:h-9 lg:w-9 text-white" />
              </span>
            )}
            <div className="min-w-0">
              <h1 className="text-base sm:text-2xl lg:text-5xl font-bold tracking-tight truncate">
                {data.conference.name}
              </h1>
              <p className="mt-0.5 text-xs sm:text-base lg:text-2xl text-blue-300 truncate">
                {data.conference.theme}
                {data.conference.themeVerse && (
                  <span className="text-slate-300"> · {data.conference.themeVerse}</span>
                )}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="text-2xl sm:text-4xl lg:text-7xl font-bold tabular-nums leading-none">{reloj}</p>
            <p className="mt-1 text-xs sm:text-base lg:text-2xl capitalize text-slate-300">
              {data.day ? fmtFecha(data.day.date) : "—"}
            </p>
            {data.day && (
              <p className="text-[10px] sm:text-sm lg:text-lg text-slate-400">
                Día {data.day.dayNumber} de {data.totalDays}
                {data.displayForcedDayId ? " · fijado manualmente" : !data.day.isToday && " · próxima jornada"}
              </p>
            )}
          </div>
        </header>

        {data.conference.location && (
          <p className="mt-2 sm:mt-4 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-base lg:text-lg text-slate-300">
            <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 shrink-0" /> {data.conference.location}
          </p>
        )}

        {sesiones.length === 0 ? (
          <p className="mt-12 sm:mt-24 text-center text-lg sm:text-2xl lg:text-4xl text-slate-300">
            No hay programa para este día.
          </p>
        ) : (
          <ul className="mt-4 sm:mt-6 lg:mt-8 space-y-2 sm:space-y-3 lg:space-y-4">
            {groupByTimeOfDay(sesiones).flatMap((group, gi) => [
              group.label && (
                <li key={`h-${gi}`} className="list-none">
                  <p className="text-[10px] sm:text-sm lg:text-lg font-bold uppercase tracking-[0.15em] text-blue-300/80 px-0.5 sm:px-1">
                    {group.label}
                  </p>
                </li>
              ),
              ...group.items.map((s) => {
              const activa = s.estado === "encurso";
              const pasada = s.estado === "pasada";
              const cancelada = s.estado === "cancelada";
              const siguiente = !cancelada && s.id === proxima?.id;

              return (
                <li
                  key={s.id}
                  className={`flex items-stretch gap-2.5 sm:gap-4 lg:gap-5 rounded-xl lg:rounded-2xl border p-2.5 sm:p-4 lg:p-6 backdrop-blur-md transition-all ${
                    activa
                      ? "border-blue-400/60 bg-blue-500/20 shadow-lg shadow-blue-500/20"
                      : cancelada
                        ? "border-red-500/20 bg-red-950/20 opacity-60"
                        : pasada
                          ? "border-white/5 bg-black/30 opacity-45"
                          : "border-white/10 bg-black/40"
                  }`}
                >
                  <div className={`w-1 sm:w-1.5 shrink-0 rounded-full ${activa ? "bg-blue-300" : cancelada ? "bg-red-400" : accentClasses(s.type?.color)} ${pasada || cancelada ? "opacity-40" : ""}`} />

                  <div className="w-14 sm:w-24 lg:w-44 shrink-0">
                    <p className={`text-sm sm:text-xl lg:text-4xl font-bold tabular-nums ${activa ? "text-blue-200" : "text-slate-200"}`}>
                      {s.timeStart || "—"}
                    </p>
                    {s.timeEnd && (
                      <p className="text-[10px] sm:text-sm lg:text-lg text-slate-400 tabular-nums">a {s.timeEnd}</p>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 lg:gap-3">
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
                        <span className={`rounded-full px-1.5 py-0.5 sm:px-2.5 sm:py-1 lg:px-3 text-[9px] sm:text-xs lg:text-sm font-semibold ${activa ? "bg-blue-600 text-white" : "bg-black/50 text-slate-200"}`}>
                          {s.type.label}
                        </span>
                      )}
                      {activa && (
                        <span className="flex items-center gap-1 sm:gap-2 rounded-full bg-blue-600 px-1.5 py-0.5 sm:px-2.5 sm:py-1 lg:px-3 text-[9px] sm:text-xs lg:text-sm font-bold text-white">
                          <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 animate-pulse rounded-full bg-white" />
                          EN CURSO
                        </span>
                      )}
                      {cancelada && (
                        <span className="rounded-full bg-red-600 px-1.5 py-0.5 sm:px-2.5 sm:py-1 lg:px-3 text-[9px] sm:text-xs lg:text-sm font-bold text-white">
                          CANCELADO
                        </span>
                      )}
                      {siguiente && (
                        <span className="flex items-center gap-1 sm:gap-2 rounded-full border border-white/20 px-1.5 py-0.5 sm:px-2.5 sm:py-1 lg:px-3 text-[9px] sm:text-xs lg:text-sm font-semibold text-slate-200 whitespace-nowrap">
                          <Clock className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4 shrink-0" /> A CONTINUACIÓN
                        </span>
                      )}
                    </div>

                    <h2 className={`mt-1 sm:mt-2 text-sm sm:text-lg lg:text-4xl font-bold leading-tight ${activa ? "text-white" : "text-slate-100"} ${cancelada ? "line-through decoration-red-400/70" : ""}`}>
                      {s.title}
                    </h2>

                    <div className="mt-1 sm:mt-2 flex flex-wrap gap-x-3 sm:gap-x-6 gap-y-0.5 sm:gap-y-1 text-[10px] sm:text-sm lg:text-xl text-slate-300">
                      {s.speaker && (
                        <span className="flex items-center gap-1 sm:gap-2">
                          <User className="h-2.5 w-2.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 shrink-0" /> {s.speaker}
                        </span>
                      )}
                      {s.scriptureRef && (
                        <span className="flex items-center gap-1 sm:gap-2">
                          <BookOpen className="h-2.5 w-2.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5 shrink-0" /> {s.scriptureRef}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
              }),
            ].filter(Boolean))}
          </ul>
        )}
        </>
        )}
      </div>
    </div>
  );
}

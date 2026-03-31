import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {useAuth} from "@/contexts/AuthContext";
import {
  Users,
  UsersRound,
  DollarSign,
  CalendarDays,
  UserSearch,
  Rocket,
  Cake,
  TrendingUp,
  ArrowUpRight,
  Wine,
  Flame,
} from "lucide-react";
import {
  membersService,
  financesService,
  groupsService,
  eventsService,
  visitorsService,
  activitiesService,
  communionService,
  prayerService,
} from "@/services/api";

// ── Utilidades ────────────────────────────────────────────────────────────────

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
};

const todayLabel = () =>
  new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const formatDate = (val) => {
  if (!val) return "—";
  return new Date(val.slice(0, 10) + "T12:00:00").toLocaleDateString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
};

const formatCurrency = (val) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(val || 0);

const DAYS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAYS_FULL = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

const fmtTimePrayer = (t) => {
  if (!t) return "";
  const [h, m] = t.slice(0, 5).split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
};

/** Días desde hoy hasta el próximo día de semana dado (0 = hoy mismo) */
const daysUntil = (dow) => (dow - new Date().getDay() + 7) % 7;

const EVENT_TYPE = {
  CULTO: {
    label: "Culto",
    color: "bg-blue-500/20 text-blue-300",
    icon: CalendarDays,
  },
  REUNION: {
    label: "Reunión",
    color: "bg-purple-500/20 text-purple-300",
    icon: CalendarDays,
  },
  ESPECIAL: {
    label: "Especial",
    color: "bg-amber-500/20 text-amber-300",
    icon: CalendarDays,
  },
  COMMUNION: {
    label: "Santa Cena",
    color: "bg-red-600/20 text-red-300",
    icon: Wine,
  },
};

// ── Componentes internos ──────────────────────────────────────────────────────

const StatCard = ({icon: Icon, label, value, sub, color, loading}) => (
  <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-center gap-4 hover:border-slate-600 transition-colors">
    <div
      className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}
    >
      <Icon className="h-6 w-6" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-slate-400 font-medium uppercase tracking-wide truncate">
        {label}
      </p>
      {loading ? (
        <div className="h-7 w-16 bg-slate-700 animate-pulse rounded mt-1" />
      ) : (
        <p className="text-2xl font-bold text-white leading-tight">{value}</p>
      )}
      {sub && !loading && (
        <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
      )}
    </div>
  </div>
);

// ── Página principal ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  const {user} = useAuth();

  const [memberStats, setMemberStats] = useState(null);
  const [balance, setBalance] = useState(null);
  const [groupTotal, setGroupTotal] = useState(null);
  const [visitorStats, setVisitorStats] = useState(null);
  const [activityStats, setActivityStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [birthdays, setBirthdays] = useState([]);
  const [prayerSessions, setPrayerSessions] = useState([]);
  const [loadingPrayer, setLoadingPrayer] = useState(true);

  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoadingStats(true);
      try {
        const [ms, fs, gs, vs, as_] = await Promise.allSettled([
          membersService.getStats(),
          financesService.getSummary(),
          groupsService.getStats(),
          visitorsService.getStats(),
          activitiesService.getStats(),
        ]);
        if (ms.status === "fulfilled") setMemberStats(ms.value);
        if (fs.status === "fulfilled")
          setBalance(fs.value?.summary?.balance ?? 0);
        if (gs.status === "fulfilled") setGroupTotal(gs.value?.total ?? 0);
        if (vs.status === "fulfilled") setVisitorStats(vs.value?.stats);
        if (as_.status === "fulfilled") setActivityStats(as_.value?.stats);
      } finally {
        setLoadingStats(false);
      }
    };

    const fetchEvents = async () => {
      setLoadingEvents(true);
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [evData, commData] = await Promise.allSettled([
          eventsService.getAll({limit: 100}),
          communionService.getAll({limit: 50}),
        ]);

        const upcomingEvents = (
          evData.status === "fulfilled" ? evData.value?.events || [] : []
        )
          .filter((e) => new Date(e.date.slice(0, 10) + "T00:00:00") >= today)
          .map((e) => ({...e, _kind: "event", date: e.date}));

        const upcomingComm = (
          commData.status === "fulfilled" ? commData.value?.communion || [] : []
        )
          .filter((c) => new Date(c.date.slice(0, 10) + "T00:00:00") >= today)
          .map((c) => ({
            ...c,
            _kind: "communion",
            title: "Santa Cena",
            event_type: "COMMUNION",
            date: c.date + (c.time ? "T" + c.time : "T00:00:00"),
          }));

        const combined = [...upcomingEvents, ...upcomingComm]
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .slice(0, 6);

        setEvents(combined);
      } finally {
        setLoadingEvents(false);
      }
    };

    const fetchBirthdays = async () => {
      try {
        const currentMonth = new Date().getMonth() + 1;
        const data = await membersService.getAll({
          limit: 200,
          status: "ACTIVO",
        });
        const thisMonth = (data?.members || [])
          .filter((m) => {
            if (!m.birth_date) return false;
            return parseInt(m.birth_date.slice(5, 7)) === currentMonth;
          })
          .sort(
            (a, b) =>
              parseInt(a.birth_date.slice(8, 10)) -
              parseInt(b.birth_date.slice(8, 10)),
          )
          .slice(0, 6);
        setBirthdays(thisMonth);
      } catch {
        /* silencioso */
      }
    };

    const fetchPrayer = async () => {
      setLoadingPrayer(true);
      try {
        const data = await prayerService.getAll();
        const active = (data?.prayer_days || [])
          .filter((s) => s.is_active)
          .sort((a, b) => daysUntil(a.day_of_week) - daysUntil(b.day_of_week));
        setPrayerSessions(active);
      } catch {
        /* silencioso */
      } finally {
        setLoadingPrayer(false);
      }
    };

    fetchAll();
    fetchEvents();
    fetchBirthdays();
    fetchPrayer();
  }, []);

  const firstName = user?.fullName?.split(" ")[0] || "Pastor";

  return (
    <div className="space-y-8">
      {/* ── Hero header ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-800 to-blue-900/40 border border-slate-700 rounded-2xl p-6 sm:p-8">
        {/* Decoración de fondo */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 right-16 w-32 h-32 bg-purple-500/5 rounded-full translate-y-1/2 pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-blue-400 font-medium mb-1">
              {greeting()}
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">
              {firstName} <span className="text-slate-400 font-normal">👋</span>
            </h1>
            <p className="text-slate-400 mt-1 text-sm capitalize">
              {todayLabel()}
            </p>
            {user?.churchName && (
              <p className="text-slate-500 text-xs mt-1">{user.churchName}</p>
            )}
          </div>

          {/* Mini métricas rápidas */}
          <div className="flex gap-3 sm:gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">
                {loadingStats
                  ? "—"
                  : (memberStats?.active ?? memberStats?.total ?? "—")}
              </p>
              <p className="text-xs text-slate-400">Activos</p>
            </div>
            <div className="w-px bg-slate-700" />
            <div className="text-center">
              <p className="text-2xl font-bold text-teal-400">
                {loadingStats ? "—" : (visitorStats?.en_seguimiento ?? "—")}
              </p>
              <p className="text-xs text-slate-400">En seguim.</p>
            </div>
            <div className="w-px bg-slate-700" />
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-400">
                {loadingStats ? "—" : (activityStats?.en_progreso ?? "—")}
              </p>
              <p className="text-xs text-slate-400">Actividades</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          icon={Users}
          label="Total Miembros"
          value={memberStats?.total ?? "—"}
          sub={
            memberStats?.active ? `${memberStats.active} activos` : undefined
          }
          color="bg-blue-500/20 text-blue-400"
          loading={loadingStats}
        />
        <StatCard
          icon={UserSearch}
          label="Visitantes"
          value={visitorStats?.total ?? "—"}
          sub={
            visitorStats?.nuevos_este_mes
              ? `+${visitorStats.nuevos_este_mes} este mes`
              : undefined
          }
          color="bg-teal-500/20 text-teal-400"
          loading={loadingStats}
        />
        <StatCard
          icon={UsersRound}
          label="Grupos"
          value={groupTotal ?? "—"}
          color="bg-purple-500/20 text-purple-400"
          loading={loadingStats}
        />
        <StatCard
          icon={Rocket}
          label="Actividades"
          value={activityStats?.total ?? "—"}
          sub={
            activityStats?.completadas
              ? `${activityStats.completadas} completadas`
              : undefined
          }
          color="bg-orange-500/20 text-orange-400"
          loading={loadingStats}
        />
        <StatCard
          icon={DollarSign}
          label="Balance"
          value={balance !== null ? formatCurrency(balance) : "—"}
          color={
            balance >= 0
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-red-500/20 text-red-400"
          }
          loading={loadingStats}
        />
      </div>

      {/* ── Eventos + Cumpleaños ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximos eventos */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-blue-400" />
              <h2 className="font-semibold text-white">Próximos Eventos</h2>
            </div>
            <Link
              to="/dashboard/events"
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-400 transition-colors"
            >
              Ver todos <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="p-3 space-y-1.5">
            {loadingEvents ? (
              [1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-14 bg-slate-700/50 animate-pulse rounded-lg"
                />
              ))
            ) : events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                <CalendarDays className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm">No hay eventos próximos</p>
              </div>
            ) : (
              events.map((event) => {
                const typeInfo = EVENT_TYPE[event.event_type] || {
                  label: event.event_type,
                  color: "bg-slate-500/20 text-slate-300",
                  icon: CalendarDays,
                };
                const todayDate = new Date();
                todayDate.setHours(0, 0, 0, 0);
                const isToday =
                  new Date(event.date.slice(0, 10) + "T00:00:00").getTime() ===
                  todayDate.getTime();
                const isCommunion = event._kind === "communion";
                const highlightClass = isToday
                  ? isCommunion
                    ? "bg-red-600/10 border border-red-600/20"
                    : "bg-blue-500/10 border border-blue-500/20"
                  : "hover:bg-slate-700/40";
                const ItemIcon = typeInfo.icon || CalendarDays;
                return (
                  <div
                    key={`${event._kind}-${event.id}`}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${highlightClass}`}
                  >
                    {/* Date block */}
                    <div className="text-center w-10 flex-shrink-0">
                      <p className="text-lg font-bold text-white leading-none">
                        {new Date(
                          event.date.slice(0, 10) + "T12:00:00",
                        ).getDate()}
                      </p>
                      <p className="text-xs text-slate-500 uppercase">
                        {new Date(
                          event.date.slice(0, 10) + "T12:00:00",
                        ).toLocaleDateString("es-MX", {month: "short"})}
                      </p>
                    </div>
                    <div className="w-px h-8 bg-slate-600 flex-shrink-0" />
                    {/* Icon */}
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isCommunion ? "bg-red-600/20" : "bg-blue-500/10"}`}
                    >
                      <ItemIcon
                        className={`h-3.5 w-3.5 ${isCommunion ? "text-red-400" : "text-blue-400"}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">
                          {event.title}
                        </p>
                        {isToday && (
                          <span
                            className={`text-xs font-medium flex-shrink-0 ${isCommunion ? "text-red-400" : "text-blue-400"}`}
                          >
                            Hoy
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {formatDate(event.date)}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${typeInfo.color}`}
                    >
                      {typeInfo.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Cumpleaños del mes */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <Cake className="h-4 w-4 text-pink-400" />
              <h2 className="font-semibold text-white">Cumpleaños del Mes</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-medium capitalize">
                {new Date().toLocaleDateString("es-MX", {month: "long"})}
              </span>
            </div>
            <Link
              to="/dashboard/members"
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-pink-400 transition-colors"
            >
              Ver todos <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="p-3 space-y-1.5">
            {birthdays.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                <Cake className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm">Sin cumpleaños registrados este mes</p>
              </div>
            ) : (
              birthdays.map((member) => {
                const day = parseInt(member.birth_date.slice(8, 10));
                const today = new Date().getDate();
                const isToday = day === today;
                const isPast = day < today;
                return (
                  <div
                    key={member.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isToday ? "bg-pink-500/10 border border-pink-500/20" : isPast ? "opacity-40" : "hover:bg-slate-700/40"}`}
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                      {member.first_name[0]}
                      {member.last_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {member.first_name} {member.last_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(
                          member.birth_date.slice(0, 10) + "T12:00:00",
                        ).toLocaleDateString("es-MX", {
                          day: "numeric",
                          month: "long",
                        })}
                      </p>
                    </div>
                    {isToday && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-medium flex-shrink-0">
                        🎂 Hoy
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Días de Oración ─────────────────────────────────────────────── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-400" />
            <h2 className="font-semibold text-white">Días de Oración</h2>
            {!loadingPrayer && prayerSessions.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-medium">
                {prayerSessions.length} activa
                {prayerSessions.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <Link
            to="/dashboard/prayer"
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-orange-400 transition-colors"
          >
            Administrar <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loadingPrayer ? (
          <div className="p-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className="h-16 bg-slate-700/50 animate-pulse rounded-lg"
              />
            ))}
          </div>
        ) : prayerSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-500">
            <Flame className="h-10 w-10 mb-2 opacity-20" />
            <p className="text-sm">No hay sesiones de oración configuradas</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Mini calendario semanal */}
            <div className="grid grid-cols-7 gap-1.5">
              {DAYS_ES.map((day, dow) => {
                const todayDow = new Date().getDay();
                const isToday = dow === todayDow;
                const session = prayerSessions.find(
                  (s) => s.day_of_week === dow,
                );
                return (
                  <div
                    key={dow}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-center transition-colors ${
                      session && isToday
                        ? "bg-orange-500/20 border border-orange-500/40"
                        : session
                          ? "bg-slate-700/60 border border-slate-600/60"
                          : isToday
                            ? "bg-slate-700/30 border border-slate-600/40"
                            : "bg-slate-700/20 border border-transparent"
                    }`}
                  >
                    <span
                      className={`text-[11px] font-semibold uppercase tracking-wide ${
                        isToday
                          ? session
                            ? "text-orange-300"
                            : "text-slate-300"
                          : "text-slate-500"
                      }`}
                    >
                      {day}
                    </span>
                    {session ? (
                      <Flame
                        className={`h-3.5 w-3.5 ${
                          isToday ? "text-orange-400" : "text-orange-500/60"
                        }`}
                      />
                    ) : (
                      <div className="h-3.5 w-3.5" />
                    )}
                    {isToday && (
                      <div className="w-1 h-1 rounded-full bg-blue-400" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Lista de sesiones */}
            <div className="space-y-1.5">
              {prayerSessions.map((s) => {
                const until = daysUntil(s.day_of_week);
                const isToday = until === 0;
                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      isToday
                        ? "bg-orange-500/10 border border-orange-500/20"
                        : "hover:bg-slate-700/40"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isToday ? "bg-orange-500/20" : "bg-slate-700"
                      }`}
                    >
                      <Flame
                        className={`h-3.5 w-3.5 ${
                          isToday ? "text-orange-400" : "text-slate-500"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">
                          {s.name}
                        </p>
                        {isToday && (
                          <span className="text-xs text-orange-400 font-semibold flex-shrink-0">
                            Hoy
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {DAYS_FULL[s.day_of_week]}
                        {s.start_time && ` · ${fmtTimePrayer(s.start_time)}`}
                        {s.location && ` · ${s.location}`}
                      </p>
                    </div>
                    <span className="text-xs text-slate-500 flex-shrink-0">
                      {isToday
                        ? "hoy"
                        : until === 1
                          ? "mañana"
                          : `en ${until}d`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Embudo de visitantes ──────────────────────────────────────────── */}
      {visitorStats && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-teal-400" />
              <h2 className="font-semibold text-white">Embudo de Visitantes</h2>
            </div>
            <Link
              to="/dashboard/visitors"
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-teal-400 transition-colors"
            >
              Gestionar <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "Primera Visita",
                value: visitorStats.primera_visita,
                color: "border-blue-500 text-blue-300",
                bg: "bg-blue-500/5",
              },
              {
                label: "En Seguimiento",
                value: visitorStats.en_seguimiento,
                color: "border-yellow-500 text-yellow-300",
                bg: "bg-yellow-500/5",
              },
              {
                label: "Integrados",
                value: visitorStats.integrados,
                color: "border-green-500 text-green-300",
                bg: "bg-green-500/5",
              },
              {
                label: "Inactivos",
                value: visitorStats.inactivos,
                color: "border-slate-500 text-slate-400",
                bg: "bg-slate-500/5",
              },
            ].map((item) => (
              <div
                key={item.label}
                className={`${item.bg} border ${item.color} rounded-lg p-3 text-center`}
              >
                <p className={`text-2xl font-bold ${item.color.split(" ")[1]}`}>
                  {item.value ?? 0}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Users, UsersRound, DollarSign, CalendarDays, Clock,
  UserSearch, Rocket, Cake, TrendingUp, ChevronRight,
  CheckSquare, Heart, Droplet, UserPlus, BarChart3,
  UserCog, Settings, Home, ArrowUpRight, Wine,
} from "lucide-react";
import {
  membersService, financesService, groupsService,
  eventsService, visitorsService, activitiesService, communionService,
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
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

const formatDate = (val) => {
  if (!val) return "—";
  return new Date(val.slice(0, 10) + "T12:00:00").toLocaleDateString("es-MX", {
    weekday: "short", day: "numeric", month: "short",
  });
};

const formatCurrency = (val) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(val || 0);

const EVENT_TYPE = {
  CULTO:       { label: "Culto",       color: "bg-blue-500/20 text-blue-300",   icon: CalendarDays },
  REUNION:     { label: "Reunión",     color: "bg-purple-500/20 text-purple-300", icon: CalendarDays },
  ESPECIAL:    { label: "Especial",    color: "bg-amber-500/20 text-amber-300", icon: CalendarDays },
  COMMUNION:   { label: "Santa Cena",  color: "bg-red-600/20 text-red-300",     icon: Wine },
};

// ── Componentes internos ──────────────────────────────────────────────────────

const StatCard = ({ icon: Icon, label, value, sub, color, loading }) => (
  <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-center gap-4 hover:border-slate-600 transition-colors">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon className="h-6 w-6" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-slate-400 font-medium uppercase tracking-wide truncate">{label}</p>
      {loading ? (
        <div className="h-7 w-16 bg-slate-700 animate-pulse rounded mt-1" />
      ) : (
        <p className="text-2xl font-bold text-white leading-tight">{value}</p>
      )}
      {sub && !loading && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  </div>
);

const QuickLink = ({ to, icon: Icon, label, color }) => (
  <Link
    to={to}
    className="flex flex-col items-center gap-2 p-4 bg-slate-800 border border-slate-700 rounded-xl hover:border-slate-500 hover:bg-slate-700/60 transition-all group"
  >
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
      <Icon className="h-5 w-5" />
    </div>
    <span className="text-xs text-slate-400 group-hover:text-white transition-colors text-center leading-tight">{label}</span>
  </Link>
);

// ── Página principal ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();

  const [memberStats,   setMemberStats]   = useState(null);
  const [balance,       setBalance]       = useState(null);
  const [groupTotal,    setGroupTotal]    = useState(null);
  const [visitorStats,  setVisitorStats]  = useState(null);
  const [activityStats, setActivityStats] = useState(null);
  const [events,        setEvents]        = useState([]);
  const [birthdays,     setBirthdays]     = useState([]);

  const [loadingStats,  setLoadingStats]  = useState(true);
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
        if (fs.status === "fulfilled") setBalance(fs.value?.summary?.balance ?? 0);
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
        const today = new Date(); today.setHours(0, 0, 0, 0);

        const [evData, commData] = await Promise.allSettled([
          eventsService.getAll({ limit: 100 }),
          communionService.getAll({ limit: 50 }),
        ]);

        const upcomingEvents = (evData.status === "fulfilled" ? evData.value?.events || [] : [])
          .filter((e) => new Date(e.date.slice(0, 10) + "T00:00:00") >= today)
          .map((e) => ({ ...e, _kind: "event", date: e.date }));

        const upcomingComm = (commData.status === "fulfilled" ? commData.value?.communion || [] : [])
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
        const data = await membersService.getAll({ limit: 200, status: "ACTIVO" });
        const thisMonth = (data?.members || [])
          .filter((m) => {
            if (!m.birth_date) return false;
            return parseInt(m.birth_date.slice(5, 7)) === currentMonth;
          })
          .sort((a, b) => parseInt(a.birth_date.slice(8, 10)) - parseInt(b.birth_date.slice(8, 10)))
          .slice(0, 6);
        setBirthdays(thisMonth);
      } catch { /* silencioso */ }
    };

    fetchAll();
    fetchEvents();
    fetchBirthdays();
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
            <p className="text-sm text-blue-400 font-medium mb-1">{greeting()}</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">
              {firstName} <span className="text-slate-400 font-normal">👋</span>
            </h1>
            <p className="text-slate-400 mt-1 text-sm capitalize">{todayLabel()}</p>
            {user?.churchName && (
              <p className="text-slate-500 text-xs mt-1">{user.churchName}</p>
            )}
          </div>

          {/* Mini métricas rápidas */}
          <div className="flex gap-3 sm:gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">
                {loadingStats ? "—" : (memberStats?.active ?? memberStats?.total ?? "—")}
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
          sub={memberStats?.active ? `${memberStats.active} activos` : undefined}
          color="bg-blue-500/20 text-blue-400"
          loading={loadingStats}
        />
        <StatCard
          icon={UserSearch}
          label="Visitantes"
          value={visitorStats?.total ?? "—"}
          sub={visitorStats?.nuevos_este_mes ? `+${visitorStats.nuevos_este_mes} este mes` : undefined}
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
          sub={activityStats?.completadas ? `${activityStats.completadas} completadas` : undefined}
          color="bg-orange-500/20 text-orange-400"
          loading={loadingStats}
        />
        <StatCard
          icon={DollarSign}
          label="Balance"
          value={balance !== null ? formatCurrency(balance) : "—"}
          color={balance >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}
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
            <Link to="/dashboard/events" className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-400 transition-colors">
              Ver todos <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="p-3 space-y-1.5">
            {loadingEvents ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-slate-700/50 animate-pulse rounded-lg" />
              ))
            ) : events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                <CalendarDays className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm">No hay eventos próximos</p>
              </div>
            ) : (
              events.map((event) => {
                const typeInfo = EVENT_TYPE[event.event_type] || { label: event.event_type, color: "bg-slate-500/20 text-slate-300", icon: CalendarDays };
                const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0);
                const isToday = new Date(event.date.slice(0, 10) + "T00:00:00").getTime() === todayDate.getTime();
                const isCommunion = event._kind === "communion";
                const highlightClass = isToday
                  ? (isCommunion ? "bg-red-600/10 border border-red-600/20" : "bg-blue-500/10 border border-blue-500/20")
                  : "hover:bg-slate-700/40";
                const ItemIcon = typeInfo.icon || CalendarDays;
                return (
                  <div key={`${event._kind}-${event.id}`}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${highlightClass}`}>
                    {/* Date block */}
                    <div className="text-center w-10 flex-shrink-0">
                      <p className="text-lg font-bold text-white leading-none">
                        {new Date(event.date.slice(0, 10) + "T12:00:00").getDate()}
                      </p>
                      <p className="text-xs text-slate-500 uppercase">
                        {new Date(event.date.slice(0, 10) + "T12:00:00").toLocaleDateString("es-MX", { month: "short" })}
                      </p>
                    </div>
                    <div className="w-px h-8 bg-slate-600 flex-shrink-0" />
                    {/* Icon */}
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isCommunion ? "bg-red-600/20" : "bg-blue-500/10"}`}>
                      <ItemIcon className={`h-3.5 w-3.5 ${isCommunion ? "text-red-400" : "text-blue-400"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">{event.title}</p>
                        {isToday && <span className={`text-xs font-medium flex-shrink-0 ${isCommunion ? "text-red-400" : "text-blue-400"}`}>Hoy</span>}
                      </div>
                      <p className="text-xs text-slate-500">{formatDate(event.date)}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${typeInfo.color}`}>
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
                {new Date().toLocaleDateString("es-MX", { month: "long" })}
              </span>
            </div>
            <Link to="/dashboard/members" className="flex items-center gap-1 text-xs text-slate-400 hover:text-pink-400 transition-colors">
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
                const isPast  = day < today;
                return (
                  <div key={member.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isToday ? "bg-pink-500/10 border border-pink-500/20" : isPast ? "opacity-40" : "hover:bg-slate-700/40"}`}>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                      {member.first_name[0]}{member.last_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {member.first_name} {member.last_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(member.birth_date.slice(0, 10) + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "long" })}
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

      {/* ── Embudo de visitantes ──────────────────────────────────────────── */}
      {visitorStats && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-teal-400" />
              <h2 className="font-semibold text-white">Embudo de Visitantes</h2>
            </div>
            <Link to="/dashboard/visitors" className="flex items-center gap-1 text-xs text-slate-400 hover:text-teal-400 transition-colors">
              Gestionar <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Primera Visita", value: visitorStats.primera_visita, color: "border-blue-500 text-blue-300", bg: "bg-blue-500/5" },
              { label: "En Seguimiento", value: visitorStats.en_seguimiento, color: "border-yellow-500 text-yellow-300", bg: "bg-yellow-500/5" },
              { label: "Integrados",     value: visitorStats.integrados,     color: "border-green-500 text-green-300", bg: "bg-green-500/5" },
              { label: "Inactivos",      value: visitorStats.inactivos,      color: "border-slate-500 text-slate-400", bg: "bg-slate-500/5" },
            ].map((item) => (
              <div key={item.label} className={`${item.bg} border ${item.color} rounded-lg p-3 text-center`}>
                <p className={`text-2xl font-bold ${item.color.split(" ")[1]}`}>{item.value ?? 0}</p>
                <p className="text-xs text-slate-400 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Acceso rápido ─────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">Acceso rápido</h2>
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-9 gap-3">
          <QuickLink to="/dashboard/members"   icon={Users}       label="Miembros"       color="bg-blue-500/20 text-blue-400" />
          <QuickLink to="/dashboard/visitors"  icon={UserSearch}  label="Visitantes"     color="bg-teal-500/20 text-teal-400" />
          <QuickLink to="/dashboard/families"  icon={UserPlus}    label="Familias"       color="bg-indigo-500/20 text-indigo-400" />
          <QuickLink to="/dashboard/groups"    icon={UsersRound}  label="Grupos"         color="bg-purple-500/20 text-purple-400" />
          <QuickLink to="/dashboard/events"    icon={CalendarDays} label="Eventos"       color="bg-cyan-500/20 text-cyan-400" />
          <QuickLink to="/dashboard/activities" icon={Rocket}     label="Actividades"    color="bg-orange-500/20 text-orange-400" />
          <QuickLink to="/dashboard/finances"  icon={DollarSign}  label="Finanzas"       color="bg-emerald-500/20 text-emerald-400" />
          <QuickLink to="/dashboard/donations" icon={Heart}       label="Diezmos"        color="bg-rose-500/20 text-rose-400" />
          <QuickLink to="/dashboard/baptisms"  icon={Droplet}     label="Bautismos"      color="bg-sky-500/20 text-sky-400" />
          <QuickLink to="/dashboard/communion" icon={Wine}        label="Santa Cena"     color="bg-red-600/20 text-red-400" />
        </div>
      </div>

    </div>
  );
}

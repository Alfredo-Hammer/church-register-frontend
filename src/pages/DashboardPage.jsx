import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Users, UserSearch, UsersRound, DollarSign,
  CalendarDays, Cake,
  TrendingUp, TrendingDown, ArrowUpRight,
  UserPlus, PlusCircle, Flame, ChevronRight,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  membersService, financesService, groupsService, eventsService,
  visitorsService, communionService, prayerService,
} from "@/services/api";

// ── Helpers ───────────────────────────────────────────────────────────────────

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
};

const todayLabel = () =>
  new Date().toLocaleDateString("es-ES", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

const fmtMoney = (v) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(v || 0);

const fmtDay = (dateStr) => {
  const d = new Date(dateStr.slice(0, 10) + "T12:00:00");
  return { day: d.getDate(), mon: d.toLocaleDateString("es-MX", { month: "short" }).toUpperCase() };
};

const daysUntil = (dow) => (dow - new Date().getDay() + 7) % 7;

const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = t.slice(0, 5).split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
};

const EVENT_META = {
  CULTO:    { label: "Culto",      dot: "bg-blue-400",   text: "text-blue-700 dark:text-blue-300"   },
  REUNION:  { label: "Reunión",    dot: "bg-purple-400", text: "text-purple-700 dark:text-purple-300" },
  ESPECIAL: { label: "Especial",   dot: "bg-amber-400",  text: "text-amber-700 dark:text-amber-300"  },
  COMMUNION:{ label: "Santa Cena", dot: "bg-red-400",    text: "text-red-700 dark:text-red-300"    },
};

// ── Subcomponentes ────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, trend, color, href, loading }) {
  const inner = (
    <div className={`bg-card border rounded-xl p-5 flex flex-col gap-3 hover:border-muted-foreground/40 transition-colors ${color.border}`}>
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color.bg}`}>
          <Icon className={`h-5 w-5 ${color.icon}`} />
        </div>
        {trend !== undefined && !loading && (
          <span className={`text-xs font-semibold flex items-center gap-0.5 ${trend >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend)}
          </span>
        )}
      </div>
      <div>
        {loading ? (
          <div className="h-8 w-20 bg-background animate-pulse rounded" />
        ) : (
          <p className="text-2xl font-bold text-foreground leading-none">{value ?? "—"}</p>
        )}
        <p className="text-xs text-muted-foreground font-medium mt-1">{label}</p>
        {sub && !loading && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
  return href ? <Link to={href}>{inner}</Link> : inner;
}

function QuickAction({ icon: Icon, label, href, color }) {
  return (
    <Link to={href}
      className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98] ${color}`}>
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}

function SectionHeader({ title, linkTo, linkLabel = "Ver todos", color = "text-muted-foreground hover:text-foreground" }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title}</h2>
      {linkTo && (
        <Link to={linkTo} className={`flex items-center gap-1 text-xs transition-colors ${color}`}>
          {linkLabel} <ArrowUpRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────

const FINANCE_ROLES = ["ADMIN", "PASTOR", "TESORERO"];

export default function DashboardPage() {
  const { user } = useAuth();
  const canSeeFinances = FINANCE_ROLES.includes(user?.role);
  const navigate = useNavigate();

  const [memberStats,   setMemberStats]   = useState(null);
  const [balance,       setBalance]       = useState(null);
  const [groupTotal,    setGroupTotal]    = useState(null);
  const [visitorStats,  setVisitorStats]  = useState(null);
  const [events,        setEvents]        = useState([]);
  const [birthdays,     setBirthdays]     = useState([]);
  const [prayerToday,   setPrayerToday]   = useState(null);
  const [finMonthly,    setFinMonthly]    = useState([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      // Un Líder no tiene permiso en el backend para /finances/summary ni
      // /finances/monthly — omitirlas de entrada evita dos 403 garantizados
      // en cada carga del dashboard (Promise.allSettled ya las toleraría,
      // pero no tiene sentido pedir algo que nunca se va a poder mostrar).
      const [ms, fs, gs, vs, ev, comm, pr, fin] = await Promise.allSettled([
        membersService.getStats(),
        canSeeFinances ? financesService.getSummary() : Promise.resolve(null),
        groupsService.getStats(),
        visitorsService.getStats(),
        eventsService.getAll({ limit: 100 }),
        communionService.getAll({ limit: 50 }),
        prayerService.getAll(),
        canSeeFinances ? financesService.getMonthly({ months: 6 }) : Promise.resolve(null),
      ]);

      if (ms.status === "fulfilled") setMemberStats(ms.value);
      if (fs.status === "fulfilled" && fs.value) setBalance(fs.value.summary?.balance ?? 0);
      if (gs.status === "fulfilled") setGroupTotal(gs.value?.total ?? 0);
      if (vs.status === "fulfilled") setVisitorStats(vs.value?.stats);

      // Eventos próximos
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const upcomingEv = (ev.status === "fulfilled" ? ev.value?.events || [] : [])
        .filter(e => new Date(e.date.slice(0, 10) + "T00:00:00") >= today)
        .map(e => ({ ...e, _kind: "event" }));
      const upcomingComm = (comm.status === "fulfilled" ? comm.value?.communion || [] : [])
        .filter(c => new Date(c.date.slice(0, 10) + "T00:00:00") >= today)
        .map(c => ({ ...c, _kind: "communion", title: "Santa Cena", event_type: "COMMUNION",
          date: c.date + (c.time ? "T" + c.time : "T00:00:00") }));
      setEvents([...upcomingEv, ...upcomingComm]
        .sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 6));

      // Cumpleaños del mes
      try {
        const cm = new Date().getMonth() + 1;
        const allMembers = await membersService.getAll({ limit: 500, status: "ACTIVO" });
        const bdays = (allMembers?.members || [])
          .filter(m => m.birth_date && parseInt(m.birth_date.slice(5, 7)) === cm)
          .sort((a, b) => parseInt(a.birth_date.slice(8, 10)) - parseInt(b.birth_date.slice(8, 10)))
          .slice(0, 8);
        setBirthdays(bdays);
      } catch { /* silent */ }

      // Oración hoy
      if (pr.status === "fulfilled") {
        const todayDow = new Date().getDay();
        const session = (pr.value?.prayer_days || []).find(s => s.is_active && s.day_of_week === todayDow);
        setPrayerToday(session || null);
      }

      // Finanzas mensuales
      if (fin.status === "fulfilled") setFinMonthly(fin.value?.months || []);

      setLoading(false);
    };
    run();
  }, []);

  const firstName = user?.fullName?.split(" ")[0] || "Pastor";
  const finHasData = finMonthly.some(m => m.ingresos > 0 || m.egresos > 0);

  // Construye dinámicamente las secciones que tienen datos
  const hasEvents    = loading || events.length > 0;
  const hasBirthdays = birthdays.length > 0;
  const hasFinance   = finHasData;

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <p className="text-muted-foreground text-sm">
            {greeting()}, <span className="text-foreground font-semibold">{firstName}</span>
          </p>
          <p className="text-xs text-muted-foreground capitalize mt-0.5">
            {todayLabel()}{user?.churchName && ` · ${user.churchName}`}
          </p>
        </div>
        {prayerToday && (
          <Link to="/dashboard/prayer"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-700 dark:text-orange-300 text-xs font-medium hover:bg-orange-500/25 transition-colors self-start sm:self-auto">
            <Flame className="h-3 w-3" />
            Día de Oración hoy{prayerToday.start_time && ` · ${fmtTime(prayerToday.start_time)}`}
          </Link>
        )}
      </div>

      {/* ── KPIs ────────────────────────────────────────────────────────────── */}
      <div className={`grid grid-cols-2 gap-4 ${canSeeFinances ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        <KpiCard
          icon={Users} label="Miembros Activos"
          value={memberStats?.active ?? memberStats?.total}
          sub={memberStats?.total ? `${memberStats.total} registrados` : undefined}
          color={{ bg: "bg-blue-500/15", icon: "text-blue-700 dark:text-blue-400", border: "border-border" }}
          href="/dashboard/members" loading={loading}
        />
        <KpiCard
          icon={UserSearch} label="Visitantes"
          value={visitorStats?.total}
          sub={visitorStats?.nuevos_este_mes ? `+${visitorStats.nuevos_este_mes} este mes` : undefined}
          trend={visitorStats?.nuevos_este_mes}
          color={{ bg: "bg-teal-500/15", icon: "text-teal-700 dark:text-teal-400", border: "border-border" }}
          href="/dashboard/visitors" loading={loading}
        />
        <KpiCard
          icon={UsersRound} label="Grupos"
          value={groupTotal}
          color={{ bg: "bg-purple-500/15", icon: "text-purple-700 dark:text-purple-400", border: "border-border" }}
          href="/dashboard/groups" loading={loading}
        />
        {canSeeFinances && (
          <KpiCard
            icon={DollarSign} label="Balance"
            value={balance !== null ? fmtMoney(balance) : undefined}
            sub={balance >= 0 ? "Superávit" : "Déficit"}
            color={balance >= 0
              ? { bg: "bg-emerald-500/15", icon: "text-emerald-700 dark:text-emerald-400", border: "border-border" }
              : { bg: "bg-red-500/15",     icon: "text-red-700 dark:text-red-400",     border: "border-red-900/40" }}
            href="/dashboard/finances" loading={loading}
          />
        )}
      </div>

      {/* ── Acciones rápidas ─────────────────────────────────────────────── */}
      <div className={`grid grid-cols-2 gap-3 ${canSeeFinances ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
        <QuickAction icon={UserPlus}     label="Nuevo Miembro"     href="/dashboard/members"  color="bg-blue-600/10 border-blue-600/30 text-blue-700 dark:text-blue-300 hover:bg-blue-600/20" />
        <QuickAction icon={UserSearch}   label="Nuevo Visitante"   href="/dashboard/visitors" color="bg-teal-600/10 border-teal-600/30 text-teal-700 dark:text-teal-300 hover:bg-teal-600/20" />
        <QuickAction icon={CalendarDays} label="Nuevo Evento"      href="/dashboard/events"   color="bg-purple-600/10 border-purple-600/30 text-purple-700 dark:text-purple-300 hover:bg-purple-600/20" />
        {canSeeFinances && (
          <QuickAction icon={PlusCircle} label="Registrar Ofrenda" href="/dashboard/finances" color="bg-emerald-600/10 border-emerald-600/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600/20" />
        )}
      </div>


      {/* ── Agenda + Finanzas (lados iguales, solo si hay) ───────────────── */}
      {(hasEvents || hasFinance) && (
        <div className={`grid grid-cols-1 gap-6 ${hasEvents && hasFinance ? "lg:grid-cols-2" : ""}`}>

          {/* Próxima agenda */}
          {hasEvents && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <SectionHeader title="Próxima Agenda" linkTo="/dashboard/events" color="text-muted-foreground hover:text-blue-700 dark:text-blue-400" />
              </div>
              <div className="divide-y divide-border">
                {loading
                  ? [1,2,3].map(i => (
                      <div key={i} className="px-5 py-3.5 flex items-center gap-4">
                        <div className="w-10 h-10 bg-background animate-pulse rounded-lg shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3.5 bg-background animate-pulse rounded w-40" />
                          <div className="h-3 bg-muted/50 animate-pulse rounded w-24" />
                        </div>
                      </div>
                    ))
                  : events.map(event => {
                      const meta = EVENT_META[event.event_type] || { label: event.event_type, dot: "bg-muted-foreground", text: "text-muted-foreground" };
                      const { day, mon } = fmtDay(event.date);
                      const t0 = new Date(); t0.setHours(0,0,0,0);
                      const isToday = new Date(event.date.slice(0,10) + "T00:00:00").getTime() === t0.getTime();
                      return (
                        <div key={`${event._kind}-${event.id}`}
                          className={`px-5 py-3.5 flex items-center gap-4 transition-colors ${isToday ? "bg-blue-500/5" : "hover:bg-muted/50"}`}>
                          <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0 border ${isToday ? "bg-blue-600/20 border-blue-500/40" : "bg-muted/50 border-border"}`}>
                            <span className={`text-base font-bold leading-none ${isToday ? "text-blue-700 dark:text-blue-300" : "text-foreground"}`}>{day}</span>
                            <span className={`text-[9px] uppercase font-semibold mt-0.5 ${isToday ? "text-blue-700 dark:text-blue-400" : "text-muted-foreground"}`}>{mon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
                              <span className={`text-xs ${meta.text}`}>{meta.label}</span>
                              {isToday && <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">· Hoy</span>}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      );
                    })
                }
              </div>
            </div>
          )}

          {/* Gráfica finanzas */}
          {hasFinance && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <SectionHeader title="Finanzas · 6 meses" linkTo="/dashboard/finances"
                  color="text-muted-foreground hover:text-emerald-700 dark:text-emerald-400" linkLabel="Detalles" />
              </div>
              <div className="px-2 pt-4 pb-2">
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={finMonthly} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "10px", fontSize: "11px" }}
                      labelStyle={{ color: "#94a3b8" }}
                      formatter={(v, n) => ["$" + Number(v).toLocaleString("en-US"), n]}
                    />
                    <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke="#22c55e" strokeWidth={2}
                      fill="url(#gIn)" dot={false} activeDot={{ r: 3 }} />
                    <Area type="monotone" dataKey="egresos" name="Egresos" stroke="#ef4444" strokeWidth={2}
                      fill="url(#gOut)" dot={false} activeDot={{ r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 px-4 pb-2">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />Ingresos
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-red-500" />Egresos
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Cumpleaños — solo si hay, ancho completo compacto ────────────── */}
      {hasBirthdays && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <SectionHeader
              title={`Cumpleaños — ${new Date().toLocaleDateString("es-MX", { month: "long" })}`}
              linkTo="/dashboard/members" color="text-muted-foreground hover:text-pink-700 dark:text-pink-400"
            />
          </div>
          <div className="px-4 py-3 flex flex-wrap gap-2.5">
            {birthdays.map(m => {
              const day = parseInt(m.birth_date.slice(8, 10));
              const today = new Date().getDate();
              const isToday = day === today;
              const isPast  = day < today;
              return (
                <div key={m.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors ${
                    isToday ? "border-pink-500/40 bg-pink-500/10" :
                    isPast  ? "border-border opacity-40" :
                              "border-border bg-muted/50"
                  }`}>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {m.first_name[0]}{m.last_name[0]}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground leading-tight">{m.first_name} {m.last_name}</p>
                    <p className={`text-[10px] leading-tight ${isToday ? "text-pink-700 dark:text-pink-400 font-semibold" : "text-muted-foreground"}`}>
                      {isToday ? "🎂 Hoy" : `día ${day}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Acceso a módulos — siempre visible ──────────────────────────── */}
      <div className="bg-muted/50 border border-border rounded-xl p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Acceso rápido</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {[
            { label: "Familias",    href: "/dashboard/families",   icon: "👨‍👩‍👧" },
            { label: "Bautismos",   href: "/dashboard/baptisms",   icon: "💧" },
            { label: "Asistencia",  href: "/dashboard/attendance", icon: "✅" },
            canSeeFinances && { label: "Donaciones", href: "/dashboard/donations", icon: "💝" },
            { label: "Líderes",     href: "/dashboard/leaders",    icon: "👑" },
            { label: "Santa Cena",  href: "/dashboard/communion",  icon: "🍷" },
            { label: "Reportes",    href: "/dashboard/reports",    icon: "📊" },
            { label: "Oración",     href: "/dashboard/prayer",     icon: "🔥" },
          ].filter(Boolean).map(({ label, href, icon }) => (
            <Link key={href} to={href}
              className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-center">
              <span className="text-xl leading-none">{icon}</span>
              <span className="text-[11px] font-medium leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}

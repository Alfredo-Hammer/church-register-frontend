import React, {useState, useEffect, useCallback} from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/Card";
import {Button} from "@/components/ui/Button";
import {Input} from "@/components/ui/Input";
import {
  BarChart3,
  Users,
  DollarSign,
  Droplet,
  Heart,
  Calendar,
  TrendingUp,
  TrendingDown,
  Users2,
  Award,
  Eye,
  FileDown,
  Flame,
} from "lucide-react";
import {
  membersService,
  financesService,
  donationsService,
  baptismsService,
  groupsService,
  eventsService,
  settingsService,
  prayerService,
} from "@/services/api";
import {
  buildOverviewReport,
  buildMembersReport,
  buildFinancesReport,
  buildDonationsReport,
  buildBaptismsReport,
  buildAttendanceReport,
  buildPrayerReport,
} from "@/utils/reportPrint";

// ── Util ──────────────────────────────────────────────────────────────────────
const MONTHS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

const fmtMoney = (v) =>
  "$" +
  Number(v || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtDate = (d) => {
  if (!d) return "—";
  const p = d.split("T")[0].split("-");
  return `${p[2]}/${p[1]}/${p[0]}`;
};

// ── Sub-components ────────────────────────────────────────────────────────────
const METRIC_COLORS = {
  blue: {
    card: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
    icon: "bg-blue-500/20",
    text: "text-blue-400",
  },
  green: {
    card: "from-green-500/20 to-green-600/10 border-green-500/30",
    icon: "bg-green-500/20",
    text: "text-green-400",
  },
  red: {
    card: "from-red-500/20 to-red-600/10 border-red-500/30",
    icon: "bg-red-500/20",
    text: "text-red-400",
  },
  purple: {
    card: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
    icon: "bg-purple-500/20",
    text: "text-purple-400",
  },
  cyan: {
    card: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/30",
    icon: "bg-cyan-500/20",
    text: "text-cyan-400",
  },
  amber: {
    card: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
    icon: "bg-amber-500/20",
    text: "text-amber-400",
  },
  orange: {
    card: "from-orange-500/20 to-red-600/10 border-orange-500/30",
    icon: "bg-orange-500/20",
    text: "text-orange-400",
  },
};

function MetricCard({label, value, sub, icon: Icon, color = "blue"}) {
  const c = METRIC_COLORS[color] || METRIC_COLORS.blue;
  return (
    <Card className={`bg-gradient-to-br ${c.card}`}>
      <CardContent className="p-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-gray-400 text-sm">{label}</p>
          <p className="text-2xl font-bold text-white mt-1 truncate">{value}</p>
          {sub && <p className="text-gray-500 text-xs mt-0.5">{sub}</p>}
        </div>
        <div
          className={`w-12 h-12 rounded-xl ${c.icon} flex items-center justify-center shrink-0`}
        >
          <Icon className={`w-6 h-6 ${c.text}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressBar({label, value, total, colorClass = "bg-cyan-500"}) {
  const pct = total > 0 ? Math.min((value / total) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-gray-300 text-sm">{label}</span>
        <span className="text-white text-sm font-semibold">{value}</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClass} rounded-full transition-all duration-500`}
          style={{width: `${pct}%`}}
        />
      </div>
    </div>
  );
}

// ── Tooltip personalizado oscuro ──────────────────────────────────────────────
const DarkTooltip = ({active, payload, label, money = false}) => {
  if (!active || !payload?.length) return null;
  const fmt = (v) => money
    ? "$" + Number(v || 0).toLocaleString("en-US", {minimumFractionDigits: 0, maximumFractionDigits: 0})
    : Number(v || 0).toLocaleString("es-MX");
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 shadow-xl text-xs">
      {label && <p className="text-slate-400 mb-1 font-medium">{label}</p>}
      {payload.map((p) => (
        <p key={p.dataKey} style={{color: p.color}} className="font-semibold">
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
};

// Barra simple por mes (reemplaza CssBarChart)
function MonthBarChart({data, color = "#06b6d4", money = false}) {
  if (!data?.length) return null;
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{top: 4, right: 4, left: -20, bottom: 0}}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
        <XAxis dataKey="label" tick={{fill: "#64748b", fontSize: 11}} axisLine={false} tickLine={false} />
        <YAxis tick={{fill: "#64748b", fontSize: 10}} axisLine={false} tickLine={false} width={36} />
        <Tooltip content={<DarkTooltip money={money} />} cursor={{fill: "#1e293b"}} />
        <Bar dataKey="value" name="Cantidad" fill={color} radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Barras agrupadas multi-serie (reemplaza MultiBarChart)
function MultiBarChart({data = [], series = [], money = false}) {
  if (!data.length) return null;
  const COLORS = {"bg-green-500": "#22c55e", "bg-red-500": "#ef4444", "bg-purple-500": "#a855f7",
                  "bg-blue-500": "#3b82f6", "bg-amber-500": "#f59e0b", "bg-cyan-500": "#06b6d4"};
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{top: 4, right: 4, left: -20, bottom: 0}} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
        <XAxis dataKey="label" tick={{fill: "#64748b", fontSize: 11}} axisLine={false} tickLine={false} />
        <YAxis tick={{fill: "#64748b", fontSize: 10}} axisLine={false} tickLine={false} width={40} />
        <Tooltip content={<DarkTooltip money={money} />} cursor={{fill: "#1e293b"}} />
        <Legend wrapperStyle={{fontSize: "11px", color: "#94a3b8", paddingTop: "8px"}} />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.label}
            fill={COLORS[s.color] || "#64748b"} radius={[3, 3, 0, 0]} maxBarSize={28} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// AreaChart para finanzas (ingresos vs egresos con gradiente)
function FinanceAreaChart({data = []}) {
  if (!data.length) return null;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{top: 8, right: 4, left: -10, bottom: 0}}>
        <defs>
          <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradEgresos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradDonaciones" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
        <XAxis dataKey="label" tick={{fill: "#64748b", fontSize: 11}} axisLine={false} tickLine={false} />
        <YAxis tick={{fill: "#64748b", fontSize: 10}} axisLine={false} tickLine={false} width={50}
          tickFormatter={(v) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`} />
        <Tooltip content={<DarkTooltip money />} />
        <Legend wrapperStyle={{fontSize: "11px", color: "#94a3b8", paddingTop: "8px"}} />
        <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke="#22c55e" strokeWidth={2}
          fill="url(#gradIngresos)" dot={false} activeDot={{r: 4}} />
        <Area type="monotone" dataKey="egresos" name="Egresos" stroke="#ef4444" strokeWidth={2}
          fill="url(#gradEgresos)" dot={false} activeDot={{r: 4}} />
        <Area type="monotone" dataKey="donaciones" name="Diezmos" stroke="#a855f7" strokeWidth={2}
          fill="url(#gradDonaciones)" dot={false} activeDot={{r: 4}} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// PieChart para distribuciones (género, estado, edad)
const PIE_COLORS = ["#3b82f6", "#ec4899", "#f59e0b", "#22c55e", "#a855f7", "#06b6d4", "#64748b"];
function DistPieChart({data = [], nameKey = "name", valueKey = "value"}) {
  if (!data.length) return null;
  const total = data.reduce((s, d) => s + parseInt(d[valueKey] || 0), 0);
  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width={120} height={120}>
        <PieChart>
          <Pie data={data} dataKey={valueKey} nameKey={nameKey} cx="50%" cy="50%"
            innerRadius={32} outerRadius={54} paddingAngle={3} strokeWidth={0}>
            {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
          </Pie>
          <Tooltip content={<DarkTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{background: PIE_COLORS[i % PIE_COLORS.length]}} />
              <span className="text-gray-300 text-sm truncate">{d[nameKey]}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-white text-sm font-semibold">{parseInt(d[valueKey] || 0)}</span>
              <span className="text-gray-500 text-xs w-10 text-right">
                {total > 0 ? ((parseInt(d[valueKey] || 0) / total) * 100).toFixed(0) + "%" : ""}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DateRangeFilter({startDate, endDate, onStart, onEnd, onReset}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-gray-400 text-sm font-medium">Período:</span>
      <Input
        type="date"
        value={startDate}
        onChange={(e) => onStart(e.target.value)}
        className="bg-slate-700 border-slate-600 text-white w-36 focus:border-amber-500 text-sm"
      />
      <span className="text-gray-500">—</span>
      <Input
        type="date"
        value={endDate}
        onChange={(e) => onEnd(e.target.value)}
        className="bg-slate-700 border-slate-600 text-white w-36 focus:border-amber-500 text-sm"
      />
      {(startDate || endDate) && (
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="border-slate-600 text-gray-400 hover:text-white hover:border-slate-500 text-xs"
        >
          Limpiar filtro
        </Button>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div className="text-center py-16">
      <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
      <p className="text-gray-400">Cargando datos...</p>
    </div>
  );
}

// ── Tabs config ───────────────────────────────────────────────────────────────
const TABS = [
  {id: "overview", label: "Resumen", icon: BarChart3},
  {id: "members", label: "Miembros", icon: Users},
  {id: "finances", label: "Finanzas", icon: DollarSign},
  {id: "donations", label: "Diezmos", icon: Heart},
  {id: "baptisms", label: "Bautismos", icon: Droplet},
  {id: "attendance", label: "Asistencia", icon: Calendar},
  {id: "prayer", label: "Días de Oración", icon: Flame},
];

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("overview");

  // church branding
  const [church, setChurch] = useState({});

  // overview
  const [overviewData, setOverviewData] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  // members
  const [memberStats, setMemberStats] = useState(null);
  const [memberLoading, setMemberLoading] = useState(false);

  // finances
  const [finStart, setFinStart] = useState("");
  const [finEnd, setFinEnd] = useState("");
  const [finData, setFinData] = useState(null);
  const [finMonthly, setFinMonthly] = useState(null);
  const [finLoading, setFinLoading] = useState(false);

  // donations
  const [donStart, setDonStart] = useState("");
  const [donEnd, setDonEnd] = useState("");
  const [donData, setDonData] = useState(null);
  const [donLoading, setDonLoading] = useState(false);

  // baptisms
  const [baptismYear, setBaptismYear] = useState(new Date().getFullYear());
  const [baptismData, setBaptismData] = useState(null);
  const [baptismLoading, setBaptismLoading] = useState(false);

  // attendance
  const [attendanceData, setAttendanceData] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // prayer
  const [prayerStart, setPrayerStart] = useState("");
  const [prayerEnd, setPrayerEnd] = useState("");
  const [prayerData, setPrayerData] = useState(null);
  const [prayerLoading, setPrayerLoading] = useState(false);

  // ─── Fetch helpers ─────────────────────────────────────────────────────────
  const fetchOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const [mStats, fSummary, dSummary, bStats, gStats] = await Promise.all([
        membersService.getStats(),
        financesService.getSummary(),
        donationsService.getSummary(),
        baptismsService.getStats(),
        groupsService.getStats(),
      ]);
      setOverviewData({mStats, fSummary, dSummary, bStats, gStats});
    } catch {
      /* silent */
    }
    setOverviewLoading(false);
  }, []);

  const fetchMembers = useCallback(async () => {
    setMemberLoading(true);
    try {
      setMemberStats(await membersService.getStats());
    } catch {
      /* silent */
    }
    setMemberLoading(false);
  }, []);

  const fetchFinances = useCallback(async () => {
    setFinLoading(true);
    try {
      const [summary, monthly] = await Promise.all([
        financesService.getSummary({
          startDate: finStart || undefined,
          endDate: finEnd || undefined,
        }),
        financesService.getMonthly({months: 6}),
      ]);
      setFinData(summary);
      setFinMonthly(monthly);
    } catch {
      /* silent */
    }
    setFinLoading(false);
  }, [finStart, finEnd]);

  const fetchDonations = useCallback(async () => {
    setDonLoading(true);
    try {
      setDonData(
        await donationsService.getSummary({
          startDate: donStart || undefined,
          endDate: donEnd || undefined,
        }),
      );
    } catch {
      /* silent */
    }
    setDonLoading(false);
  }, [donStart, donEnd]);

  const fetchBaptisms = useCallback(async () => {
    setBaptismLoading(true);
    try {
      setBaptismData(await baptismsService.getStats({year: baptismYear}));
    } catch {
      /* silent */
    }
    setBaptismLoading(false);
  }, [baptismYear]);

  const fetchAttendance = useCallback(async () => {
    setAttendanceLoading(true);
    try {
      setAttendanceData(await eventsService.getStats({months: 6}));
    } catch {
      /* silent */
    }
    setAttendanceLoading(false);
  }, []);

  const fetchPrayer = useCallback(async () => {
    setPrayerLoading(true);
    try {
      setPrayerData(
        await prayerService.getReports(
          prayerStart || undefined,
          prayerEnd || undefined,
        ),
      );
    } catch {
      /* silent */
    }
    setPrayerLoading(false);
  }, [prayerStart, prayerEnd]);

  // Carga de iglesia al montar
  useEffect(() => {
    settingsService
      .getChurch()
      .then((r) => setChurch(r.church || r || {}))
      .catch(() => {});
  }, []);

  // Carga lazy por tab
  useEffect(() => {
    if (activeTab === "overview" && !overviewData) fetchOverview();
    if (activeTab === "members" && !memberStats) fetchMembers();
    if (activeTab === "finances" && !finData) fetchFinances();
    if (activeTab === "donations" && !donData) fetchDonations();
    if (activeTab === "baptisms" && !baptismData) fetchBaptisms();
    if (activeTab === "attendance" && !attendanceData) fetchAttendance();
    if (activeTab === "prayer" && !prayerData) fetchPrayer();
  }, [activeTab]); // eslint-disable-line

  // ─── Vista previa / Exportar PDF ─────────────────────────────────────────
  const handlePreview = (autoPrint = false) => {
    let html = null;
    if (activeTab === "overview" && overviewData)
      html = buildOverviewReport(overviewData, church);
    if (activeTab === "members" && memberStats)
      html = buildMembersReport(memberStats, church);
    if (activeTab === "finances" && finData)
      html = buildFinancesReport(
        finData,
        {
          startDate: finStart,
          endDate: finEnd,
        },
        church,
      );
    if (activeTab === "donations" && donData)
      html = buildDonationsReport(
        donData,
        {
          startDate: donStart,
          endDate: donEnd,
        },
        church,
      );
    if (activeTab === "baptisms" && baptismData)
      html = buildBaptismsReport(baptismData, church);
    if (activeTab === "attendance" && attendanceData)
      html = buildAttendanceReport(attendanceData, church);
    if (activeTab === "prayer" && prayerData)
      html = buildPrayerReport(prayerData, church, {
        start: prayerStart,
        end: prayerEnd,
      });
    if (!html) return;

    const win = window.open("", "_blank", "width=960,height=720");
    win.document.write(html);
    win.document.close();
    if (autoPrint) {
      win.addEventListener("load", () => win.print());
      // fallback por si onload ya fue disparado
      setTimeout(() => {
        try {
          win.print();
        } catch {
          /* silent */
        }
      }, 600);
    }
  };

  // helpers para saber si el tab activo ya tiene datos
  const hasData = {
    overview: !!overviewData,
    members: !!memberStats,
    finances: !!finData,
    donations: !!donData,
    baptisms: !!baptismData,
    attendance: !!attendanceData,
    prayer: !!prayerData,
  };

  // Re-fetch al cambiar filtros
  useEffect(() => {
    if (activeTab === "finances") fetchFinances();
  }, [finStart, finEnd]); // eslint-disable-line
  useEffect(() => {
    if (activeTab === "donations") fetchDonations();
  }, [donStart, donEnd]); // eslint-disable-line
  useEffect(() => {
    if (activeTab === "prayer") fetchPrayer();
  }, [prayerStart, prayerEnd]); // eslint-disable-line
  useEffect(() => {
    if (activeTab === "baptisms") fetchBaptisms();
  }, [baptismYear]); // eslint-disable-line

  // ─── Tab: Resumen ──────────────────────────────────────────────────────────
  const renderOverview = () => {
    if (overviewLoading) return <Spinner />;
    if (!overviewData) return null;
    const {mStats, fSummary, dSummary, bStats, gStats} = overviewData;
    const balance = fSummary?.summary?.balance || 0;
    const baptismsThisYear =
      bStats?.byMonth?.reduce((s, m) => s + parseInt(m.count), 0) || 0;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Miembros Activos"
            value={mStats?.active || 0}
            sub={`de ${mStats?.total || 0} registrados`}
            icon={Users}
            color="blue"
          />
          <MetricCard
            label="Balance General"
            value={fmtMoney(Math.abs(balance))}
            sub={balance >= 0 ? "Superávit" : "Déficit"}
            icon={balance >= 0 ? TrendingUp : TrendingDown}
            color={balance >= 0 ? "green" : "red"}
          />
          <MetricCard
            label="Total Diezmos"
            value={fmtMoney(dSummary?.summary?.total || 0)}
            sub={`${dSummary?.summary?.count || 0} registros`}
            icon={Heart}
            color="purple"
          />
          <MetricCard
            label="Bautismos"
            value={bStats?.total || 0}
            sub={`${baptismsThisYear} este año`}
            icon={Droplet}
            color="cyan"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            label="Grupos Activos"
            value={gStats?.total || 0}
            sub={`${gStats?.membersInGroups || 0} miembros en grupos`}
            icon={Users2}
            color="amber"
          />
          <MetricCard
            label="Total Ingresos"
            value={fmtMoney(fSummary?.summary?.totalIngresos || 0)}
            sub="Todas las categorías"
            icon={TrendingUp}
            color="green"
          />
          <MetricCard
            label="Total Egresos"
            value={fmtMoney(fSummary?.summary?.totalEgresos || 0)}
            sub="Todas las categorías"
            icon={TrendingDown}
            color="red"
          />
        </div>
      </div>
    );
  };

  // ─── Tab: Miembros ─────────────────────────────────────────────────────────
  const renderMembers = () => {
    if (memberLoading) return <Spinner />;
    if (!memberStats) return null;
    const {
      total,
      active,
      birthdaysThisMonth,
      byGender = [],
      byStatus = [],
      byAgeGroup = [],
    } = memberStats;
    const GENDER_LABELS = {M: "Masculino", F: "Femenino", OTRO: "Otro"};
    const STATUS_COLORS = {
      ACTIVO: "bg-green-500",
      INACTIVO: "bg-gray-500",
      VISITANTE: "bg-yellow-500",
      TRANSFERIDO: "bg-blue-500",
    };
    const AGE_GROUP_COLORS = {
      ADULTO: "bg-blue-500",
      JOVEN: "bg-purple-500",
      NIÑO: "bg-amber-500",
    };
    const ninos = parseInt(
      byAgeGroup.find((a) => a.age_group === "NIÑO")?.count || 0,
    );
    const jovenes = parseInt(
      byAgeGroup.find((a) => a.age_group === "JOVEN")?.count || 0,
    );

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Total Miembros"
            value={total}
            icon={Users}
            color="blue"
          />
          <MetricCard
            label="Miembros Activos"
            value={active}
            sub={
              total > 0
                ? `${((active / total) * 100).toFixed(1)}% del total`
                : ""
            }
            icon={Users}
            color="green"
          />
          <MetricCard
            label="Jóvenes"
            value={jovenes}
            sub={
              total > 0
                ? `${((jovenes / total) * 100).toFixed(1)}% del total`
                : ""
            }
            icon={Users}
            color="purple"
          />
          <MetricCard
            label="Niños"
            value={ninos}
            sub={
              total > 0
                ? `${((ninos / total) * 100).toFixed(1)}% del total`
                : ""
            }
            icon={Users}
            color="amber"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-base">Por Género</CardTitle>
            </CardHeader>
            <CardContent>
              {byGender.length === 0 ? (
                <p className="text-gray-500 text-sm">Sin datos</p>
              ) : (
                <DistPieChart
                  data={byGender.map((g) => ({name: GENDER_LABELS[g.gender] || g.gender, value: parseInt(g.count)}))}
                  nameKey="name" valueKey="value"
                />
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-base">Por Estado</CardTitle>
            </CardHeader>
            <CardContent>
              {byStatus.length === 0 ? (
                <p className="text-gray-500 text-sm">Sin datos</p>
              ) : (
                <DistPieChart
                  data={byStatus.map((s) => ({name: s.status, value: parseInt(s.count)}))}
                  nameKey="name" valueKey="value"
                />
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-base">Por Grupo de Edad</CardTitle>
            </CardHeader>
            <CardContent>
              {byAgeGroup.length === 0 ? (
                <p className="text-gray-500 text-sm">Sin datos</p>
              ) : (
                <DistPieChart
                  data={byAgeGroup.map((a) => ({name: a.age_group, value: parseInt(a.count)}))}
                  nameKey="name" valueKey="value"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // ─── Tab: Finanzas ─────────────────────────────────────────────────────────
  const renderFinances = () => {
    if (finLoading) return <Spinner />;
    if (!finData) return null;
    const {summary, byCategory = []} = finData;
    const ingresos = byCategory.filter((c) => c.category_type === "INGRESO");
    const egresos = byCategory.filter((c) => c.category_type === "EGRESO");
    const maxCat = Math.max(
      ...byCategory.map((c) => parseFloat(c.total || 0)),
      1,
    );
    const balance = summary?.balance || 0;

    const monthlyChartData = (finMonthly?.months || []).map((m) => ({
      label: m.label,
      ingresos: parseFloat(m.ingresos || 0),
      egresos: parseFloat(m.egresos || 0),
      donaciones: parseFloat(m.donaciones || 0),
    }));

    const FINANCE_SERIES = [
      {key: "ingresos", label: "Ingresos", color: "bg-green-500"},
      {key: "egresos", label: "Egresos", color: "bg-red-500"},
      {key: "donaciones", label: "Diezmos", color: "bg-purple-500"},
    ];

    return (
      <div className="space-y-6">
        <DateRangeFilter
          startDate={finStart}
          endDate={finEnd}
          onStart={setFinStart}
          onEnd={setFinEnd}
          onReset={() => {
            setFinStart("");
            setFinEnd("");
          }}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            label="Total Ingresos"
            value={fmtMoney(summary?.totalIngresos)}
            icon={TrendingUp}
            color="green"
          />
          <MetricCard
            label="Total Egresos"
            value={fmtMoney(summary?.totalEgresos)}
            icon={TrendingDown}
            color="red"
          />
          <MetricCard
            label="Balance"
            value={fmtMoney(Math.abs(balance))}
            sub={balance >= 0 ? "Superávit" : "Déficit"}
            icon={balance >= 0 ? TrendingUp : TrendingDown}
            color={balance >= 0 ? "green" : "red"}
          />
        </div>

        {monthlyChartData.length > 0 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-base">
                Tendencia Mensual — Últimos 6 meses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FinanceAreaChart data={monthlyChartData} />
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            ["Ingresos por Categoría", ingresos, "bg-green-500"],
            ["Egresos por Categoría", egresos, "bg-red-500"],
          ].map(([title, cats, colorClass]) => (
            <Card key={title} className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-base">{title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cats.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    Sin datos en el período
                  </p>
                ) : (
                  cats.map((c) => (
                    <div key={c.category_id} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300 text-sm">
                          {c.category_name}
                        </span>
                        <span className="text-white text-sm font-semibold">
                          {fmtMoney(c.total)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${colorClass} rounded-full transition-all duration-500`}
                          style={{
                            width: `${(parseFloat(c.total || 0) / maxCat) * 100}%`,
                          }}
                        />
                      </div>
                      <p className="text-gray-600 text-xs">
                        {c.transaction_count} transacciones
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  // ─── Tab: Diezmos ──────────────────────────────────────────────────────────
  const renderDonations = () => {
    if (donLoading) return <Spinner />;
    if (!donData) return null;
    const {summary, byType = [], topDonors = []} = donData;
    const maxType = Math.max(...byType.map((t) => t.total), 1);

    return (
      <div className="space-y-6">
        <DateRangeFilter
          startDate={donStart}
          endDate={donEnd}
          onStart={setDonStart}
          onEnd={setDonEnd}
          onReset={() => {
            setDonStart("");
            setDonEnd("");
          }}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            label="Total Recaudado"
            value={fmtMoney(summary?.total)}
            icon={Heart}
            color="purple"
          />
          <MetricCard
            label="Total Registros"
            value={summary?.count || 0}
            icon={BarChart3}
            color="blue"
          />
          <MetricCard
            label="Contribuyentes Únicos"
            value={summary?.uniqueDonors || 0}
            icon={Users}
            color="cyan"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-base">
                Por Tipo de Contribución
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {byType.length === 0 ? (
                <p className="text-gray-500 text-sm">Sin datos en el período</p>
              ) : (
                byType.map((t) => (
                  <div key={t.type} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">{t.type}</span>
                      <span className="text-white text-sm font-semibold">
                        {fmtMoney(t.total)}{" "}
                        <span className="text-gray-500 font-normal">
                          ({t.count})
                        </span>
                      </span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full transition-all duration-500"
                        style={{width: `${(t.total / maxType) * 100}%`}}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                Top Contribuyentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {topDonors.length === 0 ? (
                <p className="text-gray-500 text-sm">Sin datos en el período</p>
              ) : (
                topDonors.map((d, i) => (
                  <div
                    key={d.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-700/40"
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                      ${i === 0 ? "bg-amber-500 text-black" : i === 1 ? "bg-gray-400 text-black" : i === 2 ? "bg-amber-700 text-white" : "bg-slate-600 text-gray-300"}`}
                    >
                      {i + 1}
                    </span>
                    <span className="flex-1 text-gray-200 text-sm">
                      {d.name}
                    </span>
                    <span className="text-white text-sm font-semibold">
                      {fmtMoney(d.total)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // ─── Tab: Bautismos ────────────────────────────────────────────────────────
  const renderBaptisms = () => {
    if (baptismLoading) return <Spinner />;
    if (!baptismData) return null;
    const {total, year, byMonth = [], recent = []} = baptismData;

    const monthlyData = MONTHS.map((label, i) => ({
      label,
      value: parseInt(
        byMonth.find((m) => parseInt(m.month) === i + 1)?.count || 0,
      ),
    }));
    const yearTotal = monthlyData.reduce((s, m) => s + m.value, 0);
    const bestMonth = monthlyData.reduce(
      (best, m) => (m.value > (best?.value || 0) ? m : best),
      null,
    );
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({length: 6}, (_, k) => currentYear - k);

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <label className="text-gray-400 text-sm font-medium">Año:</label>
          <select
            value={baptismYear}
            onChange={(e) => setBaptismYear(parseInt(e.target.value))}
            className="px-3 py-1.5 bg-slate-700 border border-slate-600 text-white rounded-md text-sm focus:outline-none focus:border-cyan-500"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            label="Total Histórico"
            value={total}
            icon={Droplet}
            color="cyan"
          />
          <MetricCard
            label={`Bautismos ${year}`}
            value={yearTotal}
            icon={Calendar}
            color="blue"
          />
          <MetricCard
            label="Mes más activo"
            value={yearTotal > 0 ? bestMonth?.label || "—" : "—"}
            sub={
              yearTotal > 0 && bestMonth?.value > 0
                ? `${bestMonth.value} bautismos`
                : ""
            }
            icon={Award}
            color="amber"
          />
        </div>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-base">
              Bautismos por Mes — {year}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {yearTotal === 0 ? (
              <p className="text-gray-500 text-sm text-center py-6">
                Sin bautismos registrados en {year}
              </p>
            ) : (
              <MonthBarChart data={monthlyData} color="#06b6d4" />
            )}
          </CardContent>
        </Card>

        {recent.length > 0 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-base">
                Bautismos Recientes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recent.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-700/40"
                >
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0">
                    <Droplet className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-200 text-sm font-medium">
                      {b.first_name} {b.last_name}
                    </p>
                    {b.minister && (
                      <p className="text-gray-500 text-xs">
                        Ministro: {b.minister}
                      </p>
                    )}
                  </div>
                  <span className="text-cyan-300 text-sm shrink-0">
                    {fmtDate(b.baptism_date)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // ─── Tab: Asistencia ──────────────────────────────────────────────────────
  const renderAttendance = () => {
    if (attendanceLoading) return <Spinner />;
    if (!attendanceData) return null;
    const {summary, byType = [], monthly = [], topEvents = []} = attendanceData;

    const TYPE_LABELS = {
      CULTO: "Culto",
      REUNION: "Reunión",
      ESPECIAL: "Especial",
    };
    const TYPE_COLORS = {
      CULTO: "bg-blue-500",
      REUNION: "bg-amber-500",
      ESPECIAL: "bg-purple-500",
    };
    const maxType = Math.max(
      ...byType.map((t) => parseInt(t.total_attendance || 0)),
      1,
    );

    const ATTEND_SERIES = [
      {
        key: "member_attendance",
        label: "Miembros registrados",
        color: "bg-blue-500",
      },
      {
        key: "guest_count",
        label: "Visitantes generales",
        color: "bg-amber-500",
      },
    ];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            label="Total Eventos"
            value={summary?.totalEvents || 0}
            icon={Calendar}
            color="blue"
          />
          <MetricCard
            label="Total Asistencias"
            value={summary?.totalAttendance || 0}
            sub="Miembros registrados"
            icon={Users}
            color="cyan"
          />
          <MetricCard
            label="Eventos este mes"
            value={summary?.eventsThisMonth || 0}
            icon={TrendingUp}
            color="amber"
          />
        </div>

        {monthly.length > 0 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-base">
                Asistencia Mensual — Últimos 6 meses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MultiBarChart data={monthly} series={ATTEND_SERIES} />
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-base">
                Asistencia por Tipo de Evento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {byType.length === 0 ? (
                <p className="text-gray-500 text-sm">Sin datos</p>
              ) : (
                byType.map((t) => (
                  <div key={t.event_type} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">
                        {TYPE_LABELS[t.event_type] || t.event_type}
                      </span>
                      <span className="text-white text-sm font-semibold">
                        {parseInt(t.total_attendance).toLocaleString()}
                        <span className="text-gray-500 font-normal ml-1 text-xs">
                          ({t.event_count} eventos)
                        </span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${TYPE_COLORS[t.event_type] || "bg-slate-500"} rounded-full transition-all duration-500`}
                        style={{
                          width: `${(parseInt(t.total_attendance || 0) / maxType) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                Eventos con Mayor Asistencia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {topEvents.length === 0 ? (
                <p className="text-gray-500 text-sm">Sin datos</p>
              ) : (
                topEvents.map((e, i) => (
                  <div
                    key={e.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-700/40"
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                        ${i === 0 ? "bg-amber-500 text-black" : i === 1 ? "bg-gray-400 text-black" : i === 2 ? "bg-amber-700 text-white" : "bg-slate-600 text-gray-300"}`}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-200 text-sm font-medium truncate">
                        {e.title}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {fmtDate(e.date)} ·{" "}
                        {TYPE_LABELS[e.event_type] || e.event_type}
                      </p>
                    </div>
                    <span className="text-white text-sm font-semibold shrink-0">
                      {parseInt(e.total_attendance).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderPrayer = () => {
    if (prayerLoading) return <Spinner />;
    if (!prayerData) return null;

    const {stats, byMonth = [], topSessions = [], byWeekday = []} = prayerData;

    const DAY_LABELS = [
      "Domingo",
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
    ];

    const maxWeekday = Math.max(
      ...byWeekday.map((d) => parseInt(d.total_attendance || 0)),
      1,
    );

    const PRAYER_SERIES = [
      {
        key: "total_attendance",
        label: "Total Asistencias",
        color: "bg-amber-500",
      },
      {
        key: "sessions",
        label: "Sesiones",
        color: "bg-blue-500",
      },
    ];

    return (
      <div className="space-y-6">
        {/* Filters */}
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm text-gray-300 mb-2 block">
                  Fecha Inicio
                </label>
                <Input
                  type="date"
                  value={prayerStart}
                  onChange={(e) => setPrayerStart(e.target.value)}
                  className="bg-slate-900 border-slate-600 text-white"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm text-gray-300 mb-2 block">
                  Fecha Fin
                </label>
                <Input
                  type="date"
                  value={prayerEnd}
                  onChange={(e) => setPrayerEnd(e.target.value)}
                  className="bg-slate-900 border-slate-600 text-white"
                />
              </div>
              <Button
                onClick={fetchPrayer}
                className="bg-amber-600 hover:bg-amber-700"
              >
                Filtrar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            label="Total Sesiones"
            value={stats?.total_sessions || 0}
            icon={Flame}
            color="amber"
          />
          <MetricCard
            label="Total Asistencias"
            value={stats?.total_attendance || 0}
            icon={Users}
            color="blue"
          />
          <MetricCard
            label="Promedio por Sesión"
            value={stats?.avg_attendance || 0}
            icon={TrendingUp}
            color="cyan"
          />
        </div>

        {/* Monthly Chart */}
        {byMonth.length > 0 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-base">
                Asistencia Mensual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MultiBarChart data={byMonth} series={PRAYER_SERIES} />
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* By Weekday */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-base">
                Asistencia por Día de la Semana
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {byWeekday.length === 0 ? (
                <p className="text-gray-500 text-sm">Sin datos</p>
              ) : (
                byWeekday.map((d) => (
                  <div key={d.day_of_week} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">
                        {DAY_LABELS[d.day_of_week] || `Día ${d.day_of_week}`}
                      </span>
                      <span className="text-white text-sm font-semibold">
                        {parseInt(d.total_attendance || 0).toLocaleString()}
                        <span className="text-gray-500 font-normal ml-1 text-xs">
                          ({d.sessions} sesiones)
                        </span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-500"
                        style={{
                          width: `${(parseInt(d.total_attendance || 0) / maxWeekday) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Top Sessions */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                Sesiones con Mayor Asistencia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {topSessions.length === 0 ? (
                <p className="text-gray-500 text-sm">Sin datos</p>
              ) : (
                topSessions.map((s, i) => (
                  <div
                    key={s.occurrence_date}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-700/40"
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                        ${i === 0 ? "bg-amber-500 text-black" : i === 1 ? "bg-gray-400 text-black" : i === 2 ? "bg-amber-700 text-white" : "bg-slate-600 text-gray-300"}`}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-200 text-sm font-medium truncate">
                        {s.prayer_day_name || "Día de Oración"}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {fmtDate(s.occurrence_date)}
                        {s.guest_count > 0 && ` · ${s.guest_count} invitados`}
                      </p>
                    </div>
                    <span className="text-white text-sm font-semibold shrink-0">
                      {parseInt(s.attendance_count || 0).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </span>
          Reportes
        </h1>
        <p className="text-gray-400 mt-1">
          Estadísticas y análisis de la iglesia
        </p>
      </div>

      {/* Tabs + Acciones */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === t.id
                    ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg"
                    : "bg-slate-700 text-gray-400 hover:text-white hover:bg-slate-600"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Botones de reporte */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handlePreview(false)}
            disabled={!hasData[activeTab]}
            className="border-slate-600 text-gray-300 hover:text-white hover:border-amber-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Vista Previa
          </Button>
          <Button
            onClick={() => handlePreview(true)}
            disabled={!hasData[activeTab]}
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
          >
            <FileDown className="w-4 h-4" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "overview" && renderOverview()}
        {activeTab === "members" && renderMembers()}
        {activeTab === "finances" && renderFinances()}
        {activeTab === "donations" && renderDonations()}
        {activeTab === "baptisms" && renderBaptisms()}
        {activeTab === "attendance" && renderAttendance()}
        {activeTab === "prayer" && renderPrayer()}
      </div>
    </div>
  );
}

import React, {useState, useEffect, useCallback} from "react";
import {useNavigate} from "react-router-dom";
import {toast} from "sonner";
import {platformService} from "@/services/api";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/Card";
import {Input} from "@/components/ui/Input";
import {Button} from "@/components/ui/Button";
import {ConfirmDialog} from "@/components/ui/ConfirmDialog";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Building2,
  Search,
  Users,
  UserRound,
  Power,
  LogIn,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MapPin,
  Phone,
  Globe,
  Calendar,
  Landmark,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const monthLabel = (yyyyMm) => {
  const [y, m] = yyyyMm.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("es-MX", {month: "short"}).replace(".", "");
};

function StatusBadge({isActive}) {
  return isActive ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
      Activa
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-muted text-muted-foreground border-border">
      Suspendida
    </span>
  );
}

function StatCard({icon: Icon, label, value, tint}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              {label}
            </p>
            <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          </div>
          <div className={`w-10 h-10 rounded-lg ${tint.bg} flex items-center justify-center shrink-0`}>
            <Icon className={`w-5 h-5 ${tint.text}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SuperAdminPage() {
  const navigate = useNavigate();
  const admin = JSON.parse(localStorage.getItem("platformAdmin") || "null");

  const [churches, setChurches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [pagination, setPagination] = useState({total: 0, limit: 20, offset: 0});

  const [toggleTarget, setToggleTarget] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [accessingId, setAccessingId] = useState(null);

  const fetchChurches = useCallback(async () => {
    setLoading(true);
    try {
      const params = {limit: pagination.limit, offset: pagination.offset};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      const data = await platformService.getChurches(params);
      setChurches(data.churches || []);
      setPagination((prev) => ({...prev, total: data.total || 0}));
    } catch {
      toast.error("Error al cargar las iglesias.");
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, pagination.offset, searchTerm]);

  useEffect(() => {
    fetchChurches();
  }, [pagination.offset]);

  useEffect(() => {
    setStatsLoading(true);
    platformService
      .getStats()
      .then(setStats)
      .catch(() => toast.error("Error al cargar las estadísticas."))
      .finally(() => setStatsLoading(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setPagination((prev) => ({...prev, offset: 0}));
      fetchChurches();
    }, 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
  const goPage = (p) =>
    setPagination((prev) => ({...prev, offset: (p - 1) * prev.limit}));

  const handleToggleActive = async (church) => {
    setTogglingId(church.id);
    try {
      const data = await platformService.toggleChurchActive(church.id);
      setChurches((prev) =>
        prev.map((c) => (c.id === church.id ? {...c, isActive: data.isActive} : c)),
      );
      toast.success(data.message);
      setStats((prev) =>
        prev
          ? {
              ...prev,
              activeChurches: prev.activeChurches + (data.isActive ? 1 : -1),
              suspendedChurches: prev.suspendedChurches + (data.isActive ? -1 : 1),
            }
          : prev,
      );
    } catch (err) {
      toast.error(err?.response?.data?.error || "Error al cambiar el estado de la iglesia.");
    } finally {
      setTogglingId(null);
      setToggleTarget(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("platformToken");
    localStorage.removeItem("platformAdmin");
    navigate("/login");
  };

  const handleAccessChurch = async (church) => {
    setAccessingId(church.id);
    try {
      const data = await platformService.impersonateChurch(church.id);
      // Claves separadas de platformToken/platformAdmin: no cierra tu sesión de superadmin.
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.open("/dashboard", "_blank");
      toast.success(`Entrando a ${church.name} como ${data.user.fullName}…`);
    } catch (err) {
      toast.error(err?.response?.data?.error || "No se pudo acceder a esta iglesia.");
    } finally {
      setAccessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0">
              <img src="/logo.png" alt="Congrega" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-none">
                Panel de Superadmin
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {admin?.fullName || "Superadmin"}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="border-border text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Salir
          </Button>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Iglesias registradas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Administra el acceso de cada iglesia (tenant) del sistema
          </p>
        </div>

        {/* Tarjetas resumen */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            icon={Building2}
            label="Iglesias"
            value={statsLoading ? "…" : stats?.totalChurches ?? 0}
            tint={{bg: "bg-slate-500/15", text: "text-slate-700 dark:text-slate-300"}}
          />
          <StatCard
            icon={CheckCircle2}
            label="Activas"
            value={statsLoading ? "…" : stats?.activeChurches ?? 0}
            tint={{bg: "bg-emerald-500/15", text: "text-emerald-700 dark:text-emerald-400"}}
          />
          <StatCard
            icon={XCircle}
            label="Suspendidas"
            value={statsLoading ? "…" : stats?.suspendedChurches ?? 0}
            tint={{bg: "bg-red-500/15", text: "text-red-700 dark:text-red-400"}}
          />
          <StatCard
            icon={UserRound}
            label="Usuarios"
            value={statsLoading ? "…" : stats?.totalUsers ?? 0}
            tint={{bg: "bg-blue-500/15", text: "text-blue-700 dark:text-blue-400"}}
          />
          <StatCard
            icon={Users}
            label="Miembros"
            value={statsLoading ? "…" : stats?.totalMembers ?? 0}
            tint={{bg: "bg-violet-500/15", text: "text-violet-700 dark:text-violet-400"}}
          />
        </div>

        {/* Gráficos */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-foreground text-base">
                Iglesias registradas por mes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={stats?.growth || []} margin={{top: 4, right: 8, left: -20, bottom: 0}}>
                  <defs>
                    <linearGradient id="gGrowth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickFormatter={monthLabel}
                    tick={{fill: "#64748b", fontSize: 10}}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide allowDecimals={false} />
                  <Tooltip
                    contentStyle={{background: "#0f172a", border: "1px solid #334155", borderRadius: "10px", fontSize: "11px"}}
                    labelStyle={{color: "#94a3b8"}}
                    labelFormatter={monthLabel}
                    formatter={(v) => [v, "Iglesias"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#gGrowth)"
                    dot={false}
                    activeDot={{r: 3}}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-foreground text-base">
                Top 5 iglesias por miembros
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={stats?.topChurches || []}
                  layout="vertical"
                  margin={{top: 4, right: 16, left: 8, bottom: 0}}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={110}
                    tick={{fill: "#64748b", fontSize: 11}}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{background: "#0f172a", border: "1px solid #334155", borderRadius: "10px", fontSize: "11px"}}
                    labelStyle={{color: "#94a3b8"}}
                    formatter={(v) => [v, "Miembros"]}
                  />
                  <Bar dataKey="memberCount" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email o ciudad…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-foreground text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                Lista de Iglesias
              </span>
              <span className="text-sm font-normal text-muted-foreground">
                {pagination.total} resultado{pagination.total !== 1 ? "s" : ""}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="w-8 h-8 border-2 border-slate-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm">Cargando iglesias...</p>
              </div>
            ) : churches.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No se encontraron iglesias</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="w-8 px-2 py-3"></th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Iglesia
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Ubicación
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Usuarios
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Miembros
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {churches.map((c) => (
                      <React.Fragment key={c.id}>
                      <tr
                        onClick={() => setExpandedId((id) => (id === c.id ? null : c.id))}
                        className="hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <td className="pl-4 py-4">
                          <ChevronDown
                            className={`w-4 h-4 text-muted-foreground transition-transform ${
                              expandedId === c.id ? "rotate-180" : ""
                            }`}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shrink-0">
                              {c.logoUrl ? (
                                <img
                                  src={c.logoUrl}
                                  alt={c.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Building2 className="w-4 h-4 text-white" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-foreground font-medium text-sm truncate">
                                {c.name}
                              </p>
                              {c.email && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {c.email}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            {[c.city, c.country].filter(Boolean).join(", ") || "—"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-foreground text-sm">
                            <UserRound className="w-3.5 h-3.5 text-muted-foreground" />
                            {c.userCount}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-foreground text-sm">
                            <Users className="w-3.5 h-3.5 text-muted-foreground" />
                            {c.memberCount}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge isActive={c.isActive} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAccessChurch(c);
                              }}
                              disabled={!c.isActive || accessingId === c.id}
                              className={`p-1.5 rounded-lg transition-colors ${
                                !c.isActive
                                  ? "text-muted-foreground/40 cursor-not-allowed"
                                  : "text-muted-foreground hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-500/10"
                              }`}
                              title={
                                !c.isActive
                                  ? "Activa la iglesia para poder entrar"
                                  : "Entrar a esta iglesia"
                              }
                            >
                              <LogIn className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setToggleTarget(c);
                              }}
                              disabled={togglingId === c.id}
                              className={`p-1.5 rounded-lg transition-colors ${
                                c.isActive
                                  ? "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                                  : "text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-500/10"
                              }`}
                              title={c.isActive ? "Suspender iglesia" : "Activar iglesia"}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedId === c.id && (
                        <tr className="bg-muted/30">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Phone className="w-3.5 h-3.5 shrink-0" />
                                {c.phone || "Sin teléfono"}
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Globe className="w-3.5 h-3.5 shrink-0" />
                                {c.website || "Sin sitio web"}
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Landmark className="w-3.5 h-3.5 shrink-0" />
                                {c.denomination || "Sin denominación"}
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="w-3.5 h-3.5 shrink-0" />
                                {c.foundedYear ? `Fundada en ${c.foundedYear}` : "Año de fundación desconocido"}
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground sm:col-span-2 lg:col-span-2">
                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                {c.address || "Sin dirección"}
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <UserRound className="w-3.5 h-3.5 shrink-0" />
                                Pastor: {c.pastorName || "—"}
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="w-3.5 h-3.5 shrink-0" />
                                Registrada el{" "}
                                {new Date(c.createdAt).toLocaleDateString("es", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </div>
                            </div>
                            <div className="mt-4">
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAccessChurch(c);
                                }}
                                disabled={!c.isActive || accessingId === c.id}
                                className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40"
                              >
                                <LogIn className="w-4 h-4 mr-2" />
                                {accessingId === c.id
                                  ? "Entrando…"
                                  : !c.isActive
                                    ? "Activa la iglesia para entrar"
                                    : "Entrar a esta iglesia"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      Página {currentPage} de {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => goPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        variant="outline"
                        size="sm"
                        className="bg-secondary border-border text-foreground hover:bg-accent"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => goPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        variant="outline"
                        size="sm"
                        className="bg-secondary border-border text-foreground hover:bg-accent"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={!!toggleTarget}
        onOpenChange={(open) => !open && setToggleTarget(null)}
        title={toggleTarget?.isActive ? "¿Suspender iglesia?" : "¿Activar iglesia?"}
        description={
          toggleTarget?.isActive
            ? `Ningún usuario de "${toggleTarget?.name}" podrá iniciar sesión hasta que reactives la iglesia.`
            : `Los usuarios de "${toggleTarget?.name}" podrán volver a iniciar sesión.`
        }
        confirmLabel={toggleTarget?.isActive ? "Sí, suspender" : "Sí, activar"}
        confirmingLabel={toggleTarget?.isActive ? "Suspendiendo…" : "Activando…"}
        variant={toggleTarget?.isActive ? "destructive" : "default"}
        onConfirm={() => handleToggleActive(toggleTarget)}
      />
    </div>
  );
}

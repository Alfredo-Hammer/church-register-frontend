import {useCallback, useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {Card, CardContent} from "@/components/ui/Card";
import {Button} from "@/components/ui/Button";
import {Input} from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog";
import {useAuth} from "@/contexts/AuthContext";
import {planningService, groupsService} from "@/services/api";
import {
  PERIOD_TYPES,
  PERIOD_MAP,
  PLAN_STATUSES,
  PLAN_STATUS_MAP,
  fmtDate,
  fmtDateRange,
  planProgress,
  ProgressBar,
  Pager,
} from "@/pages/PlanningShared";
import {
  ClipboardList,
  Plus,
  Search,
  ChevronDown,
  X,
  Target,
  ListChecks,
  Users2,
} from "lucide-react";

// Al elegir un tipo de periodo con fecha de inicio ya puesta, se propone la
// fecha de fin automáticamente — el usuario la puede pisar si quiere un
// rango distinto. "Personalizado" no toca la fecha de fin.
function suggestEndDate(startDate, periodType) {
  if (!startDate) return "";
  const d = new Date(startDate + "T12:00:00");
  if (periodType === "MENSUAL") d.setMonth(d.getMonth() + 1);
  else if (periodType === "TRIMESTRAL") d.setMonth(d.getMonth() + 3);
  else if (periodType === "SEMESTRAL") d.setMonth(d.getMonth() + 6);
  else if (periodType === "ANUAL") d.setFullYear(d.getFullYear() + 1);
  else return "";
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

const emptyForm = () => ({
  title: "",
  groupId: "",
  periodType: "TRIMESTRAL",
  startDate: "",
  endDate: "",
  description: "",
  responsibleName: "",
  status: "BORRADOR",
});

export function PlanModal({open, onClose, plan, defaultGroupId, onSaved}) {
  const [form, setForm] = useState(emptyForm());
  const [groups, setGroups] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    groupsService.getAll({limit: 200}).then((r) => setGroups(r.groups || [])).catch(() => {});
    if (plan) {
      setForm({
        title: plan.title || "",
        groupId: plan.group_id || "",
        periodType: plan.period_type || "PERSONALIZADO",
        startDate: plan.start_date ? plan.start_date.slice(0, 10) : "",
        endDate: plan.end_date ? plan.end_date.slice(0, 10) : "",
        description: plan.description || "",
        responsibleName: plan.responsible_name || "",
        status: plan.status || "BORRADOR",
      });
    } else {
      setForm({...emptyForm(), groupId: defaultGroupId || ""});
    }
    setError("");
  }, [open, plan, defaultGroupId]);

  const handlePeriodOrStartChange = (field, value) => {
    setForm((f) => {
      const next = {...f, [field]: value};
      if (field === "periodType" || field === "startDate") {
        const suggested = suggestEndDate(next.startDate, next.periodType);
        if (suggested) next.endDate = suggested;
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.startDate || !form.endDate) {
      setError("Título, fecha de inicio y fecha de fin son obligatorios.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: form.title.trim(),
        groupId: form.groupId || null,
        periodType: form.periodType,
        startDate: form.startDate,
        endDate: form.endDate,
        description: form.description.trim() || null,
        responsibleName: form.responsibleName.trim() || null,
        status: form.status,
      };
      if (plan) await planningService.update(plan.id, payload);
      else await planningService.create(payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo guardar el plan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent onClose={onClose} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{plan ? "Editar plan" : "Nuevo plan"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Título *</label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({...f, title: e.target.value}))}
              placeholder="Ej: Plan de Crecimiento 2026"
              className="bg-background border-border text-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Periodo</label>
              <select
                value={form.periodType}
                onChange={(e) => handlePeriodOrStartChange("periodType", e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-background border border-border text-foreground text-sm"
              >
                {PERIOD_TYPES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Grupo (opcional)</label>
              <select
                value={form.groupId}
                onChange={(e) => setForm((f) => ({...f, groupId: e.target.value}))}
                className="w-full h-10 px-3 rounded-md bg-background border border-border text-foreground text-sm"
              >
                <option value="">Plan de la iglesia</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Fecha de inicio *</label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => handlePeriodOrStartChange("startDate", e.target.value)}
                className="bg-background border-border text-foreground"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Fecha de fin *</label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({...f, endDate: e.target.value}))}
                className="bg-background border-border text-foreground"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Responsable (opcional)</label>
            <Input
              value={form.responsibleName}
              onChange={(e) => setForm((f) => ({...f, responsibleName: e.target.value}))}
              placeholder="Nombre de quien lidera el plan"
              className="bg-background border-border text-foreground"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Descripción (opcional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({...f, description: e.target.value}))}
              rows={3}
              placeholder="Visión general del plan…"
              className="w-full px-3 py-2 rounded-md bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {plan && (
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Estado</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({...f, status: e.target.value}))}
                className="w-full h-10 px-3 rounded-md bg-background border border-border text-foreground text-sm"
              >
                {PLAN_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="border-border text-muted-foreground">
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? "Guardando…" : plan ? "Guardar cambios" : "Crear plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PlanningPage() {
  const {user} = useAuth();
  const navigate = useNavigate();
  const canEdit = ["ADMIN", "PASTOR", "LIDER"].includes(user?.role);

  const [plans, setPlans] = useState([]);
  const [pagination, setPagination] = useState({limit: 12, offset: 0, total: 0});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const params = {limit: pagination.limit, offset: pagination.offset};
      if (search) params.search = search;
      if (status) params.status = status;
      const r = await planningService.getAll(params);
      setPlans(r.plans || []);
      setPagination((p) => ({...p, total: r.pagination?.total ?? 0}));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, pagination.offset, search, status]);

  useEffect(() => {
    const t = setTimeout(() => loadPlans(), 300);
    return () => clearTimeout(t);
  }, [loadPlans]);

  useEffect(() => {
    setPagination((p) => (p.offset === 0 ? p : {...p, offset: 0}));
  }, [search, status]);

  const hasFilters = search || status;
  const activeCount = plans.filter((p) => p.status === "ACTIVO").length;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-gradient-to-br from-card via-card to-indigo-500/5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 p-5 md:p-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30 shrink-0">
                <ClipboardList size={19} />
              </div>
              <h1 className="text-2xl md:text-[1.75rem] font-bold tracking-tight text-foreground">Planificación</h1>
            </div>
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
              Crea planes mensuales, trimestrales o anuales para tu iglesia o para un grupo, con objetivos y acciones concretas.
            </p>
            <div className="flex flex-wrap gap-2 mt-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-background/80 px-2.5 py-1.5">
                <ClipboardList size={12} /> {pagination.total} planes
              </span>
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1.5 font-semibold text-blue-700 dark:text-blue-400">
                <Target size={12} /> {activeCount} activos en esta página
              </span>
            </div>
          </div>

          {canEdit && (
            <Button
              onClick={() => setModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" /> Nuevo Plan
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar plan por título…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-indigo-500"
          />
        </div>
        <div className="relative">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 px-3 pr-8 bg-card border border-border text-foreground rounded-md text-sm focus:outline-none focus:border-indigo-500 appearance-none"
          >
            <option value="">Todos los estados</option>
            {PLAN_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
        {hasFilters && (
          <Button
            variant="outline"
            onClick={() => { setSearch(""); setStatus(""); }}
            className="border-border text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-lg font-medium">
                {hasFilters ? "Sin resultados para este filtro" : "Aún no hay planes creados"}
              </p>
              {canEdit && !hasFilters && (
                <Button onClick={() => setModalOpen(true)} className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                  <Plus className="w-4 h-4" /> Crear el primero
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 text-muted-foreground text-xs font-semibold uppercase tracking-wider">Plan</th>
                    <th className="px-4 py-3 text-muted-foreground text-xs font-semibold uppercase tracking-wider hidden sm:table-cell">Periodo</th>
                    <th className="px-4 py-3 text-muted-foreground text-xs font-semibold uppercase tracking-wider hidden md:table-cell">Fechas</th>
                    <th className="px-4 py-3 text-muted-foreground text-xs font-semibold uppercase tracking-wider hidden lg:table-cell">Objetivos</th>
                    <th className="px-4 py-3 text-muted-foreground text-xs font-semibold uppercase tracking-wider hidden lg:table-cell">Acciones</th>
                    <th className="px-4 py-3 text-muted-foreground text-xs font-semibold uppercase tracking-wider">Avance</th>
                    <th className="px-4 py-3 text-muted-foreground text-xs font-semibold uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {plans.map((plan) => {
                    const st = PLAN_STATUS_MAP[plan.status];
                    const progress = planProgress(plan);
                    return (
                      <tr
                        key={plan.id}
                        onClick={() => navigate(`/dashboard/planning/${plan.id}`)}
                        className="hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm text-foreground font-medium">{plan.title}</p>
                          {plan.group_name && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-indigo-700 dark:text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded mt-1">
                              <Users2 size={10} /> {plan.group_name}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded whitespace-nowrap">
                            {PERIOD_MAP[plan.period_type]?.label || plan.period_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell whitespace-nowrap">
                          {fmtDateRange(plan.start_date, plan.end_date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell whitespace-nowrap">
                          <span className="inline-flex items-center gap-1"><Target size={11} /> {plan.goal_completed_count}/{plan.goal_count}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell whitespace-nowrap">
                          <span className="inline-flex items-center gap-1"><ListChecks size={11} /> {plan.action_completed_count}/{plan.action_count}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <ProgressBar value={progress} className="w-16" />
                            <span className="text-xs font-medium text-muted-foreground shrink-0">{progress}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap ${st?.classes}`}>
                            {st?.label || plan.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <Pager pagination={pagination} onChange={(offset) => setPagination((p) => ({...p, offset}))} />
        </CardContent>
      </Card>

      <PlanModal open={modalOpen} onClose={() => setModalOpen(false)} plan={null} onSaved={loadPlans} />
    </div>
  );
}

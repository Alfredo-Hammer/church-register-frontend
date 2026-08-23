import {useCallback, useEffect, useState} from "react";
import {useParams, useNavigate} from "react-router-dom";
import {Button} from "@/components/ui/Button";
import {Input} from "@/components/ui/Input";
import {ConfirmDialog} from "@/components/ui/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog";
import {cn} from "@/lib/utils";
import {useAuth} from "@/contexts/AuthContext";
import {planningService, settingsService} from "@/services/api";
import {buildPlanPDF} from "@/utils/reportPrint";
import {
  PERIOD_MAP,
  PLAN_STATUS_MAP,
  GOAL_STATUSES,
  GOAL_STATUS_MAP,
  ACTION_STATUSES,
  ACTION_STATUS_MAP,
  fmtDate,
  fmtDateRange,
  fmtDayOfWeek,
  fmtTime,
  goalProgress,
  ProgressBar,
} from "@/pages/PlanningShared";
import {PlanModal} from "@/pages/PlanningPage";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Printer,
  ClipboardList,
  Target,
  ListChecks,
  Plus,
  Users2,
  Calendar,
  User,
} from "lucide-react";

// ── Modal de objetivo ────────────────────────────────────────────────────────

const emptyGoalForm = () => ({
  title: "", description: "", targetValue: "", targetUnit: "",
  currentValue: "", responsibleName: "", status: "PENDIENTE",
});

function GoalModal({open, onClose, planId, goal, onSaved}) {
  const [form, setForm] = useState(emptyGoalForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(goal ? {
      title: goal.title || "",
      description: goal.description || "",
      targetValue: goal.target_value ?? "",
      targetUnit: goal.target_unit || "",
      currentValue: goal.current_value ?? "",
      responsibleName: goal.responsible_name || "",
      status: goal.status || "PENDIENTE",
    } : emptyGoalForm());
    setError("");
  }, [open, goal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError("El título es obligatorio."); return; }
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        targetValue: form.targetValue === "" ? null : Number(form.targetValue),
        targetUnit: form.targetUnit.trim() || null,
        currentValue: form.currentValue === "" ? null : Number(form.currentValue),
        responsibleName: form.responsibleName.trim() || null,
        status: form.status,
      };
      if (goal) await planningService.updateGoal(planId, goal.id, payload);
      else await planningService.addGoal(planId, payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo guardar el objetivo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent onClose={onClose} className="sm:max-w-md">
        <DialogHeader><DialogTitle>{goal ? "Editar objetivo" : "Nuevo objetivo"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Título *</label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({...f, title: e.target.value}))}
              placeholder="Ej: 50 miembros nuevos" className="bg-background border-border text-foreground" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Meta</label>
              <Input type="number" value={form.targetValue} onChange={(e) => setForm((f) => ({...f, targetValue: e.target.value}))}
                placeholder="50" className="bg-background border-border text-foreground" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Unidad</label>
              <Input value={form.targetUnit} onChange={(e) => setForm((f) => ({...f, targetUnit: e.target.value}))}
                placeholder="miembros" className="bg-background border-border text-foreground" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Avance actual</label>
              <Input type="number" value={form.currentValue} onChange={(e) => setForm((f) => ({...f, currentValue: e.target.value}))}
                placeholder="0" className="bg-background border-border text-foreground" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Responsable</label>
              <Input value={form.responsibleName} onChange={(e) => setForm((f) => ({...f, responsibleName: e.target.value}))}
                className="bg-background border-border text-foreground" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Estado</label>
              <select value={form.status} onChange={(e) => setForm((f) => ({...f, status: e.target.value}))}
                className="w-full h-10 px-3 rounded-md bg-background border border-border text-foreground text-sm">
                {GOAL_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Descripción (opcional)</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({...f, description: e.target.value}))}
              rows={2} className="w-full px-3 py-2 rounded-md bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="border-border text-muted-foreground">Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? "Guardando…" : goal ? "Guardar cambios" : "Agregar objetivo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Modal de acción ──────────────────────────────────────────────────────────

const emptyActionForm = () => ({
  title: "", goalId: "", dueDate: "", dueTime: "", responsibleName: "", status: "PENDIENTE", notes: "",
});

function ActionModal({open, onClose, planId, action, goals, onSaved}) {
  const [form, setForm] = useState(emptyActionForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(action ? {
      title: action.title || "",
      goalId: action.goal_id || "",
      dueDate: action.due_date ? action.due_date.slice(0, 10) : "",
      dueTime: action.due_time ? action.due_time.slice(0, 5) : "",
      responsibleName: action.responsible_name || "",
      status: action.status || "PENDIENTE",
      notes: action.notes || "",
    } : emptyActionForm());
    setError("");
  }, [open, action]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError("El título es obligatorio."); return; }
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: form.title.trim(),
        goalId: form.goalId || null,
        dueDate: form.dueDate || null,
        dueTime: form.dueTime || null,
        responsibleName: form.responsibleName.trim() || null,
        status: form.status,
        notes: form.notes.trim() || null,
      };
      if (action) await planningService.updateAction(planId, action.id, payload);
      else await planningService.addAction(planId, payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo guardar la acción.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent onClose={onClose} className="sm:max-w-md">
        <DialogHeader><DialogTitle>{action ? "Editar acción" : "Nueva acción"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Título *</label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({...f, title: e.target.value}))}
              placeholder="Ej: Campaña de invitación en redes" className="bg-background border-border text-foreground" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Objetivo asociado</label>
            <select value={form.goalId} onChange={(e) => setForm((f) => ({...f, goalId: e.target.value}))}
              className="w-full h-10 px-3 rounded-md bg-background border border-border text-foreground text-sm">
              <option value="">General del plan</option>
              {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Fecha</label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({...f, dueDate: e.target.value}))}
                className="bg-background border-border text-foreground" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Hora</label>
              <Input type="time" value={form.dueTime} onChange={(e) => setForm((f) => ({...f, dueTime: e.target.value}))}
                className="bg-background border-border text-foreground" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Responsable</label>
              <Input value={form.responsibleName} onChange={(e) => setForm((f) => ({...f, responsibleName: e.target.value}))}
                className="bg-background border-border text-foreground" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Estado</label>
              <select value={form.status} onChange={(e) => setForm((f) => ({...f, status: e.target.value}))}
                className="w-full h-10 px-3 rounded-md bg-background border border-border text-foreground text-sm">
                {ACTION_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Notas (opcional)</label>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({...f, notes: e.target.value}))}
              rows={2} className="w-full px-3 py-2 rounded-md bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="border-border text-muted-foreground">Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? "Guardando…" : action ? "Guardar cambios" : "Agregar acción"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Página de detalle ────────────────────────────────────────────────────────

export default function PlanningDetailPage() {
  const {id} = useParams();
  const navigate = useNavigate();
  const {user} = useAuth();
  const canEdit = ["ADMIN", "PASTOR", "LIDER"].includes(user?.role);
  const canDelete = ["ADMIN", "PASTOR"].includes(user?.role);

  const [plan, setPlan] = useState(null);
  const [goals, setGoals] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [church, setChurch] = useState({});

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [goalModal, setGoalModal] = useState({open: false, goal: null});
  const [actionModal, setActionModal] = useState({open: false, action: null});
  const [deleteGoalTarget, setDeleteGoalTarget] = useState(null);
  const [deleteActionTarget, setDeleteActionTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await planningService.getById(id);
      setPlan(r.plan);
      setGoals(r.goals || []);
      setActions(r.actions || []);
    } catch {
      setError("No se pudo cargar este plan.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    settingsService.getChurch().then((r) => setChurch(r.church || r || {})).catch(() => {});
  }, []);

  const handleDelete = async () => {
    try {
      await planningService.delete(id);
      navigate("/dashboard/planning");
    } catch (err) {
      alert(err.response?.data?.error || "No se pudo eliminar el plan.");
      setDeleteOpen(false);
    }
  };

  const handleDeleteGoal = async () => {
    if (!deleteGoalTarget) return;
    try {
      await planningService.deleteGoal(id, deleteGoalTarget.id);
      await load();
    } catch (err) {
      alert(err.response?.data?.error || "No se pudo eliminar el objetivo.");
    } finally {
      setDeleteGoalTarget(null);
    }
  };

  const handleDeleteAction = async () => {
    if (!deleteActionTarget) return;
    try {
      await planningService.deleteAction(id, deleteActionTarget.id);
      await load();
    } catch (err) {
      alert(err.response?.data?.error || "No se pudo eliminar la acción.");
    } finally {
      setDeleteActionTarget(null);
    }
  };

  const handlePrint = () => {
    const html = buildPlanPDF(plan, goals, actions, church);
    const win = window.open("", "_blank", "width=960,height=720");
    win.document.write(html);
    win.document.close();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate("/dashboard/planning")}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver a Planificación
        </button>
        <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-2xl">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p>{error || "Plan no encontrado."}</p>
        </div>
      </div>
    );
  }

  const st = PLAN_STATUS_MAP[plan.status];
  const responsibleLabel = plan.responsible_name ||
    [plan.responsible_first_name, plan.responsible_last_name].filter(Boolean).join(" ") || null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => navigate("/dashboard/planning")}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver a Planificación
        </button>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint} className="border-border text-muted-foreground hover:bg-accent gap-2">
            <Printer className="w-4 h-4" /> PDF
          </Button>
          {canEdit && (
            <Button onClick={() => setEditOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
              <Pencil className="w-4 h-4" /> Editar
            </Button>
          )}
          {canDelete && (
            <Button variant="outline" onClick={() => setDeleteOpen(true)}
              className="border-red-800/60 text-red-700 dark:text-red-400 hover:bg-red-500/10 dark:bg-red-900/20 gap-2">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card shadow-[0_18px_45px_rgba(15,23,42,0.08)] p-6 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{plan.title}</h1>
            <div className="flex items-center gap-2 flex-wrap mt-2">
              <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold border", st?.classes)}>{st?.label || plan.status}</span>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                {PERIOD_MAP[plan.period_type]?.label || plan.period_type}
              </span>
              {plan.group_name && (
                <span className="inline-flex items-center gap-1 text-xs text-indigo-700 dark:text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-full">
                  <Users2 size={12} /> {plan.group_name}
                </span>
              )}
            </div>
          </div>
        </div>

        {plan.description && <p className="text-sm text-muted-foreground leading-relaxed">{plan.description}</p>}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 border-t border-border">
          <div>
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Calendar size={12} /> Periodo</p>
            <p className="text-sm font-semibold text-foreground mt-1">{fmtDateRange(plan.start_date, plan.end_date)}</p>
          </div>
          {responsibleLabel && (
            <div>
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><User size={12} /> Responsable</p>
              <p className="text-sm font-semibold text-foreground mt-1">{responsibleLabel}</p>
            </div>
          )}
          {plan.created_by_name && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Creado por</p>
              <p className="text-sm font-semibold text-foreground mt-1">{plan.created_by_name}</p>
            </div>
          )}
        </div>
      </div>

      {/* Objetivos */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-border bg-muted/30">
          <span className="text-sm font-semibold text-foreground flex items-center gap-2"><Target size={15} /> Objetivos</span>
          {canEdit && (
            <button onClick={() => setGoalModal({open: true, goal: null})}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <Plus size={12} /> Agregar objetivo
            </button>
          )}
        </div>
        {goals.length === 0 ? (
          <p className="px-5 py-8 text-center text-xs text-muted-foreground italic">Sin objetivos aún</p>
        ) : (
          <div className="divide-y divide-border/60">
            {goals.map((g) => {
              const gst = GOAL_STATUS_MAP[g.status];
              const progress = goalProgress(g);
              const responsible = g.responsible_name || [g.responsible_first_name, g.responsible_last_name].filter(Boolean).join(" ");
              return (
                <div key={g.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-5 py-3.5 hover:bg-muted/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground text-sm">{g.title}</p>
                      <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium border shrink-0", gst?.classes)}>{gst?.label}</span>
                    </div>
                    {g.description && <p className="text-xs text-muted-foreground mt-0.5">{g.description}</p>}
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground flex-wrap">
                      {g.target_value != null && (
                        <span>{Number(g.current_value || 0)} / {Number(g.target_value)} {g.target_unit || ""}</span>
                      )}
                      {responsible && <span className="inline-flex items-center gap-1"><User size={10} /> {responsible}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 max-w-xs">
                      <ProgressBar value={progress} />
                      <span className="text-[11px] text-muted-foreground shrink-0">{progress}%</span>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1 sm:shrink-0">
                      <button onClick={() => setGoalModal({open: true, goal: g})}
                        className="p-1.5 rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-accent transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDeleteGoalTarget(g)}
                        className="p-1.5 rounded-lg text-muted-foreground/70 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-border bg-muted/30">
          <span className="text-sm font-semibold text-foreground flex items-center gap-2"><ListChecks size={15} /> Acciones</span>
          {canEdit && (
            <button onClick={() => setActionModal({open: true, action: null})}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <Plus size={12} /> Agregar acción
            </button>
          )}
        </div>
        {actions.length === 0 ? (
          <p className="px-5 py-8 text-center text-xs text-muted-foreground italic">Sin acciones aún</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-2.5 text-muted-foreground text-xs font-semibold uppercase tracking-wider">Día</th>
                  <th className="px-4 py-2.5 text-muted-foreground text-xs font-semibold uppercase tracking-wider hidden sm:table-cell">Fecha</th>
                  <th className="px-4 py-2.5 text-muted-foreground text-xs font-semibold uppercase tracking-wider">Hora</th>
                  <th className="px-4 py-2.5 text-muted-foreground text-xs font-semibold uppercase tracking-wider">Actividad</th>
                  <th className="px-4 py-2.5 text-muted-foreground text-xs font-semibold uppercase tracking-wider">Nombre</th>
                  <th className="px-4 py-2.5 text-muted-foreground text-xs font-semibold uppercase tracking-wider hidden md:table-cell">Estado</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {actions.map((a) => {
                  const ast = ACTION_STATUS_MAP[a.status];
                  const linkedGoal = goals.find((g) => g.id === a.goal_id);
                  const responsible = a.responsible_name || [a.responsible_first_name, a.responsible_last_name].filter(Boolean).join(" ");
                  return (
                    <tr key={a.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-2.5 text-sm text-foreground whitespace-nowrap">{fmtDayOfWeek(a.due_date)}</td>
                      <td className="px-4 py-2.5 text-sm text-muted-foreground hidden sm:table-cell whitespace-nowrap">{fmtDate(a.due_date)}</td>
                      <td className="px-4 py-2.5 text-sm text-muted-foreground whitespace-nowrap">{fmtTime(a.due_time)}</td>
                      <td className="px-4 py-2.5">
                        <p className="text-sm font-medium text-foreground">{a.title}</p>
                        {linkedGoal && <p className="text-[11px] text-indigo-700 dark:text-indigo-400 inline-flex items-center gap-1 mt-0.5"><Target size={10} /> {linkedGoal.title}</p>}
                        {a.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">{a.notes}</p>}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-foreground whitespace-nowrap">{responsible || "—"}</td>
                      <td className="px-4 py-2.5 hidden md:table-cell">
                        <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap", ast?.classes)}>{ast?.label}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        {canEdit && (
                          <div className="flex items-center justify-end gap-0.5">
                            <button onClick={() => setActionModal({open: true, action: a})}
                              className="p-1.5 rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-accent transition-colors">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => setDeleteActionTarget(a)}
                              className="p-1.5 rounded-lg text-muted-foreground/70 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PlanModal open={editOpen} onClose={() => setEditOpen(false)} plan={plan} onSaved={load} />
      <GoalModal open={goalModal.open} onClose={() => setGoalModal({open: false, goal: null})} planId={id} goal={goalModal.goal} onSaved={load} />
      <ActionModal open={actionModal.open} onClose={() => setActionModal({open: false, action: null})} planId={id} action={actionModal.action} goals={goals} onSaved={load} />

      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="¿Eliminar este plan?"
        description={`"${plan.title}" y todos sus objetivos y acciones se eliminarán. Esta acción no se puede deshacer.`}
        confirmLabel="Sí, eliminar" confirmingLabel="Eliminando…" variant="destructive" onConfirm={handleDelete} />
      <ConfirmDialog open={!!deleteGoalTarget} onOpenChange={(o) => !o && setDeleteGoalTarget(null)} title="¿Eliminar este objetivo?"
        description={`"${deleteGoalTarget?.title}" se eliminará del plan.`}
        confirmLabel="Sí, eliminar" confirmingLabel="Eliminando…" variant="destructive" onConfirm={handleDeleteGoal} />
      <ConfirmDialog open={!!deleteActionTarget} onOpenChange={(o) => !o && setDeleteActionTarget(null)} title="¿Eliminar esta acción?"
        description={`"${deleteActionTarget?.title}" se eliminará del plan.`}
        confirmLabel="Sí, eliminar" confirmingLabel="Eliminando…" variant="destructive" onConfirm={handleDeleteAction} />
    </div>
  );
}

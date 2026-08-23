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
  fmtMonthYear,
  buildMonthGrid,
  WEEKDAY_HEADERS,
  goalProgress,
  ProgressBar,
  ResponsiblePicker,
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
  ChevronLeft,
  ChevronRight,
  List,
  CalendarDays,
  X,
} from "lucide-react";

// ── Modal de objetivo ────────────────────────────────────────────────────────

const emptyGoalForm = () => ({
  title: "", description: "", targetValue: "", targetUnit: "",
  currentValue: "", responsibleId: "", responsibleName: "", status: "PENDIENTE",
});

function GoalModal({open, onClose, planId, goal, groupId, onSaved}) {
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
      responsibleId: goal.responsible_id || "",
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
        responsibleId: form.responsibleId || null,
        responsibleName: (form.responsibleName || "").trim() || null,
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
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Responsable</label>
            <ResponsiblePicker
              groupId={groupId || null}
              value={{responsibleId: form.responsibleId, responsibleName: form.responsibleName}}
              onChange={(v) => setForm((f) => ({...f, responsibleId: v.responsibleId, responsibleName: v.responsibleName}))}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Estado</label>
            <select value={form.status} onChange={(e) => setForm((f) => ({...f, status: e.target.value}))}
              className="w-full h-10 px-3 rounded-md bg-background border border-border text-foreground text-sm">
              {GOAL_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
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
  title: "", goalId: "", dueDate: "", dueTime: "", responsibleId: "", responsibleName: "", status: "PENDIENTE", notes: "",
});

function ActionModal({open, onClose, planId, action, goals, groupId, defaultDate, onSaved}) {
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
      responsibleId: action.responsible_id || "",
      responsibleName: action.responsible_name || "",
      status: action.status || "PENDIENTE",
      notes: action.notes || "",
    } : {...emptyActionForm(), dueDate: defaultDate || ""});
    setError("");
  }, [open, action, defaultDate]);

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
        responsibleId: form.responsibleId || null,
        responsibleName: (form.responsibleName || "").trim() || null,
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
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Responsable</label>
            <ResponsiblePicker
              groupId={groupId || null}
              value={{responsibleId: form.responsibleId, responsibleName: form.responsibleName}}
              onChange={(v) => setForm((f) => ({...f, responsibleId: v.responsibleId, responsibleName: v.responsibleName}))}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Estado</label>
            <select value={form.status} onChange={(e) => setForm((f) => ({...f, status: e.target.value}))}
              className="w-full h-10 px-3 rounded-md bg-background border border-border text-foreground text-sm">
              {ACTION_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
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

// ── Calendario mensual de acciones ───────────────────────────────────────────
// Vista alternativa a la tabla: útil para un rol de turnos (quién dirige
// cada culto/actividad) donde ver el mes completo de un vistazo importa más
// que una lista larga. Clic en una acción existente la edita; clic en un
// día vacío abre "Agregar acción" con esa fecha ya puesta. Cada turno
// muestra hora + actividad + responsable (dos líneas, no solo un nombre
// truncado) con su propio botón de borrar — no hace falta abrir el
// formulario de edición solo para eliminar un turno.

// Un color distinto por día de la semana (no por status) en las celdas con
// actividad — ayuda a ver de un vistazo patrones como "los turnos de este
// grupo siempre caen jueves". El índice de columna dentro de la semana (di)
// ES el día de la semana (0=Dom..6=Sáb), no hace falta derivarlo de la fecha.
const WEEKDAY_CELL_COLORS = [
  {border: "border-rose-500/25",    bg: "bg-rose-500/[0.06]",    hoverBorder: "hover:border-rose-500/50",    hoverBg: "hover:bg-rose-500/10",    text: "text-rose-700 dark:text-rose-400"},
  {border: "border-amber-500/25",   bg: "bg-amber-500/[0.06]",   hoverBorder: "hover:border-amber-500/50",   hoverBg: "hover:bg-amber-500/10",   text: "text-amber-700 dark:text-amber-400"},
  {border: "border-emerald-500/25", bg: "bg-emerald-500/[0.06]", hoverBorder: "hover:border-emerald-500/50", hoverBg: "hover:bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400"},
  {border: "border-sky-500/25",     bg: "bg-sky-500/[0.06]",     hoverBorder: "hover:border-sky-500/50",     hoverBg: "hover:bg-sky-500/10",     text: "text-sky-700 dark:text-sky-400"},
  {border: "border-violet-500/25",  bg: "bg-violet-500/[0.06]",  hoverBorder: "hover:border-violet-500/50",  hoverBg: "hover:bg-violet-500/10",  text: "text-violet-700 dark:text-violet-400"},
  {border: "border-cyan-500/25",    bg: "bg-cyan-500/[0.06]",    hoverBorder: "hover:border-cyan-500/50",    hoverBg: "hover:bg-cyan-500/10",    text: "text-cyan-700 dark:text-cyan-400"},
  {border: "border-fuchsia-500/25", bg: "bg-fuchsia-500/[0.06]", hoverBorder: "hover:border-fuchsia-500/50", hoverBg: "hover:bg-fuchsia-500/10", text: "text-fuchsia-700 dark:text-fuchsia-400"},
];

function MonthCalendar({actions, year, month, onDayClick, onActionClick, onDeleteAction}) {
  const weeks = buildMonthGrid(year, month);
  const byDate = {};
  for (const a of actions) {
    if (!a.due_date) continue;
    const key = a.due_date.slice(0, 10);
    (byDate[key] = byDate[key] || []).push(a);
  }
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="p-3 sm:p-4">
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_HEADERS.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground py-1.5">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weeks.flatMap((week, wi) =>
          week.map((cell, di) => {
            if (!cell) return <div key={`${wi}-${di}`} className="min-h-[90px] sm:min-h-[120px]" />;
            const dayActions = byDate[cell.dateStr] || [];
            const hasActivity = dayActions.length > 0;
            const isToday = cell.dateStr === todayStr;
            const wc = WEEKDAY_CELL_COLORS[di];
            return (
              <button
                key={cell.dateStr}
                onClick={() => (dayActions.length > 0 ? onActionClick(dayActions[0]) : onDayClick(cell.dateStr))}
                className={cn(
                  "min-h-[90px] sm:min-h-[120px] rounded-lg border p-1.5 text-left transition-colors flex flex-col gap-1",
                  isToday
                    ? "border-indigo-500/60 bg-indigo-500/5"
                    : hasActivity
                      ? `${wc.border} ${wc.bg} ${wc.hoverBorder} ${wc.hoverBg}`
                      : "border-border/60 hover:border-border hover:bg-muted/40"
                )}
              >
                <span className={cn(
                  "text-[11px] font-medium",
                  isToday ? "text-indigo-700 dark:text-indigo-400" : hasActivity ? wc.text : "text-muted-foreground"
                )}>
                  {cell.day}
                </span>
                <div className="flex-1 space-y-1 overflow-hidden">
                  {dayActions.slice(0, 2).map((a) => {
                    const ast = ACTION_STATUS_MAP[a.status];
                    const responsible = a.responsible_name || [a.responsible_first_name, a.responsible_last_name].filter(Boolean).join(" ");
                    return (
                      <div
                        key={a.id}
                        onClick={(e) => { e.stopPropagation(); onActionClick(a); }}
                        className={cn("rounded px-1 py-0.5 border flex items-start gap-1", ast?.classes)}
                        title={`${a.title}${responsible ? ` — ${responsible}` : ""}`}
                      >
                        <div className="flex-1 min-w-0 leading-tight text-center">
                          <p className="text-[10.5px] font-semibold truncate">{a.title}</p>
                          <p className="text-[9.5px] opacity-80 truncate">
                            {[responsible, a.due_time?.slice(0, 5), ast?.label].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        {onDeleteAction && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeleteAction(a); }}
                            className="hidden sm:block shrink-0 opacity-60 hover:opacity-100 hover:text-red-700 dark:hover:text-red-400 transition-opacity"
                            title="Eliminar turno"
                          >
                            <Trash2 size={9} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {dayActions.length > 2 && (
                    <p className="text-[10px] text-muted-foreground px-1">+{dayActions.length - 2} más</p>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
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
  const [actionModal, setActionModal] = useState({open: false, action: null, defaultDate: null});
  const [deleteGoalTarget, setDeleteGoalTarget] = useState(null);
  const [deleteActionTarget, setDeleteActionTarget] = useState(null);

  const [actionsView, setActionsView] = useState("calendario");
  // Arranca en el mes de HOY, no en el mes de inicio del plan — igual que
  // cualquier calendario, se abre donde uno está parado; de ahí se navega
  // con las flechas hacia el resto del periodo del plan.
  const [calendarYM, setCalendarYM] = useState(() => {
    const d = new Date();
    return {year: d.getFullYear(), month: d.getMonth()};
  });
  const shiftMonth = (delta) => {
    setCalendarYM((ym) => {
      if (!ym) return ym;
      const d = new Date(ym.year, ym.month + delta, 1);
      return {year: d.getFullYear(), month: d.getMonth()};
    });
  };

  // Filtro de rango Desde/Hasta sobre el calendario — además de acotar qué
  // turnos se muestran, elegir "Desde" salta el calendario directo a ese
  // mes (más rápido que darle a la flecha varias veces en un plan largo).
  const [calFilterFrom, setCalFilterFrom] = useState("");
  const [calFilterTo, setCalFilterTo] = useState("");
  const calendarActions = actions.filter((a) => {
    if (!a.due_date) return true;
    const d = a.due_date.slice(0, 10);
    if (calFilterFrom && d < calFilterFrom) return false;
    if (calFilterTo && d > calFilterTo) return false;
    return true;
  });
  const handleCalFilterFrom = (value) => {
    setCalFilterFrom(value);
    if (value) {
      const d = new Date(value + "T12:00:00");
      setCalendarYM({year: d.getFullYear(), month: d.getMonth()});
    }
  };

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
    const html = buildPlanPDF(plan, goals, actions, church, {actionsView});
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
    <div className="space-y-6">
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
        <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-border bg-muted/30 flex-wrap">
          <span className="text-sm font-semibold text-foreground flex items-center gap-2"><ListChecks size={15} /> Acciones</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 bg-muted/70 rounded-lg p-0.5">
              <button onClick={() => setActionsView("lista")}
                className={cn("flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors",
                  actionsView === "lista" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                <List size={12} /> Lista
              </button>
              <button onClick={() => setActionsView("calendario")}
                className={cn("flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors",
                  actionsView === "calendario" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                <CalendarDays size={12} /> Calendario
              </button>
            </div>
            {canEdit && (
              <button onClick={() => setActionModal({open: true, action: null, defaultDate: null})}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                <Plus size={12} /> Agregar acción
              </button>
            )}
          </div>
        </div>

        {actionsView === "calendario" && calendarYM && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 border-b border-border">
            <div className="flex items-center gap-3">
              <button onClick={() => shiftMonth(-1)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-semibold text-foreground capitalize w-40 text-center">
                {fmtMonthYear(calendarYM.year, calendarYM.month)}
              </span>
              <button onClick={() => shiftMonth(1)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <input type="date" value={calFilterFrom} onChange={(e) => handleCalFilterFrom(e.target.value)}
                className="h-8 px-2 rounded-md bg-background border border-border text-foreground text-xs" />
              <span className="text-muted-foreground">→</span>
              <input type="date" value={calFilterTo} onChange={(e) => setCalFilterTo(e.target.value)}
                className="h-8 px-2 rounded-md bg-background border border-border text-foreground text-xs" />
              {(calFilterFrom || calFilterTo) && (
                <button onClick={() => { setCalFilterFrom(""); setCalFilterTo(""); }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" title="Quitar filtro de fechas">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        )}

        {actionsView === "calendario" ? (
          calendarYM && (
            <MonthCalendar
              actions={calendarActions}
              year={calendarYM.year}
              month={calendarYM.month}
              onDayClick={(dateStr) => canEdit && setActionModal({open: true, action: null, defaultDate: dateStr})}
              onActionClick={(a) => canEdit && setActionModal({open: true, action: a, defaultDate: null})}
              onDeleteAction={canEdit ? (a) => setDeleteActionTarget(a) : null}
            />
          )
        ) : actions.length === 0 ? (
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
                            <button onClick={() => setActionModal({open: true, action: a, defaultDate: null})}
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
      <GoalModal open={goalModal.open} onClose={() => setGoalModal({open: false, goal: null})} planId={id} goal={goalModal.goal} groupId={plan.group_id} onSaved={load} />
      <ActionModal open={actionModal.open} onClose={() => setActionModal({open: false, action: null, defaultDate: null})} planId={id} action={actionModal.action} defaultDate={actionModal.defaultDate} goals={goals} groupId={plan.group_id} onSaved={load} />

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

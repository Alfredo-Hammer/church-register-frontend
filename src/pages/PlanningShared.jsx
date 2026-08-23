import {Button} from "@/components/ui/Button";
import {ChevronLeft, ChevronRight} from "lucide-react";

// Piezas compartidas entre PlanningPage (listado) y PlanningDetailPage
// (ficha de un plan, con sus objetivos y acciones) — mismo patrón que
// InventoryShared.jsx.

export const PERIOD_TYPES = [
  {value: "MENSUAL", label: "Mensual"},
  {value: "TRIMESTRAL", label: "Trimestral"},
  {value: "SEMESTRAL", label: "Semestral"},
  {value: "ANUAL", label: "Anual"},
  {value: "PERSONALIZADO", label: "Personalizado"},
];
export const PERIOD_MAP = Object.fromEntries(PERIOD_TYPES.map((p) => [p.value, p]));

export const PLAN_STATUSES = [
  {value: "BORRADOR", label: "Borrador", classes: "bg-muted text-muted-foreground border-border"},
  {value: "ACTIVO", label: "Activo", classes: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30"},
  {value: "COMPLETADO", label: "Completado", classes: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"},
  {value: "ARCHIVADO", label: "Archivado", classes: "bg-muted text-muted-foreground border-border"},
];
export const PLAN_STATUS_MAP = Object.fromEntries(PLAN_STATUSES.map((s) => [s.value, s]));

export const GOAL_STATUSES = [
  {value: "PENDIENTE", label: "Pendiente", classes: "bg-muted text-muted-foreground border-border"},
  {value: "EN_PROGRESO", label: "En progreso", classes: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30"},
  {value: "COMPLETADO", label: "Completado", classes: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"},
  {value: "NO_LOGRADO", label: "No logrado", classes: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30"},
];
export const GOAL_STATUS_MAP = Object.fromEntries(GOAL_STATUSES.map((s) => [s.value, s]));

export const ACTION_STATUSES = [
  {value: "PENDIENTE", label: "Pendiente", classes: "bg-muted text-muted-foreground border-border"},
  {value: "EN_PROGRESO", label: "En progreso", classes: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30"},
  {value: "COMPLETADA", label: "Completada", classes: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"},
  {value: "CANCELADA", label: "Cancelada", classes: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30"},
];
export const ACTION_STATUS_MAP = Object.fromEntries(ACTION_STATUSES.map((s) => [s.value, s]));

export const fmtDate = (d) =>
  d ? new Date(d.slice(0, 10) + "T12:00:00").toLocaleDateString("es", {day: "2-digit", month: "short", year: "numeric"}) : "—";

export const fmtDateRange = (start, end) => `${fmtDate(start)} → ${fmtDate(end)}`;

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export const fmtDayOfWeek = (d) =>
  d ? DAY_NAMES[new Date(d.slice(0, 10) + "T12:00:00").getDay()] : "—";

export const fmtTime = (t) => {
  if (!t) return "—";
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  const period = h >= 12 ? "p. m." : "a. m.";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
};

// % de avance de un objetivo: si tiene meta numérica, current/target; si no
// tiene meta numérica, se deriva de su status (así un objetivo cualitativo
// como "Definir el equipo de liderazgo" también aporta a la barra general).
export const goalProgress = (goal) => {
  if (goal.target_value != null && Number(goal.target_value) > 0) {
    const pct = (Number(goal.current_value || 0) / Number(goal.target_value)) * 100;
    return Math.max(0, Math.min(100, Math.round(pct)));
  }
  if (goal.status === "COMPLETADO") return 100;
  if (goal.status === "EN_PROGRESO") return 50;
  return 0;
};

// % de avance general de un plan: promedio del avance de sus objetivos: si
// no tiene objetivos, se deriva del % de acciones completadas en su lugar
// (un plan corto puede no desglosar en metas numéricas).
export const planProgress = (plan) => {
  const goalCount = plan.goal_count ?? 0;
  const actionCount = plan.action_count ?? 0;
  if (goalCount > 0) {
    return Math.round(((plan.goal_completed_count ?? 0) / goalCount) * 100);
  }
  if (actionCount > 0) {
    return Math.round(((plan.action_completed_count ?? 0) / actionCount) * 100);
  }
  return 0;
};

export function ProgressBar({value, className = ""}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={`h-1.5 w-full rounded-full bg-muted overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
        style={{width: `${pct}%`}}
      />
    </div>
  );
}

export function Pager({pagination, onChange}) {
  const {limit, offset, total} = pagination;
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
      <p className="text-sm text-muted-foreground">
        Página {currentPage} de {totalPages} · {total} en total
      </p>
      <div className="flex gap-2">
        <Button
          onClick={() => onChange(Math.max(0, offset - limit))}
          disabled={currentPage === 1}
          variant="outline"
          size="sm"
          className="bg-secondary border-border text-foreground hover:bg-accent"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => onChange(offset + limit)}
          disabled={currentPage === totalPages}
          variant="outline"
          size="sm"
          className="bg-secondary border-border text-foreground hover:bg-accent"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

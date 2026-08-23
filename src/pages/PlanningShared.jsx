import {useEffect, useState} from "react";
import {Button} from "@/components/ui/Button";
import {ChevronLeft, ChevronRight} from "lucide-react";
import {groupsService, membersService} from "@/services/api";

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
const DAY_NAMES_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export const fmtDayOfWeek = (d) =>
  d ? DAY_NAMES[new Date(d.slice(0, 10) + "T12:00:00").getDay()] : "—";

export const fmtMonthYear = (year, month) => `${MONTH_NAMES[month]} ${year}`;

// Matriz de semanas (7 columnas Dom-Sáb) para el mes `month` (0-11) del año
// `year` — cada celda es { day, dateStr } o null si cae fuera del mes (para
// dejar el hueco en blanco en vez de mostrar días del mes vecino, que
// confunden más de lo que ayudan en una vista de turnos).
export function buildMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay.getDay(); // 0=domingo
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({day, dateStr});
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export const WEEKDAY_HEADERS = DAY_NAMES_SHORT;

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

// Selector de responsable: miembros del GRUPO si el plan/objetivo/acción
// pertenece a uno, o de toda la iglesia si es un plan general — en vez del
// texto libre que había antes (usado en PlanModal, GoalModal y ActionModal).
// "Otro…" se deja como escape hatch para alguien que dirige algo sin ser
// miembro del sistema (p. ej. un predicador invitado) — el backend ya
// acepta responsibleId O responsibleName, nunca ambos a la vez.
export function ResponsiblePicker({groupId, value, onChange, className = ""}) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const load = groupId
      ? groupsService.getById(groupId).then((r) => r.members || [])
      : membersService.getAll({limit: 1000, status: "ACTIVO"}).then((r) => r.members || []);
    load
      .then((list) => { if (!cancelled) setMembers(list); })
      .catch(() => { if (!cancelled) setMembers([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [groupId]);

  const isOther = !value.responsibleId && !!value.responsibleName;
  const selectValue = isOther ? "__other__" : (value.responsibleId || "");

  return (
    <div className={className}>
      <select
        value={selectValue}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "__other__") onChange({responsibleId: null, responsibleName: value.responsibleName || ""});
          else if (v === "") onChange({responsibleId: null, responsibleName: null});
          else onChange({responsibleId: v, responsibleName: null});
        }}
        className="w-full h-10 px-3 rounded-md bg-background border border-border text-foreground text-sm"
      >
        <option value="">{loading ? "Cargando…" : "Sin asignar"}</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>{`${m.first_name} ${m.last_name}`.trim()}</option>
        ))}
        <option value="__other__">Otro (escribir nombre)…</option>
      </select>
      {isOther && (
        <input
          type="text"
          value={value.responsibleName || ""}
          onChange={(e) => onChange({responsibleId: null, responsibleName: e.target.value})}
          placeholder="Nombre de quien dirige"
          className="w-full h-10 px-3 mt-2 rounded-md bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground"
        />
      )}
    </div>
  );
}

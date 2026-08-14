import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { conferenceService } from "@/services/api";
import { Input } from "@/components/ui/Input";
import {
  ArrowLeft, Search, Check, Loader2, Users, ClipboardCheck, Church, X,
  CalendarDays, Lock, Clock, ShieldCheck, Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatTime(t) {
  if (!t) return null;
  const [h, m] = t.split(':');
  const hour = parseInt(h);
  return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function initials(name) {
  return (name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

// null = ausente (no hay fila en conference_attendance); los otros tres son
// los valores reales de conference_attendance.status.
const STATUS_OPTIONS = [
  { key: null,           label: "Ausente",     icon: Ban,         activeClasses: "bg-red-600 text-white" },
  { key: "PRESENTE",     label: "Presente",    icon: Check,       activeClasses: "bg-emerald-600 text-white" },
  { key: "TARDE",        label: "Tarde",       icon: Clock,       activeClasses: "bg-amber-500 text-white" },
  { key: "JUSTIFICADO",  label: "Justificado", icon: ShieldCheck, activeClasses: "bg-blue-600 text-white" },
];

const STATUS_META = {
  PRESENTE:    { label: "Presente",    dot: "bg-emerald-500" },
  TARDE:       { label: "Tarde",       dot: "bg-amber-500" },
  JUSTIFICADO: { label: "Justificado", dot: "bg-blue-500" },
};
const ABSENT_META = { label: "Ausente", dot: "bg-red-500" };

const FILTERS = [
  { key: "all",         label: "Todos" },
  { key: "PRESENTE",    label: "Presentes" },
  { key: "TARDE",       label: "Tarde" },
  { key: "JUSTIFICADO", label: "Justificados" },
  { key: "absent",      label: "Ausentes" },
];

// Toma de asistencia manual: lista completa de inscritos con 4 estados por
// persona (ausente / presente / tarde / justificado). Complementa el
// escaneo de QR (ConferenceCheckInPage) sin reemplazarlo — esta pantalla es
// para cuando el asistente no trae el gafete o llegó fuera de horario.
export default function ConferenceManualAttendancePage() {
  const { id, sessionId } = useParams();
  const navigate = useNavigate();

  const [conference, setConference] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [statusById, setStatusById] = useState(() => new Map()); // regId -> 'PRESENTE'|'TARDE'|'JUSTIFICADO'
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);

  const isLocked = conference && ["FINALIZADO", "CANCELADO"].includes(conference.status);
  const noAttendance = sessionInfo?.takes_attendance === false;
  const editingDisabled = isLocked || noAttendance;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [confData, regsData, attData] = await Promise.all([
        conferenceService.getById(id),
        conferenceService.getRegistrations(id, { limit: 1000 }),
        conferenceService.getSessionAttendance(sessionId),
      ]);
      setConference(confData.conference);
      const session = confData.days.flatMap((d) => d.sessions).find((s) => s.id === sessionId);
      setSessionInfo(session || attData.session);
      setRegistrations(regsData.registrations);
      setStatusById(new Map(attData.attendance.map((a) => [a.registration_id, a.status || "PRESENTE"])));
    } catch {
      navigate(`/dashboard/conference/${id}`);
    }
    setLoading(false);
  }, [id, sessionId, navigate]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return registrations.filter((r) => {
      if (term && !(r.full_name?.toLowerCase().includes(term) || r.origin_church?.toLowerCase().includes(term))) return false;
      const status = statusById.get(r.id) || null;
      if (statusFilter === "absent") return status === null;
      if (statusFilter !== "all") return status === statusFilter;
      return true;
    });
  }, [registrations, search, statusFilter, statusById]);

  const attendedCount = statusById.size;
  const progressPct = registrations.length ? Math.round((attendedCount / registrations.length) * 100) : 0;

  const setAttendance = async (regId, newStatus) => {
    if (editingDisabled || togglingId) return;
    setTogglingId(regId);
    try {
      if (newStatus === null) {
        await conferenceService.unmarkAttendance(sessionId, regId);
        setStatusById((prev) => { const next = new Map(prev); next.delete(regId); return next; });
      } else {
        await conferenceService.markAttendance(sessionId, regId, newStatus);
        setStatusById((prev) => new Map(prev).set(regId, newStatus));
      }
    } catch { /* silent */ }
    setTogglingId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 to-background px-4 py-6 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <Link to={`/dashboard/conference/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft size={15} /> Volver a la conferencia
        </Link>

        {/* Encabezado */}
        <div className="rounded-3xl border border-border bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 p-[1px] shadow-lg shadow-emerald-900/10 mb-5">
          <div className="rounded-3xl bg-card/95 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/30 flex-shrink-0">
                    <ClipboardCheck size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Asistencia manual</p>
                    <h1 className="text-base font-bold text-foreground truncate">{sessionInfo?.title || "Sesión"}</h1>
                  </div>
                </div>
                {sessionInfo?.time_start && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 pl-11">
                    <CalendarDays size={11} /> {formatTime(sessionInfo.time_start)}
                    {sessionInfo.time_end && ` – ${formatTime(sessionInfo.time_end)}`}
                  </p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-2xl font-bold text-foreground tabular-nums">{attendedCount}<span className="text-muted-foreground text-base">/{registrations.length}</span></p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">registrados</p>
              </div>
            </div>

            <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>

        {isLocked && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3.5 py-2.5 text-xs text-muted-foreground">
            <Lock size={13} className="flex-shrink-0" /> Esta conferencia está finalizada o cancelada — no se puede editar la asistencia.
          </div>
        )}
        {!isLocked && noAttendance && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3.5 py-2.5 text-xs text-muted-foreground">
            <Clock size={13} className="flex-shrink-0" /> Esta sesión no requiere control de asistencia.
          </div>
        )}

        {/* Buscador + filtros */}
        <div className="flex flex-col gap-2 mb-4">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o iglesia..." className="pl-9" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={15} />
              </button>
            )}
          </div>
          <div className="flex gap-1 bg-muted/50 p-1 rounded-lg overflow-x-auto">
            {FILTERS.map((f) => (
              <button key={f.key} onClick={() => setStatusFilter(f.key)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex-shrink-0",
                  statusFilter === f.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-muted-foreground">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-10 text-center text-muted-foreground text-sm">
            {registrations.length === 0 ? "Sin asistentes inscritos todavía" : "Nadie coincide con el filtro"}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden divide-y divide-border">
            {filtered.map((r) => {
              const status = statusById.get(r.id) || null;
              const meta = status ? STATUS_META[status] : ABSENT_META;
              const isToggling = togglingId === r.id;
              return (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={cn(
                    "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    status ? "bg-emerald-600/90 text-white" : "bg-red-600/15 text-red-600 dark:text-red-400"
                  )}>
                    {initials(r.full_name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">{r.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <Church size={11} /> {r.origin_church || "Sin especificar"}
                      <span className={cn("ml-1 inline-flex h-1.5 w-1.5 rounded-full", meta.dot)} />
                    </p>
                  </div>

                  <div className="flex items-center gap-0.5 rounded-full border border-border bg-muted/40 p-0.5 flex-shrink-0">
                    {isToggling ? (
                      <div className="flex items-center justify-center w-[124px] h-7">
                        <Loader2 size={14} className="animate-spin text-muted-foreground" />
                      </div>
                    ) : STATUS_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const active = status === opt.key;
                      return (
                        <button
                          key={opt.label}
                          type="button"
                          title={opt.label}
                          disabled={editingDisabled}
                          onClick={() => setAttendance(r.id, opt.key)}
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                            active ? opt.activeClasses : "text-muted-foreground hover:bg-background hover:text-foreground",
                            editingDisabled && "cursor-not-allowed opacity-60"
                          )}>
                          <Icon size={13} strokeWidth={active ? 2.5 : 2} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-[11px] text-muted-foreground mt-4 flex items-center justify-center gap-1.5">
          <Users size={11} /> Toca ausente, presente, tarde o justificado para cada asistente
        </p>
      </div>
    </div>
  );
}

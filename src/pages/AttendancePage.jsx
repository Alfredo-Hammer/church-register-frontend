import React, {useState, useEffect} from "react";
import {Card, CardContent} from "@/components/ui/Card";
import {Button} from "@/components/ui/Button";
import {Input} from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import {
  CheckSquare,
  Calendar,
  Check,
  Search,
  AlertCircle,
  CheckCircle,
  UserCheck,
  Clock,
  UserPlus,
  Minus,
  Plus,
  UsersRound,
  LayoutList,
  LayoutGrid,
  ChevronRight,
  MapPin,
  FileText,
  Eye,
  Flame,
  History,
} from "lucide-react";
import {eventsService, membersService, prayerService} from "@/services/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDateLong = (d) =>
  new Date(d).toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
const fmtDateShort = (d) =>
  new Date(d).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
const fmtTime = (d) =>
  new Date(d).toLocaleTimeString("es-ES", {hour: "2-digit", minute: "2-digit"});

const TYPE_LABEL = {
  CULTO: "Culto",
  REUNION: "Reunión",
  ESPECIAL: "Evento Especial",
};
const TYPE_COLOR = {
  CULTO: {
    badge: "bg-blue-600/20 text-blue-400 border-blue-600/40",
    dot: "bg-blue-400",
    text: "text-blue-400",
  },
  REUNION: {
    badge: "bg-purple-600/20 text-purple-400 border-purple-600/40",
    dot: "bg-purple-400",
    text: "text-purple-400",
  },
  ESPECIAL: {
    badge: "bg-amber-600/20 text-amber-400 border-amber-600/40",
    dot: "bg-amber-400",
    text: "text-amber-400",
  },
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({event, open, onClose, onEdit}) {
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !event) return;
    setLoading(true);
    eventsService
      .getAttendance(event.id)
      .then((d) => setAttendees(d.attendees || d.attendance || []))
      .catch(() => setAttendees([]))
      .finally(() => setLoading(false));
  }, [open, event]);

  if (!event) return null;

  const members = parseInt(event.attendance_count) || 0;
  const guests = parseInt(event.guest_count) || 0;
  const total = parseInt(event.total_count) || members + guests;
  const tc = TYPE_COLOR[event.event_type] || TYPE_COLOR.CULTO;
  const isPast = new Date(event.date) < new Date();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl w-full max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-white flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5
              ${isPast ? "bg-slate-700" : "bg-emerald-600/20"}`}
            >
              <Calendar
                className={`w-5 h-5 ${isPast ? "text-gray-400" : "text-emerald-400"}`}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg leading-tight">{event.title}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs border ${tc.badge}`}
                >
                  {TYPE_LABEL[event.event_type]}
                </span>
                {isPast && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-slate-700 text-gray-400 border border-slate-600">
                    Pasado
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-sm font-normal mt-1 capitalize">
                {fmtDateLong(event.date)} · {fmtTime(event.date)}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 space-y-5 mt-2">
          {/* Description */}
          {event.description && (
            <div className="flex items-start gap-2.5 text-sm text-gray-400 bg-slate-700/40 rounded-xl px-4 py-3">
              <FileText className="w-4 h-4 shrink-0 mt-0.5 text-gray-500" />
              <p>{event.description}</p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                icon: UserCheck,
                label: "Miembros",
                value: members,
                color: "text-emerald-400",
                bg: "bg-emerald-500/10 border-emerald-500/20",
              },
              {
                icon: UserPlus,
                label: "Visitantes",
                value: guests,
                color: "text-amber-400",
                bg: "bg-amber-500/10 border-amber-500/20",
              },
              {
                icon: UsersRound,
                label: "Total",
                value: total,
                color: "text-white",
                bg: "bg-slate-700/60 border-slate-600/50",
              },
            ].map(({icon: Icon, label, value, color, bg}) => (
              <div
                key={label}
                className={`rounded-xl border p-3 text-center ${bg}`}
              >
                <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Attendees list */}
          <div>
            <p className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              Lista de miembros asistentes
              {!loading && (
                <span className="text-gray-500 font-normal">
                  ({attendees.length})
                </span>
              )}
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : attendees.length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-slate-700/30 rounded-xl">
                <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No hay miembros registrados aún</p>
              </div>
            ) : (
              <div className="bg-slate-700/30 rounded-xl overflow-hidden">
                {attendees.map((a, i) => (
                  <div
                    key={a.id}
                    className={`flex items-center gap-3 px-4 py-2.5 ${i < attendees.length - 1 ? "border-b border-slate-700/50" : ""}`}
                  >
                    <div className="w-7 h-7 rounded-full bg-emerald-600/20 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">
                        {a.first_name} {a.last_name}
                      </p>
                      {a.phone && (
                        <p className="text-gray-500 text-xs">{a.phone}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Guest note */}
          {guests > 0 && (
            <div className="flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
              <UserPlus className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-sm text-amber-300">
                <strong>{guests}</strong> persona{guests !== 1 ? "s" : ""}{" "}
                adicionale{guests !== 1 ? "s" : ""} asistió como público general
                (sin registro).
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 pt-4 border-t border-slate-700 shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 border-slate-600 text-gray-300 hover:text-white hover:border-slate-500"
          >
            Cerrar
          </Button>
          {isPast ? (
            <Button
              onClick={() => {
                onClose();
                onEdit(event);
              }}
              className="flex-[2] bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white gap-2"
            >
              <CheckSquare className="w-4 h-4" />
              Registrar / Editar asistencia
            </Button>
          ) : (
            <Button
              disabled
              className={`flex-[2] cursor-not-allowed gap-2 ${
                new Date(event.date).toDateString() ===
                new Date().toDateString()
                  ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                  : "bg-slate-700 text-gray-500"
              }`}
            >
              <Clock className="w-4 h-4" />
              {new Date(event.date).toDateString() === new Date().toDateString()
                ? `Disponible hoy a las ${fmtTime(event.date)}`
                : `Disponible el ${fmtDateShort(event.date)} · ${fmtTime(event.date)}`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Attendance Modal ─────────────────────────────────────────────────────────
function AttendanceModal({event, open, onClose, onSaved}) {
  const [allMembers, setAllMembers] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState(new Set());
  const [memberSearch, setMemberSearch] = useState("");
  const [guestCount, setGuestCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    if (!open || !event) return;
    setSelectedMembers(new Set());
    setMemberSearch("");
    setFormError("");
    setFormSuccess("");
    setGuestCount(0);
    setDataLoading(true);

    Promise.all([
      membersService.getAll({limit: 1000, status: "ACTIVO"}),
      eventsService.getAttendance(event.id),
    ])
      .then(([membersData, attendanceData]) => {
        setAllMembers(membersData.members || []);
        const records =
          attendanceData.attendees || attendanceData.attendance || [];
        setAttendanceRecords(records);
        setSelectedMembers(new Set(records.map((a) => a.member_id)));
        setGuestCount(parseInt(event.guest_count) || 0);
      })
      .catch(console.error)
      .finally(() => setDataLoading(false));
  }, [open, event]);

  const toggleMember = (id) => {
    const s = new Set(selectedMembers);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedMembers(s);
  };

  const handleSave = async () => {
    if (!event) return;
    setIsSaving(true);
    setFormError("");
    setFormSuccess("");
    try {
      const existing = new Set(attendanceRecords.map((a) => a.member_id));
      const toAdd = Array.from(selectedMembers).filter(
        (id) => !existing.has(id),
      );
      const toRemove = attendanceRecords.filter(
        (r) => !selectedMembers.has(r.member_id),
      );

      await Promise.all([
        ...(toAdd.length > 0
          ? [eventsService.recordBulkAttendance(event.id, toAdd)]
          : []),
        ...toRemove.map((r) =>
          eventsService.deleteAttendance(event.id, r.id).catch(() => {}),
        ),
        eventsService.updateGuestCount(event.id, guestCount),
      ]);

      setFormSuccess("Asistencia guardada exitosamente");
      onSaved();
      setTimeout(onClose, 1800);
    } catch (e) {
      setFormError(e.response?.data?.error || "Error al guardar asistencia");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredMembers = allMembers.filter((m) =>
    `${m.first_name} ${m.last_name}`
      .toLowerCase()
      .includes(memberSearch.toLowerCase()),
  );
  const total = selectedMembers.size + guestCount;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle className="text-white text-lg flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-emerald-600/20 flex items-center justify-center shrink-0">
              <CheckSquare className="w-5 h-5 text-emerald-400" />
            </span>
            <div>
              <p>{event?.title}</p>
              <p className="text-gray-400 text-sm font-normal mt-0.5 capitalize">
                {event && `${fmtDateLong(event.date)} · ${fmtTime(event.date)}`}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {dataLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="mt-2 space-y-4">
            {formError && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                {formSuccess}
              </div>
            )}

            {/* Visitantes */}
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                    <UserPlus className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">
                      Público general / Visitantes
                    </p>
                    <p className="text-gray-400 text-xs">
                      Personas sin registro previo (libre entrada)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setGuestCount((v) => Math.max(0, v - 1))}
                    className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 border border-slate-600 flex items-center justify-center text-white transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={guestCount}
                    onChange={(e) =>
                      setGuestCount(Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className="w-20 text-center bg-slate-700 border border-slate-600 text-white text-lg font-bold rounded-lg py-1.5 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setGuestCount((v) => v + 1)}
                    className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 border border-slate-600 flex items-center justify-center text-white transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Miembros */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  Miembros registrados
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setSelectedMembers(new Set(allMembers.map((m) => m.id)))
                    }
                    className="text-xs text-gray-400 hover:text-white border border-slate-600 hover:border-slate-500 rounded px-2 py-1 transition-colors"
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setSelectedMembers(new Set())}
                    className="text-xs text-gray-400 hover:text-white border border-slate-600 hover:border-slate-500 rounded px-2 py-1 transition-colors"
                  >
                    Ninguno
                  </button>
                </div>
              </div>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar miembro..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="max-h-56 overflow-y-auto space-y-1 rounded-xl bg-slate-700/40 p-2">
                {filteredMembers.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">
                    Sin miembros encontrados
                  </p>
                ) : (
                  filteredMembers.map((m) => (
                    <label
                      key={m.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors
                      ${
                        selectedMembers.has(m.id)
                          ? "bg-emerald-600/15 border border-emerald-500/30"
                          : "hover:bg-slate-700 border border-transparent"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedMembers.has(m.id)}
                        onChange={() => toggleMember(m.id)}
                        className="h-4 w-4 rounded border-slate-500 accent-emerald-500"
                      />
                      <span className="flex-1 text-sm text-white">
                        {m.first_name} {m.last_name}
                      </span>
                      {selectedMembers.has(m.id) && (
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Resumen */}
            <div className="bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span className="text-gray-400">
                Miembros:{" "}
                <strong className="text-white">{selectedMembers.size}</strong>
              </span>
              <span className="text-gray-400">
                Visitantes:{" "}
                <strong className="text-amber-400">{guestCount}</strong>
              </span>
              <span className="text-gray-400">
                Total:{" "}
                <strong className="text-emerald-400 text-base">{total}</strong>
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 border-slate-600 text-gray-300 hover:text-white hover:border-slate-500"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !!formSuccess || dataLoading}
            className="flex-[2] bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Guardando...
              </>
            ) : (
              "Guardar Asistencia"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Helpers (oración) ───────────────────────────────────────────────────────

const DAYS_ES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

/** Devuelve la fecha más reciente (≤ hoy) en que cayó el día de semana dado */
const lastOccurrence = (dow) => {
  const today = new Date();
  const diff = (today.getDay() - dow + 7) % 7;
  const d = new Date(today);
  d.setDate(today.getDate() - diff);
  return d.toISOString().slice(0, 10);
};

const fmtTimePrayer = (t) => {
  if (!t) return "";
  const [h, m] = t.slice(0, 5).split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
};

// ─── Prayer History Modal ──────────────────────────────────────────────────────

function PrayerHistoryModal({session, open, onClose, onEditDate}) {
  const [history, setHistory] = useState([]);
  const [expandedDates, setExpandedDates] = useState(new Set());
  const [dateDetails, setDateDetails] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingDates, setLoadingDates] = useState(new Set());

  useEffect(() => {
    if (!open || !session) return;
    setLoading(true);
    setExpandedDates(new Set());
    setDateDetails({});
    setLoadingDates(new Set());
    prayerService
      .getAttendanceHistory(session.id, 52)
      .then((d) => setHistory(d.history || []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [open, session]);

  const formatDateKey = (dateValue) => {
    // Convertir fecha a formato YYYY-MM-DD
    if (!dateValue) return "";
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  };

  const toggleDate = async (dateValue) => {
    const dateKey = formatDateKey(dateValue);
    if (!dateKey) return;

    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(dateKey)) {
      newExpanded.delete(dateKey);
      setExpandedDates(newExpanded);
    } else {
      newExpanded.add(dateKey);
      setExpandedDates(newExpanded);

      // Cargar detalles si no están cargados
      if (!dateDetails[dateKey]) {
        setLoadingDates((prev) => new Set(prev).add(dateKey));
        try {
          const data = await prayerService.getAttendance(session.id, dateKey);
          setDateDetails((prev) => ({
            ...prev,
            [dateKey]: data.attendance || [],
          }));
        } catch (err) {
          console.error("Error loading date details:", err);
          setDateDetails((prev) => ({
            ...prev,
            [dateKey]: [],
          }));
        } finally {
          setLoadingDates((prev) => {
            const newSet = new Set(prev);
            newSet.delete(dateKey);
            return newSet;
          });
        }
      }
    }
  };

  if (!session) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-3xl w-full max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-white text-lg flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0">
              <History className="w-5 h-5 text-orange-400" />
            </span>
            <div>
              <p>Historial de Asistencias</p>
              <p className="text-gray-400 text-sm font-normal mt-0.5">
                {session.name} — {DAYS_ES[session.day_of_week]}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 mx-auto mb-3 text-gray-600" />
              <p className="text-gray-400">No hay registros de asistencia</p>
              <p className="text-gray-500 text-sm mt-1">
                Comienza a pasar lista para ver el historial
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((record) => {
                const dateKey = formatDateKey(record.attendance_date);
                const isExpanded = expandedDates.has(dateKey);
                const details = dateDetails[dateKey] || [];
                const loadingDetails = loadingDates.has(dateKey);

                // Formatear fecha para mostrar
                const dateObj = new Date(record.attendance_date);
                const displayDate = isNaN(dateObj.getTime())
                  ? "Fecha no válida"
                  : dateObj.toLocaleDateString("es-ES", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    });

                return (
                  <div
                    key={dateKey}
                    className="border border-slate-700 rounded-xl overflow-hidden bg-slate-800/50"
                  >
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-700/50 transition-colors"
                      onClick={() => toggleDate(record.attendance_date)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-white capitalize">
                            {displayDate}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs">
                          <span className="text-emerald-400 font-medium">
                            {record.total} miembros
                          </span>
                          {record.guest_count > 0 && (
                            <span className="text-amber-400 font-medium">
                              +{record.guest_count} visitantes
                            </span>
                          )}
                          <span className="text-gray-500">•</span>
                          <span className="text-white font-semibold">
                            Total: {record.grand_total}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditDate(dateKey);
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition-colors"
                      >
                        Editar
                      </button>
                      <ChevronRight
                        className={`w-4 h-4 text-gray-400 transition-transform ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      />
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-700 px-4 py-3 bg-slate-900/30">
                        {loadingDetails ? (
                          <div className="flex justify-center py-4">
                            <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : details.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-2">
                            Sin miembros registrados
                          </p>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500 font-medium mb-2">
                              Miembros asistentes:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {details.map((member) => (
                                <div
                                  key={member.member_id}
                                  className="flex items-center gap-2 text-sm text-gray-300 bg-slate-800/50 rounded px-2.5 py-1.5"
                                >
                                  <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <span>
                                    {member.first_name} {member.last_name}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-slate-700 pt-4 mt-4 shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full border-slate-600 text-gray-300 hover:text-white hover:border-slate-500"
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Prayer Attendance Modal ──────────────────────────────────────────────────

function PrayerAttendanceModal({session, open, onClose, onSaved, initialDate}) {
  const [allMembers, setAllMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState(new Set());
  const [date, setDate] = useState("");
  const [guestCount, setGuestCount] = useState(0);
  const [memberSearch, setMemberSearch] = useState("");
  const [dataLoading, setDataLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  useEffect(() => {
    if (!open || !session) return;
    const defaultDate = initialDate || lastOccurrence(session.day_of_week);
    setDate(defaultDate);
    setMemberSearch("");
    setFormError("");
    setFormSuccess("");
    setGuestCount(0);
    setDataLoading(true);

    Promise.all([
      membersService.getAll({limit: 1000, status: "ACTIVO"}),
      prayerService.getAttendance(session.id, defaultDate),
    ])
      .then(([membersData, attData]) => {
        setAllMembers(membersData.members || []);
        setSelectedMembers(
          new Set((attData.attendance || []).map((a) => a.member_id)),
        );
        setGuestCount(parseInt(attData.guest_count) || 0);
      })
      .catch(console.error)
      .finally(() => setDataLoading(false));
  }, [open, session, initialDate]);

  // Reload attendance when date changes
  useEffect(() => {
    if (!open || !session || !date) return;
    setDataLoading(true);
    prayerService
      .getAttendance(session.id, date)
      .then((d) => {
        setSelectedMembers(
          new Set((d.attendance || []).map((a) => a.member_id)),
        );
        setGuestCount(parseInt(d.guest_count) || 0);
      })
      .catch(() => {
        setSelectedMembers(new Set());
        setGuestCount(0);
      })
      .finally(() => setDataLoading(false));
  }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMember = (id) => {
    const s = new Set(selectedMembers);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedMembers(s);
  };

  const handleSave = async () => {
    if (!session || !date) return;
    setIsSaving(true);
    setFormError("");
    setFormSuccess("");
    try {
      await prayerService.saveAttendance(
        session.id,
        date,
        Array.from(selectedMembers),
        guestCount,
      );
      setFormSuccess("Asistencia guardada exitosamente");
      onSaved();
      setTimeout(onClose, 1500);
    } catch (e) {
      setFormError(e.response?.data?.error || "Error al guardar asistencia");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredMembers = allMembers.filter((m) =>
    `${m.first_name} ${m.last_name}`
      .toLowerCase()
      .includes(memberSearch.toLowerCase()),
  );
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle className="text-white text-lg flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5 text-orange-400" />
            </span>
            <div>
              <p>{session?.name}</p>
              <p className="text-gray-400 text-sm font-normal mt-0.5">
                {session &&
                  `${DAYS_ES[session.day_of_week]} · ${fmtTimePrayer(session.start_time)}`}
                {initialDate && (
                  <span className="text-blue-400 ml-2">
                    — Editando registro
                  </span>
                )}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {dataLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="mt-2 space-y-4">
            {formError && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                {formSuccess}
              </div>
            )}

            {/* Selector de fecha */}
            <div className="bg-slate-700/40 border border-slate-600/50 rounded-xl p-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm font-semibold text-white">
                    Fecha de la sesión
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Solo fechas pasadas o de hoy
                  </p>
                </div>
                <input
                  type="date"
                  max={today}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Visitantes */}
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                    <UserPlus className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">
                      Público general / Visitantes
                    </p>
                    <p className="text-gray-400 text-xs">
                      Personas sin registro previo
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setGuestCount((v) => Math.max(0, v - 1))}
                    className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 border border-slate-600 flex items-center justify-center text-white transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={guestCount}
                    onChange={(e) =>
                      setGuestCount(Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className="w-20 text-center bg-slate-700 border border-slate-600 text-white text-lg font-bold rounded-lg py-1.5 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setGuestCount((v) => v + 1)}
                    className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 border border-slate-600 flex items-center justify-center text-white transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Miembros */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  Miembros ({selectedMembers.size} marcados)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setSelectedMembers(new Set(allMembers.map((m) => m.id)))
                    }
                    className="text-xs text-gray-400 hover:text-white border border-slate-600 hover:border-slate-500 rounded px-2 py-1 transition-colors"
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setSelectedMembers(new Set())}
                    className="text-xs text-gray-400 hover:text-white border border-slate-600 hover:border-slate-500 rounded px-2 py-1 transition-colors"
                  >
                    Ninguno
                  </button>
                </div>
              </div>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar miembro..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="max-h-56 overflow-y-auto space-y-1 rounded-xl bg-slate-700/40 p-2">
                {filteredMembers.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">
                    Sin miembros encontrados
                  </p>
                ) : (
                  filteredMembers.map((m) => (
                    <label
                      key={m.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors
                      ${
                        selectedMembers.has(m.id)
                          ? "bg-emerald-600/15 border border-emerald-500/30"
                          : "hover:bg-slate-700 border border-transparent"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedMembers.has(m.id)}
                        onChange={() => toggleMember(m.id)}
                        className="h-4 w-4 rounded border-slate-500 accent-emerald-500"
                      />
                      <span className="flex-1 text-sm text-white">
                        {m.first_name} {m.last_name}
                      </span>
                      {selectedMembers.has(m.id) && (
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Resumen */}
            <div className="bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span className="text-gray-400">
                Miembros:{" "}
                <strong className="text-white">{selectedMembers.size}</strong>
              </span>
              <span className="text-gray-400">
                Visitantes:{" "}
                <strong className="text-amber-400">{guestCount}</strong>
              </span>
              <span className="text-gray-400">
                Total:{" "}
                <strong className="text-emerald-400 text-base">
                  {selectedMembers.size + guestCount}
                </strong>
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 border-slate-600 text-gray-300 hover:text-white hover:border-slate-500"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !!formSuccess || dataLoading || !date}
            className="flex-[2] bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Guardando...
              </>
            ) : (
              "Guardar Asistencia"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Prayer Session Row ───────────────────────────────────────────────────────

/** Devuelve la próxima fecha (≥ mañana) en que caerá el día de semana dado */
const nextOccurrence = (dow) => {
  const today = new Date();
  const diff = (dow - today.getDay() + 7) % 7 || 7; // mínimo 1 día
  const d = new Date(today);
  d.setDate(today.getDate() + diff);
  return d.toISOString().slice(0, 10);
};

function PrayerSessionRow({session, onRegister, onViewHistory}) {
  const [history, setHistory] = useState([]);
  const [loadingH, setLoadingH] = useState(true);

  useEffect(() => {
    prayerService
      .getAttendanceHistory(session.id, 5)
      .then((d) => setHistory(d.history || []))
      .catch(() => setHistory([]))
      .finally(() => setLoadingH(false));
  }, [session.id]);

  const lastTotal = history[0]?.total ?? null;
  const lastGuests = history[0]?.guest_count ?? null;

  // Determinar si hoy es el día de la sesión o ya pasó (puede pasar lista)
  const todayDow = new Date().getDay();
  const isToday = session.day_of_week === todayDow;

  // Próxima fecha para mostrar info contextual
  const nextDate = nextOccurrence(session.day_of_week);
  const nextFmt = new Date(nextDate + "T12:00:00").toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-slate-700/50 last:border-0 hover:bg-slate-700/30 transition-colors group">
      {/* Flame dot */}
      <div
        className={`w-2 h-2 rounded-full shrink-0 ${isToday ? "bg-orange-400" : "bg-slate-600"}`}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-white">
            {session.name}
          </span>
          <span
            className={`px-1.5 py-0.5 rounded text-[11px] border ${
              isToday
                ? "bg-orange-500/20 text-orange-300 border-orange-500/40"
                : "bg-orange-500/10 text-orange-400 border-orange-500/30"
            }`}
          >
            {isToday ? "Hoy" : DAYS_ES[session.day_of_week]}
          </span>
          {!session.is_active && (
            <span className="px-1.5 py-0.5 rounded text-[11px] border bg-slate-700 text-gray-500 border-slate-600">
              Inactiva
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          {fmtTimePrayer(session.start_time)}
          {session.end_time && ` – ${fmtTimePrayer(session.end_time)}`}
          {session.location && ` · ${session.location}`}
          {!isToday && (
            <span className="text-gray-600">
              {" "}
              · Próx: <span className="text-gray-500">{nextFmt}</span>
            </span>
          )}
        </p>
      </div>

      {/* Última asistencia */}
      <div className="hidden sm:flex items-center gap-5 shrink-0 text-sm">
        <div className="text-center">
          <p className="text-gray-500 text-xs">Última sesión</p>
          {loadingH ? (
            <div className="h-4 w-8 bg-slate-700 animate-pulse rounded mx-auto mt-1" />
          ) : (
            <p
              className={`font-bold ${lastTotal !== null ? "text-emerald-400" : "text-gray-600"}`}
            >
              {lastTotal !== null ? lastTotal : "—"}
              {lastGuests !== null && lastGuests > 0 && (
                <span className="text-amber-400 text-xs ml-1">
                  +{lastGuests}v
                </span>
              )}
            </p>
          )}
        </div>
        <div className="text-center">
          <p className="text-gray-500 text-xs">Sesiones</p>
          <p className="text-white font-semibold">{history.length}</p>
        </div>
      </div>

      {/* Buttons */}
      <div className="hidden group-hover:flex items-center gap-2 shrink-0">
        <button
          onClick={() => onViewHistory(session)}
          className="items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors bg-slate-700 hover:bg-slate-600 text-gray-300 border border-slate-600"
          title="Ver historial completo"
        >
          <History className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onRegister(session)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-500/30"
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Pasar lista</span>
        </button>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
    </div>
  );
}

// ─── Prayer Section ───────────────────────────────────────────────────────────

function PrayerSection() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState(null);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [historySession, setHistorySession] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editDate, setEditDate] = useState("");

  useEffect(() => {
    prayerService
      .getAll()
      .then((d) => setSessions(d.prayer_days || []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  const activeSessions = sessions.filter((s) => s.is_active);
  const inactiveSessions = sessions.filter((s) => !s.is_active);

  const openRegister = (session) => {
    setActiveSession(session);
    setEditDate("");
    setAttendanceOpen(true);
  };

  const openHistory = (session) => {
    setHistorySession(session);
    setHistoryOpen(true);
  };

  const openEditFromHistory = (date) => {
    setHistoryOpen(false);
    setActiveSession(historySession);
    setEditDate(date);
    setAttendanceOpen(true);
  };

  const handleSaved = () => {
    // Recargar sesiones para actualizar estadísticas
    prayerService
      .getAll()
      .then((d) => setSessions(d.prayer_days || []))
      .catch(() => {});
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400">Cargando sesiones de oración...</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-20">
        <Flame className="h-12 w-12 mx-auto mb-4 text-gray-600" />
        <p className="text-gray-400">No hay sesiones de oración configuradas</p>
        <p className="text-gray-500 text-sm mt-1">
          Ve a <strong>Días de Oración</strong> para crear sesiones recurrentes
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {activeSessions.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-400" />
              Sesiones activas — {activeSessions.length}
            </h2>
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              {activeSessions.map((s) => (
                <PrayerSessionRow
                  key={s.id}
                  session={s}
                  onRegister={openRegister}
                  onViewHistory={openHistory}
                />
              ))}
            </div>
          </section>
        )}

        {inactiveSessions.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-600" />
              Inactivas — {inactiveSessions.length}
            </h2>
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden opacity-60">
              {inactiveSessions.map((s) => (
                <PrayerSessionRow
                  key={s.id}
                  session={s}
                  onRegister={openRegister}
                  onViewHistory={openHistory}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <PrayerHistoryModal
        session={historySession}
        open={historyOpen}
        onClose={() => {
          setHistoryOpen(false);
          setHistorySession(null);
        }}
        onEditDate={openEditFromHistory}
      />

      <PrayerAttendanceModal
        session={activeSession}
        open={attendanceOpen}
        initialDate={editDate}
        onClose={() => {
          setAttendanceOpen(false);
          setActiveSession(null);
          setEditDate("");
        }}
        onSaved={handleSaved}
      />
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState("events"); // "events" | "prayer"
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState("list"); // "list" | "grid"

  // Detail modal
  const [detailEvent, setDetailEvent] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Attendance modal
  const [attendanceEvent, setAttendanceEvent] = useState(null);
  const [attendanceOpen, setAttendanceOpen] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, [eventTypeFilter]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params = {limit: 200};
      if (eventTypeFilter !== "ALL") params.eventType = eventTypeFilter;
      const data = await eventsService.getAll(params);
      setEvents(data.events || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = (event) => {
    setDetailEvent(event);
    setDetailOpen(true);
  };

  const openAttendance = (event) => {
    setAttendanceEvent(event);
    setAttendanceOpen(true);
  };

  const filteredEvents = events.filter((e) =>
    e.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const now = new Date();
  const upcomingEvents = filteredEvents.filter((e) => new Date(e.date) >= now);
  const pastEvents = filteredEvents.filter((e) => new Date(e.date) < now);

  // ─── List row ───────────────────────────────────────────────────────────────
  const ListRow = ({event, past}) => {
    const members = parseInt(event.attendance_count) || 0;
    const guests = parseInt(event.guest_count) || 0;
    const total = parseInt(event.total_count) || members + guests;
    const tc = TYPE_COLOR[event.event_type] || TYPE_COLOR.CULTO;

    return (
      <div
        className={`flex items-center gap-4 px-4 py-3 border-b border-slate-700/50 last:border-0 hover:bg-slate-700/30 transition-colors cursor-pointer group`}
        onClick={() => openDetail(event)}
      >
        {/* Status dot */}
        <div
          className={`w-2 h-2 rounded-full shrink-0 ${past ? "bg-slate-600" : tc.dot}`}
        />

        {/* Title + type */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-sm font-semibold ${past ? "text-gray-400" : "text-white"}`}
            >
              {event.title}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[11px] border ${tc.badge}`}
            >
              {TYPE_LABEL[event.event_type]}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 capitalize">
            {fmtDateShort(event.date)} · {fmtTime(event.date)}
          </p>
        </div>

        {/* Counts */}
        <div className="hidden sm:flex items-center gap-5 shrink-0 text-sm">
          <div className="text-center">
            <p className="text-gray-500 text-xs">Miembros</p>
            <p className="text-white font-semibold">{members}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-500 text-xs">Visitantes</p>
            <p className="text-amber-400 font-semibold">{guests}</p>
          </div>
          <div className="text-center min-w-[48px]">
            <p className="text-gray-500 text-xs">Total</p>
            <p
              className={`font-bold text-base ${past ? "text-gray-300" : "text-emerald-400"}`}
            >
              {total}
            </p>
          </div>
        </div>

        {/* Mobile total */}
        <div className="sm:hidden shrink-0 text-right">
          <p className="text-xs text-gray-500">Total</p>
          <p
            className={`font-bold ${past ? "text-gray-300" : "text-emerald-400"}`}
          >
            {total}
          </p>
        </div>

        {/* Action */}
        <div className="flex items-center gap-1 shrink-0">
          {past ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                openAttendance(event);
              }}
              className="hidden group-hover:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors bg-slate-700 hover:bg-slate-600 text-gray-300"
              title="Registrar asistencia"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Registrar</span>
            </button>
          ) : (
            <span
              title={`Registro disponible a partir del ${fmtDateShort(event.date)} · ${fmtTime(event.date)}`}
              className={`hidden group-hover:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-not-allowed
                ${
                  new Date(event.date).toDateString() ===
                  new Date().toDateString()
                    ? "bg-amber-500/10 text-amber-600/80 border border-amber-500/20"
                    : "bg-slate-700/50 text-gray-500"
                }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden md:inline">
                {new Date(event.date).toDateString() ===
                new Date().toDateString()
                  ? `Hoy · ${fmtTime(event.date)}`
                  : "Pendiente"}
              </span>
            </span>
          )}
          <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
        </div>
      </div>
    );
  };

  // ─── Grid card ──────────────────────────────────────────────────────────────
  const GridCard = ({event, past}) => {
    const members = parseInt(event.attendance_count) || 0;
    const guests = parseInt(event.guest_count) || 0;
    const total = parseInt(event.total_count) || members + guests;
    const tc = TYPE_COLOR[event.event_type] || TYPE_COLOR.CULTO;

    return (
      <div
        className={`rounded-xl border p-4 cursor-pointer transition-all duration-200 space-y-3
          ${
            past
              ? "bg-slate-800/50 border-slate-700/50 opacity-80 hover:opacity-100"
              : "bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5"
          }`}
        onClick={() => openDetail(event)}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`w-2 h-2 rounded-full shrink-0 mt-1 ${past ? "bg-slate-600" : tc.dot}`}
            />
            <p
              className={`text-sm font-semibold leading-snug ${past ? "text-gray-400" : "text-white"}`}
            >
              {event.title}
            </p>
          </div>
          <span
            className={`px-1.5 py-0.5 rounded text-[11px] border shrink-0 ${tc.badge}`}
          >
            {TYPE_LABEL[event.event_type]}
          </span>
        </div>

        {/* Date */}
        <p className="text-xs text-gray-500 capitalize">
          {fmtDateShort(event.date)} · {fmtTime(event.date)}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            {label: "Miembros", value: members, color: "text-white"},
            {label: "Visitantes", value: guests, color: "text-amber-400"},
            {
              label: "Total",
              value: total,
              color: past ? "text-gray-300" : "text-emerald-400",
            },
          ].map(({label, value, color}) => (
            <div key={label} className="bg-slate-700/50 rounded-lg py-2">
              <p className={`text-lg font-bold ${color}`}>{value}</p>
              <p className="text-[10px] text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openDetail(event);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-slate-700 hover:bg-slate-600 text-gray-300 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            Ver detalles
          </button>
          {past ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                openAttendance(event);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors bg-slate-700 hover:bg-slate-600 text-gray-300"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Registrar
            </button>
          ) : (
            <span
              title={`Registro disponible a partir del ${fmtDateShort(event.date)} · ${fmtTime(event.date)}`}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium cursor-not-allowed
                ${
                  new Date(event.date).toDateString() ===
                  new Date().toDateString()
                    ? "bg-amber-500/10 text-amber-600/80 border border-amber-500/20"
                    : "bg-slate-700/40 text-gray-600"
                }`}
            >
              <Clock className="w-3.5 h-3.5" />
              {new Date(event.date).toDateString() === new Date().toDateString()
                ? `Hoy · ${fmtTime(event.date)}`
                : "Pendiente"}
            </span>
          )}
        </div>
      </div>
    );
  };

  const SectionList = ({events: evs, past}) => (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      {evs.map((e) => (
        <ListRow key={e.id} event={e} past={past} />
      ))}
    </div>
  );

  const SectionGrid = ({events: evs, past}) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {evs.map((e) => (
        <GridCard key={e.id} event={e} past={past} />
      ))}
    </div>
  );

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Asistencia</h1>
          <p className="text-gray-400 mt-1">
            Control de asistencia a servicios, eventos y oración
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800 border border-slate-700 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab("events")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "events"
              ? "bg-slate-700 text-white shadow"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Eventos
        </button>
        <button
          onClick={() => setActiveTab("prayer")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "prayer"
              ? "bg-slate-700 text-white shadow"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Flame className="w-4 h-4" />
          Días de Oración
        </button>
      </div>

      {/* ── Eventos tab ──────────────────────────────────────────────────── */}
      {activeTab === "events" && (
        <>
          {/* Filters + view toggle */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar evento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="ALL">Todos los tipos</option>
              <option value="CULTO">Cultos</option>
              <option value="REUNION">Reuniones</option>
              <option value="ESPECIAL">Eventos Especiales</option>
            </select>
            <div className="flex gap-1 bg-slate-800 border border-slate-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                  ${viewMode === "list" ? "bg-slate-700 text-white" : "text-gray-400 hover:text-white"}`}
              >
                <LayoutList className="w-4 h-4" />
                <span className="hidden sm:inline">Lista</span>
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                  ${viewMode === "grid" ? "bg-slate-700 text-white" : "text-gray-400 hover:text-white"}`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Cuadrícula</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="w-10 h-10 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-400">Cargando eventos...</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-20">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400">No se encontraron eventos</p>
            </div>
          ) : (
            <div className="space-y-8">
              {upcomingEvents.length > 0 && (
                <section>
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-emerald-400" />
                    Próximos — {upcomingEvents.length} evento
                    {upcomingEvents.length !== 1 ? "s" : ""}
                  </h2>
                  {viewMode === "list" ? (
                    <SectionList events={upcomingEvents} past={false} />
                  ) : (
                    <SectionGrid events={upcomingEvents} past={false} />
                  )}
                </section>
              )}
              {pastEvents.length > 0 && (
                <section>
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-gray-500" />
                    Pasados — {pastEvents.length} evento
                    {pastEvents.length !== 1 ? "s" : ""}
                  </h2>
                  {viewMode === "list" ? (
                    <SectionList events={pastEvents} past={true} />
                  ) : (
                    <SectionGrid events={pastEvents} past={true} />
                  )}
                </section>
              )}
            </div>
          )}

          <DetailModal
            event={detailEvent}
            open={detailOpen}
            onClose={() => setDetailOpen(false)}
            onEdit={(e) => {
              setDetailOpen(false);
              openAttendance(e);
            }}
          />
          <AttendanceModal
            event={attendanceEvent}
            open={attendanceOpen}
            onClose={() => setAttendanceOpen(false)}
            onSaved={fetchEvents}
          />
        </>
      )}

      {/* ── Oración tab ──────────────────────────────────────────────────── */}
      {activeTab === "prayer" && <PrayerSection />}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog";
import {
  CalendarDays, Plus, Search, Edit, Trash2, Calendar, Clock,
  AlertCircle, CheckCircle, Users, UserCheck, Check, ChevronRight,
  FileText, UserPlus, UsersRound, X, Minus,
} from "lucide-react";
import { eventsService, membersService } from "@/services/api";

// ─── Constants ────────────────────────────────────────────────────────────────
const TYPE_LABEL = { CULTO: "Culto", REUNION: "Reunión", ESPECIAL: "Evento Especial" };
const TYPE_COLOR = {
  CULTO:    { badge: "bg-blue-600/20 text-blue-400 border-blue-600/40",    dot: "bg-blue-400" },
  REUNION:  { badge: "bg-purple-600/20 text-purple-400 border-purple-600/40", dot: "bg-purple-400" },
  ESPECIAL: { badge: "bg-amber-600/20 text-amber-400 border-amber-600/40",  dot: "bg-amber-400" },
};

const fmtDateLong = (d) =>
  new Date(d).toLocaleDateString("es-ES", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
const fmtDateShort = (d) =>
  new Date(d).toLocaleDateString("es-ES", {
    day: "2-digit", month: "short", year: "numeric",
  });
const fmtTime = (d) =>
  new Date(d).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ event, open, onClose, onEdit, onDelete }) {
  if (!event) return null;
  const tc     = TYPE_COLOR[event.event_type] || TYPE_COLOR.CULTO;
  const isPast = new Date(event.date) < new Date();
  const members = parseInt(event.attendance_count) || 0;
  const guests  = parseInt(event.guest_count)      || 0;
  const total   = parseInt(event.total_count)      || members + guests;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-lg w-full">
        <DialogHeader>
          <DialogTitle className="text-white flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5
              ${isPast ? "bg-slate-700" : "bg-indigo-600/20"}`}>
              <CalendarDays className={`w-5 h-5 ${isPast ? "text-gray-400" : "text-indigo-400"}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2 flex-wrap">
                <span className="text-base leading-tight">{event.title}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs border shrink-0 ${tc.badge}`}>
                  {TYPE_LABEL[event.event_type]}
                </span>
              </div>
              <p className="text-gray-400 text-sm font-normal mt-1 capitalize">
                {fmtDateLong(event.date)} · {fmtTime(event.date)}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          {/* Description */}
          {event.description && (
            <div className="flex items-start gap-2.5 text-sm text-gray-400 bg-slate-700/40 rounded-xl px-4 py-3">
              <FileText className="w-4 h-4 shrink-0 mt-0.5 text-gray-500" />
              <p>{event.description}</p>
            </div>
          )}

          {/* Status row */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isPast ? "bg-slate-500" : tc.dot}`} />
            <span className={`text-sm ${isPast ? "text-gray-500" : "text-gray-300"}`}>
              {isPast ? "Evento realizado" : "Evento programado"}
            </span>
            {isPast && (
              <span className="ml-auto text-xs text-gray-500 bg-slate-700/50 px-2 py-0.5 rounded-full">
                Pasado
              </span>
            )}
          </div>

          {/* Attendance stats — only for past events */}
          {isPast && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: UserCheck,  label: "Miembros",   value: members, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
                { icon: UserPlus,   label: "Visitantes", value: guests,  color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20" },
                { icon: UsersRound, label: "Total",       value: total,   color: "text-white",       bg: "bg-slate-700/60 border-slate-600/50" },
              ].map(({ icon: Icon, label, value, color, bg }) => (
                <div key={label} className={`rounded-xl border p-3 text-center ${bg}`}>
                  <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 mt-5 pt-4 border-t border-slate-700">
          <button
            onClick={() => { onClose(); onDelete(event.id, event.title); }}
            className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors"
            title="Eliminar evento"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <Button variant="outline" onClick={() => { onClose(); onEdit(event); }}
            className="flex-1 border-slate-600 text-gray-300 hover:text-white hover:border-slate-500 gap-2">
            <Edit className="w-4 h-4" />
            Editar
          </Button>
          <Button onClick={onClose}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white">
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create / Edit Modal ──────────────────────────────────────────────────────
function EventFormModal({ open, isEditing, formData, formError, formSuccess, onChange, onSubmit, onClose }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-lg w-full">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-3">
            <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0
              ${isEditing ? "bg-blue-600/20" : "bg-indigo-600/20"}`}>
              <CalendarDays className={`w-5 h-5 ${isEditing ? "text-blue-400" : "text-indigo-400"}`} />
            </span>
            {isEditing ? "Editar Evento" : "Nuevo Evento"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 mt-2">
          {formError && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />{formError}
            </div>
          )}
          {formSuccess && (
            <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
              <CheckCircle className="w-4 h-4 shrink-0" />{formSuccess}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-300">Título *</label>
            <Input name="title" value={formData.title} onChange={onChange} required
              placeholder="Ej: Culto Dominical, Reunión de Jóvenes"
              className="bg-slate-700 border-slate-600 text-white" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Fecha y Hora *</label>
              <input type="datetime-local" name="date" value={formData.date}
                onChange={onChange} required
                className="w-full h-10 rounded-md border border-slate-600 bg-slate-700 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Tipo *</label>
              <select name="eventType" value={formData.eventType} onChange={onChange} required
                className="w-full h-10 rounded-md border border-slate-600 bg-slate-700 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-600">
                <option value="CULTO">Culto</option>
                <option value="REUNION">Reunión</option>
                <option value="ESPECIAL">Evento Especial</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-300">Descripción</label>
            <textarea name="description" value={formData.description} onChange={onChange}
              rows={3} placeholder="Detalles adicionales del evento..."
              className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none" />
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={!!formSuccess}
              className="flex-1 border-slate-600 text-gray-300 hover:text-white hover:border-slate-500">
              Cancelar
            </Button>
            <Button type="submit" disabled={!!formSuccess}
              className="flex-[2] bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white">
              {isEditing ? "Actualizar Evento" : "Crear Evento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Attendance Modal ─────────────────────────────────────────────────────────
function AttendanceModal({ event, open, onClose, onSaved }) {
  const [allMembers, setAllMembers]               = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [selectedMembers, setSelectedMembers]     = useState(new Set());
  const [memberSearch, setMemberSearch]           = useState("");
  const [guestCount, setGuestCount]               = useState(0);
  const [isSaving, setIsSaving]                   = useState(false);
  const [error, setError]                         = useState("");
  const [success, setSuccess]                     = useState("");
  const [loading, setLoading]                     = useState(false);

  useEffect(() => {
    if (!open || !event) return;
    setSelectedMembers(new Set());
    setMemberSearch("");
    setError("");
    setSuccess("");
    setGuestCount(0);
    setLoading(true);

    Promise.all([
      membersService.getAll({ limit: 1000, status: "ACTIVO" }),
      eventsService.getAttendance(event.id),
    ]).then(([membersData, attendanceData]) => {
      setAllMembers(membersData.members || []);
      const records = attendanceData.attendees || attendanceData.attendance || [];
      setAttendanceRecords(records);
      setSelectedMembers(new Set(records.map((a) => a.member_id)));
      setGuestCount(parseInt(event.guest_count) || 0);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [open, event]);

  const toggle = (id) => {
    const s = new Set(selectedMembers);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedMembers(s);
  };

  const handleSave = async () => {
    if (!event) return;
    setIsSaving(true); setError(""); setSuccess("");
    try {
      const existing = new Set(attendanceRecords.map((a) => a.member_id));
      const toAdd    = Array.from(selectedMembers).filter((id) => !existing.has(id));
      const toRemove = attendanceRecords.filter((r) => !selectedMembers.has(r.member_id));

      await Promise.all([
        ...(toAdd.length > 0 ? [eventsService.recordBulkAttendance(event.id, toAdd)] : []),
        ...toRemove.map((r) => eventsService.deleteAttendance(event.id, r.id).catch(() => {})),
        eventsService.updateGuestCount(event.id, guestCount),
      ]);

      setSuccess("Asistencia guardada exitosamente");
      onSaved();
      setTimeout(onClose, 1500);
    } catch (e) {
      setError(e.response?.data?.error || "Error al guardar asistencia");
    } finally {
      setIsSaving(false);
    }
  };

  const isPast = event ? new Date(event.date) < new Date() : false;
  const filtered = allMembers.filter((m) =>
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-xl w-full">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-emerald-600/20 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5 text-emerald-400" />
            </span>
            <div>
              <p className="leading-tight">{event?.title}</p>
              <p className="text-gray-400 text-sm font-normal mt-0.5 capitalize">
                {event && `${fmtDateLong(event.date)} · ${fmtTime(event.date)}`}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="mt-2 space-y-4">
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" />{error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
                <CheckCircle className="w-4 h-4 shrink-0" />{success}
              </div>
            )}

            {/* Guest count — solo eventos pasados */}
            {isPast && (
              <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                      <UserPlus className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold">Público general / Visitantes</p>
                      <p className="text-gray-400 text-xs">Sin registro previo (libre entrada)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button" onClick={() => setGuestCount((v) => Math.max(0, v - 1))}
                      className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 border border-slate-600 flex items-center justify-center text-white transition-colors">
                      <Minus className="w-4 h-4" />
                    </button>
                    <input type="number" min="0" value={guestCount}
                      onChange={(e) => setGuestCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-16 text-center bg-slate-700 border border-slate-600 text-white text-lg font-bold rounded-lg py-1.5 focus:outline-none focus:border-amber-500" />
                    <button type="button" onClick={() => setGuestCount((v) => v + 1)}
                      className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 border border-slate-600 flex items-center justify-center text-white transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Members */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  Miembros registrados
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedMembers(new Set(allMembers.map((m) => m.id)))}
                    className="text-xs text-gray-400 hover:text-white border border-slate-600 hover:border-slate-500 rounded px-2 py-1 transition-colors">
                    Todos
                  </button>
                  <button onClick={() => setSelectedMembers(new Set())}
                    className="text-xs text-gray-400 hover:text-white border border-slate-600 hover:border-slate-500 rounded px-2 py-1 transition-colors">
                    Ninguno
                  </button>
                </div>
              </div>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Buscar miembro..." value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white" />
              </div>
              <div className="max-h-52 overflow-y-auto space-y-1 rounded-xl bg-slate-700/40 p-2">
                {filtered.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-5">Sin resultados</p>
                ) : filtered.map((m) => (
                  <label key={m.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors
                      ${selectedMembers.has(m.id)
                        ? "bg-emerald-600/15 border border-emerald-500/30"
                        : "hover:bg-slate-700 border border-transparent"}`}>
                    <input type="checkbox" checked={selectedMembers.has(m.id)}
                      onChange={() => toggle(m.id)}
                      className="h-4 w-4 rounded border-slate-500 accent-emerald-500" />
                    <span className="flex-1 text-sm text-white">{m.first_name} {m.last_name}</span>
                    {selectedMembers.has(m.id) && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                  </label>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span className="text-gray-400">Miembros: <strong className="text-white">{selectedMembers.size}</strong></span>
              {isPast && <span className="text-gray-400">Visitantes: <strong className="text-amber-400">{guestCount}</strong></span>}
              <span className="text-gray-400">Total: <strong className="text-emerald-400 text-base">{selectedMembers.size + (isPast ? guestCount : 0)}</strong></span>
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <Button variant="outline" onClick={onClose} disabled={isSaving}
            className="flex-1 border-slate-600 text-gray-300 hover:text-white hover:border-slate-500">
            Cancelar
          </Button>
          {isPast ? (
            <Button onClick={handleSave} disabled={isSaving || !!success || loading}
              className="flex-[2] bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white">
              {isSaving
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />Guardando...</>
                : "Guardar Asistencia"}
            </Button>
          ) : (
            <Button disabled className="flex-[2] bg-slate-700 text-gray-500 cursor-not-allowed gap-2">
              <Clock className="w-4 h-4" />
              Evento aún no realizado
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── List Row ─────────────────────────────────────────────────────────────────
function EventRow({ event, past, onDetail, onEdit, onDelete, onAttendance }) {
  const tc      = TYPE_COLOR[event.event_type] || TYPE_COLOR.CULTO;
  const members = parseInt(event.attendance_count) || 0;
  const guests  = parseInt(event.guest_count)      || 0;
  const total   = parseInt(event.total_count)      || members + guests;

  return (
    <div
      onClick={() => onDetail(event)}
      className="flex items-center gap-4 px-4 py-3 border-b border-slate-700/50 last:border-0 hover:bg-slate-700/30 transition-colors cursor-pointer group"
    >
      {/* Dot */}
      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${past ? "bg-slate-600" : tc.dot}`} />

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-semibold ${past ? "text-gray-400" : "text-white"}`}>
            {event.title}
          </span>
          <span className={`px-1.5 py-0.5 rounded text-[11px] border ${tc.badge}`}>
            {TYPE_LABEL[event.event_type]}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5 capitalize">
          {fmtDateShort(event.date)} · {fmtTime(event.date)}
        </p>
      </div>

      {/* Attendance (past events) */}
      {past ? (
        <div className="hidden sm:flex items-center gap-4 shrink-0 text-sm">
          <div className="text-center">
            <p className="text-gray-500 text-xs">Miembros</p>
            <p className="text-white font-semibold">{members}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-500 text-xs">Visitantes</p>
            <p className="text-amber-400 font-semibold">{guests}</p>
          </div>
          <div className="text-center min-w-[44px]">
            <p className="text-gray-500 text-xs">Total</p>
            <p className="text-gray-300 font-bold text-base">{total}</p>
          </div>
        </div>
      ) : (
        <div className="hidden sm:block shrink-0">
          <span className="px-2 py-1 rounded-full text-xs bg-indigo-600/10 text-indigo-400 border border-indigo-600/20">
            Programado
          </span>
        </div>
      )}

      {/* Mobile total */}
      {past && (
        <div className="sm:hidden shrink-0 text-right">
          <p className="text-xs text-gray-500">Total</p>
          <p className="font-bold text-gray-300">{total}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        <div className="hidden group-hover:flex items-center gap-1">
          {past && (
            <button onClick={() => onAttendance(event)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
              title="Registrar asistencia">
              <UserCheck className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Asistencia</span>
            </button>
          )}
          <button onClick={() => onEdit(event)}
            className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors" title="Editar">
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(event.id, event.title)}
            className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors" title="Eliminar">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EventsPage() {
  const [events, setEvents]               = useState([]);
  const [loading, setLoading]             = useState(false);
  const [searchTerm, setSearchTerm]       = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("ALL");

  // Detail modal
  const [detailEvent, setDetailEvent]     = useState(null);
  const [detailOpen, setDetailOpen]       = useState(false);

  // Create / Edit modal
  const [formOpen, setFormOpen]           = useState(false);
  const [isEditing, setIsEditing]         = useState(false);
  const [currentEvent, setCurrentEvent]   = useState(null);
  const [formData, setFormData]           = useState({ title: "", date: "", eventType: "CULTO", description: "" });
  const [formError, setFormError]         = useState("");
  const [formSuccess, setFormSuccess]     = useState("");

  // Attendance modal
  const [attendanceEvent, setAttendanceEvent] = useState(null);
  const [attendanceOpen, setAttendanceOpen]   = useState(false);

  useEffect(() => { fetchEvents(); }, [eventTypeFilter]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params = { limit: 200 };
      if (eventTypeFilter !== "ALL") params.eventType = eventTypeFilter;
      const data = await eventsService.getAll(params);
      setEvents(data.events || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setIsEditing(false);
    setCurrentEvent(null);
    setFormData({ title: "", date: "", eventType: "CULTO", description: "" });
    setFormError(""); setFormSuccess("");
    setFormOpen(true);
  };

  const openEdit = (event) => {
    setIsEditing(true);
    setCurrentEvent(event);
    const dateObj = new Date(event.date);
    setFormData({
      title: event.title || "",
      date: dateObj.toISOString().slice(0, 16),
      eventType: event.event_type || "CULTO",
      description: event.description || "",
    });
    setFormError(""); setFormSuccess("");
    setFormOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError(""); setFormSuccess("");
    try {
      const payload = {
        title: formData.title,
        date: formData.date,
        eventType: formData.eventType,
        description: formData.description || null,
      };
      if (isEditing && currentEvent) {
        await eventsService.update(currentEvent.id, payload);
        setFormSuccess("Evento actualizado exitosamente");
      } else {
        await eventsService.create(payload);
        setFormSuccess("Evento creado exitosamente");
      }
      setTimeout(() => { setFormOpen(false); fetchEvents(); }, 1500);
    } catch (error) {
      setFormError(error.response?.data?.error || "Error al guardar el evento");
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`¿Eliminar el evento "${title}"?\nEsta acción eliminará toda la asistencia registrada.`)) return;
    try {
      await eventsService.delete(id);
      fetchEvents();
    } catch (error) {
      alert(error.response?.data?.error || "Error al eliminar el evento");
    }
  };

  const openDetail = (event) => { setDetailEvent(event); setDetailOpen(true); };
  const openAttendance = (event) => { setAttendanceEvent(event); setAttendanceOpen(true); };

  const filteredEvents = events.filter((e) =>
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );
  const now           = new Date();
  const upcomingEvents = filteredEvents.filter((e) => new Date(e.date) >= now);
  const pastEvents     = filteredEvents.filter((e) => new Date(e.date) < now);

  // Summary stats
  const totalEvents    = events.length;
  const totalAttended  = events.reduce((s, e) => s + (parseInt(e.total_count) || 0), 0);
  const upcoming       = upcomingEvents.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Eventos</h1>
          <p className="text-gray-400 mt-1">Programación y gestión de eventos de la iglesia</p>
        </div>
        <Button onClick={openCreate}
          className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg gap-2">
          <Plus className="h-5 w-5" />
          Nuevo Evento
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total eventos",    value: totalEvents,   color: "text-white",        icon: CalendarDays, bg: "bg-slate-800 border-slate-700" },
          { label: "Próximos",         value: upcoming,      color: "text-indigo-400",   icon: Clock,        bg: "bg-indigo-600/5 border-indigo-600/20" },
          { label: "Asistentes total", value: totalAttended, color: "text-emerald-400",  icon: Users,        bg: "bg-emerald-600/5 border-emerald-600/20" },
        ].map(({ label, value, color, icon: Icon, bg }) => (
          <div key={label} className={`rounded-xl border p-4 ${bg}`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-4 h-4 ${color}`} />
              <p className="text-xs text-gray-500">{label}</p>
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Buscar evento..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-700 text-white" />
        </div>
        <select value={eventTypeFilter} onChange={(e) => setEventTypeFilter(e.target.value)}
          className="h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-600">
          <option value="ALL">Todos los tipos</option>
          <option value="CULTO">Cultos</option>
          <option value="REUNION">Reuniones</option>
          <option value="ESPECIAL">Eventos Especiales</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400">Cargando eventos...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-20">
          <CalendarDays className="h-12 w-12 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400">No se encontraron eventos</p>
        </div>
      ) : (
        <div className="space-y-8">
          {upcomingEvents.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-400" />
                Próximos — {upcomingEvents.length} evento{upcomingEvents.length !== 1 ? "s" : ""}
              </h2>
              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                {upcomingEvents.map((e) => (
                  <EventRow key={e.id} event={e} past={false}
                    onDetail={openDetail} onEdit={openEdit} onDelete={handleDelete} onAttendance={openAttendance} />
                ))}
              </div>
            </section>
          )}

          {pastEvents.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-gray-500" />
                Pasados — {pastEvents.length} evento{pastEvents.length !== 1 ? "s" : ""}
              </h2>
              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                {pastEvents.map((e) => (
                  <EventRow key={e.id} event={e} past={true}
                    onDetail={openDetail} onEdit={openEdit} onDelete={handleDelete} onAttendance={openAttendance} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Detail Modal */}
      <DetailModal
        event={detailEvent}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onEdit={(e) => { setDetailOpen(false); openEdit(e); }}
        onDelete={(id, title) => { setDetailOpen(false); handleDelete(id, title); }}
      />

      {/* Create / Edit Modal */}
      <EventFormModal
        open={formOpen}
        isEditing={isEditing}
        formData={formData}
        formError={formError}
        formSuccess={formSuccess}
        onChange={handleFormChange}
        onSubmit={handleFormSubmit}
        onClose={() => setFormOpen(false)}
      />

      {/* Attendance Modal */}
      <AttendanceModal
        event={attendanceEvent}
        open={attendanceOpen}
        onClose={() => setAttendanceOpen(false)}
        onSaved={fetchEvents}
      />
    </div>
  );
}

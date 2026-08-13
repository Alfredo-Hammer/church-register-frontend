import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import {
  Wine, Plus, Search, Edit, Trash2, ChevronRight, CheckCircle,
  Clock, Users, UserCheck, UserPlus, UsersRound, AlertCircle,
  Check, Minus, FileText, CalendarDays, X, ChevronLeft,
} from "lucide-react";
import { communionService, membersService } from "@/services/api";

// ─── Constants ────────────────────────────────────────────────────────────────
const TYPE_LABEL = {
  REGULAR:     "Regular",
  ESPECIAL:    "Especial",
  ANIVERSARIO: "Aniversario",
};
const TYPE_COLOR = {
  REGULAR:     "bg-red-600/20 text-red-700 dark:text-red-400 border-red-600/40",
  ESPECIAL:    "bg-amber-600/20 text-amber-700 dark:text-amber-400 border-amber-600/40",
  ANIVERSARIO: "bg-purple-600/20 text-purple-700 dark:text-purple-400 border-purple-600/40",
};

const fmtDateLong = (d) =>
  new Date(d.slice(0, 10) + "T12:00:00").toLocaleDateString("es-ES", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
const fmtDateShort = (d) =>
  new Date(d.slice(0, 10) + "T12:00:00").toLocaleDateString("es-ES", {
    day: "2-digit", month: "short", year: "numeric",
  });
const fmtTime = (t) => t ? t.slice(0, 5) : null;

const isPast = (date) => new Date(date.slice(0, 10) + "T23:59:59") < new Date();

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ communion, open, onClose, onEdit, onDelete, onRecord }) {
  if (!communion) return null;
  const members  = parseInt(communion.participant_count) || 0;
  const guests   = parseInt(communion.guest_count)       || 0;
  const total    = parseInt(communion.total_count)       || members + guests;
  const past     = isPast(communion.date);
  const tc       = TYPE_COLOR[communion.type] || TYPE_COLOR.REGULAR;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-lg w-full">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5
              ${past ? "bg-background" : "bg-red-600/20"}`}>
              <Wine className={`w-5 h-5 ${past ? "text-muted-foreground" : "text-red-700 dark:text-red-400"}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base">Santa Cena</span>
                <span className={`px-2 py-0.5 rounded-full text-xs border shrink-0 ${tc}`}>
                  {TYPE_LABEL[communion.type]}
                </span>
              </div>
              <p className="text-muted-foreground text-sm font-normal mt-1 capitalize">
                {fmtDateLong(communion.date)}
                {communion.time && ` · ${fmtTime(communion.time)}`}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          {communion.notes && (
            <div className="flex items-start gap-2.5 text-sm text-muted-foreground bg-muted/50 rounded-xl px-4 py-3">
              <FileText className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
              <p>{communion.notes}</p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: UserCheck,  label: "Miembros",   value: members, color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
              { icon: UserPlus,   label: "Visitantes", value: guests,  color: "text-amber-700 dark:text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20" },
              { icon: UsersRound, label: "Total",      value: total,   color: "text-foreground",       bg: "bg-muted/50 border-border" },
            ].map(({ icon: Icon, label, value, color, bg }) => (
              <div key={label} className={`rounded-xl border p-3 text-center ${bg}`}>
                <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mt-5 pt-4 border-t border-border">
          <button onClick={() => { onClose(); onDelete(communion); }}
            className="p-2 rounded-lg text-red-700 dark:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors"
            title="Eliminar">
            <Trash2 className="w-4 h-4" />
          </button>
          <Button variant="outline" onClick={() => { onClose(); onEdit(communion); }}
            className="flex-1 border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 gap-2">
            <Edit className="w-4 h-4" /> Editar
          </Button>
          {past ? (
            <Button onClick={() => { onClose(); onRecord(communion); }}
              className="flex-[2] bg-gradient-to-r from-red-700 to-rose-700 hover:from-red-800 hover:to-rose-800 text-white gap-2">
              <UserCheck className="w-4 h-4" /> Registrar participantes
            </Button>
          ) : (
            <Button disabled className="flex-[2] bg-background text-muted-foreground cursor-not-allowed gap-2">
              <Clock className="w-4 h-4" /> Aún no realizado
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Form Modal ───────────────────────────────────────────────────────────────
function FormModal({ open, isEditing, form, error, success, onChange, onSubmit, onClose }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-md w-full">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-3">
            <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0
              ${isEditing ? "bg-blue-600/20" : "bg-red-600/20"}`}>
              <Wine className={`w-5 h-5 ${isEditing ? "text-blue-700 dark:text-blue-400" : "text-red-700 dark:text-red-400"}`} />
            </span>
            {isEditing ? "Editar Santa Cena" : "Nueva Santa Cena"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 mt-2">
          {error && (
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
              <CheckCircle className="w-4 h-4 shrink-0" />{success}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Fecha *</label>
              <Input type="date" name="date" value={form.date} onChange={onChange} required
                className="bg-background border-border text-foreground" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Hora</label>
              <Input type="time" name="time" value={form.time} onChange={onChange}
                className="bg-background border-border text-foreground" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Tipo</label>
            <select name="type" value={form.type} onChange={onChange}
              className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-600">
              <option value="REGULAR">Regular</option>
              <option value="ESPECIAL">Especial</option>
              <option value="ANIVERSARIO">Aniversario</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Notas</label>
            <textarea name="notes" value={form.notes} onChange={onChange} rows={2}
              placeholder="Tema, pasaje bíblico, observaciones..."
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-red-600 resize-none" />
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={!!success}
              className="flex-1 border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40">
              Cancelar
            </Button>
            <Button type="submit" disabled={!!success}
              className="flex-[2] bg-gradient-to-r from-red-700 to-rose-700 hover:from-red-800 hover:to-rose-800 text-white">
              {isEditing ? "Guardar Cambios" : "Crear Registro"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Participants Modal ────────────────────────────────────────────────────────
function ParticipantsModal({ communion, open, onClose, onSaved }) {
  const [allMembers, setAllMembers]           = useState([]);
  const [prevParticipants, setPrevParticipants] = useState([]);
  const [selected, setSelected]               = useState(new Set());
  const [search, setSearch]                   = useState("");
  const [guestCount, setGuestCount]           = useState(0);
  const [loading, setLoading]                 = useState(false);
  const [saving, setSaving]                   = useState(false);
  const [error, setError]                     = useState("");
  const [success, setSuccess]                 = useState("");

  useEffect(() => {
    if (!open || !communion) return;
    setSearch(""); setError(""); setSuccess(""); setGuestCount(0);
    setSelected(new Set());
    setLoading(true);
    Promise.all([
      membersService.getAll({ limit: 1000, status: "ACTIVO" }),
      communionService.getById(communion.id),
    ]).then(([membData, commData]) => {
      setAllMembers(membData.members || []);
      const parts = commData.participants || [];
      setPrevParticipants(parts);
      setSelected(new Set(parts.map((p) => p.member_id)));
      setGuestCount(parseInt(communion.guest_count) || 0);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [open, communion]);

  const toggle = (id) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const handleSave = async () => {
    if (!communion) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      const existing  = new Set(prevParticipants.map((p) => p.member_id));
      const toAdd     = Array.from(selected).filter((id) => !existing.has(id));
      const toRemove  = prevParticipants.filter((p) => !selected.has(p.member_id));

      await Promise.all([
        ...(toAdd.length ? [communionService.addBulkParticipants(communion.id, toAdd)] : []),
        ...toRemove.map((p) => communionService.removeParticipant(communion.id, p.id).catch(() => {})),
        communionService.updateGuestCount(communion.id, guestCount),
      ]);

      setSuccess("Participantes guardados exitosamente");
      onSaved();
      setTimeout(onClose, 1500);
    } catch (e) {
      setError(e.response?.data?.error || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const filtered = allMembers.filter((m) =>
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-xl w-full">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-red-600/20 flex items-center justify-center shrink-0">
              <Wine className="w-5 h-5 text-red-700 dark:text-red-400" />
            </span>
            <div>
              <p className="leading-tight">Participantes — Santa Cena</p>
              <p className="text-muted-foreground text-sm font-normal mt-0.5 capitalize">
                {communion && fmtDateLong(communion.date)}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="mt-2 space-y-4">
            {error && (
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" />{error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
                <CheckCircle className="w-4 h-4 shrink-0" />{success}
              </div>
            )}

            {/* Guest count */}
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                    <UserPlus className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-foreground text-sm font-semibold">Visitantes / Público general</p>
                    <p className="text-muted-foreground text-xs">No registrados en el sistema</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button type="button" onClick={() => setGuestCount((v) => Math.max(0, v - 1))}
                    className="w-8 h-8 rounded-lg bg-background hover:bg-accent border border-border flex items-center justify-center text-foreground transition-colors">
                    <Minus className="w-4 h-4" />
                  </button>
                  <input type="number" min="0" value={guestCount}
                    onChange={(e) => setGuestCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-16 text-center bg-background border border-border text-foreground text-lg font-bold rounded-lg py-1.5 focus:outline-none focus:border-amber-500" />
                  <button type="button" onClick={() => setGuestCount((v) => v + 1)}
                    className="w-8 h-8 rounded-lg bg-background hover:bg-accent border border-border flex items-center justify-center text-foreground transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Members */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" /> Miembros
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setSelected(new Set(allMembers.map((m) => m.id)))}
                    className="text-xs text-muted-foreground hover:text-foreground border border-border hover:border-muted-foreground/40 rounded px-2 py-1 transition-colors">
                    Todos
                  </button>
                  <button onClick={() => setSelected(new Set())}
                    className="text-xs text-muted-foreground hover:text-foreground border border-border hover:border-muted-foreground/40 rounded px-2 py-1 transition-colors">
                    Ninguno
                  </button>
                </div>
              </div>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar miembro..." value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-background border-border text-foreground" />
              </div>
              <div className="max-h-52 overflow-y-auto space-y-1 rounded-xl bg-muted/50 p-2">
                {filtered.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-5">Sin resultados</p>
                ) : filtered.map((m) => (
                  <label key={m.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors
                      ${selected.has(m.id)
                        ? "bg-red-600/15 border border-red-500/30"
                        : "hover:bg-accent border border-transparent"}`}>
                    <input type="checkbox" checked={selected.has(m.id)}
                      onChange={() => toggle(m.id)}
                      className="h-4 w-4 rounded border-border accent-red-600" />
                    <span className="flex-1 text-sm text-foreground">{m.first_name} {m.last_name}</span>
                    {selected.has(m.id) && <Check className="w-4 h-4 text-red-700 dark:text-red-400 shrink-0" />}
                  </label>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-muted/50 border border-border rounded-xl px-4 py-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span className="text-muted-foreground">Miembros: <strong className="text-foreground">{selected.size}</strong></span>
              <span className="text-muted-foreground">Visitantes: <strong className="text-amber-700 dark:text-amber-400">{guestCount}</strong></span>
              <span className="text-muted-foreground">Total: <strong className="text-red-700 dark:text-red-400 text-base">{selected.size + guestCount}</strong></span>
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}
            className="flex-1 border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !!success || loading}
            className="flex-[2] bg-gradient-to-r from-red-700 to-rose-700 hover:from-red-800 hover:to-rose-800 text-white">
            {saving
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />Guardando...</>
              : "Guardar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── List Row ─────────────────────────────────────────────────────────────────
function CommunionRow({ communion: c, onDetail, onEdit, onDelete, onRecord }) {
  const members = parseInt(c.participant_count) || 0;
  const guests  = parseInt(c.guest_count)       || 0;
  const total   = parseInt(c.total_count)       || members + guests;
  const past    = isPast(c.date);
  const tc      = TYPE_COLOR[c.type] || TYPE_COLOR.REGULAR;

  return (
    <div onClick={() => onDetail(c)}
      className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors cursor-pointer group">
      {/* Icon */}
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0
        ${past ? "bg-background" : "bg-red-600/20"}`}>
        <Wine className={`w-4 h-4 ${past ? "text-muted-foreground" : "text-red-700 dark:text-red-400"}`} />
      </div>

      {/* Date + type */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-semibold ${past ? "text-muted-foreground" : "text-foreground"}`}>
            Santa Cena
          </span>
          <span className={`px-1.5 py-0.5 rounded text-[11px] border ${tc}`}>
            {TYPE_LABEL[c.type]}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 capitalize">
          {fmtDateShort(c.date)}{c.time ? ` · ${fmtTime(c.time)}` : ""}
        </p>
      </div>

      {/* Stats */}
      <div className="hidden sm:flex items-center gap-4 shrink-0 text-sm">
        <div className="text-center">
          <p className="text-muted-foreground text-xs">Miembros</p>
          <p className="text-foreground font-semibold">{members}</p>
        </div>
        <div className="text-center">
          <p className="text-muted-foreground text-xs">Visitantes</p>
          <p className="text-amber-700 dark:text-amber-400 font-semibold">{guests}</p>
        </div>
        <div className="text-center min-w-[44px]">
          <p className="text-muted-foreground text-xs">Total</p>
          <p className={`font-bold text-base ${past ? "text-muted-foreground" : "text-red-700 dark:text-red-400"}`}>{total}</p>
        </div>
      </div>

      {/* Mobile total */}
      <div className="sm:hidden shrink-0 text-right">
        <p className="text-xs text-muted-foreground">Total</p>
        <p className={`font-bold ${past ? "text-muted-foreground" : "text-red-700 dark:text-red-400"}`}>{total}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        <div className="hidden group-hover:flex items-center gap-1">
          {past && (
            <button onClick={() => onRecord(c)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-red-700 hover:bg-red-800 text-white transition-colors">
              <UserCheck className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Participantes</span>
            </button>
          )}
          <button onClick={() => onEdit(c)}
            className="p-1.5 rounded-lg text-blue-700 dark:text-blue-400 hover:bg-blue-500/10 transition-colors">
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(c)}
            className="p-1.5 rounded-lg text-red-700 dark:text-red-400 hover:bg-red-500/10 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const emptyForm = { date: "", time: "", type: "REGULAR", notes: "" };

export default function CommunionPage() {
  const [records, setRecords]   = useState([]);
  const [stats, setStats]       = useState({});
  const [loading, setLoading]   = useState(false);
  const [search, setSearch]     = useState("");
  const [pagination, setPagination] = useState({total: 0, limit: 20, offset: 0});

  // Detail
  const [detailItem, setDetailItem] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Form
  const [formOpen, setFormOpen]     = useState(false);
  const [isEditing, setIsEditing]   = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm]             = useState(emptyForm);
  const [formError, setFormError]   = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Participants
  const [recordItem, setRecordItem] = useState(null);
  const [recordOpen, setRecordOpen] = useState(false);

  useEffect(() => { fetchAll(); }, [pagination.offset]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPagination((prev) => ({...prev, offset: 0}));
      fetchAll();
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const params = {limit: pagination.limit, offset: pagination.offset};
      if (search.trim()) params.search = search.trim();
      const [listData, statsData] = await Promise.all([
        communionService.getAll(params),
        communionService.getStats(),
      ]);
      setRecords(listData.communion || []);
      setPagination((prev) => ({...prev, total: listData.total || 0}));
      setStats(statsData.stats || {});
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setIsEditing(false);
    setEditTarget(null);
    setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 10) });
    setFormError(""); setFormSuccess("");
    setFormOpen(true);
  };

  const openEdit = (item) => {
    setIsEditing(true);
    setEditTarget(item);
    setForm({
      date:  item.date ? item.date.slice(0, 10) : "",
      time:  item.time ? item.time.slice(0, 5)  : "",
      type:  item.type  || "REGULAR",
      notes: item.notes || "",
    });
    setFormError(""); setFormSuccess("");
    setFormOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError(""); setFormSuccess("");
    try {
      const payload = {
        date:  form.date,
        time:  form.time || undefined,
        type:  form.type,
        notes: form.notes || undefined,
      };
      if (isEditing && editTarget) {
        await communionService.update(editTarget.id, payload);
        setFormSuccess("Registro actualizado");
      } else {
        await communionService.create(payload);
        setFormSuccess("Registro creado");
      }
      setTimeout(() => { setFormOpen(false); fetchAll(); }, 1200);
    } catch (err) {
      setFormError(err.response?.data?.error || "Error al guardar");
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`¿Eliminar el registro de Santa Cena del ${fmtDateShort(item.date)}?\nSe perderán todos los participantes registrados.`)) return;
    try {
      await communionService.delete(item.id);
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.error || "Error al eliminar");
    }
  };

  const openDetail  = (item) => { setDetailItem(item); setDetailOpen(true); };
  const openRecord  = (item) => { setRecordItem(item); setRecordOpen(true); };

  // El filtro de búsqueda ya se aplica en el backend (ver fetchAll).
  const filtered    = records;
  const now         = new Date();
  const upcoming    = filtered.filter((r) => !isPast(r.date));
  const past        = filtered.filter((r) => isPast(r.date));
  const totalPages  = Math.ceil(pagination.total / pagination.limit);
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
  const goPage      = (p) => setPagination((prev) => ({...prev, offset: (p - 1) * prev.limit}));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-red-700 to-rose-800 rounded-xl flex items-center justify-center shadow-lg shadow-red-900/30">
            <Wine className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Santa Cena</h1>
            <p className="text-sm text-muted-foreground">Registro de participantes en la comunión</p>
          </div>
        </div>
        <Button onClick={openCreate}
          className="bg-gradient-to-r from-red-700 to-rose-700 hover:from-red-800 hover:to-rose-800 text-white shadow-lg gap-2">
          <Plus className="h-5 w-5" /> Nuevo Registro
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total servicios",   value: stats.total_services        || 0, color: "text-foreground",      icon: Wine,        bg: "bg-card border-border" },
          { label: "Próximos",          value: upcoming.length,             color: "text-red-700 dark:text-red-400",        icon: Clock,       bg: "bg-red-600/5 border-red-600/20" },
          { label: "Total participantes", value: stats.total_participants  || 0, color: "text-emerald-700 dark:text-emerald-400", icon: Users,       bg: "bg-emerald-600/5 border-emerald-600/20" },
          { label: "Promedio por servicio", value: parseFloat(stats.avg_participants || 0).toFixed(0), color: "text-amber-700 dark:text-amber-400", icon: UsersRound, bg: "bg-amber-600/5 border-amber-600/20" },
        ].map(({ label, value, color, icon: Icon, bg }) => (
          <div key={label} className={`rounded-xl border p-4 ${bg}`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-4 h-4 ${color}`} />
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por tipo, fecha o notas..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card border-border text-foreground" />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground">Cargando registros...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-xl">
          <div className="w-16 h-16 rounded-2xl bg-red-600/10 border border-red-600/20 flex items-center justify-center mx-auto mb-4">
            <Wine className="w-8 h-8 text-red-500/40" />
          </div>
          <p className="text-foreground font-medium">No hay registros de Santa Cena</p>
          <p className="text-muted-foreground text-sm mt-1 mb-5">Registra la primera celebración de la comunión</p>
          <Button onClick={openCreate}
            className="bg-gradient-to-r from-red-700 to-rose-700 hover:from-red-800 hover:to-rose-800 text-white gap-2">
            <Plus className="w-4 h-4" /> Nuevo Registro
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-red-700 dark:text-red-400" />
                Próximos — {upcoming.length} registro{upcoming.length !== 1 ? "s" : ""}
              </h2>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                {upcoming.map((r) => (
                  <CommunionRow key={r.id} communion={r}
                    onDetail={openDetail} onEdit={openEdit} onDelete={handleDelete} onRecord={openRecord} />
                ))}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                Realizados — {past.length} registro{past.length !== 1 ? "s" : ""}
              </h2>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                {past.map((r) => (
                  <CommunionRow key={r.id} communion={r}
                    onDetail={openDetail} onEdit={openEdit} onDelete={handleDelete} onRecord={openRecord} />
                ))}
              </div>
            </section>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-card border border-border rounded-xl">
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

      {/* Detail */}
      <DetailModal communion={detailItem} open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onEdit={(c) => { setDetailOpen(false); openEdit(c); }}
        onDelete={(c) => { setDetailOpen(false); handleDelete(c); }}
        onRecord={(c) => { setDetailOpen(false); openRecord(c); }} />

      {/* Form */}
      <FormModal open={formOpen} isEditing={isEditing} form={form}
        error={formError} success={formSuccess}
        onChange={handleFormChange} onSubmit={handleFormSubmit}
        onClose={() => setFormOpen(false)} />

      {/* Participants */}
      <ParticipantsModal communion={recordItem} open={recordOpen}
        onClose={() => setRecordOpen(false)} onSaved={fetchAll} />
    </div>
  );
}

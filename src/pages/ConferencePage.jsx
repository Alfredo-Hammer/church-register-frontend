import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { conferenceService } from "@/services/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogFooter } from "@/components/ui/Dialog";
import {
  BookOpen, Plus, CalendarDays, Users, MapPin,
  ChevronRight, Pencil, Trash2, Loader2, CheckCircle2,
  Clock, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS = {
  ACTIVO:     { label: "Activa",     color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  FINALIZADO: { label: "Finalizada", color: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
  CANCELADO:  { label: "Cancelada",  color: "bg-red-500/15 text-red-400 border-red-500/30" },
};

const STATUS_ICONS = { ACTIVO: CheckCircle2, FINALIZADO: Clock, CANCELADO: XCircle };

function formatDateRange(start, end) {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end   + 'T00:00:00');
  const opts = { day: 'numeric', month: 'short', year: 'numeric' };
  if (start === end) return s.toLocaleDateString('es', opts);
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear())
    return `${s.getDate()} – ${e.toLocaleDateString('es', opts)}`;
  return `${s.toLocaleDateString('es', { day: 'numeric', month: 'short' })} – ${e.toLocaleDateString('es', opts)}`;
}

const EMPTY_FORM = { name: "", theme: "", themeVerse: "", location: "", startDate: "", endDate: "" };

// ── Página ────────────────────────────────────────────────────────────────────

export default function ConferencePage() {
  const navigate = useNavigate();
  const [conferences, setConferences] = useState([]);
  const [loading, setLoading]         = useState(true);

  const [dialogOpen, setDialogOpen]   = useState(false);
  const [editing, setEditing]         = useState(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [saving, setSaving]           = useState(false);
  const [formError, setFormError]     = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const data = await conferenceService.getAll();
      setConferences(data.conferences);
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setDialogOpen(true);
  };

  const openEdit = (e, conf) => {
    e.stopPropagation();
    setEditing(conf);
    setForm({
      name:       conf.name,
      theme:      conf.theme || "",
      themeVerse: conf.theme_verse || "",
      location:   conf.location || "",
      startDate:  conf.start_date?.split('T')[0] || "",
      endDate:    conf.end_date?.split('T')[0]   || "",
    });
    setFormError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim())      return setFormError("El nombre es obligatorio.");
    if (!form.startDate)        return setFormError("La fecha de inicio es obligatoria.");
    if (!form.endDate)          return setFormError("La fecha de fin es obligatoria.");
    if (form.endDate < form.startDate) return setFormError("La fecha de fin debe ser posterior al inicio.");

    setSaving(true);
    setFormError("");
    try {
      if (editing) {
        await conferenceService.update(editing.id, {
          name: form.name, theme: form.theme,
          themeVerse: form.themeVerse, location: form.location,
        });
      } else {
        await conferenceService.create(form);
      }
      setDialogOpen(false);
      fetchAll();
    } catch (err) {
      setFormError(err.response?.data?.error || "Error al guardar.");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await conferenceService.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchAll();
    } catch { /* silent */ }
    setDeleting(false);
  };

  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={22} className="text-amber-400" />
            <h1 className="text-2xl font-bold text-white">Conferencias</h1>
          </div>
          <p className="text-slate-400 text-sm">Crea y gestiona tus conferencias con calendario dinámico</p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2">
          <Plus size={16} /> Nueva Conferencia
        </Button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-20 text-slate-500">
          <Loader2 size={32} className="animate-spin" />
        </div>
      ) : conferences.length === 0 ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-16 text-center">
          <BookOpen size={48} className="mx-auto mb-4 text-slate-600" />
          <p className="text-white font-semibold text-lg mb-1">Sin conferencias aún</p>
          <p className="text-slate-400 text-sm mb-6">Crea tu primera conferencia para comenzar a gestionar el programa y los asistentes</p>
          <Button onClick={openCreate} className="inline-flex items-center gap-2">
            <Plus size={16} /> Crear Conferencia
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {conferences.map((conf) => {
            const st = STATUS[conf.status] || STATUS.ACTIVO;
            const StIcon = STATUS_ICONS[conf.status] || CheckCircle2;
            return (
              <div
                key={conf.id}
                onClick={() => navigate(`/dashboard/conference/${conf.id}`)}
                className="bg-slate-800 rounded-xl border border-slate-700/50 p-5 cursor-pointer hover:border-slate-500 hover:bg-slate-750 transition-all group flex flex-col gap-4"
              >
                {/* Header card */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-white text-base leading-tight truncate group-hover:text-amber-300 transition-colors">
                      {conf.name}
                    </h2>
                    {conf.theme && (
                      <p className="text-slate-400 text-xs mt-0.5 italic truncate">{conf.theme}</p>
                    )}
                  </div>
                  <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border flex-shrink-0", st.color)}>
                    <StIcon size={10} /> {st.label}
                  </span>
                </div>

                {/* Info */}
                <div className="space-y-1.5 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <CalendarDays size={13} className="text-slate-500 flex-shrink-0" />
                    <span>{formatDateRange(conf.start_date, conf.end_date)}</span>
                  </div>
                  {conf.location && (
                    <div className="flex items-center gap-2">
                      <MapPin size={13} className="text-slate-500 flex-shrink-0" />
                      <span className="truncate">{conf.location}</span>
                    </div>
                  )}
                </div>

                {/* Stats + acciones */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                  <div className="flex gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <CalendarDays size={12} />
                      {conf.days_count} días
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen size={12} />
                      {conf.sessions_count} sesiones
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {conf.registrants_count} asistentes
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => openEdit(e, conf)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-600 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(conf); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                    <ChevronRight size={16} className="text-slate-500 ml-1" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <BookOpen size={18} className="text-amber-400" />
              {editing ? "Editar Conferencia" : "Nueva Conferencia"}
            </h2>
            {!editing && (
              <p className="text-slate-400 text-sm">
                Los días se generarán automáticamente según las fechas elegidas.
              </p>
            )}
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                Nombre <span className="text-red-400">*</span>
              </label>
              <Input placeholder="Ej. Conferencia Bíblica 2026"
                value={form.name}
                onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                Lema / Tema
              </label>
              <Input placeholder="Ej. La Voluntad de Dios en la Biblia"
                value={form.theme}
                onChange={(e) => setForm(p => ({ ...p, theme: e.target.value }))} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                Versículo del lema
              </label>
              <Input placeholder='Ej. 1 Juan 2:17 — "Y el mundo pasa…"'
                value={form.themeVerse}
                onChange={(e) => setForm(p => ({ ...p, themeVerse: e.target.value }))} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                <MapPin size={11} className="inline mr-1" />Lugar
              </label>
              <Input placeholder="Sarasota, Florida"
                value={form.location}
                onChange={(e) => setForm(p => ({ ...p, location: e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                  Fecha inicio <span className="text-red-400">*</span>
                </label>
                <Input type="date" value={form.startDate}
                  disabled={Boolean(editing)}
                  onChange={(e) => setForm(p => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                  Fecha fin <span className="text-red-400">*</span>
                </label>
                <Input type="date" value={form.endDate}
                  disabled={Boolean(editing)}
                  onChange={(e) => setForm(p => ({ ...p, endDate: e.target.value }))} />
              </div>
            </div>
            {editing && (
              <p className="text-xs text-slate-500 italic">
                Las fechas no se pueden cambiar. Para agregar días usa el botón "+ Agregar Día" en el detalle.
              </p>
            )}

            {formError && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                {formError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editing ? "Guardar Cambios" : "Crear Conferencia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog eliminar */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <h2 className="text-lg font-semibold text-white">Eliminar Conferencia</h2>
          </DialogHeader>
          <p className="text-slate-300 mt-2">
            ¿Eliminar <strong className="text-white">{deleteTarget?.name}</strong>? Se eliminarán todos los días, sesiones y registros asociados. Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancelar</Button>
            <Button onClick={handleDelete} disabled={deleting}
              className="bg-red-600 hover:bg-red-700 flex items-center gap-2">
              {deleting && <Loader2 size={14} className="animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import {useState, useEffect, useCallback} from "react";
import {useAuth} from "@/contexts/AuthContext";
import {prayerService} from "@/services/api";
import {Button} from "@/components/ui/Button";
import {Input} from "@/components/ui/Input";
import {
  Flame,
  Plus,
  Pencil,
  Trash2,
  Power,
  Clock,
  MapPin,
  User,
  X,
  AlertCircle,
  ChevronDown,
} from "lucide-react";

// ── Constantes ────────────────────────────────────────────────────────────────

const DAYS = [
  {value: 1, label: "Lunes", short: "Lun"},
  {value: 2, label: "Martes", short: "Mar"},
  {value: 3, label: "Miércoles", short: "Mié"},
  {value: 4, label: "Jueves", short: "Jue"},
  {value: 5, label: "Viernes", short: "Vie"},
  {value: 6, label: "Sábado", short: "Sáb"},
  {value: 0, label: "Domingo", short: "Dom"},
];

const TODAY_DOW = new Date().getDay(); // 0=Sun…6=Sat

const formatTime = (timeStr) => {
  if (!timeStr) return "";
  const [h, m] = timeStr.slice(0, 5).split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};

const EMPTY_FORM = {
  name: "",
  dayOfWeek: "",
  startTime: "",
  endTime: "",
  location: "",
  leader: "",
  description: "",
  isActive: true,
};

// ── Componente modal ──────────────────────────────────────────────────────────

function PrayerFormModal({initial, onClose, onSaved}) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((f) => ({...f, [k]: v}));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) return setError("El nombre es obligatorio.");
    if (form.dayOfWeek === "")
      return setError("Selecciona un día de la semana.");
    if (!form.startTime) return setError("La hora de inicio es obligatoria.");

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        dayOfWeek: parseInt(form.dayOfWeek, 10),
        startTime: form.startTime,
        endTime: form.endTime || null,
        location: form.location.trim() || null,
        leader: form.leader.trim() || null,
        description: form.description.trim() || null,
        isActive: form.isActive,
      };

      if (initial?.id) {
        await prayerService.update(initial.id, payload);
      } else {
        await prayerService.create(payload);
      }
      onSaved();
    } catch (err) {
      setError(
        err?.response?.data?.error || "Error al guardar. Intenta de nuevo.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Flame className="h-4 w-4 text-orange-400" />
            </div>
            <h2 className="font-semibold text-white text-lg">
              {initial?.id ? "Editar sesión" : "Nueva sesión de oración"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          {/* Nombre */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Nombre <span className="text-red-400">*</span>
            </label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ej: Oración de madrugada"
              maxLength={120}
            />
          </div>

          {/* Día + Hora inicio + Hora fin */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Día <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <select
                  value={form.dayOfWeek}
                  onChange={(e) => set("dayOfWeek", e.target.value)}
                  className="w-full appearance-none bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar</option>
                  {DAYS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-slate-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Inicio <span className="text-red-400">*</span>
              </label>
              <Input
                type="time"
                value={form.startTime}
                onChange={(e) => set("startTime", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Fin (opcional)
              </label>
              <Input
                type="time"
                value={form.endTime}
                onChange={(e) => set("endTime", e.target.value)}
              />
            </div>
          </div>

          {/* Lugar + Líder */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Lugar
              </label>
              <Input
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="Ej: Templo principal"
                maxLength={120}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Líder / Encargado
              </label>
              <Input
                value={form.leader}
                onChange={(e) => set("leader", e.target.value)}
                placeholder="Nombre del líder"
                maxLength={120}
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Descripción
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Tema, enfoque o notas…"
              rows={2}
              maxLength={500}
              className="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
            />
          </div>

          {/* Activo */}
          {initial?.id && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => set("isActive", !form.isActive)}
                className={`relative w-10 h-5 rounded-full transition-colors ${form.isActive ? "bg-green-500" : "bg-slate-600"}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isActive ? "translate-x-5" : ""}`}
                />
              </button>
              <span className="text-sm text-slate-300">
                {form.isActive ? "Activa" : "Inactiva"}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving
                ? "Guardando…"
                : initial?.id
                  ? "Guardar cambios"
                  : "Crear sesión"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Confirmation dialog ───────────────────────────────────────────────────────

function ConfirmDialog({message, onConfirm, onCancel}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <p className="text-white text-sm mb-5">{message}</p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>
            Cancelar
          </Button>
          <button
            className="flex-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 transition-colors"
            onClick={onConfirm}
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tarjeta de sesión de oración ──────────────────────────────────────────────

function PrayerCard({item, canEdit, onEdit, onToggle, onDelete}) {
  return (
    <div
      className={`group flex items-start gap-3 p-3 rounded-xl border transition-all ${
        item.is_active
          ? "bg-slate-700/30 border-slate-600/50 hover:bg-slate-700/50 hover:border-slate-500"
          : "bg-slate-800/30 border-slate-700/30 opacity-50"
      }`}
    >
      {/* Icono hora */}
      <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex flex-col items-center justify-center shrink-0">
        <Flame className="h-4 w-4 text-orange-400" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{item.name}</p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Clock className="h-3 w-3" />
            {formatTime(item.start_time)}
            {item.end_time && <> – {formatTime(item.end_time)}</>}
          </span>
          {item.location && (
            <span className="flex items-center gap-1 text-xs text-slate-500 truncate">
              <MapPin className="h-3 w-3 shrink-0" /> {item.location}
            </span>
          )}
          {item.leader && (
            <span className="flex items-center gap-1 text-xs text-slate-500 truncate">
              <User className="h-3 w-3 shrink-0" /> {item.leader}
            </span>
          )}
        </div>

        {item.description && (
          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        )}
      </div>

      {canEdit && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => onToggle(item)}
            title={item.is_active ? "Desactivar" : "Activar"}
            className={`p-1.5 rounded-md transition-colors ${
              item.is_active
                ? "text-green-400 hover:bg-green-500/10"
                : "text-slate-500 hover:bg-slate-600"
            }`}
          >
            <Power className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onEdit(item)}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-600 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(item)}
            className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function PrayerPage() {
  const {user} = useAuth();
  const canEdit = ["ADMIN", "PASTOR"].includes(user?.role);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showInactive, setShowInactive] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await prayerService.getAll();
      setItems(data.prayer_days || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleEdit = (item) => {
    setEditing({
      id: item.id,
      name: item.name,
      dayOfWeek: String(item.day_of_week),
      startTime: item.start_time?.slice(0, 5) || "",
      endTime: item.end_time?.slice(0, 5) || "",
      location: item.location || "",
      leader: item.leader || "",
      description: item.description || "",
      isActive: item.is_active,
    });
    setShowModal(true);
  };

  const handleToggle = async (item) => {
    try {
      await prayerService.toggleActive(item.id);
      load();
    } catch {
      /* silencioso */
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await prayerService.remove(confirmDelete.id);
      setConfirmDelete(null);
      load();
    } catch {
      /* silencioso */
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
  };

  // Agrupar por día
  const byDay = DAYS.map((d) => ({
    ...d,
    sessions: items.filter((i) => {
      if (!showInactive && !i.is_active) return false;
      return i.day_of_week === d.value;
    }),
    total: items.filter((i) => i.day_of_week === d.value).length,
  }));

  const totalActive = items.filter((i) => i.is_active).length;

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <Flame className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Días de Oración</h1>
            <p className="text-sm text-slate-400">
              {loading
                ? "Cargando…"
                : `${totalActive} sesión${totalActive !== 1 ? "es" : ""} activa${totalActive !== 1 ? "s" : ""} por semana`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle inactivos */}
          <button
            onClick={() => setShowInactive((v) => !v)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              showInactive
                ? "border-blue-500/40 bg-blue-500/10 text-blue-300"
                : "border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300"
            }`}
          >
            {showInactive ? "Ocultar inactivas" : "Ver inactivas"}
          </button>

          {canEdit && (
            <Button
              onClick={() => {
                setEditing(null);
                setShowModal(true);
              }}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nueva sesión
            </Button>
          )}
        </div>
      </div>

      {/* ── Indicador del día actual ──────────────────────────────────────── */}
      {!loading && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {DAYS.map((d) => (
            <div
              key={d.value}
              className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl border text-xs transition-colors ${
                d.value === TODAY_DOW
                  ? "border-orange-500/50 bg-orange-500/10 text-orange-300"
                  : "border-slate-700 text-slate-500"
              }`}
            >
              <span className="font-medium">{d.short}</span>
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  d.value === TODAY_DOW
                    ? "bg-orange-500 text-white"
                    : "bg-slate-700 text-slate-400"
                }`}
              >
                {
                  items.filter((i) => i.day_of_week === d.value && i.is_active)
                    .length
                }
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Grid semanal ──────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {DAYS.map((d) => (
            <div
              key={d.value}
              className="h-40 bg-slate-800 border border-slate-700 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {byDay.map((day) => (
            <div
              key={day.value}
              className={`bg-slate-800 border rounded-xl overflow-hidden transition-colors ${
                day.value === TODAY_DOW
                  ? "border-orange-500/40 shadow-lg shadow-orange-500/5"
                  : "border-slate-700"
              }`}
            >
              {/* Encabezado del día */}
              <div
                className={`flex items-center justify-between px-4 py-3 border-b ${
                  day.value === TODAY_DOW
                    ? "border-orange-500/30 bg-orange-500/5"
                    : "border-slate-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`font-semibold text-sm ${day.value === TODAY_DOW ? "text-orange-300" : "text-white"}`}
                  >
                    {day.label}
                  </span>
                  {day.value === TODAY_DOW && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-medium">
                      Hoy
                    </span>
                  )}
                </div>
                {day.total > 0 && (
                  <span className="text-xs text-slate-500">
                    {day.sessions.length} sesión
                    {day.sessions.length !== 1 ? "es" : ""}
                  </span>
                )}
              </div>

              {/* Sesiones */}
              <div className="p-3 space-y-2 min-h-[80px]">
                {day.sessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-slate-600">
                    <Flame className="h-6 w-6 mb-1 opacity-30" />
                    <p className="text-xs">
                      Sin sesiones{showInactive ? "" : " activas"}
                    </p>
                  </div>
                ) : (
                  day.sessions.map((item) => (
                    <PrayerCard
                      key={item.id}
                      item={item}
                      canEdit={canEdit}
                      onEdit={handleEdit}
                      onToggle={handleToggle}
                      onDelete={setConfirmDelete}
                    />
                  ))
                )}
              </div>

              {/* Botón añadir rápido en tarjeta */}
              {canEdit && (
                <div className="px-3 pb-3">
                  <button
                    onClick={() => {
                      setEditing({...EMPTY_FORM, dayOfWeek: String(day.value)});
                      setShowModal(true);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-slate-600 text-xs text-slate-500 hover:border-orange-500/40 hover:text-orange-400 transition-colors"
                  >
                    <Plus className="h-3 w-3" /> Añadir sesión
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Modales ───────────────────────────────────────────────────────── */}
      {showModal && (
        <PrayerFormModal
          initial={editing}
          onClose={closeModal}
          onSaved={() => {
            closeModal();
            load();
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          message={`¿Eliminar la sesión "${confirmDelete.name}"? Esta acción no se puede deshacer.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

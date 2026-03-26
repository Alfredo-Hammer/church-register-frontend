import { useEffect, useState } from 'react';
import { activitiesService } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogHeader, DialogContent, DialogFooter } from '@/components/ui/Dialog';
import {
  Plus, Search, Rocket, AlertCircle, CheckCircle,
  Pencil, Trash2, Users, CheckSquare2, Clock, XCircle,
  MapPin, User, CalendarDays,
} from 'lucide-react';

const CATEGORIES = [
  { value: 'RECOLECCION_FONDOS', label: 'Recolección de Fondos',  color: 'bg-amber-500/20 text-amber-300' },
  { value: 'SERVICIO_COMUNITARIO', label: 'Servicio Comunitario', color: 'bg-teal-500/20 text-teal-300' },
  { value: 'CAPACITACION', label: 'Capacitación',                 color: 'bg-blue-500/20 text-blue-300' },
  { value: 'EVANGELISMO', label: 'Evangelismo',                   color: 'bg-purple-500/20 text-purple-300' },
  { value: 'SOCIAL', label: 'Social / Convivio',                  color: 'bg-pink-500/20 text-pink-300' },
  { value: 'OTRO', label: 'Otro',                                 color: 'bg-slate-500/20 text-slate-300' },
];

const STATUSES = [
  { value: 'PLANIFICADA',  label: 'Planificada',  color: 'bg-blue-500/20 text-blue-300' },
  { value: 'EN_PROGRESO',  label: 'En Progreso',  color: 'bg-yellow-500/20 text-yellow-300' },
  { value: 'COMPLETADA',   label: 'Completada',   color: 'bg-green-500/20 text-green-300' },
  { value: 'CANCELADA',    label: 'Cancelada',    color: 'bg-red-500/20 text-red-300' },
];

const emptyForm = {
  title: '',
  description: '',
  category: 'OTRO',
  date: '',
  location: '',
  responsible: '',
  organizer: '',
  expectedCount: '',
  actualCount: '',
  status: 'PLANIFICADA',
  notes: '',
  outcome: '',
};

const formatDate = (val) => {
  if (!val) return '—';
  return new Date(val.slice(0, 10) + 'T12:00:00').toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
};

const getCategory = (val) => CATEGORIES.find((c) => c.value === val) || { label: val, color: 'bg-slate-500/20 text-slate-300' };
const getStatus  = (val) => STATUSES.find((s) => s.value === val)   || { label: val, color: 'bg-slate-500/20 text-slate-300' };

export default function ActivitiesPage() {
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus]     = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [page, setPage]       = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const LIMIT = 20;

  const [modalOpen, setModalOpen]     = useState(false);
  const [editing, setEditing]         = useState(null);
  const [form, setForm]               = useState(emptyForm);
  const [saving, setSaving]           = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]       = useState(false);

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg]     = useState('');

  const loadActivities = async () => {
    setLoading(true);
    try {
      const params = { limit: LIMIT, offset: (page - 1) * LIMIT };
      if (filterStatus   !== 'ALL') params.status   = filterStatus;
      if (filterCategory !== 'ALL') params.category = filterCategory;
      if (search.trim())            params.search   = search.trim();

      const data = await activitiesService.getAll(params);
      setActivities(data.activities || []);
      setTotalItems(data.pagination?.total || 0);
    } catch {
      setErrorMsg('Error al cargar actividades');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await activitiesService.getStats();
      setStats(data.stats);
    } catch { /* silencioso */ }
  };

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { loadActivities(); }, [page, filterStatus, filterCategory]);
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); loadActivities(); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrorMsg('');
    setSuccessMsg('');
    setModalOpen(true);
  };

  const openEdit = (activity) => {
    setEditing(activity);
    setForm({
      title:         activity.title        || '',
      description:   activity.description  || '',
      category:      activity.category     || 'OTRO',
      date:          activity.date ? activity.date.slice(0, 10) : '',
      location:      activity.location     || '',
      responsible:   activity.responsible  || '',
      organizer:     activity.organizer    || '',
      expectedCount: activity.expected_count ?? '',
      actualCount:   activity.actual_count  ?? '',
      status:        activity.status       || 'PLANIFICADA',
      notes:         activity.notes        || '',
      outcome:       activity.outcome      || '',
    });
    setErrorMsg('');
    setSuccessMsg('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    try {
      const payload = {
        title:         form.title,
        description:   form.description   || undefined,
        category:      form.category,
        date:          form.date,
        location:      form.location      || undefined,
        responsible:   form.responsible   || undefined,
        organizer:     form.organizer     || undefined,
        expectedCount: form.expectedCount ? parseInt(form.expectedCount) : undefined,
        actualCount:   form.actualCount   ? parseInt(form.actualCount)   : undefined,
        status:        form.status,
        notes:         form.notes         || undefined,
        outcome:       form.outcome       || undefined,
      };

      if (editing) {
        await activitiesService.update(editing.id, payload);
        setSuccessMsg('Actividad actualizada exitosamente');
      } else {
        await activitiesService.create(payload);
        setSuccessMsg('Actividad creada exitosamente');
      }

      setTimeout(() => {
        setModalOpen(false);
        setSuccessMsg('');
        loadActivities();
        loadStats();
      }, 1200);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Error al guardar la actividad');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setErrorMsg('');
    try {
      await activitiesService.delete(deleteTarget.id);
      setDeleteTarget(null);
      setSuccessMsg('Actividad eliminada');
      setTimeout(() => setSuccessMsg(''), 2000);
      loadActivities();
      loadStats();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(totalItems / LIMIT);
  const isCompleted = form.status === 'COMPLETADA';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
            <Rocket className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Actividades</h1>
            <p className="text-sm text-slate-400">Proyectos y actividades especiales de la iglesia</p>
          </div>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700">
          <Plus className="h-4 w-4" />
          Nueva Actividad
        </Button>
      </div>

      {/* Mensajes globales */}
      {successMsg && !modalOpen && (
        <div className="flex items-center gap-2 p-3 bg-green-900/40 border border-green-700 rounded-lg text-green-300 text-sm">
          <CheckCircle className="h-4 w-4" /> {successMsg}
        </div>
      )}
      {errorMsg && !modalOpen && (
        <div className="flex items-center gap-2 p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">
          <AlertCircle className="h-4 w-4" /> {errorMsg}
        </div>
      )}

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-xs text-slate-400 mb-1">Total activas</p>
            <p className="text-2xl font-bold text-white">{stats.total || 0}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-3.5 w-3.5 text-yellow-400" />
              <p className="text-xs text-slate-400">En progreso</p>
            </div>
            <p className="text-2xl font-bold text-yellow-300">{stats.en_progreso || 0}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <CheckSquare2 className="h-3.5 w-3.5 text-green-400" />
              <p className="text-xs text-slate-400">Completadas</p>
            </div>
            <p className="text-2xl font-bold text-green-300">{stats.completadas || 0}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-3.5 w-3.5 text-purple-400" />
              <p className="text-xs text-slate-400">Total participantes</p>
            </div>
            <p className="text-2xl font-bold text-purple-300">{stats.total_participantes || 0}</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por título, responsable u organizador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-md bg-slate-700 border border-slate-600 text-white text-sm"
        >
          <option value="ALL">Todos los estados</option>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-md bg-slate-700 border border-slate-600 text-white text-sm"
        >
          <option value="ALL">Todas las categorías</option>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {/* Lista de tarjetas */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-slate-800 rounded-lg border border-slate-700">
          <Rocket className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-lg font-medium">No hay actividades registradas</p>
          <p className="text-sm">Crea la primera actividad con el botón de arriba</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {activities.map((activity) => {
            const cat    = getCategory(activity.category);
            const status = getStatus(activity.status);
            const hasParticipants = activity.expected_count || activity.actual_count;

            return (
              <div key={activity.id} className="bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors flex flex-col">
                {/* Card header */}
                <div className="p-4 flex-1 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-white leading-tight">{activity.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${status.color}`}>
                      {status.label}
                    </span>
                  </div>

                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cat.color}`}>
                    {cat.label}
                  </span>

                  {activity.description && (
                    <p className="text-sm text-slate-400 line-clamp-2">{activity.description}</p>
                  )}

                  <div className="space-y-1.5 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{formatDate(activity.date)}</span>
                    </div>
                    {activity.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{activity.location}</span>
                      </div>
                    )}
                    {activity.responsible && (
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{activity.responsible}</span>
                        {activity.organizer && (
                          <span className="text-slate-500">· {activity.organizer}</span>
                        )}
                      </div>
                    )}
                    {hasParticipants && (
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>
                          {activity.actual_count != null
                            ? <><span className="text-white font-medium">{activity.actual_count}</span> participaron</>
                            : null}
                          {activity.actual_count != null && activity.expected_count ? ' / ' : null}
                          {activity.expected_count
                            ? <>{activity.actual_count == null ? '' : ''}<span className="text-slate-400">{activity.expected_count} esperados</span></>
                            : null}
                        </span>
                      </div>
                    )}
                  </div>

                  {activity.outcome && (
                    <div className="mt-2 p-2 bg-slate-700/50 rounded text-xs text-slate-300 italic border-l-2 border-purple-500">
                      {activity.outcome}
                    </div>
                  )}
                </div>

                {/* Card actions */}
                <div className="border-t border-slate-700 px-4 py-2 flex justify-end gap-1">
                  <button
                    onClick={() => openEdit(activity)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </button>
                  <button
                    onClick={() => setDeleteTarget(activity)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>{totalItems} actividades en total</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              Anterior
            </Button>
            <span className="px-3 py-1 text-white">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* ── Modal crear / editar ── */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)}>
        <DialogHeader onClose={() => setModalOpen(false)}>
          <h2 className="text-lg font-bold text-white">
            {editing ? 'Editar Actividad' : 'Nueva Actividad'}
          </h2>
        </DialogHeader>

        <form onSubmit={handleSave}>
          <DialogContent className="space-y-4">
            {errorMsg && (
              <div className="flex items-center gap-2 p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" /> {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="flex items-center gap-2 p-3 bg-green-900/40 border border-green-700 rounded-lg text-green-300 text-sm">
                <CheckCircle className="h-4 w-4 flex-shrink-0" /> {successMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Título */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">Título *</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ej: Venta de comida — apoyo grupo de jóvenes"
                  required
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Categoría</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-md bg-slate-700 border border-slate-600 text-white text-sm"
                >
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              {/* Estado */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Estado</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-md bg-slate-700 border border-slate-600 text-white text-sm"
                >
                  {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Fecha *</label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              {/* Lugar */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Lugar</label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Ej: Salón de usos múltiples"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              {/* Responsable */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Responsable</label>
                <Input
                  value={form.responsible}
                  onChange={(e) => setForm({ ...form, responsible: e.target.value })}
                  placeholder="Persona a cargo"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              {/* Organizador (ministerio/grupo) */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Ministerio / Grupo organizador</label>
                <Input
                  value={form.organizer}
                  onChange={(e) => setForm({ ...form, organizer: e.target.value })}
                  placeholder="Ej: Grupo de Jóvenes"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              {/* Participantes esperados */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Participantes esperados</label>
                <Input
                  type="number"
                  min="0"
                  value={form.expectedCount}
                  onChange={(e) => setForm({ ...form, expectedCount: e.target.value })}
                  placeholder="0"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              {/* Participantes reales — solo visible si ya hay actividad en progreso o completada */}
              {(form.status === 'EN_PROGRESO' || form.status === 'COMPLETADA') && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Participantes reales</label>
                  <Input
                    type="number"
                    min="0"
                    value={form.actualCount}
                    onChange={(e) => setForm({ ...form, actualCount: e.target.value })}
                    placeholder="0"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              )}

              {/* Descripción */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="¿En qué consiste la actividad? ¿Cuál es el objetivo?"
                  rows={3}
                  className="w-full px-3 py-2 rounded-md bg-slate-700 border border-slate-600 text-white text-sm placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Notas */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">Notas / Instrucciones</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Notas internas, materiales necesarios, indicaciones..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-md bg-slate-700 border border-slate-600 text-white text-sm placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Resultado — solo si está completada */}
              {isCompleted && (
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Resultado / Conclusión</label>
                  <textarea
                    value={form.outcome}
                    onChange={(e) => setForm({ ...form, outcome: e.target.value })}
                    placeholder="¿Cómo resultó la actividad? Logros, aprendizajes, observaciones..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-md bg-slate-700 border border-slate-600 text-white text-sm placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}
            </div>
          </DialogContent>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="bg-purple-600 hover:bg-purple-700">
              {saving ? 'Guardando...' : editing ? 'Guardar Cambios' : 'Crear Actividad'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* ── Modal confirmación de eliminación ── */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogHeader onClose={() => setDeleteTarget(null)}>
          <h2 className="text-lg font-bold text-white">Eliminar Actividad</h2>
        </DialogHeader>
        <DialogContent>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-red-900/40 rounded-full flex items-center justify-center flex-shrink-0">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-white font-medium">{deleteTarget?.title}</p>
              <p className="text-slate-400 text-sm mt-1">
                Esta acción no se puede deshacer. ¿Confirmas que deseas eliminar esta actividad?
              </p>
            </div>
          </div>
          {errorMsg && (
            <div className="mt-3 flex items-center gap-2 p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">
              <AlertCircle className="h-4 w-4" /> {errorMsg}
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancelar
          </Button>
          <Button onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
            {deleting ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

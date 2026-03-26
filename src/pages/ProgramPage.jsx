import { useEffect, useState, useRef } from 'react';
import { programsService, membersService, settingsService } from '@/services/api';
import { PrintLayout, PrintPage, PrintHeader, PrintFooter } from '@/components/print';
import { exportProgramPdf } from '@/utils/pdf';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogHeader, DialogContent, DialogFooter } from '@/components/ui/Dialog';
import {
  ClipboardList, Plus, Pencil, Trash2, AlertCircle, CheckCircle, XCircle,
  ChevronRight, Clock, Users, Music, BookOpen, MessageSquare,
  Heart, Megaphone, Wine, Star, Hand, HelpCircle, CalendarDays,
  CheckSquare, PlayCircle, Search, User, Printer, X, GripVertical,
} from 'lucide-react';

// ── Catálogos ─────────────────────────────────────────────────────────────────

const ITEM_TYPES = [
  { value: 'BIENVENIDA',     label: 'Bienvenida',       icon: Hand,           color: 'text-teal-400',   bg: 'bg-teal-500/15' },
  { value: 'ALABANZA',       label: 'Alabanza',          icon: Music,          color: 'text-purple-400', bg: 'bg-purple-500/15' },
  { value: 'ORACION',        label: 'Oración',           icon: Users,          color: 'text-blue-400',   bg: 'bg-blue-500/15' },
  { value: 'LECTURA_BIBLICA',label: 'Lectura Bíblica',   icon: BookOpen,       color: 'text-amber-400',  bg: 'bg-amber-500/15' },
  { value: 'MENSAJE',        label: 'Mensaje / Sermón',  icon: MessageSquare,  color: 'text-indigo-400', bg: 'bg-indigo-500/15' },
  { value: 'OFRENDAS',       label: 'Ofrendas / Diezmos',icon: Heart,          color: 'text-rose-400',   bg: 'bg-rose-500/15' },
  { value: 'ANUNCIOS',       label: 'Anuncios',          icon: Megaphone,      color: 'text-orange-400', bg: 'bg-orange-500/15' },
  { value: 'COMUNION',       label: 'Santa Cena',        icon: Wine,           color: 'text-red-400',    bg: 'bg-red-500/15' },
  { value: 'ESPECIAL',       label: 'Especial',          icon: Star,           color: 'text-yellow-400', bg: 'bg-yellow-500/15' },
  { value: 'OTRO',           label: 'Otro',              icon: HelpCircle,     color: 'text-slate-400',  bg: 'bg-slate-500/15' },
];

const STATUSES = [
  { value: 'BORRADOR',   label: 'Borrador',   color: 'bg-slate-500/20 text-slate-300' },
  { value: 'PUBLICADO',  label: 'Publicado',  color: 'bg-blue-500/20 text-blue-300' },
  { value: 'COMPLETADO', label: 'Completado', color: 'bg-green-500/20 text-green-300' },
];

const getType   = (v) => ITEM_TYPES.find((t) => t.value === v) || ITEM_TYPES[ITEM_TYPES.length - 1];
const getStatus = (v) => STATUSES.find((s) => s.value === v)   || STATUSES[0];

// ── Plantillas ────────────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: 'culto_dominical',
    label: 'Culto Dominical',
    description: 'Servicio completo de domingo con alabanza, mensaje y ofrendas',
    icon: '⛪',
    color: 'border-indigo-500/40 bg-indigo-500/5',
    items: [
      { title: 'Bienvenida y apertura',     itemType: 'BIENVENIDA',      durationMinutes: 5  },
      { title: 'Alabanza congregacional',   itemType: 'ALABANZA',        durationMinutes: 20 },
      { title: 'Oración general',           itemType: 'ORACION',         durationMinutes: 8  },
      { title: 'Lectura bíblica',           itemType: 'LECTURA_BIBLICA', durationMinutes: 8  },
      { title: 'Mensaje del día',           itemType: 'MENSAJE',         durationMinutes: 40 },
      { title: 'Diezmos y ofrendas',        itemType: 'OFRENDAS',        durationMinutes: 8  },
      { title: 'Anuncios y avisos',         itemType: 'ANUNCIOS',        durationMinutes: 5  },
    ],
  },
  {
    id: 'servicio_alabanza',
    label: 'Servicio de Alabanza',
    description: 'Enfocado en adoración y alabanza extendida',
    icon: '🎵',
    color: 'border-purple-500/40 bg-purple-500/5',
    items: [
      { title: 'Bienvenida',                itemType: 'BIENVENIDA',      durationMinutes: 5  },
      { title: 'Alabanza de apertura',      itemType: 'ALABANZA',        durationMinutes: 15 },
      { title: 'Oración de adoración',      itemType: 'ORACION',         durationMinutes: 10 },
      { title: 'Alabanza profunda',         itemType: 'ALABANZA',        durationMinutes: 25 },
      { title: 'Lectura y reflexión',       itemType: 'LECTURA_BIBLICA', durationMinutes: 10 },
      { title: 'Diezmos y ofrendas',        itemType: 'OFRENDAS',        durationMinutes: 8  },
      { title: 'Oración de cierre',         itemType: 'ORACION',         durationMinutes: 5  },
    ],
  },
  {
    id: 'reunion_jovenes',
    label: 'Reunión de Jóvenes',
    description: 'Dinámica, alabanza y mensaje para jóvenes',
    icon: '🔥',
    color: 'border-orange-500/40 bg-orange-500/5',
    items: [
      { title: 'Bienvenida y dinámica',     itemType: 'BIENVENIDA',      durationMinutes: 10 },
      { title: 'Alabanza juvenil',          itemType: 'ALABANZA',        durationMinutes: 20 },
      { title: 'Oración y testimonio',      itemType: 'ORACION',         durationMinutes: 10 },
      { title: 'Mensaje joven',             itemType: 'MENSAJE',         durationMinutes: 30 },
      { title: 'Número especial',           itemType: 'ESPECIAL',        durationMinutes: 10 },
      { title: 'Anuncios y avisos',         itemType: 'ANUNCIOS',        durationMinutes: 5  },
    ],
  },
  {
    id: 'santa_cena',
    label: 'Santa Cena',
    description: 'Servicio solemne con celebración de la comunión',
    icon: '🍞',
    color: 'border-red-500/40 bg-red-500/5',
    items: [
      { title: 'Bienvenida',                itemType: 'BIENVENIDA',      durationMinutes: 5  },
      { title: 'Alabanza de adoración',     itemType: 'ALABANZA',        durationMinutes: 15 },
      { title: 'Oración de consagración',   itemType: 'ORACION',         durationMinutes: 8  },
      { title: 'Lectura bíblica',           itemType: 'LECTURA_BIBLICA', durationMinutes: 8  },
      { title: 'Mensaje de la Cena',        itemType: 'MENSAJE',         durationMinutes: 30 },
      { title: 'Santa Cena / Comunión',     itemType: 'COMUNION',        durationMinutes: 20 },
      { title: 'Diezmos y ofrendas',        itemType: 'OFRENDAS',        durationMinutes: 8  },
    ],
  },
  {
    id: 'evento_especial',
    label: 'Evento Especial',
    description: 'Para cultos especiales, aniversarios o visitas',
    icon: '✨',
    color: 'border-amber-500/40 bg-amber-500/5',
    items: [
      { title: 'Bienvenida especial',       itemType: 'BIENVENIDA',      durationMinutes: 8  },
      { title: 'Alabanza de apertura',      itemType: 'ALABANZA',        durationMinutes: 20 },
      { title: 'Número especial',           itemType: 'ESPECIAL',        durationMinutes: 15 },
      { title: 'Oración y presentación',    itemType: 'ORACION',         durationMinutes: 10 },
      { title: 'Mensaje principal',         itemType: 'MENSAJE',         durationMinutes: 40 },
      { title: 'Diezmos y ofrendas',        itemType: 'OFRENDAS',        durationMinutes: 8  },
      { title: 'Anuncios y cierre',         itemType: 'ANUNCIOS',        durationMinutes: 5  },
    ],
  },
];

const formatDate = (val) => {
  if (!val) return '—';
  return new Date(val.slice(0, 10) + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
};

const formatDateShort = (val) => {
  if (!val) return '—';
  return new Date(val.slice(0, 10) + 'T12:00:00').toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
};

// Calcular hora de cada item a partir de la hora de inicio
const calcItemTimes = (startTime, items) => {
  if (!startTime) return items.map(() => null);
  const [h, m] = startTime.slice(0, 5).split(':').map(Number);
  let totalMinutes = h * 60 + m;
  return items.map((item) => {
    const timeStr = `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
    totalMinutes += item.duration_minutes || 0;
    return timeStr;
  });
};

const minutesToDuration = (mins) => {
  if (!mins) return null;
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
};

const emptyProgram = { title: '', date: '', startTime: '', status: 'BORRADOR', notes: '' };
const emptyItem    = { title: '', itemType: 'ALABANZA', durationMinutes: '', responsibleId: '', responsibleName: '', notes: '' };

// ── Componente principal ──────────────────────────────────────────────────────

export default function ProgramPage() {
  const [programs, setPrograms]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [selectedProgram, setSelected]  = useState(null); // { program, items }
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeMembers, setActiveMembers] = useState([]);

  // Modales
  const [programModal, setProgramModal] = useState(false);
  const [editingProgram, setEditingProg] = useState(null);
  const [programForm, setProgramForm]   = useState(emptyProgram);

  const [itemModal, setItemModal]       = useState(false);
  const [editingItem, setEditingItem]   = useState(null);
  const [itemForm, setItemForm]         = useState(emptyItem);
  const [memberSearch, setMemberSearch] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'program'|'item', id, programId? }
  const [deleting, setDeleting]         = useState(false);

  const [saving, setSaving]     = useState(false);
  const [successMsg, setSuccess] = useState('');
  const [errorMsg, setError]    = useState('');

  // Plantillas
  const [templateModal, setTemplateModal] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState(null); // items to add after create

  // Print
  const [showPrint, setShowPrint]   = useState(false);
  const [churchData, setChurchData] = useState(null);

  // Drag & drop items
  const [dragIndex, setDragIndex]   = useState(null);
  const [hoverIndex, setHoverIndex] = useState(null);

  const detailRef = useRef(null);

  // ── Carga ──────────────────────────────────────────────────────────────────

  const loadPrograms = async () => {
    setLoading(true);
    try {
      const data = await programsService.getAll({ limit: 50 });
      setPrograms(data.programs || []);
    } catch { setError('Error al cargar programas'); }
    finally { setLoading(false); }
  };

  const loadDetail = async (programId) => {
    setLoadingDetail(true);
    try {
      const data = await programsService.getById(programId);
      setSelected(data);
      setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch { setError('Error al cargar el programa'); }
    finally { setLoadingDetail(false); }
  };

  const loadActiveMembers = async () => {
    try {
      const data = await membersService.getAll({ status: 'ACTIVO', limit: 200 });
      setActiveMembers(data.members || []);
    } catch { /* silencioso */ }
  };

  useEffect(() => { loadPrograms(); loadActiveMembers(); }, []);

  // ── CRUD Programa ──────────────────────────────────────────────────────────

  const openCreateProgram = (template = null) => {
    setEditingProg(null);
    setProgramForm({
      ...emptyProgram,
      title: template ? template.label : '',
      date: new Date().toISOString().slice(0, 10),
    });
    setPendingTemplate(template ? template.items : null);
    setError(''); setSuccess('');
    setTemplateModal(false);
    setProgramModal(true);
  };

  const openEditProgram = (program, e) => {
    e.stopPropagation();
    setEditingProg(program);
    setProgramForm({
      title:     program.title      || '',
      date:      program.date ? program.date.slice(0, 10) : '',
      startTime: program.start_time ? program.start_time.slice(0, 5) : '',
      status:    program.status     || 'BORRADOR',
      notes:     program.notes      || '',
    });
    setError(''); setSuccess('');
    setProgramModal(true);
  };

  const handleSaveProgram = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = {
        title:     programForm.title,
        date:      programForm.date,
        startTime: programForm.startTime || undefined,
        status:    programForm.status,
        notes:     programForm.notes || undefined,
      };
      if (editingProgram) {
        await programsService.update(editingProgram.id, payload);
        setSuccess('Programa actualizado');
        if (selectedProgram?.program?.id === editingProgram.id) loadDetail(editingProgram.id);
        setTimeout(() => { setProgramModal(false); setSuccess(''); loadPrograms(); }, 1000);
      } else {
        const created = await programsService.create(payload);
        const newId = created.program?.id || created.id;
        if (pendingTemplate && newId) {
          setSuccess('Creando items del programa...');
          for (const item of pendingTemplate) {
            await programsService.addItem(newId, item);
          }
          setPendingTemplate(null);
        }
        setSuccess('Programa creado');
        setTimeout(() => {
          setProgramModal(false); setSuccess('');
          loadPrograms();
          if (newId) loadDetail(newId);
        }, 800);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally { setSaving(false); }
  };

  // ── CRUD Item ──────────────────────────────────────────────────────────────

  const openAddItem = () => {
    setEditingItem(null);
    setItemForm(emptyItem);
    setMemberSearch('');
    setError(''); setSuccess('');
    setItemModal(true);
  };

  const openEditItem = (item) => {
    setEditingItem(item);
    const member = item.responsible_id
      ? activeMembers.find((m) => m.id === item.responsible_id)
      : null;
    setItemForm({
      title:           item.title            || '',
      itemType:        item.item_type         || 'OTRO',
      durationMinutes: item.duration_minutes  ?? '',
      responsibleId:   item.responsible_id    || '',
      responsibleName: item.responsible_name  || '',
      notes:           item.notes             || '',
    });
    setMemberSearch(member ? `${member.first_name} ${member.last_name}` : (item.responsible_name || ''));
    setError(''); setSuccess('');
    setItemModal(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = {
        title:           itemForm.title,
        itemType:        itemForm.itemType,
        durationMinutes: itemForm.durationMinutes ? parseInt(itemForm.durationMinutes) : undefined,
        responsibleId:   itemForm.responsibleId   || undefined,
        responsibleName: !itemForm.responsibleId && memberSearch ? memberSearch : undefined,
        notes:           itemForm.notes           || undefined,
      };
      if (editingItem) {
        await programsService.updateItem(selectedProgram.program.id, editingItem.id, payload);
      } else {
        await programsService.addItem(selectedProgram.program.id, payload);
      }
      setSuccess(editingItem ? 'Item actualizado' : 'Item agregado');
      setTimeout(() => { setItemModal(false); setSuccess(''); loadDetail(selectedProgram.program.id); }, 800);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally { setSaving(false); }
  };

  const handleDragStart = (idx) => {
    setDragIndex(idx);
    setHoverIndex(idx);
  };

  const handleDragEnter = (idx) => {
    if (idx !== hoverIndex) setHoverIndex(idx);
  };

  const handleDragEnd = async () => {
    if (dragIndex === null || hoverIndex === null || dragIndex === hoverIndex) {
      setDragIndex(null);
      setHoverIndex(null);
      return;
    }
    // Optimistic update
    const newItems = [...selectedProgram.items];
    const [moved] = newItems.splice(dragIndex, 1);
    newItems.splice(hoverIndex, 0, moved);
    setSelected({ ...selectedProgram, items: newItems });
    setDragIndex(null);
    setHoverIndex(null);
    try {
      await programsService.reorderItems(selectedProgram.program.id, newItems.map((i) => i.id));
    } catch {
      // Rollback on error
      loadDetail(selectedProgram.program.id);
    }
  };

  // ── Eliminación ────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true); setError('');
    try {
      if (deleteTarget.type === 'program') {
        await programsService.delete(deleteTarget.id);
        if (selectedProgram?.program?.id === deleteTarget.id) setSelected(null);
        loadPrograms();
      } else {
        await programsService.deleteItem(selectedProgram.program.id, deleteTarget.id);
        loadDetail(selectedProgram.program.id);
      }
      setDeleteTarget(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al eliminar');
    } finally { setDeleting(false); }
  };

  // ── Print ──────────────────────────────────────────────────────────────────

  const openPrint = async () => {
    if (!churchData) {
      try {
        const data = await settingsService.getChurch();
        setChurchData(data.church || data);
      } catch { /* usa datos vacíos */ }
    }
    setShowPrint(true);
  };

  // ── Helpers UI ─────────────────────────────────────────────────────────────

  const filteredMembers = activeMembers.filter((m) => {
    const full = `${m.first_name} ${m.last_name}`.toLowerCase();
    return full.includes(memberSearch.toLowerCase());
  });

  const selectMember = (member) => {
    setItemForm({ ...itemForm, responsibleId: member.id });
    setMemberSearch(`${member.first_name} ${member.last_name}`);
  };

  const clearMember = () => {
    setItemForm({ ...itemForm, responsibleId: '' });
    setMemberSearch('');
  };

  // Separar programas próximos y pasados
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcoming = programs.filter((p) => new Date(p.date.slice(0, 10) + 'T00:00:00') >= today);
  const past     = programs.filter((p) => new Date(p.date.slice(0, 10) + 'T00:00:00') <  today);

  // Calcular tiempos del detalle
  const itemTimes = selectedProgram
    ? calcItemTimes(selectedProgram.program.start_time, selectedProgram.items)
    : [];
  const totalMinutes = selectedProgram?.items.reduce((acc, i) => acc + (i.duration_minutes || 0), 0) || 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
            <ClipboardList className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Programa de Culto</h1>
            <p className="text-sm text-slate-400">Gestiona el orden y tiempo de cada servicio</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setTemplateModal(true)} variant="outline"
            className="flex items-center gap-2 border-slate-600 text-slate-300 hover:border-indigo-500/50 hover:text-white">
            <ClipboardList className="h-4 w-4" /> Plantillas
          </Button>
          <Button onClick={() => openCreateProgram()} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> Nuevo Programa
          </Button>
        </div>
      </div>

      {/* Mensajes globales */}
      {successMsg && !programModal && !itemModal && (
        <div className="flex items-center gap-2 p-3 bg-green-900/40 border border-green-700 rounded-lg text-green-300 text-sm">
          <CheckCircle className="h-4 w-4" /> {successMsg}
        </div>
      )}

      {/* Lista de programas */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map((i) => <div key={i} className="h-32 bg-slate-800 rounded-xl animate-pulse border border-slate-700" />)}
        </div>
      ) : programs.length === 0 ? (
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center py-10 bg-slate-800 border border-slate-700 rounded-xl text-slate-400">
            <ClipboardList className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium text-white">No hay programas creados</p>
            <p className="text-sm mb-4">Empieza desde una plantilla o crea uno desde cero</p>
            <Button onClick={() => setTemplateModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 gap-2">
              <ClipboardList className="h-4 w-4" /> Usar una plantilla
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Próximos */}
          {upcoming.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-3">Próximos</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcoming.map((p) => (
                  <ProgramCard
                    key={p.id}
                    program={p}
                    isSelected={selectedProgram?.program?.id === p.id}
                    onClick={() => loadDetail(p.id)}
                    onEdit={(e) => openEditProgram(p, e)}
                    onDelete={(e) => { e.stopPropagation(); setError(''); setDeleteTarget({ type: 'program', id: p.id, label: p.title }); }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Pasados */}
          {past.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-3">Anteriores</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
                {past.slice(0, 6).map((p) => (
                  <ProgramCard
                    key={p.id}
                    program={p}
                    isSelected={selectedProgram?.program?.id === p.id}
                    onClick={() => loadDetail(p.id)}
                    onEdit={(e) => openEditProgram(p, e)}
                    onDelete={(e) => { e.stopPropagation(); setError(''); setDeleteTarget({ type: 'program', id: p.id, label: p.title }); }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Detalle del programa ────────────────────────────────────────────── */}
      {(selectedProgram || loadingDetail) && (
        <div ref={detailRef} className="bg-slate-800 border border-indigo-500/30 rounded-2xl overflow-hidden">

          {loadingDetail ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : selectedProgram && (
            <>
              {/* Header del detalle */}
              <div className="bg-gradient-to-r from-indigo-900/40 to-slate-800 px-6 py-5 border-b border-slate-700">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatus(selectedProgram.program.status).color}`}>
                        {getStatus(selectedProgram.program.status).label}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-white">{selectedProgram.program.title}</h2>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        <span className="capitalize">{formatDate(selectedProgram.program.date)}</span>
                      </span>
                      {selectedProgram.program.start_time && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {selectedProgram.program.start_time.slice(0, 5)}
                        </span>
                      )}
                      {totalMinutes > 0 && (
                        <span className="flex items-center gap-1.5 text-indigo-400">
                          <PlayCircle className="h-3.5 w-3.5" />
                          Duración estimada: {minutesToDuration(totalMinutes)}
                        </span>
                      )}
                    </div>
                    {selectedProgram.program.notes && (
                      <p className="mt-2 text-sm text-slate-400 italic">{selectedProgram.program.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button onClick={openPrint} variant="outline" className="flex items-center gap-2">
                      <Printer className="h-4 w-4" /> Imprimir
                    </Button>
                    <Button onClick={openAddItem} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700">
                      <Plus className="h-4 w-4" /> Agregar Item
                    </Button>
                  </div>
                </div>
              </div>

              {/* Timeline de items */}
              <div className="p-6">
                {selectedProgram.items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <ClipboardList className="h-10 w-10 mb-2 opacity-30" />
                    <p className="text-sm">Este programa no tiene items aún</p>
                    <p className="text-xs mt-1">Usa "Agregar Item" para construir el orden del servicio</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedProgram.items.map((item, idx) => {
                      const typeInfo = getType(item.item_type);
                      const Icon     = typeInfo.icon;
                      const time     = itemTimes[idx];
                      const isLast   = idx === selectedProgram.items.length - 1;
                      const leaderName = item.responsible_id
                        ? `${item.member_first_name || ''} ${item.member_last_name || ''}`.trim()
                        : item.responsible_name;
                      const isDragging = dragIndex === idx;
                      const isHover    = hoverIndex === idx && dragIndex !== null && dragIndex !== idx;

                      return (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={() => handleDragStart(idx)}
                          onDragEnter={() => handleDragEnter(idx)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => e.preventDefault()}
                          className={`flex gap-4 group transition-opacity ${isDragging ? 'opacity-40' : 'opacity-100'}`}
                        >
                          {/* Línea de tiempo */}
                          <div className="flex flex-col items-center flex-shrink-0 w-12">
                            {time && (
                              <span className="text-xs text-slate-500 font-mono mb-1 whitespace-nowrap">{time}</span>
                            )}
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${typeInfo.bg}`}>
                              <Icon className={`h-4 w-4 ${typeInfo.color}`} />
                            </div>
                            {!isLast && <div className="w-0.5 flex-1 bg-slate-700 mt-1 min-h-[16px]" />}
                          </div>

                          {/* Contenido */}
                          <div className="flex-1 pb-4">
                            <div className={`bg-slate-700/40 hover:bg-slate-700/60 border rounded-xl p-4 transition-colors
                              ${isHover ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-600'}`}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={`text-xs font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
                                    {item.duration_minutes && (
                                      <span className="text-xs px-1.5 py-0.5 bg-slate-600 text-slate-300 rounded font-mono">
                                        {minutesToDuration(item.duration_minutes)}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-white font-semibold mt-0.5">{item.title}</p>
                                  {leaderName && (
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                      <div className="w-5 h-5 rounded-full bg-indigo-600/40 flex items-center justify-center text-xs font-bold text-indigo-300">
                                        {leaderName[0]}
                                      </div>
                                      <span className="text-xs text-slate-400">{leaderName}</span>
                                      {item.responsible_id && (
                                        <CheckSquare className="h-3 w-3 text-green-500" title="Miembro activo" />
                                      )}
                                    </div>
                                  )}
                                  {item.notes && (
                                    <p className="text-xs text-slate-500 mt-1.5 italic">{item.notes}</p>
                                  )}
                                </div>

                                {/* Controles */}
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <div
                                    title="Arrastrar para reordenar"
                                    className="p-1 text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing transition-colors"
                                    onMouseDown={(e) => e.stopPropagation()}
                                  >
                                    <GripVertical className="h-4 w-4" />
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEditItem(item)}
                                      className="p-1 text-slate-500 hover:text-blue-400 hover:bg-slate-600 rounded transition-colors">
                                      <Pencil className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => { setError(''); setDeleteTarget({ type: 'item', id: item.id, label: item.title }); }}
                                      className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-600 rounded transition-colors">
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Hora de finalización estimada */}
                    {selectedProgram.program.start_time && totalMinutes > 0 && (
                      <div className="flex gap-4 mt-2">
                        <div className="w-12 flex justify-center">
                          <span className="text-xs text-indigo-400 font-mono font-bold">
                            {itemTimes[selectedProgram.items.length] ||
                              (() => {
                                const [h, m] = selectedProgram.program.start_time.slice(0, 5).split(':').map(Number);
                                const end = h * 60 + m + totalMinutes;
                                return `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
                              })()
                            }
                          </span>
                        </div>
                        <div className="flex-1 pb-2">
                          <div className="flex items-center gap-2 text-xs text-indigo-400 border border-indigo-500/20 bg-indigo-500/5 rounded-lg px-3 py-2">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Fin estimado — Duración total: <strong>{minutesToDuration(totalMinutes)}</strong>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Vista Previa / Imprimir ────────────────────────────────────────── */}
      {showPrint && selectedProgram && (
        <PrintPreview
          program={selectedProgram.program}
          items={selectedProgram.items}
          church={churchData}
          onClose={() => setShowPrint(false)}
        />
      )}

      {/* ── Modal: crear / editar programa ─────────────────────────────────── */}
      <Dialog open={programModal} onClose={() => setProgramModal(false)}>
        <DialogHeader onClose={() => setProgramModal(false)}>
          <h2 className="text-lg font-bold text-white">
            {editingProgram ? 'Editar Programa' : 'Nuevo Programa'}
          </h2>
        </DialogHeader>
        <form onSubmit={handleSaveProgram}>
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
              <div className="sm:col-span-2">
                {pendingTemplate && (
                  <div className="mb-3 flex items-center gap-2 text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-3 py-2">
                    <ClipboardList className="h-3.5 w-3.5 shrink-0" />
                    Se agregarán <strong>{pendingTemplate.length} items</strong> automáticamente al crear.
                  </div>
                )}
                <label className="block text-sm font-medium text-slate-300 mb-1">Título *</label>
                <Input value={programForm.title}
                  onChange={(e) => setProgramForm({ ...programForm, title: e.target.value })}
                  placeholder="Ej: Culto Dominical, Servicio de Adoración" required
                  className="bg-slate-700 border-slate-600 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Fecha *</label>
                <Input type="date" value={programForm.date}
                  onChange={(e) => setProgramForm({ ...programForm, date: e.target.value })} required
                  className="bg-slate-700 border-slate-600 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Hora de inicio</label>
                <Input type="time" value={programForm.startTime}
                  onChange={(e) => setProgramForm({ ...programForm, startTime: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Estado</label>
                <select value={programForm.status}
                  onChange={(e) => setProgramForm({ ...programForm, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-md bg-slate-700 border border-slate-600 text-white text-sm">
                  {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">Notas</label>
                <textarea value={programForm.notes}
                  onChange={(e) => setProgramForm({ ...programForm, notes: e.target.value })}
                  placeholder="Tema del mensaje, notas generales..." rows={2}
                  className="w-full px-3 py-2 rounded-md bg-slate-700 border border-slate-600 text-white text-sm placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          </DialogContent>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setProgramModal(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
              {saving ? 'Guardando...' : editingProgram ? 'Guardar Cambios' : 'Crear Programa'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* ── Modal: agregar / editar item ────────────────────────────────────── */}
      <Dialog open={itemModal} onClose={() => setItemModal(false)}>
        <DialogHeader onClose={() => setItemModal(false)}>
          <h2 className="text-lg font-bold text-white">
            {editingItem ? 'Editar Item' : 'Agregar Item al Programa'}
          </h2>
        </DialogHeader>
        <form onSubmit={handleSaveItem}>
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

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Tipo</label>
                <select value={itemForm.itemType}
                  onChange={(e) => setItemForm({ ...itemForm, itemType: e.target.value })}
                  className="w-full px-3 py-2 rounded-md bg-slate-700 border border-slate-600 text-white text-sm">
                  {ITEM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              {/* Duración */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Duración (minutos)</label>
                <Input type="number" min="1" max="180" value={itemForm.durationMinutes}
                  onChange={(e) => setItemForm({ ...itemForm, durationMinutes: e.target.value })}
                  placeholder="Ej: 15" className="bg-slate-700 border-slate-600 text-white" />
              </div>

              {/* Título */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">Descripción / Título *</label>
                <Input value={itemForm.title}
                  onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                  placeholder="Ej: Alabanza de apertura, Oración general, Sermón..." required
                  className="bg-slate-700 border-slate-600 text-white" />
              </div>

              {/* Responsable — búsqueda de miembro activo */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Quien dirige
                  <span className="text-xs text-slate-500 ml-1">(miembro activo o nombre libre)</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={memberSearch}
                    onChange={(e) => {
                      setMemberSearch(e.target.value);
                      if (itemForm.responsibleId) setItemForm({ ...itemForm, responsibleId: '' });
                    }}
                    placeholder="Buscar miembro activo o escribir nombre..."
                    className="pl-9 bg-slate-700 border-slate-600 text-white"
                  />
                  {itemForm.responsibleId && (
                    <button type="button" onClick={clearMember}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                      <XCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Dropdown de miembros */}
                {memberSearch.length > 0 && !itemForm.responsibleId && filteredMembers.length > 0 && (
                  <div className="mt-1 bg-slate-700 border border-slate-600 rounded-lg overflow-hidden max-h-40 overflow-y-auto shadow-xl">
                    {filteredMembers.slice(0, 8).map((m) => (
                      <button key={m.id} type="button" onClick={() => selectMember(m)}
                        className="flex items-center gap-3 w-full px-3 py-2 hover:bg-slate-600 transition-colors text-left">
                        <div className="w-7 h-7 rounded-full bg-indigo-600/40 flex items-center justify-center text-xs font-bold text-indigo-300 flex-shrink-0">
                          {m.first_name[0]}{m.last_name[0]}
                        </div>
                        <div>
                          <p className="text-sm text-white">{m.first_name} {m.last_name}</p>
                          {m.phone && <p className="text-xs text-slate-400">{m.phone}</p>}
                        </div>
                        <CheckSquare className="h-3.5 w-3.5 text-green-500 ml-auto flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {itemForm.responsibleId && (
                  <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                    <CheckSquare className="h-3 w-3" /> Miembro activo seleccionado
                  </p>
                )}
              </div>

              {/* Notas */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">Notas del item</label>
                <textarea value={itemForm.notes}
                  onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
                  placeholder="Pasaje bíblico, canción, instrucciones especiales..." rows={2}
                  className="w-full px-3 py-2 rounded-md bg-slate-700 border border-slate-600 text-white text-sm placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          </DialogContent>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setItemModal(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
              {saving ? 'Guardando...' : editingItem ? 'Guardar Cambios' : 'Agregar'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* ── Modal: plantillas ───────────────────────────────────────────────── */}
      <Dialog open={templateModal} onClose={() => setTemplateModal(false)}>
        <DialogHeader onClose={() => setTemplateModal(false)}>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-indigo-400" />
            Plantillas de Programa
          </h2>
        </DialogHeader>
        <DialogContent>
          <p className="text-sm text-slate-400 mb-4">
            Elige una plantilla para crear el programa con los items predefinidos. Podrás editarlos después.
          </p>
          <div className="space-y-3">
            {TEMPLATES.map((t) => (
              <button key={t.id} onClick={() => openCreateProgram(t)}
                className={`w-full text-left rounded-xl border p-4 hover:border-indigo-500/60 hover:bg-indigo-500/5 transition-all group ${t.color}`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl leading-none mt-0.5">{t.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm group-hover:text-indigo-300 transition-colors">
                      {t.label}
                    </p>
                    <p className="text-slate-400 text-xs mt-0.5">{t.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {t.items.map((item, i) => {
                        const info = getType(item.itemType);
                        return (
                          <span key={i}
                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${info.bg} ${info.color}`}>
                            {info.label}
                          </span>
                        );
                      })}
                    </div>
                    <p className="text-slate-500 text-xs mt-2">
                      {t.items.length} items · {minutesToDuration(t.items.reduce((s, i) => s + (i.durationMinutes || 0), 0))} estimado
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-indigo-400 transition-colors shrink-0 mt-1" />
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setTemplateModal(false)}
            className="w-full border-slate-600 text-slate-300 hover:text-white">
            Cancelar
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ── Modal: confirmar eliminación ────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogHeader onClose={() => setDeleteTarget(null)}>
          <h2 className="text-lg font-bold text-white">
            {deleteTarget?.type === 'program' ? 'Eliminar Programa' : 'Eliminar Item'}
          </h2>
        </DialogHeader>
        <DialogContent>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-red-900/40 rounded-full flex items-center justify-center flex-shrink-0">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-white font-medium">{deleteTarget?.label}</p>
              <p className="text-slate-400 text-sm mt-1">
                {deleteTarget?.type === 'program'
                  ? 'Se eliminarán también todos los items del programa. Esta acción no se puede deshacer.'
                  : 'Esta acción no se puede deshacer.'}
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
          <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancelar</Button>
          <Button onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
            {deleting ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

// ── Sub-componente: Vista Previa de Impresión ─────────────────────────────────

const to12h = (time24) => {
  if (!time24) return null;
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
};

function PrintPreview({ program, items, church, onClose }) {
  const times = calcItemTimes(program.start_time, items);
  const totalMins = items.reduce((acc, i) => acc + (i.duration_minutes || 0), 0);

  const endTime = (() => {
    if (!program.start_time || !totalMins) return null;
    const [h, m] = program.start_time.slice(0, 5).split(':').map(Number);
    const end = h * 60 + m + totalMins;
    const endH = Math.floor(end / 60);
    const endM = end % 60;
    return to12h(`${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`);
  })();

  const dateLabel = new Date(program.date.slice(0, 10) + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const documentMeta = [
    dateLabel,
    program.start_time ? to12h(program.start_time.slice(0, 5)) : null,
  ].filter(Boolean).join(' · ');

  const filename = `programa-${program.title.toLowerCase().replace(/\s+/g, '-')}-${program.date.slice(0, 10)}`;

  return (
    <PrintLayout
      title="Vista Previa"
      subtitle={program.title}
      onClose={onClose}
      onExportPdf={(onStart, onEnd) => exportProgramPdf(filename, onStart, onEnd)}
    >
      <PrintPage>
        <PrintHeader
          church={church}
          documentTitle={program.title}
          documentMeta={documentMeta}
          documentNote={program.notes}
        />

        {/* Título de sección */}
        <div style={{ padding: '8px 28px 6px', borderBottom: '1.5px solid #e5e7eb' }}>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, color: '#6b7280', margin: 0, textTransform: 'uppercase', fontFamily: 'Arial, sans-serif' }}>
            Orden del Servicio
          </p>
        </div>

        {/* Items */}
        <div>
          {items.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#9ca3af', padding: '24px', fontSize: 13, fontFamily: 'Arial, sans-serif' }}>
              Este programa no tiene items registrados.
            </p>
          ) : (
            items.map((item, idx) => {
              const typeInfo = ITEM_TYPES.find((t) => t.value === item.item_type) || ITEM_TYPES[ITEM_TYPES.length - 1];
              const time     = times[idx];
              const leader   = item.responsible_id
                ? `${item.member_first_name || ''} ${item.member_last_name || ''}`.trim()
                : item.responsible_name;
              const isEven   = idx % 2 === 0;

              return (
                <div key={item.id} style={{
                  display: 'flex', gap: 10, padding: '7px 28px',
                  background: isEven ? '#f9fafb' : 'white',
                  borderBottom: '1px solid #f3f4f6',
                  alignItems: 'center',
                }}>
                  {/* Número simple */}
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: '#a5b4fc',
                    flexShrink: 0, fontFamily: 'Arial, sans-serif', width: 16, textAlign: 'right',
                  }}>
                    {idx + 1}.
                  </span>

                  {/* Contenido */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'Arial, sans-serif' }}>
                        {typeInfo.label}
                      </span>
                      {item.duration_minutes && (
                        <span style={{ fontSize: 9, background: '#f3f4f6', color: '#6b7280', padding: '1px 5px', borderRadius: 3, fontFamily: 'monospace', border: '1px solid #e5e7eb' }}>
                          {minutesToDuration(item.duration_minutes)}
                        </span>
                      )}
                      {leader && (
                        <span style={{ fontSize: 9, color: '#9ca3af', fontFamily: 'Arial, sans-serif' }}>
                          · {item.responsible_id ? '✓ ' : ''}{leader}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: '2px 0 0', color: '#111827', lineHeight: 1.3 }}>
                      {item.title}
                    </p>
                    {item.notes && (
                      <p style={{ fontSize: 10, color: '#9ca3af', margin: '1px 0 0', fontStyle: 'italic', fontFamily: 'Arial, sans-serif' }}>
                        {item.notes}
                      </p>
                    )}
                  </div>

                  {/* Hora en 12h */}
                  {time && (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5', fontFamily: 'monospace' }}>
                        {to12h(time)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Resumen de tiempos */}
        {(totalMins > 0 || endTime) && (
          <div style={{
            padding: '8px 28px', background: '#f5f3ff',
            borderTop: '1.5px solid #e0e7ff',
            display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6,
          }}>
            {totalMins > 0 && (
              <span style={{ fontSize: 11, color: '#4b5563', fontFamily: 'Arial, sans-serif' }}>
                <strong>Duración total:</strong> {minutesToDuration(totalMins)}
              </span>
            )}
            {endTime && (
              <span style={{ fontSize: 11, color: '#4f46e5', fontWeight: 700, fontFamily: 'Arial, sans-serif' }}>
                Fin estimado: {endTime} hrs
              </span>
            )}
          </div>
        )}

        <PrintFooter church={church} generatedLabel="Programa de Culto" />
      </PrintPage>
    </PrintLayout>
  );
}

// ── Sub-componente: tarjeta de programa ───────────────────────────────────────

function ProgramCard({ program, isSelected, onClick, onEdit, onDelete }) {
  const status = getStatus(program.status);
  const today  = new Date(); today.setHours(0, 0, 0, 0);
  const isToday = new Date(program.date.slice(0, 10) + 'T00:00:00').getTime() === today.getTime();

  return (
    <div
      onClick={onClick}
      className={`group bg-slate-800 border rounded-xl p-4 cursor-pointer transition-all hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-900/20
        ${isSelected ? 'border-indigo-500 shadow-lg shadow-indigo-900/30' : 'border-slate-700'}
        ${isToday ? 'ring-1 ring-indigo-500/30' : ''}`}
    >
      {/* Fecha grande */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0
            ${isToday ? 'bg-indigo-600' : 'bg-slate-700'}`}>
            <span className="text-lg font-bold text-white leading-none">
              {new Date(program.date.slice(0, 10) + 'T12:00:00').getDate()}
            </span>
            <span className="text-xs text-white/70 uppercase">
              {new Date(program.date.slice(0, 10) + 'T12:00:00').toLocaleDateString('es-MX', { month: 'short' })}
            </span>
          </div>
          <div>
            <p className="font-semibold text-white text-sm leading-tight">{program.title}</p>
            {program.start_time && (
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                <Clock className="h-3 w-3" /> {program.start_time.slice(0, 5)}
              </p>
            )}
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${status.color}`}>
          {status.label}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <ClipboardList className="h-3.5 w-3.5" />
            {program.item_count} items
          </span>
          {program.total_minutes > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {minutesToDuration(program.total_minutes)}
            </span>
          )}
          {isToday && <span className="text-indigo-400 font-medium">Hoy</span>}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
          <button onClick={onEdit}
            className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-slate-700 rounded transition-colors">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete}
            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { conferenceService, settingsService } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogFooter } from "@/components/ui/Dialog";
import { CertificatePreviewDialog } from "@/components/CertificatePreviewDialog";
import { BadgePreviewDialog } from "@/components/BadgePreviewDialog";
import { ProgramQRDialog } from "@/components/ProgramQRDialog";
import {
  BookOpen, ArrowLeft, Plus, Trash2, Pencil, Users, Church,
  MapPin, Phone, CalendarDays, Clock, Loader2, Search, X,
  ChevronLeft, ChevronRight, StickyNote, FileDown, Award,
  Badge, QrCode, Check, Camera, Cake, ScanLine, BarChart3, Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generateProgramaPDF, generateCertificadoPDF, generateGafetePDF, generateGafetesBatchPDF } from "@/utils/pdf/conferencePdf";
import { SESSION_TYPE_COLORS, badgeClasses, swatchClasses } from "@/utils/sessionTypeColors";

// ── Constantes ────────────────────────────────────────────────────────────────

const EMPTY_SESSION = { sessionTypeId: null, title: "", timeStart: "", timeEnd: "", speaker: "", scriptureRef: "", notes: "" };
const EMPTY_REG     = { fullName: "", phone: "", originChurch: "", city: "", notes: "", photoUrl: null, birthDate: "", gender: "", ageGroup: "ADULTO" };
const LIMIT         = 20;

// Estado en vivo de una sesión, que controla a mano quien lleva la
// conferencia — la pantalla del salón lo respeta por encima de su propio
// cálculo automático por reloj (ver DisplayPage). Mismos 5 valores que el
// CHECK de la migración 033.
const SESSION_STATUSES = [
  { value: "PROGRAMADA",     label: "Programada" },
  { value: "EN_CURSO",       label: "En curso" },
  { value: "A_CONTINUACION", label: "A continuación" },
  { value: "FINALIZADA",     label: "Finalizada" },
  { value: "CANCELADA",      label: "Cancelada" },
];

const SESSION_STATUS_CLASSES = {
  PROGRAMADA:     "bg-muted text-muted-foreground border-border",
  EN_CURSO:       "bg-blue-600 text-white border-blue-600",
  A_CONTINUACION: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40",
  FINALIZADA:     "bg-muted text-muted-foreground border-border",
  CANCELADA:      "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/40",
};

const AGE_GROUPS = [
  { value: "ADULTO", label: "Adulto" },
  { value: "JOVEN",  label: "Joven" },
  { value: "NIÑO",   label: "Niño" },
];

function calcAge(birthDate) {
  if (!birthDate) return null;
  const b = new Date(String(birthDate).slice(0, 10) + 'T00:00:00');
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

function formatDate(dateStr) {
  const d = new Date(String(dateStr).slice(0, 10) + 'T00:00:00');
  return d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatTime(t) {
  if (!t) return null;
  const [h, m] = t.split(':');
  const hour = parseInt(h);
  return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

// ── Componente badge de tipo ──────────────────────────────────────────────────
// Recibe el tipo ya resuelto por el backend ({label, color}): no hay ningún
// mapa fijo en el frontend, así que un tipo personalizado se ve exactamente
// igual que uno de fábrica. Un punto de color en vez de un ícono por tipo,
// ya que los personalizados no tienen uno asignado.

function TypeBadge({ type }) {
  if (!type) return null;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold border", badgeClasses(type.color))}>
      <span className={cn("h-1.5 w-1.5 rounded-full", swatchClasses(type.color))} />
      {type.label}
    </span>
  );
}

// ── Foto de asistente ─────────────────────────────────────────────────────────
// Mismo patrón que PhotoUploader en MembersPage: base64 inline, 2MB máx., sin
// subir a ningún storage aparte — se guarda directo en photo_url.
function RegPhotoUploader({ preview, onChange, onRemove }) {
  const ref = useRef();
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return alert("Solo imágenes.");
    if (file.size > 2 * 1024 * 1024) return alert("Máximo 2MB.");
    const reader = new FileReader();
    reader.onload = (ev) => onChange(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  return (
    <div className="flex items-center gap-4">
      <div
        onClick={() => ref.current?.click()}
        className="w-16 h-16 rounded-full overflow-hidden bg-muted border-2 border-dashed border-border hover:border-blue-500 cursor-pointer flex items-center justify-center transition-colors shrink-0"
      >
        {preview
          ? <img src={preview} alt="preview" className="w-full h-full object-cover" />
          : <Camera className="w-6 h-6 text-muted-foreground" />}
      </div>
      <div className="flex flex-col gap-1.5">
        <button type="button" onClick={() => ref.current?.click()}
          className="text-xs text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium">
          {preview ? "Cambiar foto" : "Subir foto (opcional)"}
        </button>
        {preview && (
          <button type="button" onClick={onRemove}
            className="text-xs text-red-700 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium">
            Quitar foto
          </button>
        )}
        <p className="text-xs text-muted-foreground">PNG, JPG — máx. 2MB. Sale en el gafete.</p>
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function ConferenceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Datos de iglesia para el certificado
  const [church, setChurch] = useState(null);

  const [conference, setConference]   = useState(null);
  const [days, setDays]               = useState([]);
  const [stats, setStats]             = useState(null);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState("programa"); // "programa" | "asistentes" | "reportes"

  // Reportes (resumen por iglesia + matriz de asistencia)
  const [report, setReport]           = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Sesiones
  const [sessionDialog, setSessionDialog] = useState(false);
  const [targetDayId, setTargetDayId]     = useState(null);
  const [editingSession, setEditingSession] = useState(null);
  const [sessionForm, setSessionForm]     = useState(EMPTY_SESSION);
  const [savingSession, setSavingSession] = useState(false);
  const [sessionError, setSessionError]   = useState("");
  const [deletingSession, setDeletingSession] = useState(null);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  // Catálogo de tipos de sesión (por iglesia; incluye los personalizados)
  const [sessionTypes, setSessionTypes]     = useState([]);
  const [showNewType, setShowNewType]       = useState(false);
  const [newTypeLabel, setNewTypeLabel]     = useState("");
  const [newTypeColor, setNewTypeColor]     = useState(SESSION_TYPE_COLORS[0]);
  const [savingType, setSavingType]         = useState(false);
  const [typeError, setTypeError]           = useState("");
  const [deletingTypeId, setDeletingTypeId] = useState(null);

  // Días
  const [addDayDialog, setAddDayDialog]   = useState(false);
  const [newDayDate, setNewDayDate]       = useState("");
  const [savingDay, setSavingDay]         = useState(false);
  const [deletingDay, setDeletingDay]     = useState(null);

  // Registros
  const [registrations, setRegistrations] = useState([]);
  const [regTotal, setRegTotal]           = useState(0);
  const [regPage, setRegPage]             = useState(0);
  const [regSearch, setRegSearch]         = useState("");
  const [regLoading, setRegLoading]       = useState(false);
  const [regDialog, setRegDialog]         = useState(false);
  const [editingReg, setEditingReg]       = useState(null);
  const [regForm, setRegForm]             = useState(EMPTY_REG);
  const [savingReg, setSavingReg]         = useState(false);
  const [regError, setRegError]           = useState("");
  const [deletingReg, setDeletingReg]     = useState(null);

  // PDF
  const [pdfLoading, setPdfLoading] = useState(null);
  const [previewReg, setPreviewReg] = useState(null);
  const [badgeReg, setBadgeReg] = useState(null);
  const [showProgramQR, setShowProgramQR] = useState(false);

  // Impresión de gafetes por lote
  const [selectedRegIds, setSelectedRegIds] = useState(() => new Set());
  const [batchPrinting, setBatchPrinting] = useState(false);
  const [batchProgress, setBatchProgress] = useState(null); // {current, total}
  const [batchError, setBatchError] = useState("");

  // Filtro de la tabla de asistencia: "all" | "day:<n>" | "session:<id>" —
  // codificado como un solo string para que sea un <select> simple.
  const [reportFilter, setReportFilter] = useState("all");

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchConference = useCallback(async () => {
    try {
      const data = await conferenceService.getById(id);
      setConference(data.conference);
      setDays(data.days);
    } catch { navigate('/dashboard/conference'); }
  }, [id, navigate]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await conferenceService.getStats(id);
      setStats(data.stats);
    } catch { /* silent */ }
  }, [id]);

  const fetchSessionTypes = useCallback(async () => {
    try {
      const data = await conferenceService.getSessionTypes();
      setSessionTypes(data.types);
    } catch { /* silent */ }
  }, []);

  const fetchRegistrations = useCallback(async (search, page) => {
    setRegLoading(true);
    try {
      const data = await conferenceService.getRegistrations(id, {
        search: search || undefined, limit: LIMIT, offset: page * LIMIT,
      });
      setRegistrations(data.registrations);
      setRegTotal(data.pagination.total);
    } catch { /* silent */ }
    setRegLoading(false);
  }, [id]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchConference();
      await fetchStats();
      await fetchSessionTypes();
      setLoading(false);
    };
    load();
    // Cargar datos de iglesia para certificados (logo en context, resto del API)
    settingsService.getChurch().then(data =>
      setChurch({
        name:       data.name       || user?.churchName || '',
        pastorName: data.pastorName || null,
        phone:      data.phone      || null,
        logoUrl:    data.logoUrl    || user?.churchLogo || null,
      })
    ).catch(() =>
      setChurch({ name: user?.churchName || '', logoUrl: user?.churchLogo || null })
    );
  }, [fetchConference, fetchStats, fetchSessionTypes]);

  useEffect(() => {
    if (activeTab === "asistentes") fetchRegistrations(regSearch, regPage);
  }, [activeTab, fetchRegistrations, regSearch, regPage]);

  const fetchReport = useCallback(async () => {
    setReportLoading(true);
    try {
      const data = await conferenceService.getAttendanceReport(id);
      setReport(data);
    } catch { /* silent */ }
    setReportLoading(false);
  }, [id]);

  useEffect(() => {
    if (activeTab === "reportes") fetchReport();
  }, [activeTab, fetchReport]);

  // ── Sesiones ───────────────────────────────────────────────────────────────

  // Tipo por defecto para una sesión nueva: "Clase bíblica" si existe (el más
  // común), si no el primero del catálogo de la iglesia.
  const defaultTypeId = () =>
    sessionTypes.find((t) => t.key === "CLASE_BIBLICA")?.id ?? sessionTypes[0]?.id ?? null;

  const openAddSession = (dayId) => {
    setTargetDayId(dayId);
    setEditingSession(null);
    setSessionForm({ ...EMPTY_SESSION, sessionTypeId: defaultTypeId() });
    setSessionError("");
    setShowNewType(false);
    setTypeError("");
    setSessionDialog(true);
  };

  const openEditSession = (session, dayId) => {
    setTargetDayId(dayId);
    setEditingSession(session);
    setSessionForm({
      sessionTypeId: session.session_type_id ?? session.type?.id ?? defaultTypeId(),
      title:        session.title,
      timeStart:    session.time_start?.slice(0, 5) || "",
      timeEnd:      session.time_end?.slice(0, 5) || "",
      speaker:      session.speaker || "",
      scriptureRef: session.scripture_ref || "",
      notes:        session.notes || "",
    });
    setSessionError("");
    setShowNewType(false);
    setTypeError("");
    setSessionDialog(true);
  };

  const handleSaveSession = async () => {
    if (!sessionForm.title.trim()) return setSessionError("El título es obligatorio.");
    setSavingSession(true);
    setSessionError("");
    try {
      if (editingSession) {
        await conferenceService.updateSession(editingSession.id, sessionForm);
      } else {
        await conferenceService.addSession(targetDayId, sessionForm);
      }
      setSessionDialog(false);
      await fetchConference();
    } catch (err) {
      setSessionError(err.response?.data?.error || "Error al guardar.");
    }
    setSavingSession(false);
  };

  const handleDeleteSession = async (sessionId) => {
    setDeletingSession(sessionId);
    try {
      await conferenceService.deleteSession(sessionId);
      await fetchConference();
    } catch { /* silent */ }
    setDeletingSession(null);
  };

  const handleChangeSessionStatus = async (sessionId, status) => {
    setUpdatingStatusId(sessionId);
    try {
      await conferenceService.updateSessionStatus(sessionId, status);
      await fetchConference();
    } catch { /* silent */ }
    setUpdatingStatusId(null);
  };

  // ── Tipos de sesión (personalizados por iglesia) ────────────────────────────

  const handleCreateType = async () => {
    if (!newTypeLabel.trim()) return setTypeError("Ponle un nombre al tipo.");
    setSavingType(true);
    setTypeError("");
    try {
      const data = await conferenceService.createSessionType({
        label: newTypeLabel.trim(),
        color: newTypeColor,
      });
      await fetchSessionTypes();
      // Queda seleccionado de una vez: si alguien lo creó a mitad de armar
      // una sesión, no tiene que volver a buscarlo en la lista.
      setSessionForm((p) => ({ ...p, sessionTypeId: data.type.id }));
      setNewTypeLabel("");
      setNewTypeColor(SESSION_TYPE_COLORS[0]);
      setShowNewType(false);
    } catch (err) {
      setTypeError(err.response?.data?.error || "No se pudo crear el tipo.");
    }
    setSavingType(false);
  };

  const handleDeleteType = async (typeId) => {
    setDeletingTypeId(typeId);
    setTypeError("");
    try {
      await conferenceService.deleteSessionType(typeId);
      await fetchSessionTypes();
      // Si el tipo borrado era el seleccionado en el formulario, hay que
      // recaer en otro para no dejar el formulario apuntando a un id muerto.
      setSessionForm((p) => (p.sessionTypeId === typeId ? { ...p, sessionTypeId: defaultTypeId() } : p));
    } catch (err) {
      // "está en uso" es el caso esperado, no un error de verdad — se
      // muestra igual que cualquier otro mensaje del backend.
      setTypeError(err.response?.data?.error || "No se pudo eliminar el tipo.");
    }
    setDeletingTypeId(null);
  };

  // ── Días ───────────────────────────────────────────────────────────────────

  const handleAddDay = async () => {
    if (!newDayDate) return;
    setSavingDay(true);
    try {
      await conferenceService.addDay(id, { dayDate: newDayDate });
      setAddDayDialog(false);
      setNewDayDate("");
      await fetchConference();
    } catch { /* silent */ }
    setSavingDay(false);
  };

  const handleDeleteDay = async (dayId) => {
    setDeletingDay(dayId);
    try {
      await conferenceService.deleteDay(id, dayId);
      await fetchConference();
    } catch { /* silent */ }
    setDeletingDay(null);
  };

  // ── Registros ──────────────────────────────────────────────────────────────

  const openAddReg = () => {
    setEditingReg(null);
    setRegForm(EMPTY_REG);
    setRegError("");
    setRegDialog(true);
  };

  const openEditReg = (reg) => {
    setEditingReg(reg);
    setRegForm({
      fullName:     reg.full_name,
      phone:        reg.phone || "",
      originChurch: reg.origin_church || "",
      city:         reg.city || "",
      notes:        reg.notes || "",
      photoUrl:     reg.photo_url || null,
      birthDate:    reg.birth_date ? String(reg.birth_date).slice(0, 10) : "",
      gender:       reg.gender || "",
      ageGroup:     reg.age_group || "ADULTO",
    });
    setRegError("");
    setRegDialog(true);
  };

  const handleSaveReg = async () => {
    if (!regForm.fullName.trim()) return setRegError("El nombre es obligatorio.");
    setSavingReg(true);
    setRegError("");
    try {
      const payload = {
        ...regForm,
        photoBase64: regForm.photoUrl || null,
        removePhoto: !regForm.photoUrl,
      };
      if (editingReg) {
        await conferenceService.updateRegistration(id, editingReg.id, payload);
      } else {
        await conferenceService.createRegistration(id, payload);
      }
      setRegDialog(false);
      fetchRegistrations(regSearch, regPage);
      fetchStats();
    } catch (err) {
      setRegError(err.response?.data?.error || "Error al guardar.");
    }
    setSavingReg(false);
  };

  const handleDeleteReg = async () => {
    if (!deletingReg) return;
    try {
      await conferenceService.deleteRegistration(id, deletingReg.id);
      setDeletingReg(null);
      fetchRegistrations(regSearch, regPage);
      fetchStats();
    } catch { /* silent */ }
  };

  // ── Impresión de gafetes por lote ────────────────────────────────────────────

  const toggleSelectReg = (regId) => {
    setSelectedRegIds((prev) => {
      const next = new Set(prev);
      if (next.has(regId)) next.delete(regId); else next.add(regId);
      return next;
    });
  };

  const allVisibleSelected = registrations.length > 0 && registrations.every((r) => selectedRegIds.has(r.id));

  const toggleSelectAllVisible = () => {
    setSelectedRegIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        registrations.forEach((r) => next.delete(r.id));
      } else {
        registrations.forEach((r) => next.add(r.id));
      }
      return next;
    });
  };

  const runBatchPrint = async (regsToPrint) => {
    setBatchPrinting(true);
    setBatchError("");
    setBatchProgress({ current: 0, total: regsToPrint.length });
    await generateGafetesBatchPDF(
      conference, regsToPrint, church,
      () => {},
      (current, total) => setBatchProgress({ current, total }),
      (err) => {
        if (err) setBatchError(err);
        setBatchPrinting(false);
        setBatchProgress(null);
      }
    );
  };

  const handlePrintSelected = () => {
    const chosen = registrations.filter((r) => selectedRegIds.has(r.id));
    if (chosen.length === 0) return;
    runBatchPrint(chosen).then(() => setSelectedRegIds(new Set()));
  };

  // "Imprimir todos" trae la lista completa de la conferencia de una sola
  // vez (ignora la paginación de la tabla) — es lo que se usa antes del
  // evento para sacar todos los gafetes juntos.
  const handlePrintAll = async () => {
    setBatchPrinting(true);
    setBatchError("");
    setBatchProgress({ current: 0, total: 0 });
    try {
      const data = await conferenceService.getRegistrations(id, { limit: 5000, offset: 0 });
      await runBatchPrint(data.registrations);
    } catch {
      setBatchError('No se pudo cargar la lista completa de asistentes.');
      setBatchPrinting(false);
      setBatchProgress(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  // Set de "registrationId:sessionId" para lookup O(1) al pintar la matriz
  // celda por celda, en vez de recorrer el arreglo de pares en cada render.
  // Debe ir antes de los `return` condicionales de abajo: los hooks no
  // pueden depender de si `conference` ya cargó o no.
  const attendedSet = useMemo(() => {
    if (!report) return new Set();
    return new Set(report.attendance.map((a) => `${a.registration_id}:${a.session_id}`));
  }, [report]);

  // Columnas que muestra la tabla de asistencia según el filtro elegido:
  // todas las sesiones, solo las de un día, o una sola clase.
  const visibleSessions = useMemo(() => {
    if (!report) return [];
    if (reportFilter === "all") return report.sessions;
    if (reportFilter.startsWith("day:")) {
      const dayNumber = Number(reportFilter.slice(4));
      return report.sessions.filter((s) => s.day_number === dayNumber);
    }
    if (reportFilter.startsWith("session:")) {
      const sessionId = reportFilter.slice(8);
      return report.sessions.filter((s) => s.id === sessionId);
    }
    return report.sessions;
  }, [report, reportFilter]);

  if (loading) return (
    <div className="flex justify-center items-center py-32 text-muted-foreground">
      <Loader2 size={36} className="animate-spin" />
    </div>
  );

  if (!conference) return null;

  const totalRegPages = Math.ceil(regTotal / LIMIT);

  return (
    <div className="space-y-6">

      {/* ── Back + Header ── */}
      <div>
        <button onClick={() => navigate('/dashboard/conference')}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-4 transition-colors">
          <ArrowLeft size={16} /> Todas las conferencias
        </button>

        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen size={20} className="text-amber-700 dark:text-amber-400 flex-shrink-0" />
                <h1 className="text-xl font-bold text-foreground truncate">{conference.name}</h1>
              </div>
              {conference.theme && (
                <p className="text-muted-foreground italic text-sm mb-1">{conference.theme}</p>
              )}
              {conference.theme_verse && (
                <p className="text-muted-foreground text-xs italic">"{conference.theme_verse}"</p>
              )}
              <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CalendarDays size={12} />
                  {new Date(String(conference.start_date).slice(0,10) + 'T00:00:00').toLocaleDateString('es', { day:'numeric', month:'short', year:'numeric' })}
                  {conference.start_date !== conference.end_date && ` → ${new Date(String(conference.end_date).slice(0,10) + 'T00:00:00').toLocaleDateString('es', { day:'numeric', month:'short', year:'numeric' })}`}
                </span>
                {conference.location && (
                  <span className="flex items-center gap-1"><MapPin size={12} />{conference.location}</span>
                )}
                <span className="flex items-center gap-1"><CalendarDays size={12} />{days.length} días</span>
                <span className="flex items-center gap-1"><Users size={12} />{stats?.total || 0} asistentes</span>
                <span className="flex items-center gap-1"><Church size={12} />{stats?.churches || 0} iglesias</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-lg w-fit">
        {[
          { key: "programa",   label: "Programa",   icon: CalendarDays },
          { key: "asistentes", label: "Asistentes", icon: Users },
          { key: "reportes",   label: "Reportes",   icon: BarChart3 },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
              activeTab === key
                ? "bg-background text-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            )}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════
          TAB: PROGRAMA (calendario dinámico)
      ════════════════════════════════════════ */}
      {activeTab === "programa" && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAddDayDialog(true)}
              className="flex items-center gap-2 text-sm border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40">
              <Plus size={14} /> Agregar Día
            </Button>
            <Button variant="outline" onClick={() => setShowProgramQR(true)}
              className="flex items-center gap-2 text-sm border-blue-700/60 text-blue-700 dark:text-blue-400 hover:border-blue-500">
              <QrCode size={14} /> Ver QR
            </Button>
            <Button variant="outline" disabled={pdfLoading === 'programa'}
              onClick={() => generateProgramaPDF(
                conference, days,
                () => setPdfLoading('programa'),
                () => setPdfLoading(null),
              )}
              className="flex items-center gap-2 text-sm border-emerald-700/60 text-emerald-700 dark:text-emerald-400 hover:text-emerald-700 dark:text-emerald-300 hover:border-emerald-500 disabled:opacity-50">
              {pdfLoading === 'programa'
                ? <Loader2 size={14} className="animate-spin" />
                : <FileDown size={14} />}
              PDF Programa
            </Button>
          </div>

          {days.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
              <CalendarDays size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium text-muted-foreground">Sin días en el programa</p>
              <p className="text-sm mt-1">Usa "Agregar Día" para construir el calendario</p>
            </div>
          ) : (
            /* Grid de días — scroll horizontal en mobile */
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-4 min-w-max">
                {days.map((day) => (
                  <div key={day.id} className="w-72 flex-shrink-0 bg-card rounded-xl border border-border flex flex-col">

                    {/* Cabecera del día */}
                    <div className="bg-muted/50 rounded-t-xl px-4 py-3 flex items-center justify-between border-b border-border">
                      <div>
                        <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Día {day.day_number}</p>
                        <p className="text-sm font-semibold text-foreground capitalize">{formatDate(day.day_date)}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteDay(day.id)}
                        disabled={deletingDay === day.id}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-700 dark:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Eliminar día"
                      >
                        {deletingDay === day.id
                          ? <Loader2 size={13} className="animate-spin" />
                          : <Trash2 size={13} />}
                      </button>
                    </div>

                    {/* Sesiones */}
                    <div className="flex flex-col gap-2 p-3 flex-1">
                      {day.sessions.length === 0 && (
                        <p className="text-center text-muted-foreground text-xs py-4 italic">Sin sesiones aún</p>
                      )}
                      {day.sessions.map((session) => {
                        return (
                          <div key={session.id}
                            className="bg-muted/50 rounded-lg p-3 border border-border group relative">
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <TypeBadge type={session.type} />
                              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                <button onClick={() => navigate(`/dashboard/conference/${id}/check-in/${session.id}`)}
                                  title="Escanear asistencia"
                                  className="p-1 rounded text-muted-foreground hover:text-blue-700 dark:text-blue-400 hover:bg-blue-500/10 transition-colors">
                                  <ScanLine size={11} />
                                </button>
                                <button onClick={() => openEditSession(session, day.id)}
                                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                                  <Pencil size={11} />
                                </button>
                                <button
                                  onClick={() => handleDeleteSession(session.id)}
                                  disabled={deletingSession === session.id}
                                  className="p-1 rounded text-muted-foreground hover:text-red-700 dark:text-red-400 hover:bg-red-500/10 transition-colors">
                                  {deletingSession === session.id
                                    ? <Loader2 size={11} className="animate-spin" />
                                    : <Trash2 size={11} />}
                                </button>
                              </div>
                            </div>
                            <p className="text-sm font-semibold text-foreground leading-tight">{session.title}</p>
                            {session.time_start && (
                              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <Clock size={10} /> {formatTime(session.time_start)}
                                {session.time_end && ` – ${formatTime(session.time_end)}`}
                              </p>
                            )}
                            {session.speaker && (
                              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                <Users size={10} /> {session.speaker}
                              </p>
                            )}
                            {session.scripture_ref && (
                              <p className="text-xs text-amber-400/70 mt-0.5 flex items-center gap-1">
                                <BookOpen size={10} /> {session.scripture_ref}
                              </p>
                            )}

                            {/* Estado en vivo: lo va cambiando quien controla la
                                conferencia según avanza el programa — la pantalla
                                del salón lo refleja solo (encuesta cada 60s). */}
                            <div className="relative mt-2">
                              <select
                                value={session.status || "PROGRAMADA"}
                                disabled={updatingStatusId === session.id}
                                onChange={(e) => handleChangeSessionStatus(session.id, e.target.value)}
                                className={cn(
                                  "w-full appearance-none rounded-md border px-2 py-1 text-[11px] font-semibold text-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60",
                                  SESSION_STATUS_CLASSES[session.status] || SESSION_STATUS_CLASSES.PROGRAMADA
                                )}
                              >
                                {SESSION_STATUSES.map((s) => (
                                  <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Botón agregar sesión */}
                    <div className="p-3 pt-0">
                      <button onClick={() => openAddSession(day.id)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 text-xs font-medium transition-colors">
                        <Plus size={13} /> Agregar Sesión
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════
          TAB: ASISTENTES
      ════════════════════════════════════════ */}
      {activeTab === "asistentes" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar por nombre, iglesia o teléfono…"
                value={regSearch}
                onChange={(e) => { setRegSearch(e.target.value); setRegPage(0); fetchRegistrations(e.target.value, 0); }} />
              {regSearch && (
                <button onClick={() => { setRegSearch(""); setRegPage(0); fetchRegistrations("", 0); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              )}
            </div>
            <Button onClick={openAddReg} className="flex items-center gap-2 flex-shrink-0">
              <Plus size={15} /> Registrar Asistente
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" disabled={batchPrinting || regTotal === 0}
              onClick={handlePrintAll}
              className="flex items-center gap-2 text-sm border-emerald-700/60 text-emerald-700 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:border-emerald-500 disabled:opacity-50">
              <Badge size={14} /> Imprimir todos ({regTotal})
            </Button>
            {selectedRegIds.size > 0 && (
              <Button variant="outline" disabled={batchPrinting}
                onClick={handlePrintSelected}
                className="flex items-center gap-2 text-sm border-blue-700/60 text-blue-700 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:border-blue-500 disabled:opacity-50">
                <Badge size={14} /> Imprimir seleccionados ({selectedRegIds.size})
              </Button>
            )}
            {batchPrinting && batchProgress && (
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 size={13} className="animate-spin" />
                {batchProgress.total > 0
                  ? `Generando gafete ${batchProgress.current} de ${batchProgress.total}…`
                  : "Cargando lista completa…"}
              </span>
            )}
            {batchError && (
              <span className="text-xs text-red-700 dark:text-red-400">{batchError}</span>
            )}
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 w-8">
                      <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible}
                        className="rounded border-border cursor-pointer" />
                    </th>
                    {["#","","Nombre","Iglesia","Ciudad","Teléfono",""].map((h, i) => (
                      <th key={`${h}-${i}`} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {regLoading ? (
                    <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">
                      <Loader2 size={24} className="animate-spin mx-auto" />
                    </td></tr>
                  ) : registrations.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">
                      <Users size={28} className="mx-auto mb-2 opacity-30" />
                      <p>Sin asistentes registrados</p>
                    </td></tr>
                  ) : registrations.map((reg, i) => (
                    <tr key={reg.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selectedRegIds.has(reg.id)} onChange={() => toggleSelectReg(reg.id)}
                          className="rounded border-border cursor-pointer" />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs tabular-nums">{regPage * LIMIT + i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-muted border border-border flex items-center justify-center shrink-0">
                          {reg.photo_url
                            ? <img src={reg.photo_url} alt="" className="w-full h-full object-cover" />
                            : <span className="text-[10px] font-semibold text-muted-foreground">{reg.full_name?.charAt(0)?.toUpperCase()}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {reg.full_name}
                        {reg.notes && <StickyNote size={11} className="inline ml-1.5 text-muted-foreground" title={reg.notes} />}
                        {reg.age_group === "NIÑO" && (
                          <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/40 align-middle">
                            Niño
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{reg.origin_church || <span className="text-muted-foreground italic text-xs">—</span>}</td>
                      <td className="px-4 py-3 text-muted-foreground">{reg.city || <span className="text-muted-foreground italic text-xs">—</span>}</td>
                      <td className="px-4 py-3 text-muted-foreground">{reg.phone || <span className="text-muted-foreground italic text-xs">—</span>}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            title="Gafete con QR de asistencia"
                            onClick={() => setBadgeReg(reg)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-700 dark:text-blue-400 hover:bg-blue-500/10 transition-colors">
                            <Badge size={13} />
                          </button>
                          <button
                            title="Vista previa del certificado"
                            onClick={() => setPreviewReg(reg)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 transition-colors">
                            <Award size={13} />
                          </button>
                          <button onClick={() => openEditReg(reg)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => setDeletingReg(reg)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-700 dark:text-red-400 hover:bg-red-500/10 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {regTotal > LIMIT && (
              <div className="px-4 py-3 border-t border-border flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{regPage * LIMIT + 1}–{Math.min((regPage + 1) * LIMIT, regTotal)} de {regTotal}</span>
                <div className="flex gap-2">
                  <button disabled={regPage === 0} onClick={() => setRegPage(p => p - 1)}
                    className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-30 text-muted-foreground">
                    <ChevronLeft size={16} />
                  </button>
                  <span className="px-2 py-1 text-muted-foreground">{regPage + 1}/{totalRegPages}</span>
                  <button disabled={regPage + 1 >= totalRegPages} onClick={() => setRegPage(p => p + 1)}
                    className="p-1.5 rounded-lg hover:bg-accent disabled:opacity-30 text-muted-foreground">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          TAB: REPORTES (por iglesia + matriz de asistencia)
      ════════════════════════════════════════ */}
      {activeTab === "reportes" && (
        <div className="space-y-6">
          {reportLoading ? (
            <div className="flex justify-center py-16 text-muted-foreground">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : !report || report.registrants.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
              <BarChart3 size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium text-muted-foreground">Sin datos todavía</p>
              <p className="text-sm mt-1">Registra asistentes y marca asistencia para ver reportes aquí</p>
            </div>
          ) : (
            <>
              {/* Resumen por iglesia */}
              <div>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Church size={12} /> Asistencia por iglesia
                </h2>
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          {["Iglesia", "Inscritos", "Asistencias registradas", "Promedio por persona"].map((h) => (
                            <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {report.byChurch.map((c) => (
                          <tr key={c.church} className="border-b border-border last:border-0">
                            <td className="px-4 py-2.5 font-medium text-foreground">{c.church}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{c.registrants}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{c.checkins}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">
                              {c.registrants ? (c.checkins / c.registrants).toFixed(1) : "0.0"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Matriz de asistencia: inscrito × sesión */}
              <div>
                <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <BarChart3 size={12} /> Tabla de asistencia
                  </h2>
                  <select
                    value={reportFilter}
                    onChange={(e) => setReportFilter(e.target.value)}
                    className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todas las sesiones</option>
                    {Array.from(new Set(report.sessions.map((s) => s.day_number))).map((dayNumber) => (
                      <optgroup key={dayNumber} label={`Día ${dayNumber}`}>
                        <option value={`day:${dayNumber}`}>Todo el día {dayNumber}</option>
                        {report.sessions.filter((s) => s.day_number === dayNumber).map((s) => (
                          <option key={s.id} value={`session:${s.id}`}>{s.title}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                {visibleSessions.length === 0 ? (
                  <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground text-sm">
                    {report.sessions.length === 0 ? "Aún no hay sesiones en el programa" : "Ninguna sesión coincide con el filtro"}
                  </div>
                ) : (
                  <div className="bg-card rounded-xl border border-border overflow-auto max-h-[32rem]">
                    <table className="text-sm border-collapse w-full">
                      <thead className="sticky top-0 z-20">
                        <tr>
                          <th className="sticky left-0 z-30 bg-card text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wide border-b border-r border-border whitespace-nowrap">
                            Asistente
                          </th>
                          {visibleSessions.map((s) => (
                            <th key={s.id} title={s.title}
                              className="bg-card text-center text-xs font-semibold text-muted-foreground px-3 py-3 border-b border-border whitespace-nowrap min-w-[84px]">
                              <div>Día {s.day_number}</div>
                              <div className="font-normal normal-case text-[11px] truncate max-w-[90px] mx-auto">{s.title}</div>
                              {s.time_start && <div className="font-normal normal-case text-[10px]">{formatTime(s.time_start)}</div>}
                            </th>
                          ))}
                          <th className="bg-card text-center text-xs font-semibold text-muted-foreground px-3 py-3 border-b border-border whitespace-nowrap">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.registrants.map((r) => {
                          const attendedCount = visibleSessions.filter((s) => attendedSet.has(`${r.id}:${s.id}`)).length;
                          return (
                            <tr key={r.id} className="hover:bg-muted/50 transition-colors">
                              <td className="sticky left-0 z-10 bg-card px-4 py-2 border-r border-b border-border">
                                <p className="font-medium text-foreground whitespace-nowrap">{r.full_name}</p>
                                <p className="text-xs text-muted-foreground whitespace-nowrap">{r.origin_church || "—"}</p>
                              </td>
                              {visibleSessions.map((s) => (
                                <td key={s.id} className="text-center px-3 py-2 border-b border-border">
                                  {attendedSet.has(`${r.id}:${s.id}`)
                                    ? <Check size={14} className="mx-auto text-emerald-700 dark:text-emerald-400" />
                                    : <Minus size={12} className="mx-auto text-muted-foreground/40" />}
                                </td>
                              ))}
                              <td className="text-center px-3 py-2 border-b border-border font-semibold text-foreground">
                                {attendedCount}/{visibleSessions.length}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ════ Dialog: Sesión ════ */}
      <Dialog open={sessionDialog} onOpenChange={setSessionDialog}>
        <DialogContent>
          <DialogHeader>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <CalendarDays size={18} className="text-amber-700 dark:text-amber-400" />
              {editingSession ? "Editar Sesión" : "Nueva Sesión"}
            </h2>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Tipo — el catálogo es de la iglesia: incluye sus tipos
                personalizados igual que los de fábrica, sin distinción. */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Tipo de sesión</label>
              <div className="grid grid-cols-2 gap-2">
                {sessionTypes.map((t) => {
                  const selected = sessionForm.sessionTypeId === t.id;
                  return (
                    <button key={t.id} type="button"
                      onClick={() => setSessionForm(p => ({ ...p, sessionTypeId: t.id }))}
                      className={cn(
                        "group/type relative flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-bold transition-all text-left",
                        selected ? badgeClasses(t.color) : "bg-muted/50 text-muted-foreground border-border hover:border-muted-foreground/40"
                      )}>
                      <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", swatchClasses(t.color))} />
                      <span className="truncate flex-1">{t.label}</span>
                      {!t.is_system && (
                        // Solo los personalizados se pueden borrar; los de
                        // fábrica se quedan siempre disponibles. stopPropagation
                        // para que el clic en la papelera no seleccione el tipo.
                        <span
                          role="button"
                          title="Eliminar tipo"
                          onClick={(e) => { e.stopPropagation(); handleDeleteType(t.id); }}
                          className="shrink-0 p-0.5 rounded opacity-0 group-hover/type:opacity-100 hover:bg-red-500/20 hover:text-red-700 dark:hover:text-red-400 transition-opacity"
                        >
                          {deletingTypeId === t.id
                            ? <Loader2 size={11} className="animate-spin" />
                            : <X size={11} />}
                        </span>
                      )}
                    </button>
                  );
                })}

                <button type="button" onClick={() => setShowNewType((v) => !v)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-dashed text-xs font-bold transition-all",
                    showNewType
                      ? "border-blue-500 text-blue-700 dark:text-blue-400 bg-blue-500/10"
                      : "border-border text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
                  )}>
                  <Plus size={14} /> Crear tipo
                </button>
              </div>

              {showNewType && (
                <div className="mt-3 p-3 rounded-lg border border-border bg-muted/30 space-y-3">
                  <Input
                    placeholder="Nombre del tipo (ej. Bautismos)"
                    value={newTypeLabel}
                    onChange={(e) => setNewTypeLabel(e.target.value)}
                    maxLength={80}
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    {SESSION_TYPE_COLORS.map((color) => (
                      <button key={color} type="button" title={color}
                        onClick={() => setNewTypeColor(color)}
                        className={cn(
                          "h-7 w-7 rounded-full flex items-center justify-center transition-transform",
                          swatchClasses(color),
                          newTypeColor === color ? "ring-2 ring-offset-2 ring-offset-card ring-foreground scale-105" : "hover:scale-105"
                        )}>
                        {newTypeColor === color && <Check size={13} className="text-white" />}
                      </button>
                    ))}
                  </div>
                  {typeError && <p className="text-xs text-red-700 dark:text-red-400">{typeError}</p>}
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm"
                      onClick={() => { setShowNewType(false); setTypeError(""); }}>
                      Cancelar
                    </Button>
                    <Button type="button" size="sm" onClick={handleCreateType} disabled={savingType}
                      className="flex items-center gap-1.5">
                      {savingType && <Loader2 size={13} className="animate-spin" />}
                      Guardar tipo
                    </Button>
                  </div>
                </div>
              )}
              {typeError && !showNewType && (
                <p className="text-xs text-red-700 dark:text-red-400 mt-2">{typeError}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Título <span className="text-red-700 dark:text-red-400">*</span>
              </label>
              <Input placeholder="Ej. La Implicancia del Amor"
                value={sessionForm.title}
                onChange={(e) => setSessionForm(p => ({ ...p, title: e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  <Clock size={10} className="inline mr-1" />Desde
                </label>
                <Input type="time" value={sessionForm.timeStart}
                  onChange={(e) => setSessionForm(p => ({ ...p, timeStart: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  <Clock size={10} className="inline mr-1" />Hasta
                </label>
                {/* Sin esto, la pantalla del salón solo puede adivinar cuándo
                    termina una sesión mirando cuándo empieza la siguiente —
                    y un receso o almuerzo aparece como si la clase anterior
                    siguiera en curso. */}
                <Input type="time" value={sessionForm.timeEnd}
                  onChange={(e) => setSessionForm(p => ({ ...p, timeEnd: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                <BookOpen size={10} className="inline mr-1" />Versículo
              </label>
              <Input placeholder="Ej. Juan 3:16"
                value={sessionForm.scriptureRef}
                onChange={(e) => setSessionForm(p => ({ ...p, scriptureRef: e.target.value }))} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                <Users size={10} className="inline mr-1" />Expositor / Speaker
              </label>
              <Input placeholder="Nombre del predicador o equipo"
                value={sessionForm.speaker}
                onChange={(e) => setSessionForm(p => ({ ...p, speaker: e.target.value }))} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notas</label>
              <textarea rows={2} placeholder="Detalles adicionales…"
                value={sessionForm.notes}
                onChange={(e) => setSessionForm(p => ({ ...p, notes: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-muted-foreground" />
            </div>

            {sessionError && (
              <p className="text-red-700 dark:text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{sessionError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setSessionDialog(false)} disabled={savingSession}>Cancelar</Button>
            <Button onClick={handleSaveSession} disabled={savingSession} className="flex items-center gap-2">
              {savingSession && <Loader2 size={14} className="animate-spin" />}
              {editingSession ? "Guardar" : "Agregar Sesión"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════ Dialog: Agregar día ════ */}
      <Dialog open={addDayDialog} onOpenChange={setAddDayDialog}>
        <DialogContent>
          <DialogHeader>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <CalendarDays size={18} className="text-amber-700 dark:text-amber-400" /> Agregar Día
            </h2>
          </DialogHeader>
          <div className="mt-2">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Fecha</label>
            <Input type="date" value={newDayDate} onChange={(e) => setNewDayDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddDayDialog(false)} disabled={savingDay}>Cancelar</Button>
            <Button onClick={handleAddDay} disabled={savingDay || !newDayDate} className="flex items-center gap-2">
              {savingDay && <Loader2 size={14} className="animate-spin" />}
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════ Dialog: Asistente ════ */}
      <Dialog open={regDialog} onOpenChange={setRegDialog}>
        <DialogContent>
          <DialogHeader>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Users size={18} className="text-amber-700 dark:text-amber-400" />
              {editingReg ? "Editar Asistente" : "Registrar Asistente"}
            </h2>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <RegPhotoUploader
              preview={regForm.photoUrl}
              onChange={(dataUrl) => setRegForm(p => ({ ...p, photoUrl: dataUrl }))}
              onRemove={() => setRegForm(p => ({ ...p, photoUrl: null }))}
            />
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Nombre Completo <span className="text-red-700 dark:text-red-400">*</span>
              </label>
              <Input placeholder="Nombre y apellido" value={regForm.fullName}
                onChange={(e) => setRegForm(p => ({ ...p, fullName: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  <Church size={10} className="inline mr-1" />Iglesia
                </label>
                <Input placeholder="Iglesia que representa" value={regForm.originChurch}
                  onChange={(e) => setRegForm(p => ({ ...p, originChurch: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  <MapPin size={10} className="inline mr-1" />Ciudad
                </label>
                <Input placeholder="Ciudad, Estado" value={regForm.city}
                  onChange={(e) => setRegForm(p => ({ ...p, city: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  <Phone size={10} className="inline mr-1" />Teléfono
                </label>
                <Input placeholder="(000) 000-0000" value={regForm.phone}
                  onChange={(e) => setRegForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  <Cake size={10} className="inline mr-1" />Fecha de nacimiento
                </label>
                <Input type="date" value={regForm.birthDate}
                  onChange={(e) => setRegForm(p => ({ ...p, birthDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Sexo</label>
              <div className="flex gap-2">
                {[{v: "MASCULINO", l: "Masculino"}, {v: "FEMENINO", l: "Femenino"}, {v: "OTRO", l: "Otro"}].map(({v, l}) => (
                  <button key={v} type="button"
                    onClick={() => setRegForm(p => ({ ...p, gender: p.gender === v ? "" : v }))}
                    className={cn(
                      "flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
                      regForm.gender === v
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-background border-border text-muted-foreground hover:bg-accent"
                    )}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Grupo de edad</label>
              <div className="flex gap-2">
                {AGE_GROUPS.map(({value, label}) => (
                  <button key={value} type="button"
                    onClick={() => setRegForm(p => ({ ...p, ageGroup: value }))}
                    className={cn(
                      "flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
                      regForm.ageGroup === value
                        ? "bg-amber-600 border-amber-600 text-white"
                        : "bg-background border-border text-muted-foreground hover:bg-accent"
                    )}>
                    {label}
                  </button>
                ))}
              </div>
              {regForm.birthDate && calcAge(regForm.birthDate) != null && (
                <p className="text-xs text-muted-foreground mt-1">Edad calculada: {calcAge(regForm.birthDate)} años</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notas</label>
              <textarea rows={2} placeholder="Observaciones…" value={regForm.notes}
                onChange={(e) => setRegForm(p => ({ ...p, notes: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-muted-foreground" />
            </div>
            {regError && (
              <p className="text-red-700 dark:text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{regError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRegDialog(false)} disabled={savingReg}>Cancelar</Button>
            <Button onClick={handleSaveReg} disabled={savingReg} className="flex items-center gap-2">
              {savingReg && <Loader2 size={14} className="animate-spin" />}
              {editingReg ? "Guardar" : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════ Dialog: Confirmar eliminar asistente ════ */}
      <Dialog open={Boolean(deletingReg)} onOpenChange={(v) => !v && setDeletingReg(null)}>
        <DialogContent>
          <DialogHeader>
            <h2 className="text-lg font-semibold text-foreground">Eliminar Asistente</h2>
          </DialogHeader>
          <p className="text-muted-foreground mt-2">
            ¿Eliminar a <strong className="text-foreground">{deletingReg?.full_name}</strong> del registro?
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeletingReg(null)}>Cancelar</Button>
            <Button onClick={handleDeleteReg} className="bg-red-600 hover:bg-red-700">Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════ Dialog: Vista previa del certificado ════ */}
      <CertificatePreviewDialog
        open={Boolean(previewReg)}
        onClose={() => setPreviewReg(null)}
        conference={conference}
        registration={previewReg}
        church={church}
        downloading={pdfLoading === `cert-${previewReg?.id}`}
        onDownload={() => generateCertificadoPDF(
          conference, previewReg, church,
          () => setPdfLoading(`cert-${previewReg?.id}`),
          () => setPdfLoading(null),
        )}
      />

      {/* ════ Dialog: Vista previa del gafete ════ */}
      <BadgePreviewDialog
        open={Boolean(badgeReg)}
        onClose={() => setBadgeReg(null)}
        conference={conference}
        registration={badgeReg}
        church={church}
        downloading={pdfLoading === `badge-${badgeReg?.id}`}
        onDownload={() => generateGafetePDF(
          conference, badgeReg, church,
          () => setPdfLoading(`badge-${badgeReg?.id}`),
          () => setPdfLoading(null),
        )}
      />

      {/* ════ Dialog: QR del programa general ════ */}
      <ProgramQRDialog
        open={showProgramQR}
        onClose={() => setShowProgramQR(false)}
        conference={conference}
      />
    </div>
  );
}

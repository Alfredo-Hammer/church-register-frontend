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
import { ParticipatingChurchesEditor } from "@/components/ConferenceCatalogs";
import {
  BookOpen, ArrowLeft, Plus, Trash2, Pencil, Users, Church,
  MapPin, Phone, CalendarDays, Clock, Loader2, Search, X,
  ChevronLeft, ChevronRight, ChevronDown, StickyNote, FileDown, Award,
  Badge, QrCode, Check, Camera, Cake, ScanLine, BarChart3, Minus,
  CheckCircle2, XCircle, RotateCcw, AlertTriangle, Lock,
  Link2, Copy, RefreshCw, Trophy, ClipboardCheck, ShieldCheck, Coffee, Eye, Monitor,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generateCertificadoPDF, generateGafetePDF, generateGafetesBatchPDF } from "@/utils/pdf/conferencePdf";
import { SESSION_TYPE_COLORS, badgeClasses, swatchClasses } from "@/utils/sessionTypeColors";
import { buildConferenceProgramBooklet } from "@/utils/reportPrint";

// ── Constantes ────────────────────────────────────────────────────────────────

const EMPTY_SESSION = { sessionTypeId: null, title: "", timeStart: "", timeEnd: "", speaker: "", scriptureRef: "", notes: "", takesAttendance: true };
const EMPTY_REG     = { fullName: "", phone: "", originChurch: "", city: "", notes: "", photoUrl: null, birthDate: "", gender: "", ageGroup: "ADULTO" };
const LIMIT         = 20;

// Estado de la conferencia — manual a propósito (no derivado de end_date):
// auto-bloquear por fecha haría que "Reabrir" se re-bloqueara solo en la
// siguiente lectura si la fecha de fin ya pasó, que es justo el caso que
// existe para reabrir. Mismos 3 valores que ConferencePage.jsx.
const CONFERENCE_STATUS = {
  ACTIVO:     { label: "Activa",     classes: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30", icon: CheckCircle2 },
  FINALIZADO: { label: "Finalizada", classes: "bg-muted text-muted-foreground border-border", icon: Clock },
  CANCELADO:  { label: "Cancelada",  classes: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30", icon: XCircle },
};
const CONFERENCE_LOCKED_STATUSES = ["FINALIZADO", "CANCELADO"];

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

function formatDateShort(dateStr) {
  const d = new Date(String(dateStr).slice(0, 10) + 'T00:00:00');
  return d.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(t) {
  if (!t) return null;
  const [h, m] = t.split(':');
  const hour = parseInt(h);
  return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

// "Ausente" solo aplica a una sesión que ya ocurrió y a la que nadie marcó
// asistencia; una sesión futura o en curso sin marcar es "pendiente", no una
// falta real. El backend ya manda `is_past` calculado con su propio reloj,
// pero por si acaso una sesión vieja no lo trae, se recalcula aquí igual.
function isSessionPast(session) {
  if (session.is_past !== undefined && session.is_past !== null) return session.is_past;
  if (!session.day_date) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dayDate = new Date(String(session.day_date).slice(0, 10) + 'T00:00:00');
  if (dayDate < today) return true;
  if (dayDate.getTime() === today.getTime() && session.time_end) {
    const [h, m] = session.time_end.split(':').map(Number);
    const end = new Date();
    end.setHours(h, m, 0, 0);
    return new Date() > end;
  }
  return false;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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
  const [activeDayId, setActiveDayId] = useState(null); // pestaña de día dentro de Programa

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

  // Catálogo de oradores (por iglesia) — mismo criterio que tipos de sesión
  const [speakers, setSpeakers]                 = useState([]);
  const [showNewSpeaker, setShowNewSpeaker]     = useState(false);
  const [newSpeakerName, setNewSpeakerName]     = useState("");
  const [newSpeakerTitle, setNewSpeakerTitle]   = useState("");
  const [savingSpeaker, setSavingSpeaker]       = useState(false);
  const [speakerError, setSpeakerError]         = useState("");
  const [deletingSpeakerId, setDeletingSpeakerId] = useState(null);

  // Catálogo de iglesias participantes (por iglesia anfitriona) — se
  // gestiona desde el panel del link de registro

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
  const [regChurchFilter, setRegChurchFilter] = useState("all");
  const [regDayFilter, setRegDayFilter]   = useState("all");
  const [regChurchOptions, setRegChurchOptions] = useState([]);
  const [regLoading, setRegLoading]       = useState(false);
  const [regDialog, setRegDialog]         = useState(false);
  const [editingReg, setEditingReg]       = useState(null);
  const [regForm, setRegForm]             = useState(EMPTY_REG);
  const [savingReg, setSavingReg]         = useState(false);
  const [regError, setRegError]           = useState("");
  const [deletingReg, setDeletingReg]     = useState(null);
  const [participatingChurches, setParticipatingChurches] = useState([]);
  const [regUseOtherChurch, setRegUseOtherChurch]         = useState(false);

  // PDF
  const [pdfLoading, setPdfLoading] = useState(null);
  const [previewReg, setPreviewReg] = useState(null);
  const [badgeReg, setBadgeReg] = useState(null);
  const [showProgramQR, setShowProgramQR] = useState(false);
  const [savingConfStatus, setSavingConfStatus] = useState(false);
  const [confirmConfStatus, setConfirmConfStatus] = useState(null); // "FINALIZADO" | "CANCELADO" | null
  // Pausa manual de la pantalla del salón (receso no planeado) — separada
  // del estado de la conferencia, ver DisplayPage.
  const [savingDisplayPause, setSavingDisplayPause] = useState(false);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [pauseMessageInput, setPauseMessageInput] = useState("");
  // Forzar a mano qué día muestra la pantalla del salón, en vez de dejarlo
  // siempre al cálculo automático por fecha.
  const [savingForcedDay, setSavingForcedDay] = useState(false);

  // Link público de auto-registro (iglesias invitadas registran a sus
  // miembros de antemano; en la puerta solo se recoge el gafete)
  const [showRegLink, setShowRegLink] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [confirmRegenLink, setConfirmRegenLink] = useState(false);
  const [regeneratingLink, setRegeneratingLink] = useState(false);

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

  const fetchSpeakers = useCallback(async () => {
    try {
      const data = await conferenceService.getSpeakers();
      setSpeakers(data.speakers);
    } catch { /* silent */ }
  }, []);

  const fetchParticipatingChurches = useCallback(async () => {
    try {
      const data = await conferenceService.getParticipatingChurches();
      setParticipatingChurches(data.churches.filter((c) => c.is_active));
    } catch { /* silent */ }
  }, []);

  const fetchRegistrations = useCallback(async (
    search = regSearch,
    page = regPage,
    churchFilter = regChurchFilter,
    dayFilter = regDayFilter
  ) => {
    setRegLoading(true);
    try {
      const data = await conferenceService.getRegistrations(id, {
        search: search || undefined,
        originChurch: churchFilter && churchFilter !== 'all' ? churchFilter : undefined,
        dayNumber: dayFilter && dayFilter !== 'all' ? dayFilter : undefined,
        limit: LIMIT,
        offset: page * LIMIT,
      });
      setRegistrations(data.registrations);
      setRegTotal(data.pagination.total);
      setRegChurchOptions(data.churches || []);
    } catch { /* silent */ }
    setRegLoading(false);
  }, [id, regSearch, regPage, regChurchFilter, regDayFilter]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchConference();
      await fetchStats();
      await fetchSessionTypes();
      await fetchSpeakers();
      await fetchParticipatingChurches();
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
  }, [fetchConference, fetchStats, fetchSessionTypes, fetchSpeakers, fetchParticipatingChurches]);

  useEffect(() => {
    if (activeTab === "asistentes") {
      fetchRegistrations(regSearch, regPage, regChurchFilter, regDayFilter);
    }
  }, [activeTab, fetchRegistrations, regSearch, regPage, regChurchFilter, regDayFilter]);

  const fetchReport = useCallback(async () => {
    setReportLoading(true);
    try {
      const data = await conferenceService.getAttendanceReport(id);
      setReport(data);
    } catch { /* silent */ }
    setReportLoading(false);
  }, [id]);

  useEffect(() => {
    if (activeTab === "reportes" || activeTab === "ranking") fetchReport();
  }, [activeTab, fetchReport]);

  // ── Sesiones ───────────────────────────────────────────────────────────────

  // Tipo por defecto para una sesión nueva: "Clase bíblica" si existe (el más
  // común), si no el primero del catálogo de la iglesia.
  const defaultTypeId = () =>
    sessionTypes.find((t) => t.key === "CLASE_BIBLICA")?.id ?? sessionTypes[0]?.id ?? null;

  // Sugiere como hora de inicio la hora de fin de la última sesión del día
  // (la que termina más tarde, no necesariamente la última en la lista) —
  // así no hay que volver a escribir a mano la misma hora que ya se usó.
  // Si esa sesión no tiene hora de fin, usa su hora de inicio en su lugar.
  const suggestedStartTime = (dayId) => {
    const day = days.find((d) => d.id === dayId);
    const sessions = day?.sessions || [];
    let latest = null;
    for (const s of sessions) {
      const t = (s.time_end || s.time_start)?.slice(0, 5);
      if (t && (!latest || t > latest)) latest = t;
    }
    return latest || "";
  };

  const openAddSession = (dayId) => {
    setTargetDayId(dayId);
    setEditingSession(null);
    setSessionForm({ ...EMPTY_SESSION, sessionTypeId: defaultTypeId(), timeStart: suggestedStartTime(dayId) });
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
      takesAttendance: session.takes_attendance ?? true,
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

  const handleCreateSpeaker = async () => {
    if (!newSpeakerName.trim()) return setSpeakerError("Ponle un nombre al orador.");
    setSavingSpeaker(true);
    setSpeakerError("");
    try {
      const data = await conferenceService.createSpeaker({
        fullName: newSpeakerName.trim(),
        title: newSpeakerTitle.trim() || undefined,
      });
      await fetchSpeakers();
      setSessionForm((p) => ({ ...p, speaker: data.speaker.full_name }));
      setNewSpeakerName("");
      setNewSpeakerTitle("");
      setShowNewSpeaker(false);
    } catch (err) {
      setSpeakerError(err.response?.data?.error || "No se pudo agregar el orador.");
    }
    setSavingSpeaker(false);
  };

  const handleDeleteSpeaker = async (speakerId) => {
    setDeletingSpeakerId(speakerId);
    try {
      await conferenceService.deleteSpeaker(speakerId);
      await fetchSpeakers();
    } catch { /* silent */ }
    setDeletingSpeakerId(null);
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

  const handleChangeConferenceStatus = async (status) => {
    setSavingConfStatus(true);
    try {
      await conferenceService.updateStatus(id, status);
      await fetchConference();
      setConfirmConfStatus(null);
    } catch { /* silent */ }
    setSavingConfStatus(false);
  };

  const handlePauseDisplay = async () => {
    setSavingDisplayPause(true);
    try {
      await conferenceService.updateDisplayPause(id, true, pauseMessageInput);
      await fetchConference();
      setShowPauseDialog(false);
      setPauseMessageInput("");
    } catch { /* silent */ }
    setSavingDisplayPause(false);
  };

  const handleResumeDisplay = async () => {
    setSavingDisplayPause(true);
    try {
      await conferenceService.updateDisplayPause(id, false);
      await fetchConference();
    } catch { /* silent */ }
    setSavingDisplayPause(false);
  };

  const handleForceDisplayDay = async (dayId) => {
    setSavingForcedDay(true);
    try {
      await conferenceService.updateDisplayForcedDay(id, dayId);
      await fetchConference();
    } catch { /* silent */ }
    setSavingForcedDay(false);
  };

  // Librillo del programa — misma vista previa en pestaña nueva que ya usa
  // Programa (ver ProgramPage.jsx): se abre el HTML completo para revisarlo
  // antes de imprimir/guardar, en vez de descargar un PDF a ciegas.
  const handleOpenProgramPrint = async () => {
    // Se abre la pestaña ANTES de esperar el QR: si se abriera después del
    // await, el navegador ya no lo asocia con el clic del usuario y puede
    // bloquearla como popup.
    const win = window.open('', '_blank');
    const html = await buildConferenceProgramBooklet(conference, days, church || {});
    if (!win) return;
    win.document.write(html);
    win.document.close();
  };

  const handleCopyRegLink = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch { /* el navegador negó el permiso; no hay nada más que hacer */ }
  };

  const handleRegenerateRegLink = async () => {
    setRegeneratingLink(true);
    try {
      const data = await conferenceService.regenerateRegistrationToken(id);
      setConference((prev) => ({ ...prev, registration_token: data.registrationToken }));
      setConfirmRegenLink(false);
    } catch { /* silent */ }
    setRegeneratingLink(false);
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
    setRegUseOtherChurch(participatingChurches.length === 0);
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
    // Si la iglesia guardada no está en el catálogo (o no hay catálogo), usar texto libre
    setRegUseOtherChurch(
      participatingChurches.length === 0 ||
      (!!reg.origin_church && !participatingChurches.some((c) => c.name === reg.origin_church))
    );
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
      fetchRegistrations(regSearch, regPage, regChurchFilter, regDayFilter);
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
      fetchRegistrations(regSearch, regPage, regChurchFilter, regDayFilter);
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
      const data = await conferenceService.getRegistrations(id, {
        limit: 5000,
        offset: 0,
        search: regSearch || undefined,
        originChurch: regChurchFilter && regChurchFilter !== 'all' ? regChurchFilter : undefined,
        dayNumber: regDayFilter && regDayFilter !== 'all' ? regDayFilter : undefined,
      });
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
    if (!report) return new Map();
    return new Map(report.attendance.map((a) => [`${a.registration_id}:${a.session_id}`, a.status || "PRESENTE"]));
  }, [report]);

  // Columnas que muestra la tabla de asistencia según la pestaña elegida:
  // todas las sesiones, o solo las de un día. Siempre de la más temprana a
  // la más tardía (izquierda a derecha), sin importar el orden en que se
  // hayan creado — las sin hora (time_start null) quedan al final.
  const visibleSessions = useMemo(() => {
    if (!report) return [];
    const bySchedule = (a, b) => {
      if (a.day_number !== b.day_number) return a.day_number - b.day_number;
      if (!a.time_start && !b.time_start) return 0;
      if (!a.time_start) return 1;
      if (!b.time_start) return -1;
      return a.time_start.localeCompare(b.time_start);
    };
    const sessions = reportFilter.startsWith("day:")
      ? report.sessions.filter((s) => s.day_number === Number(reportFilter.slice(4)))
      : report.sessions;
    return [...sessions].sort(bySchedule);
  }, [report, reportFilter]);

  const filteredReportLabel = useMemo(() => {
    if (!report) return "Reporte";
    if (reportFilter === "all") return "Reporte general";
    const dayNumber = Number(reportFilter.slice(4));
    const day = report.sessions.find((s) => s.day_number === dayNumber);
    return day ? `Reporte del día ${dayNumber}` : `Reporte del día ${dayNumber}`;
  }, [report, reportFilter]);

  const sessionParticipationLeaderboard = useMemo(() => {
    if (!report || !visibleSessions.length) return [];

    const registrantById = new Map((report.registrants || []).map((r) => [r.id, r]));

    return visibleSessions.map((session) => {
      const counts = new Map();

      (report.attendance || []).forEach((entry) => {
        if (entry.session_id !== session.id) return;
        const registrant = registrantById.get(entry.registration_id);
        if (!registrant) return;
        const churchName = (registrant.origin_church || 'Sin especificar').trim() || 'Sin especificar';
        counts.set(churchName, (counts.get(churchName) || 0) + 1);
      });

      const churches = [...counts.entries()]
        .map(([church, count]) => ({ church, count }))
        .sort((a, b) => b.count - a.count || a.church.localeCompare(b.church))
        .slice(0, 5);

      return {
        sessionId: session.id,
        title: session.title || `Sesión ${session.day_number}`,
        churches,
      };
    });
  }, [report, visibleSessions]);

  const openFilteredReportWindow = (print = false) => {
    if (!report || !visibleSessions.length) return;

    const summaryRows = report.byChurch.map((church) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #0f172a;">${escapeHtml(church.church)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #334155; text-align: center;">${church.registrants}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #334155; text-align: center;">${church.checkins}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #334155; text-align: center;">${church.registrants ? (church.checkins / church.registrants).toFixed(1) : '0.0'}</td>
      </tr>
    `).join('');

    const rankingHtml = sessionParticipationLeaderboard.map((session) => `
      <div style="margin-top: 18px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #fff;">
        <div style="padding: 12px 14px; background: linear-gradient(180deg, #f8fafc, #f1f5f9); border-bottom: 1px solid #e2e8f0; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: #475569; font-weight:700;">
          ${escapeHtml(session.title)}
        </div>
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr>
              <th style="text-align:left; padding:10px 12px; font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:#475569; border-bottom:1px solid #e2e8f0;">Lugar</th>
              <th style="text-align:left; padding:10px 12px; font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:#475569; border-bottom:1px solid #e2e8f0;">Iglesia</th>
              <th style="text-align:center; padding:10px 12px; font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:#475569; border-bottom:1px solid #e2e8f0;">Asistencias</th>
            </tr>
          </thead>
          <tbody>
            ${session.churches.length
              ? session.churches.map((entry, index) => `
                  <tr>
                    <td style="padding:10px 12px; border-bottom:1px solid #e2e8f0; color:#0f172a; font-weight:700;">#${index + 1}</td>
                    <td style="padding:10px 12px; border-bottom:1px solid #e2e8f0; color:#0f172a;">${escapeHtml(entry.church)}</td>
                    <td style="padding:10px 12px; border-bottom:1px solid #e2e8f0; text-align:center; color:#334155; font-weight:700;">${entry.count}</td>
                  </tr>
                `).join('')
              : '<tr><td colspan="3" style="padding:12px; color:#64748b;">Sin asistencia registrada</td></tr>'}
          </tbody>
        </table>
      </div>
    `).join('');

    const rowsHtml = report.registrants.map((r) => {
      const attendedCount = visibleSessions.filter((s) => attendedSet.has(`${r.id}:${s.id}`)).length;
      const cells = visibleSessions.map((s) => {
        const status = attendedSet.get(`${r.id}:${s.id}`);
        const cellStyles = {
          PRESENTE:    { bg: '#ecfdf5', mark: '<span style="color:#15803d; font-weight:700; font-size:16px;">✓</span>' },
          TARDE:       { bg: '#fffbeb', mark: '<span style="color:#b45309; font-weight:700; font-size:12px;">T</span>' },
          JUSTIFICADO: { bg: '#eff6ff', mark: '<span style="color:#1d4ed8; font-weight:700; font-size:12px;">J</span>' },
        };
        const style = cellStyles[status];
        const past = isSessionPast(s);
        return `
        <td style="border:1px solid #e2e8f0; padding:10px 8px; text-align:center; background:${style ? style.bg : (past ? '#fef2f2' : '#ffffff')};">
          ${style
            ? style.mark
            : (past
                ? '<span style="color:#dc2626; font-weight:700; font-size:12px;">✕</span>'
                : '<span style="color:#94a3b8; font-size:12px;">—</span>')}
        </td>
      `;
      }).join('');

      return `
        <tr>
          <td style="border:1px solid #e2e8f0; padding:10px 12px; min-width:200px; background:#fff;">
            <div style="font-weight:700; color:#0f172a;">${escapeHtml(r.full_name || 'Sin nombre')}</div>
            <div style="font-size:12px; color:#475569; margin-top:3px;">${escapeHtml(r.origin_church || '—')}</div>
          </td>
          ${cells}
          <td style="border:1px solid #e2e8f0; padding:10px 8px; text-align:center; font-weight:700; color:#0f172a; background:#f8fafc;">${attendedCount}/${visibleSessions.length}</td>
        </tr>
      `;
    }).join('');

    const headersHtml = visibleSessions.map((s) => `
      <th style="border:1px solid #e2e8f0; background:linear-gradient(180deg,#f8fafc,#f1f5f9); padding:10px 8px; min-width:88px; text-align:center;">
        <div style="font-size:10px; letter-spacing:0.12em; text-transform:uppercase; color:#64748b;">Día ${s.day_number}</div>
        <div style="font-size:11px; color:#0f172a; font-weight:700; margin-top:5px; line-height:1.3;">${escapeHtml(s.title || 'Sesión')}</div>
        ${s.time_start ? `<div style="font-size:10px; color:#64748b; margin-top:4px;">${escapeHtml(formatTime(s.time_start))}</div>` : ''}
      </th>
    `).join('');

    const logoHtml = church?.logoUrl
      ? `<img src="${escapeHtml(church.logoUrl)}" alt="Logo" />`
      : `<div style="font-size: 18px; font-weight: 700;">${escapeHtml((conference?.name || 'I').charAt(0).toUpperCase())}</div>`;

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(filteredReportLabel)}</title>
          <style>
            :root {
              --bg: #f8fafc;
              --panel: #ffffff;
              --ink: #0f172a;
              --muted: #475569;
              --line: #e2e8f0;
              --brand: #1d4ed8;
              --brand-soft: #dbeafe;
              --success: #15803d;
              --success-soft: #ecfdf5;
            }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              font-family: "Segoe UI", Arial, sans-serif;
              background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
              color: var(--ink);
            }
            .page {
              max-width: 1200px;
              margin: 0 auto;
              padding: 32px 28px 40px;
            }
            .header {
              background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
              color: white;
              border-radius: 18px;
              padding: 22px 24px;
              box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 18px;
            }
            .header-brand {
              display: flex;
              align-items: center;
              gap: 14px;
              min-width: 0;
            }
            .logo {
              width: 56px;
              height: 56px;
              border-radius: 14px;
              background: rgba(255,255,255,0.12);
              border: 1px solid rgba(255,255,255,0.2);
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
              flex-shrink: 0;
            }
            .logo img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .eyebrow {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.14em;
              opacity: 0.8;
              font-weight: 700;
            }
            h1 {
              margin: 8px 0 6px;
              font-size: 30px;
              line-height: 1.2;
            }
            .meta {
              font-size: 13px;
              opacity: 0.9;
            }
            .summary {
              margin-top: 22px;
              background: var(--panel);
              border: 1px solid var(--line);
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
            }
            .summary h2, .table-wrap h2 {
              margin: 0;
              font-size: 13px;
              letter-spacing: 0.12em;
              text-transform: uppercase;
              color: #475569;
              background: #f8fafc;
              border-bottom: 1px solid var(--line);
              padding: 12px 16px;
            }
            .footer {
              margin-top: 28px;
              border-top: 1px solid var(--line);
              padding-top: 14px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 16px;
              color: #64748b;
              font-size: 11px;
              flex-wrap: wrap;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              vertical-align: top;
            }
            .summary-table th, .summary-table td {
              border-bottom: 1px solid var(--line);
              padding: 12px 16px;
            }
            .summary-table th {
              text-align: left;
              color: #475569;
              font-size: 11px;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              background: #f8fafc;
            }
            .table-wrap {
              margin-top: 22px;
              background: var(--panel);
              border: 1px solid var(--line);
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
            }
            .attendance-table {
              display: block;
              overflow-x: auto;
              white-space: nowrap;
            }
            .attendance-table th {
              font-size: 11px;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              color: #475569;
              background: #f8fafc;
            }
            .label {
              color: #64748b;
              font-size: 11px;
            }
            @media print {
              body { background: white; }
              .page { padding: 0; max-width: none; }
              .header { border-radius: 0; }
              .summary, .table-wrap { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div class="header-brand">
                <div class="logo">
                  ${logoHtml}
                </div>
                <div>
                  <div class="eyebrow">Reporte de asistencia</div>
                  <h1>${escapeHtml(filteredReportLabel)}</h1>
                  <div class="meta">${escapeHtml(conference?.name || 'Conferencia')} • ${reportFilter === 'all' ? 'Todos los días' : 'Filtro por día'}</div>
                </div>
              </div>
              <div style="font-size: 12px; opacity: 0.85; text-align: right; max-width: 220px;">
                <div style="font-weight:700; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase;">Lema</div>
                <div>${escapeHtml(conference?.theme || 'Sin lema')}</div>
              </div>
            </div>

            <div class="summary">
              <h2>Resumen por iglesia</h2>
              <table class="summary-table">
                <thead>
                  <tr>
                    <th>Iglesia</th>
                    <th style="text-align:center;">Inscritos</th>
                    <th style="text-align:center;">Asistencias</th>
                    <th style="text-align:center;">Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  ${summaryRows || '<tr><td colspan="4" style="padding:12px; color:#64748b;">Sin datos</td></tr>'}
                </tbody>
              </table>
            </div>

            <div class="summary" style="margin-top: 22px;">
              <h2>Top iglesias por participación</h2>
              <div style="padding: 16px; background: #fff;">
                ${rankingHtml || '<div style="padding: 12px; color:#64748b;">Sin datos</div>'}
              </div>
            </div>

            <div class="table-wrap">
              <h2>Asistencia por sesión</h2>
              <div class="attendance-table">
                <table>
                  <thead>
                    <tr>
                      <th style="border:1px solid #e2e8f0; background:linear-gradient(180deg,#f8fafc,#f1f5f9); padding:12px 14px; min-width:210px; text-align:left;">Asistente</th>
                      ${headersHtml}
                      <th style="border:1px solid #e2e8f0; background:linear-gradient(180deg,#f8fafc,#f1f5f9); padding:12px 10px; min-width:78px; text-align:center;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rowsHtml || '<tr><td colspan="999" style="padding:16px; color:#64748b;">Sin registros</td></tr>'}
                  </tbody>
                </table>
              </div>
            </div>

            <div class="footer">
              <div>${escapeHtml(conference?.name || 'Conferencia')}</div>
              <div>${escapeHtml(conference?.location || 'Sin ubicación')}</div>
              <div>${escapeHtml(reportFilter === 'all' ? 'Reporte general' : filteredReportLabel)}</div>
              <div>${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
            </div>
          </div>
        </body>
      </html>
    `;

    const newWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!newWindow) return;
    newWindow.document.open();
    newWindow.document.write(html);
    newWindow.document.close();
    if (print) {
      setTimeout(() => {
        newWindow.focus();
        newWindow.print();
      }, 300);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center py-32 text-muted-foreground">
      <Loader2 size={36} className="animate-spin" />
    </div>
  );

  if (!conference) return null;

  const totalRegPages = Math.ceil(regTotal / LIMIT);

  const confStatus = CONFERENCE_STATUS[conference.status] || CONFERENCE_STATUS.ACTIVO;
  const ConfStatusIcon = confStatus.icon;
  const isLocked = CONFERENCE_LOCKED_STATUSES.includes(conference.status);
  // Sugerencia, no automatismo: si ya pasó end_date y nadie la cerró, se
  // ofrece finalizarla con un clic en vez de cambiarle el estado sola.
  const alreadyEnded = !isLocked && String(conference.end_date).slice(0, 10) < new Date().toISOString().slice(0, 10);

  // Día activo dentro de la pestaña Programa: si el que estaba activo ya no
  // existe (se borró, o es la primera carga) cae al primero de la lista en
  // vez de dejar la tabla vacía.
  const currentDayId = days.some((d) => d.id === activeDayId) ? activeDayId : days[0]?.id;
  const currentDay = days.find((d) => d.id === currentDayId) || null;

  return (
    <div className="space-y-6">

      {/* ── Back + Header ── */}
      <div>
        <button onClick={() => navigate('/dashboard/conference')}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-4 transition-colors">
          <ArrowLeft size={16} /> Todas las conferencias
        </button>

        <div className="rounded-3xl border border-border bg-gradient-to-br from-card via-card to-blue-500/5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-5 md:p-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30 shrink-0">
                  <BookOpen size={18} />
                </div>
                <h1 className="text-xl sm:text-2xl md:text-[1.75rem] font-bold tracking-tight text-foreground break-words">{conference.name}</h1>
                <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border flex-shrink-0 shadow-sm", confStatus.classes)}>
                  <ConfStatusIcon size={11} /> {confStatus.label}
                </span>
              </div>
              {conference.theme && (
                <p className="text-sm md:text-base text-muted-foreground italic font-medium">{conference.theme}</p>
              )}
              {conference.theme_verse && (
                <p className="mt-1 text-xs md:text-sm text-muted-foreground/80 italic">"{conference.theme_verse}"</p>
              )}
              <div className="flex flex-wrap gap-2 mt-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-background/80 px-2.5 py-1.5">
                  <CalendarDays size={12} />
                  {new Date(String(conference.start_date).slice(0,10) + 'T00:00:00').toLocaleDateString('es', { day:'numeric', month:'short', year:'numeric' })}
                  {conference.start_date !== conference.end_date && ` → ${new Date(String(conference.end_date).slice(0,10) + 'T00:00:00').toLocaleDateString('es', { day:'numeric', month:'short', year:'numeric' })}`}
                </span>
                {conference.location && (
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-background/80 px-2.5 py-1.5"><MapPin size={12} />{conference.location}</span>
                )}
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-background/80 px-2.5 py-1.5"><CalendarDays size={12} />{days.length} días</span>
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-background/80 px-2.5 py-1.5"><Users size={12} />{stats?.total || 0} asistentes</span>
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-background/80 px-2.5 py-1.5"><Church size={12} />{stats?.churches || 0} iglesias</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isLocked ? (
                <Button variant="outline" disabled={savingConfStatus}
                  onClick={() => handleChangeConferenceStatus("ACTIVO")}
                  className="flex items-center gap-2 text-sm border-blue-700/60 text-blue-700 dark:text-blue-400 hover:border-blue-500 disabled:opacity-50">
                  {savingConfStatus ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                  Reabrir
                </Button>
              ) : (
                <>
                  <Button variant="outline" disabled={savingConfStatus}
                    onClick={() => setConfirmConfStatus("FINALIZADO")}
                    className="flex items-center gap-2 text-sm border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 disabled:opacity-50">
                    <CheckCircle2 size={14} /> Finalizar
                  </Button>
                  <Button variant="outline" disabled={savingConfStatus}
                    onClick={() => setConfirmConfStatus("CANCELADO")}
                    className="flex items-center gap-2 text-sm border-red-700/60 text-red-700 dark:text-red-400 hover:border-red-500 disabled:opacity-50">
                    <XCircle size={14} /> Cancelar
                  </Button>
                </>
              )}
            </div>
          </div>

          {alreadyEnded && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
              <span className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle size={14} /> Esta conferencia ya terminó. ¿La marcamos como finalizada?
              </span>
              <button onClick={() => setConfirmConfStatus("FINALIZADO")}
                className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline flex-shrink-0">
                Finalizar ahora
              </button>
            </div>
          )}

          {isLocked && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              <Lock size={13} className="flex-shrink-0" />
              Esta conferencia está {confStatus.label.toLowerCase()} — no se puede editar el programa ni los asistentes hasta que la reabras.
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-border bg-muted/50 p-1.5 shadow-inner">
        {[
          { key: "programa",   label: "Programa",   icon: CalendarDays },
          { key: "asistentes", label: "Asistentes", icon: Users },
          { key: "ranking",    label: "Ranking",    icon: Trophy },
          { key: "reportes",   label: "Reportes",   icon: BarChart3 },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200",
              activeTab === key
                ? "bg-background text-foreground shadow-sm border border-border/80 ring-1 ring-blue-500/15"
                : "text-muted-foreground hover:text-foreground hover:bg-background/70"
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
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setAddDayDialog(true)} disabled={isLocked}
              className="flex items-center gap-2 text-sm border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 disabled:opacity-50">
              <Plus size={14} /> Agregar Día
            </Button>
            <Button variant="outline" onClick={() => setShowProgramQR(true)}
              className="flex items-center gap-2 text-sm border-blue-700/60 text-blue-700 dark:text-blue-400 hover:border-blue-500">
              <QrCode size={14} /> Ver QR
            </Button>
            {conference.display_paused ? (
              <Button variant="outline" onClick={handleResumeDisplay} disabled={savingDisplayPause}
                className="flex items-center gap-2 text-sm border-amber-500/60 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:border-amber-500 disabled:opacity-50">
                {savingDisplayPause ? <Loader2 size={14} className="animate-spin" /> : <Coffee size={14} />}
                Pantalla en receso · Reanudar
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setShowPauseDialog(true)}
                className="flex items-center gap-2 text-sm border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40">
                <Coffee size={14} /> Pausar pantalla
              </Button>
            )}
            <Button variant="outline" onClick={handleOpenProgramPrint}
              className="flex items-center gap-2 text-sm border-emerald-700/60 text-emerald-700 dark:text-emerald-400 hover:text-emerald-700 dark:text-emerald-300 hover:border-emerald-500">
              <Eye size={14} />
              Vista previa del programa
            </Button>
            {/* Forzar a mano qué día muestra la pantalla del salón — por
                defecto queda en automático (calcula el día por la fecha real). */}
            {days.length > 0 && (
              <div className={cn(
                "flex items-center gap-1.5 pl-2.5 pr-1.5 rounded-lg text-sm border",
                conference.display_forced_day_id
                  ? "border-blue-500/60 bg-blue-500/10 text-blue-700 dark:text-blue-400"
                  : "border-border text-muted-foreground",
              )}>
                <Monitor size={14} className="shrink-0" />
                <select
                  value={conference.display_forced_day_id || ""}
                  disabled={savingForcedDay}
                  onChange={(e) => handleForceDisplayDay(e.target.value || null)}
                  className="bg-transparent text-sm py-1.5 pr-1 focus:outline-none disabled:opacity-50"
                  title="Forzar qué día muestra la pantalla del salón"
                >
                  <option value="">Pantalla: Automático</option>
                  {days.map((day) => (
                    <option key={day.id} value={day.id}>
                      Pantalla: Día {day.day_number} · {formatDateShort(day.day_date)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {days.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
              <CalendarDays size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium text-muted-foreground">Sin días en el programa</p>
              <p className="text-sm mt-1">Usa "Agregar Día" para construir el calendario</p>
            </div>
          ) : (
            <>
              {/* Pestañas de día — la tabla de abajo solo muestra un día a la
                  vez. Con una conferencia de varios días, mezclar todo en una
                  sola tabla larga era tan difícil de escanear como las
                  tarjetas que reemplazó. */}
              <div className="flex gap-1 bg-muted/50 p-1 rounded-lg w-fit overflow-x-auto max-w-full">
                {days.map((day) => (
                  <button key={day.id} onClick={() => setActiveDayId(day.id)}
                    className={cn(
                      "flex flex-col items-center px-3.5 py-1.5 rounded-md text-sm font-medium transition-all flex-shrink-0",
                      currentDayId === day.id
                        ? "bg-background text-foreground shadow"
                        : "text-muted-foreground hover:text-foreground"
                    )}>
                    <span>Día {day.day_number}</span>
                    <span className="text-[10px] font-normal capitalize opacity-70">{formatDateShort(day.day_date)}</span>
                  </button>
                ))}
              </div>

              {currentDay && (
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-border bg-muted/30">
                    <span className="text-sm font-semibold text-foreground capitalize">{formatDate(currentDay.day_date)}</span>
                    <div className="flex items-center gap-1">
                      {/* Mismo forzado que el selector "Pantalla" de arriba, pero a
                          mano desde el día que ya estás viendo — sin tener que
                          buscarlo en el dropdown de otro lugar. */}
                      <button
                        onClick={() => handleForceDisplayDay(conference.display_forced_day_id === currentDay.id ? null : currentDay.id)}
                        disabled={savingForcedDay}
                        title={conference.display_forced_day_id === currentDay.id ? "Volver la pantalla a automático" : "Forzar este día en la pantalla del salón"}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50",
                          conference.display_forced_day_id === currentDay.id
                            ? "text-blue-700 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent",
                        )}
                      >
                        <Monitor size={12} />
                        {conference.display_forced_day_id === currentDay.id ? "En pantalla" : "Mostrar en pantalla"}
                      </button>
                      {!isLocked && (
                        <>
                          <button onClick={() => openAddSession(currentDay.id)}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                            <Plus size={12} /> Agregar Sesión
                          </button>
                          <button onClick={() => handleDeleteDay(currentDay.id)}
                            disabled={deletingDay === currentDay.id}
                            title="Eliminar día"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-700 dark:text-red-400 hover:bg-red-500/10 transition-colors">
                            {deletingDay === currentDay.id
                              ? <Loader2 size={13} className="animate-spin" />
                              : <Trash2 size={13} />}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Lista de sesiones — filas flex en vez de <table>: la tabla
                      con 5 columnas obligaba a scroll horizontal en móvil y
                      escondía las acciones detrás de un hover que el touch no
                      dispara. Este layout se reacomoda solo por breakpoint y
                      las acciones quedan siempre visibles; también es más
                      compacto verticalmente para programas con muchas sesiones. */}
                  {currentDay.sessions.length === 0 ? (
                    <p className="px-4 py-8 text-center text-xs text-muted-foreground italic">Sin sesiones aún</p>
                  ) : (
                    <div className="divide-y divide-border/60">
                      {currentDay.sessions.map((session) => (
                        <div key={session.id}
                          className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 px-3 sm:px-4 py-2.5 hover:bg-muted/40 transition-colors">
                          {/* Hora (+ tipo, solo en móvil). Inicio y fin en
                              líneas separadas — en una sola línea "11:00 AM –
                              12:00 PM" no cabía en una columna angosta y se
                              montaba encima de la píldora de tipo. */}
                          <div className="flex items-center gap-2 sm:w-20 sm:shrink-0">
                            <div className="text-xs font-medium text-muted-foreground tabular-nums leading-tight whitespace-nowrap">
                              <div>{session.time_start ? formatTime(session.time_start) : "—"}</div>
                              {session.time_end && <div className="opacity-60">– {formatTime(session.time_end)}</div>}
                            </div>
                            <span className="sm:hidden"><TypeBadge type={session.type} /></span>
                          </div>

                          {/* Título + tipo (desktop) + reunión/pasaje */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                              <span className="hidden sm:inline-flex shrink-0"><TypeBadge type={session.type} /></span>
                              <p className="font-semibold text-foreground text-sm sm:truncate">{session.title}</p>
                              {session.takes_attendance === false && (
                                <span title="No requiere control de asistencia"
                                  className="shrink-0 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                  Sin asistencia
                                </span>
                              )}
                            </div>
                            {(session.speaker || session.scripture_ref) && (
                              <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                                {session.speaker && (
                                  <span className="flex items-center gap-1"><Users size={10} /> {session.speaker}</span>
                                )}
                                {session.scripture_ref && (
                                  <span className="flex items-center gap-1"><BookOpen size={10} /> {session.scripture_ref}</span>
                                )}
                              </p>
                            )}
                          </div>

                          {/* Estado en vivo + acciones. El estado lo va
                              cambiando quien controla la conferencia según
                              avanza el programa — la pantalla del salón lo
                              refleja sola (encuesta cada 5s). */}
                          <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:shrink-0">
                            <select
                              value={session.status || "PROGRAMADA"}
                              disabled={updatingStatusId === session.id || isLocked}
                              onChange={(e) => handleChangeSessionStatus(session.id, e.target.value)}
                              className={cn(
                                "appearance-none rounded-md border px-2 py-1 text-[11px] font-semibold text-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed",
                                SESSION_STATUS_CLASSES[session.status] || SESSION_STATUS_CLASSES.PROGRAMADA
                              )}
                            >
                              {SESSION_STATUSES.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                              ))}
                            </select>

                            {!isLocked && (
                              <div className="flex items-center gap-0.5">
                                {session.takes_attendance !== false && (
                                  <>
                                    <button onClick={() => navigate(`/dashboard/conference/${id}/attendance/${session.id}`)}
                                      title="Tomar asistencia manual"
                                      className="p-1.5 rounded-lg text-muted-foreground/70 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                                      <ClipboardCheck size={13} />
                                    </button>
                                    <button onClick={() => navigate(`/dashboard/conference/${id}/check-in/${session.id}`)}
                                      title="Escanear asistencia (QR)"
                                      className="p-1.5 rounded-lg text-muted-foreground/70 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-500/10 transition-colors">
                                      <ScanLine size={13} />
                                    </button>
                                  </>
                                )}
                                <button onClick={() => openEditSession(session, currentDay.id)}
                                  className="p-1.5 rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-accent transition-colors">
                                  <Pencil size={13} />
                                </button>
                                <button
                                  onClick={() => handleDeleteSession(session.id)}
                                  disabled={deletingSession === session.id}
                                  className="p-1.5 rounded-lg text-muted-foreground/70 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                  {deletingSession === session.id
                                    ? <Loader2 size={13} className="animate-spin" />
                                    : <Trash2 size={13} />}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
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
                onChange={(e) => {
                  setRegSearch(e.target.value);
                  setRegPage(0);
                  fetchRegistrations(e.target.value, 0, regChurchFilter);
                }} />
              {regSearch && (
                <button onClick={() => {
                  setRegSearch("");
                  setRegPage(0);
                  fetchRegistrations("", 0, regChurchFilter);
                }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="relative min-w-[180px] sm:max-w-[220px]">
              <select
                value={regChurchFilter}
                onChange={(e) => {
                  setRegChurchFilter(e.target.value);
                  setRegPage(0);
                  fetchRegistrations(regSearch, 0, e.target.value, regDayFilter);
                }}
                className="w-full appearance-none rounded-md border border-border bg-background px-3 py-2 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todas las iglesias</option>
                {regChurchOptions.map((church) => (
                  <option key={church} value={church}>{church}</option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
            {days.length > 1 && (
              <div className="relative min-w-[140px] sm:max-w-[180px]">
                <select
                  value={regDayFilter}
                  onChange={(e) => {
                    setRegDayFilter(e.target.value);
                    setRegPage(0);
                    fetchRegistrations(regSearch, 0, regChurchFilter, e.target.value);
                  }}
                  className="w-full appearance-none rounded-md border border-border bg-background px-3 py-2 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos los días</option>
                  {days.map((day) => (
                    <option key={day.id} value={String(day.day_number)}>Día {day.day_number}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
            )}
            {!isLocked && (
              <Button onClick={openAddReg} className="flex items-center gap-2 flex-shrink-0">
                <Plus size={15} /> Registrar Asistente
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isLocked && (
              <Button variant="outline"
                onClick={() => setShowRegLink((v) => !v)}
                className="flex items-center gap-2 text-sm border-purple-700/60 text-purple-700 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:border-purple-500">
                <Link2 size={14} /> Link de registro
              </Button>
            )}
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

          {showRegLink && conference.registration_token && (() => {
            const regUrl = `${window.location.origin}/registro-conferencia/${conference.registration_token}`;
            return (
              <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Comparte este link con las iglesias invitadas para que registren a sus propios miembros de antemano — al llegar, solo dan su nombre para recoger el gafete ya impreso.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="flex-1 min-w-[220px] text-xs bg-background border border-border rounded-lg px-3 py-2 text-foreground truncate">
                    {regUrl}
                  </code>
                  <Button size="sm" variant="outline" onClick={() => handleCopyRegLink(regUrl)}
                    className="flex items-center gap-1.5 border-border">
                    {linkCopied ? <Check size={14} className="text-emerald-700 dark:text-emerald-400" /> : <Copy size={14} />}
                    {linkCopied ? "Copiado" : "Copiar"}
                  </Button>
                </div>
                {confirmRegenLink ? (
                  <div className="flex flex-wrap items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                    <p className="text-xs text-amber-700 dark:text-amber-400 flex-1 min-w-[180px]">
                      El link actual dejará de funcionar. ¿Regenerar?
                    </p>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmRegenLink(false)} disabled={regeneratingLink}>
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleRegenerateRegLink} disabled={regeneratingLink}
                      className="bg-amber-600 hover:bg-amber-700 text-white">
                      {regeneratingLink ? "Regenerando…" : "Sí, regenerar"}
                    </Button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmRegenLink(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                    <RefreshCw size={12} /> Regenerar link
                  </button>
                )}

                {/* Catálogo de iglesias participantes: el formulario público
                    las ofrece como <select> en vez de texto libre, para que
                    no queden escritas de formas distintas cada vez. También
                    se puede cargar desde el diálogo de crear conferencia. */}
                <div className="pt-3 border-t border-purple-500/20">
                  <ParticipatingChurchesEditor />
                </div>
              </div>
            );
          })()}

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
                          {!isLocked && (
                            <>
                              <button onClick={() => openEditReg(reg)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                                <Pencil size={13} />
                              </button>
                              <button onClick={() => setDeletingReg(reg)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-700 dark:text-red-400 hover:bg-red-500/10 transition-colors">
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
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
          TAB: RANKING (top iglesias por participación)
      ════════════════════════════════════════ */}
      {activeTab === "ranking" && (
        <div className="space-y-6">
          {reportLoading ? (
            <div className="flex justify-center py-16 text-muted-foreground">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : !report || report.registrants.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
              <Trophy size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium text-muted-foreground">Sin datos todavía</p>
              <p className="text-sm mt-1">Cuando haya asistencia, aparecerá el ranking aquí.</p>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-border bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-[1px] shadow-lg shadow-blue-900/10">
                <div className="rounded-2xl bg-card/95 p-5 md:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Resumen general</p>
                      <h2 className="text-2xl font-bold text-foreground mt-1">Top iglesias participantes</h2>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400">
                      <Trophy size={14} /> {report.byChurch.length} iglesias
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    {[...report.byChurch]
                      .sort((a, b) => b.checkins - a.checkins || b.registrants - a.registrants)
                      .slice(0, 3)
                      .map((church, index) => (
                        <div key={church.church} className={cn(
                          "rounded-xl border p-4",
                          index === 0 && "border-amber-500/40 bg-amber-500/10",
                          index === 1 && "border-slate-300 bg-slate-500/5 dark:border-slate-600 dark:bg-slate-500/10",
                          index === 2 && "border-orange-500/40 bg-orange-500/10"
                        )}>
                          <div className="flex items-center justify-between mb-3">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-background text-xs font-bold text-foreground border border-border">
                              #{index + 1}
                            </span>
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{church.checkins} asist.</span>
                          </div>
                          <p className="font-semibold text-foreground text-lg truncate">{church.church}</p>
                          <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                            <span>Inscritos</span>
                            <span className="font-medium text-foreground">{church.registrants}</span>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                            <span>Promedio</span>
                            <span className="font-medium text-foreground">{church.registrants ? (church.checkins / church.registrants).toFixed(1) : "0.0"}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="border-b border-border bg-muted/40 px-4 py-3">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Trophy size={12} /> Ranking por sesión
                  </h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 p-4">
                  {sessionParticipationLeaderboard.map((session) => (
                    <div key={session.sessionId} className="overflow-hidden rounded-2xl border border-border bg-background/60">
                      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/50 px-3 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Sesión</p>
                        <span className="text-[10px] font-medium text-muted-foreground">{session.churches.length} iglesias</span>
                      </div>
                      <div className="p-3">
                        <p className="font-semibold text-foreground mb-3 leading-snug">{session.title}</p>
                        <div className="space-y-2">
                          {session.churches.length ? session.churches.map((entry, index) => (
                            <div key={`${session.sessionId}-${entry.church}`} className={cn(
                              "flex items-center justify-between gap-3 rounded-xl border px-2.5 py-2",
                              index === 0 && "border-amber-500/40 bg-amber-500/10",
                              index === 1 && "border-slate-300 bg-slate-500/5 dark:border-slate-600 dark:bg-slate-500/10",
                              index === 2 && "border-orange-500/40 bg-orange-500/10",
                              index > 2 && "border-border bg-background/70"
                            )}>
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={cn(
                                  "inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold",
                                  index === 0 && "bg-amber-500 text-white",
                                  index === 1 && "bg-slate-500 text-white",
                                  index === 2 && "bg-orange-500 text-white",
                                  index > 2 && "bg-muted text-muted-foreground"
                                )}>#{index + 1}</span>
                                <span className="truncate text-sm font-medium text-foreground">{entry.church}</span>
                              </div>
                              <span className="shrink-0 text-xs font-semibold text-muted-foreground">{entry.count}</span>
                            </div>
                          )) : (
                            <p className="text-sm text-muted-foreground">Sin asistencia registrada</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
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
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => openFilteredReportWindow(false)}
                  className="flex items-center gap-2 text-sm border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
                >
                  <BarChart3 size={14} /> Ver reporte
                </Button>
                <Button
                  variant="outline"
                  onClick={() => openFilteredReportWindow(true)}
                  className="flex items-center gap-2 text-sm border-emerald-700/60 text-emerald-700 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:border-emerald-500"
                >
                  <FileDown size={14} /> Imprimir reporte
                </Button>
              </div>

              {/* Resumen por iglesia */}
              <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                <div className="border-b border-border bg-muted/40 px-4 py-3">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Church size={12} /> Asistencia por iglesia
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-background/60">
                        {["Iglesia", "Inscritos", "Asistencias registradas", "Promedio por persona"].map((h) => (
                          <th key={h} className="text-left text-[11px] font-semibold text-muted-foreground px-4 py-3 uppercase tracking-[0.12em]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.byChurch.map((c) => (
                        <tr key={c.church} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">{c.church}</td>
                          <td className="px-4 py-3 text-muted-foreground">{c.registrants}</td>
                          <td className="px-4 py-3 text-muted-foreground">{c.checkins}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {c.registrants ? (c.checkins / c.registrants).toFixed(1) : "0.0"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Matriz de asistencia: inscrito × sesión */}
              <div>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                  <BarChart3 size={12} /> Tabla de asistencia
                </h2>

                <div className="flex flex-wrap items-center gap-3 mb-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Check size={12} className="text-emerald-700 dark:text-emerald-400" /> Presente</span>
                  <span className="flex items-center gap-1"><Clock size={12} className="text-amber-600 dark:text-amber-400" /> Tarde</span>
                  <span className="flex items-center gap-1"><ShieldCheck size={12} className="text-blue-700 dark:text-blue-400" /> Justificado</span>
                  <span className="flex items-center gap-1"><X size={12} className="text-red-600 dark:text-red-400" /> Ausente</span>
                  <span className="flex items-center gap-1"><Minus size={12} className="text-muted-foreground/40" /> Pendiente</span>
                </div>

                {/* Pestañas por día — mismo patrón que el Programa: una tabla
                    con todos los días mezclados era difícil de leer con la
                    conferencia avanzada. "Todos" conserva la vista completa
                    para cuando sí hace falta comparar entre días. */}
                <div className="flex gap-1 bg-muted/50 p-1 rounded-lg w-fit overflow-x-auto max-w-full mb-3">
                  <button onClick={() => setReportFilter("all")}
                    className={cn(
                      "px-3.5 py-1.5 rounded-md text-sm font-medium transition-all flex-shrink-0",
                      reportFilter === "all" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
                    )}>
                    Todos
                  </button>
                  {Array.from(new Map(report.sessions.map((s) => [s.day_number, s.day_date])).entries())
                    .sort(([a], [b]) => a - b)
                    .map(([dayNumber, dayDate]) => (
                      <button key={dayNumber} onClick={() => setReportFilter(`day:${dayNumber}`)}
                        className={cn(
                          "flex flex-col items-center px-3.5 py-1.5 rounded-md text-sm font-medium transition-all flex-shrink-0",
                          reportFilter === `day:${dayNumber}` ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
                        )}>
                        <span>Día {dayNumber}</span>
                        <span className="text-[10px] font-normal capitalize opacity-70">{formatDateShort(dayDate)}</span>
                      </button>
                    ))}
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
                              {visibleSessions.map((s) => {
                                const status = attendedSet.get(`${r.id}:${s.id}`);
                                return (
                                  <td key={s.id} className="text-center px-3 py-2 border-b border-border">
                                    {status === "PRESENTE" && <Check size={14} className="mx-auto text-emerald-700 dark:text-emerald-400" />}
                                    {status === "TARDE" && <Clock size={13} className="mx-auto text-amber-600 dark:text-amber-400" />}
                                    {status === "JUSTIFICADO" && <ShieldCheck size={13} className="mx-auto text-blue-700 dark:text-blue-400" />}
                                    {!status && (
                                      isSessionPast(s)
                                        ? <X size={12} className="mx-auto text-red-600 dark:text-red-400" title="Ausente" />
                                        : <Minus size={12} className="mx-auto text-muted-foreground/40" title="Pendiente" />
                                    )}
                                  </td>
                                );
                              })}
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

            <label className="flex items-start gap-2.5 p-3 rounded-lg border border-border bg-muted/30 cursor-pointer">
              <input type="checkbox" checked={!sessionForm.takesAttendance}
                onChange={(e) => setSessionForm(p => ({ ...p, takesAttendance: !e.target.checked }))}
                className="mt-0.5 rounded border-border cursor-pointer" />
              <span className="text-xs text-foreground">
                <span className="font-semibold">Esta sesión no requiere control de asistencia</span>
                <span className="block text-muted-foreground mt-0.5">Para recesos, comidas u otros momentos donde no se pasa lista. Oculta el check-in por QR/PIN para esta sesión, y mientras esté en curso la pantalla del salón muestra un aviso de receso en vez del programa.</span>
              </span>
            </label>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                <BookOpen size={10} className="inline mr-1" />Versículo
              </label>
              <Input placeholder="Ej. Juan 3:16"
                value={sessionForm.scriptureRef}
                onChange={(e) => setSessionForm(p => ({ ...p, scriptureRef: e.target.value }))} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                <Users size={10} className="inline mr-1" />Expositor / Speaker
              </label>
              <div className="flex flex-wrap gap-2">
                {speakers.map((s) => {
                  const selected = sessionForm.speaker === s.full_name;
                  return (
                    <button key={s.id} type="button"
                      onClick={() => setSessionForm(p => ({ ...p, speaker: s.full_name }))}
                      className={cn(
                        "group/spk relative flex items-center gap-1.5 pl-3 pr-2 py-2 rounded-lg border text-xs font-bold transition-all",
                        selected
                          ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/50"
                          : "bg-muted/50 text-muted-foreground border-border hover:border-muted-foreground/40"
                      )}>
                      {s.full_name}{s.title ? <span className="font-normal opacity-70">· {s.title}</span> : null}
                      <span
                        role="button"
                        title="Eliminar orador"
                        onClick={(e) => { e.stopPropagation(); handleDeleteSpeaker(s.id); }}
                        className="shrink-0 p-0.5 rounded opacity-0 group-hover/spk:opacity-100 hover:bg-red-500/20 hover:text-red-700 dark:hover:text-red-400 transition-opacity"
                      >
                        {deletingSpeakerId === s.id
                          ? <Loader2 size={11} className="animate-spin" />
                          : <X size={11} />}
                      </span>
                    </button>
                  );
                })}
                <button type="button" onClick={() => setShowNewSpeaker((v) => !v)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed text-xs font-bold transition-all",
                    showNewSpeaker
                      ? "border-blue-500 text-blue-700 dark:text-blue-400 bg-blue-500/10"
                      : "border-border text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
                  )}>
                  <Plus size={14} /> Agregar orador
                </button>
              </div>

              {showNewSpeaker && (
                <div className="mt-3 p-3 rounded-lg border border-border bg-muted/30 space-y-2">
                  <Input placeholder="Nombre del orador" value={newSpeakerName}
                    onChange={(e) => setNewSpeakerName(e.target.value)} maxLength={200} />
                  <Input placeholder="Título u organización (opcional, ej. Evangelista)" value={newSpeakerTitle}
                    onChange={(e) => setNewSpeakerTitle(e.target.value)} maxLength={100} />
                  {speakerError && <p className="text-xs text-red-700 dark:text-red-400">{speakerError}</p>}
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm"
                      onClick={() => { setShowNewSpeaker(false); setSpeakerError(""); }}>
                      Cancelar
                    </Button>
                    <Button type="button" size="sm" onClick={handleCreateSpeaker} disabled={savingSpeaker}
                      className="flex items-center gap-1.5">
                      {savingSpeaker && <Loader2 size={13} className="animate-spin" />}
                      Guardar orador
                    </Button>
                  </div>
                </div>
              )}
              {sessionForm.speaker && !speakers.some((s) => s.full_name === sessionForm.speaker) && (
                <p className="text-xs text-muted-foreground mt-2">
                  Expositor actual: <span className="font-medium text-foreground">{sessionForm.speaker}</span> (no está en el catálogo)
                </p>
              )}
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
                {participatingChurches.length > 0 && !regUseOtherChurch ? (
                  <div className="relative">
                    <select
                      value={regForm.originChurch}
                      onChange={(e) => {
                        if (e.target.value === "__OTHER__") {
                          setRegUseOtherChurch(true);
                          setRegForm(p => ({ ...p, originChurch: "" }));
                        } else {
                          setRegForm(p => ({ ...p, originChurch: e.target.value }));
                        }
                      }}
                      className="w-full appearance-none rounded-md border border-border bg-background px-3 py-2 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="" disabled>Selecciona una iglesia…</option>
                      {participatingChurches.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                      <option value="__OTHER__">Otra (no está en la lista)</option>
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <Input placeholder="Iglesia que representa" value={regForm.originChurch}
                      onChange={(e) => setRegForm(p => ({ ...p, originChurch: e.target.value }))} />
                    {participatingChurches.length > 0 && (
                      <button type="button"
                        onClick={() => { setRegUseOtherChurch(false); setRegForm(p => ({ ...p, originChurch: "" })); }}
                        className="text-xs text-blue-700 dark:text-blue-400 hover:underline mt-1.5">
                        Elegir de la lista
                      </button>
                    )}
                  </>
                )}
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

      {/* ════ Dialog: Confirmar Finalizar/Cancelar conferencia ════ */}
      <Dialog open={Boolean(confirmConfStatus)} onOpenChange={(v) => !v && setConfirmConfStatus(null)}>
        <DialogContent>
          <DialogHeader>
            <h2 className="text-lg font-semibold text-foreground">
              {confirmConfStatus === "CANCELADO" ? "Cancelar conferencia" : "Finalizar conferencia"}
            </h2>
          </DialogHeader>
          <p className="text-muted-foreground mt-2">
            Ya no se va a poder editar el programa ni los asistentes de <strong className="text-foreground">{conference.name}</strong> hasta que la reabras.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmConfStatus(null)} disabled={savingConfStatus}>Cancelar</Button>
            <Button
              onClick={() => handleChangeConferenceStatus(confirmConfStatus)}
              disabled={savingConfStatus}
              className={cn("flex items-center gap-2", confirmConfStatus === "CANCELADO" ? "bg-red-600 hover:bg-red-700" : "")}>
              {savingConfStatus && <Loader2 size={14} className="animate-spin" />}
              {confirmConfStatus === "CANCELADO" ? "Sí, cancelar" : "Sí, finalizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════ Dialog: Pausar la pantalla del salón (receso manual) ════ */}
      <Dialog open={showPauseDialog} onOpenChange={(v) => !v && setShowPauseDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <h2 className="text-lg font-semibold text-foreground">Pausar pantalla</h2>
          </DialogHeader>
          <p className="text-muted-foreground mt-2 text-sm">
            La pantalla del salón mostrará este mensaje en vez del programa, hasta que la reanudes desde acá.
          </p>
          <div className="mt-3">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Mensaje (opcional)
            </label>
            <Input placeholder="Ej. Volvemos en 15 minutos"
              value={pauseMessageInput}
              onChange={(e) => setPauseMessageInput(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowPauseDialog(false)} disabled={savingDisplayPause}>Cancelar</Button>
            <Button onClick={handlePauseDisplay} disabled={savingDisplayPause}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white">
              {savingDisplayPause && <Loader2 size={14} className="animate-spin" />}
              Pausar pantalla
            </Button>
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

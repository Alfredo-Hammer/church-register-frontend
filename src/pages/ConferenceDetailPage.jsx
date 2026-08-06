import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { conferenceService, settingsService } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogFooter } from "@/components/ui/Dialog";
import { CertificatePreviewDialog } from "@/components/CertificatePreviewDialog";
import {
  BookOpen, ArrowLeft, Plus, Trash2, Pencil, Users, Church,
  MapPin, Phone, CalendarDays, Clock, Loader2, Search, X,
  ChevronLeft, ChevronRight, StickyNote, GraduationCap,
  Music2, FlameKindling, Star, MoreHorizontal, FileDown, Award,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generateProgramaPDF, generateCertificadoPDF } from "@/utils/pdf/conferencePdf";

// ── Constantes ────────────────────────────────────────────────────────────────

const SESSION_TYPES = [
  { value: "CLASE_BIBLICA",  label: "Clase Bíblica",      icon: GraduationCap, color: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/40" },
  { value: "CULTO_ALABANZA", label: "Culto / Alabanza",    icon: Music2,        color: "bg-violet-500/20 text-violet-700 dark:text-violet-300 border-violet-500/40" },
  { value: "ORACION",        label: "Oración",             icon: FlameKindling, color: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40" },
  { value: "ESPECIAL",       label: "Especial",             icon: Star,          color: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40" },
  { value: "OTRO",           label: "Otro",                 icon: MoreHorizontal,color: "bg-muted text-muted-foreground border-border" },
];

const typeConfig = (type) => SESSION_TYPES.find(t => t.value === type) || SESSION_TYPES[4];

const EMPTY_SESSION = { sessionType: "CLASE_BIBLICA", title: "", timeStart: "", speaker: "", scriptureRef: "", notes: "" };
const EMPTY_REG     = { fullName: "", phone: "", originChurch: "", city: "", notes: "" };
const LIMIT         = 20;

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

function TypeBadge({ type }) {
  const cfg = typeConfig(type);
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border", cfg.color)}>
      <Icon size={10} /> {cfg.label}
    </span>
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
  const [activeTab, setActiveTab]     = useState("programa"); // "programa" | "asistentes"

  // Sesiones
  const [sessionDialog, setSessionDialog] = useState(false);
  const [targetDayId, setTargetDayId]     = useState(null);
  const [editingSession, setEditingSession] = useState(null);
  const [sessionForm, setSessionForm]     = useState(EMPTY_SESSION);
  const [savingSession, setSavingSession] = useState(false);
  const [sessionError, setSessionError]   = useState("");
  const [deletingSession, setDeletingSession] = useState(null);

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
  }, [fetchConference, fetchStats]);

  useEffect(() => {
    if (activeTab === "asistentes") fetchRegistrations(regSearch, regPage);
  }, [activeTab, fetchRegistrations, regSearch, regPage]);

  // ── Sesiones ───────────────────────────────────────────────────────────────

  const openAddSession = (dayId) => {
    setTargetDayId(dayId);
    setEditingSession(null);
    setSessionForm(EMPTY_SESSION);
    setSessionError("");
    setSessionDialog(true);
  };

  const openEditSession = (session, dayId) => {
    setTargetDayId(dayId);
    setEditingSession(session);
    setSessionForm({
      sessionType:  session.session_type,
      title:        session.title,
      timeStart:    session.time_start?.slice(0, 5) || "",
      speaker:      session.speaker || "",
      scriptureRef: session.scripture_ref || "",
      notes:        session.notes || "",
    });
    setSessionError("");
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
    });
    setRegError("");
    setRegDialog(true);
  };

  const handleSaveReg = async () => {
    if (!regForm.fullName.trim()) return setRegError("El nombre es obligatorio.");
    setSavingReg(true);
    setRegError("");
    try {
      if (editingReg) {
        await conferenceService.updateRegistration(id, editingReg.id, regForm);
      } else {
        await conferenceService.createRegistration(id, regForm);
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

  // ── Render ─────────────────────────────────────────────────────────────────

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
                        const cfg = typeConfig(session.session_type);
                        const Icon = cfg.icon;
                        return (
                          <div key={session.id}
                            className="bg-muted/50 rounded-lg p-3 border border-border group relative">
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <TypeBadge type={session.session_type} />
                              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
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

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Nombre","Iglesia","Ciudad","Teléfono",""].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {regLoading ? (
                    <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">
                      <Loader2 size={24} className="animate-spin mx-auto" />
                    </td></tr>
                  ) : registrations.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">
                      <Users size={28} className="mx-auto mb-2 opacity-30" />
                      <p>Sin asistentes registrados</p>
                    </td></tr>
                  ) : registrations.map((reg) => (
                    <tr key={reg.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {reg.full_name}
                        {reg.notes && <StickyNote size={11} className="inline ml-1.5 text-muted-foreground" title={reg.notes} />}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{reg.origin_church || <span className="text-muted-foreground italic text-xs">—</span>}</td>
                      <td className="px-4 py-3 text-muted-foreground">{reg.city || <span className="text-muted-foreground italic text-xs">—</span>}</td>
                      <td className="px-4 py-3 text-muted-foreground">{reg.phone || <span className="text-muted-foreground italic text-xs">—</span>}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
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
            {/* Tipo */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Tipo de sesión</label>
              <div className="grid grid-cols-2 gap-2">
                {SESSION_TYPES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button key={t.value} type="button"
                      onClick={() => setSessionForm(p => ({ ...p, sessionType: t.value }))}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-bold transition-all",
                        sessionForm.sessionType === t.value ? t.color : "bg-muted/50 text-muted-foreground border-border hover:border-muted-foreground/40"
                      )}>
                      <Icon size={14} /> {t.label}
                    </button>
                  );
                })}
              </div>
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
                  <Clock size={10} className="inline mr-1" />Hora
                </label>
                <Input type="time" value={sessionForm.timeStart}
                  onChange={(e) => setSessionForm(p => ({ ...p, timeStart: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  <BookOpen size={10} className="inline mr-1" />Versículo
                </label>
                <Input placeholder="Ej. Juan 3:16"
                  value={sessionForm.scriptureRef}
                  onChange={(e) => setSessionForm(p => ({ ...p, scriptureRef: e.target.value }))} />
              </div>
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
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                <Phone size={10} className="inline mr-1" />Teléfono
              </label>
              <Input placeholder="(000) 000-0000" value={regForm.phone}
                onChange={(e) => setRegForm(p => ({ ...p, phone: e.target.value }))} />
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
    </div>
  );
}

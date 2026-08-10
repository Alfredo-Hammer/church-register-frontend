import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import jsQR from "jsqr";
import { conferenceService } from "@/services/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  ArrowLeft, Camera, CameraOff, QrCode, Check, AlertTriangle, X,
  Loader2, Users, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Reescanear el mismo gafete mientras sigue frente a la cámara no debe
// reenviar la petición en cada frame — se ignora el mismo token si se vio
// hace menos de este tiempo.
const RESCAN_COOLDOWN_MS = 4000;

function formatTime(t) {
  if (!t) return null;
  const [h, m] = t.split(':');
  const hour = parseInt(h);
  return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

export default function ConferenceCheckInPage() {
  const { id, sessionId } = useParams();
  const navigate = useNavigate();

  const [conference, setConference] = useState(null);
  const [days, setDays] = useState([]);
  const [sessionPickerOpen, setSessionPickerOpen] = useState(false);

  const [attendance, setAttendance] = useState([]);
  const [sessionTitle, setSessionTitle] = useState("");
  const [total, setTotal] = useState(0);
  const [loadingList, setLoadingList] = useState(false);

  const [manualToken, setManualToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null); // { kind: 'ok'|'warn'|'error', text }

  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const lastScanRef = useRef({ token: null, at: 0 });
  const inputRef = useRef(null);

  // ── Datos de la conferencia (para el selector de sesión) ────────────────
  useEffect(() => {
    conferenceService.getById(id).then((data) => {
      setConference(data.conference);
      setDays(data.days);
    }).catch(() => navigate(`/dashboard/conference/${id}`));
  }, [id, navigate]);

  // ── Lista de asistencia de la sesión activa ──────────────────────────────
  const fetchAttendance = useCallback(async () => {
    if (!sessionId) return;
    setLoadingList(true);
    try {
      const data = await conferenceService.getSessionAttendance(sessionId);
      setAttendance(data.attendance);
      setSessionTitle(data.session.title);
      setTotal(data.total);
    } catch { /* silent */ }
    setLoadingList(false);
  }, [sessionId]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  // ── Escaneo (cámara o entrada manual) ────────────────────────────────────

  // fromCamera: la cámara decodifica el mismo gafete en cada frame mientras
  // sigue en foco, así que ahí sí hace falta el cooldown. Una entrada manual
  // (teclado, lector USB, botón "Marcar") ya es una acción explícita y
  // puntual — aplicarle el mismo cooldown solo la haría fallar en silencio
  // si alguien reintenta el mismo código a propósito.
  const handleScan = useCallback(async (rawToken, fromCamera = false) => {
    const token = rawToken.trim();
    if (!token || submitting) return;

    const now = Date.now();
    if (fromCamera && lastScanRef.current.token === token && now - lastScanRef.current.at < RESCAN_COOLDOWN_MS) {
      return;
    }
    lastScanRef.current = { token, at: now };

    setSubmitting(true);
    try {
      const data = await conferenceService.checkIn(token, sessionId);
      setFeedback({
        kind: data.alreadyCheckedIn ? "warn" : "ok",
        text: data.alreadyCheckedIn
          ? `${data.attendee.fullName} ya estaba registrado`
          : `${data.attendee.fullName} — asistencia registrada`,
      });
      fetchAttendance();
    } catch (err) {
      setFeedback({ kind: "error", text: err.response?.data?.error || "No se pudo registrar." });
    }
    setSubmitting(false);
  }, [sessionId, submitting, fetchAttendance]);

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 3500);
    return () => clearTimeout(t);
  }, [feedback]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    handleScan(manualToken);
    setManualToken("");
    inputRef.current?.focus();
  };

  // ── Cámara ────────────────────────────────────────────────────────────────

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);

      const tick = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code?.data) handleScan(code.data, true);
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setCameraError("No se pudo acceder a la cámara. Usa el código manual abajo.");
      setCameraOn(false);
    }
  }, [handleScan]);

  useEffect(() => () => stopCamera(), [stopCamera]);
  // Cambiar de sesión no debe seguir escaneando para la anterior a medio camino.
  useEffect(() => { stopCamera(); }, [sessionId, stopCamera]);

  const switchSession = (newSessionId) => {
    setSessionPickerOpen(false);
    navigate(`/dashboard/conference/${id}/check-in/${newSessionId}`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6 max-w-2xl mx-auto">
      <Link to={`/dashboard/conference/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft size={15} /> Volver a la conferencia
      </Link>

      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <QrCode size={19} className="text-blue-700 dark:text-blue-400" />
            Control de Asistencia
          </h1>
          {conference && <p className="text-xs text-muted-foreground mt-0.5">{conference.name}</p>}
        </div>
        <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground bg-card border border-border rounded-lg px-3 py-1.5 flex-shrink-0">
          <Users size={14} className="text-muted-foreground" /> {total}
        </div>
      </div>

      {/* Selector de sesión */}
      <div className="relative mt-3 mb-5">
        <button onClick={() => setSessionPickerOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-2 bg-card border border-border rounded-lg px-3 py-2.5 text-left hover:border-muted-foreground/40 transition-colors">
          <span className="text-sm font-semibold text-foreground truncate">
            {sessionTitle || "Selecciona una sesión…"}
          </span>
          <ChevronDown size={15} className={cn("text-muted-foreground flex-shrink-0 transition-transform", sessionPickerOpen && "rotate-180")} />
        </button>
        {sessionPickerOpen && (
          <div className="absolute z-10 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg max-h-72 overflow-y-auto">
            {days.map((day) => (
              <div key={day.id}>
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground bg-muted/50">
                  Día {day.day_number}
                </div>
                {day.sessions.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground italic">Sin sesiones</p>
                ) : day.sessions.map((s) => (
                  <button key={s.id} onClick={() => switchSession(s.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between gap-2",
                      s.id === sessionId ? "text-blue-700 dark:text-blue-400 font-semibold" : "text-foreground"
                    )}>
                    <span className="truncate">{s.title}</span>
                    {s.time_start && <span className="text-xs text-muted-foreground flex-shrink-0">{formatTime(s.time_start)}</span>}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feedback del último escaneo */}
      {feedback && (
        <div className={cn(
          "mb-4 rounded-lg border px-4 py-3 flex items-center gap-2.5 text-sm font-semibold",
          feedback.kind === "ok"    && "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
          feedback.kind === "warn"  && "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400",
          feedback.kind === "error" && "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400",
        )}>
          {feedback.kind === "ok" && <Check size={16} className="flex-shrink-0" />}
          {feedback.kind === "warn" && <AlertTriangle size={16} className="flex-shrink-0" />}
          {feedback.kind === "error" && <X size={16} className="flex-shrink-0" />}
          <span className="flex-1">{feedback.text}</span>
        </div>
      )}

      {/* Cámara */}
      <div className="bg-card rounded-xl border border-border overflow-hidden mb-3">
        <div className="relative bg-black aspect-square sm:aspect-video flex items-center justify-center">
          <video ref={videoRef} className={cn("w-full h-full object-cover", !cameraOn && "hidden")} muted playsInline />
          <canvas ref={canvasRef} className="hidden" />
          {!cameraOn && (
            <div className="text-center px-6">
              <Camera size={32} className="mx-auto mb-2 text-white/40" />
              <p className="text-white/70 text-sm">{cameraError || "Activa la cámara para escanear los gafetes"}</p>
            </div>
          )}
          {cameraOn && (
            <div className="absolute inset-8 border-2 border-white/60 rounded-2xl pointer-events-none" />
          )}
        </div>
        <div className="p-3">
          <Button
            onClick={cameraOn ? stopCamera : startCamera}
            disabled={!sessionId}
            variant={cameraOn ? "outline" : "default"}
            className="w-full flex items-center justify-center gap-2">
            {cameraOn ? <><CameraOff size={15} /> Detener cámara</> : <><Camera size={15} /> Activar cámara</>}
          </Button>
        </div>
      </div>

      {/* Entrada manual / lector USB */}
      <form onSubmit={handleManualSubmit} className="flex gap-2 mb-6">
        <Input
          ref={inputRef}
          autoFocus
          placeholder="Código del gafete (o escanéalo con un lector)"
          value={manualToken}
          disabled={!sessionId}
          onChange={(e) => setManualToken(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={!sessionId || submitting || !manualToken.trim()}>
          {submitting ? <Loader2 size={15} className="animate-spin" /> : "Marcar"}
        </Button>
      </form>

      {/* Lista de asistencia */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Registrados en esta sesión
        </h2>
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {loadingList ? (
            <div className="py-8 text-center text-muted-foreground"><Loader2 size={20} className="animate-spin mx-auto" /></div>
          ) : attendance.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              <Users size={22} className="mx-auto mb-2 opacity-30" />
              Aún nadie ha sido registrado
            </div>
          ) : (
            <ul className="divide-y divide-border max-h-96 overflow-y-auto">
              {attendance.map((a) => (
                <li key={a.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{a.full_name}</p>
                    {a.origin_church && <p className="text-xs text-muted-foreground truncate">{a.origin_church}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {new Date(a.checked_in_at).toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

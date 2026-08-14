import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import jsQR from "jsqr";
import { conferenceService } from "@/services/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  ArrowLeft, Camera, CameraOff, QrCode, Check, AlertTriangle, X,
  Loader2, Users, ChevronDown, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Reescanear el mismo gafete mientras sigue frente a la cámara no debe
// reenviar la petición en cada frame — se ignora el mismo token si se vio
// hace menos de este tiempo.
const RESCAN_COOLDOWN_MS = 4000;

// Le dice a quien escanea que ya lo habían marcado a mano con un status
// distinto de Presente — el scan nunca pisa esa marca (ver ON CONFLICT
// DO NOTHING en checkInAttendance), así que sin esto quedaría invisible
// que alguien "Justificado" en realidad sí llegó.
const NON_PRESENT_LABELS = { TARDE: "Tarde", JUSTIFICADO: "Justificado" };

function formatTime(t) {
  if (!t) return null;
  const [h, m] = t.split(':');
  const hour = parseInt(h);
  return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

// Mismo criterio que el backend en checkInAttendance: solo se sabe con
// certeza que una clase terminó si tiene time_end y ya pasó, o si es de un
// día anterior. El backend es la autoridad final (por si el reloj del
// celular está mal); esto es solo para no dejar escanear algo que de
// entrada se sabe que va a fallar.
function isSessionPast(day, session) {
  if (!day || !session) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dayDate = new Date(String(day.day_date).slice(0, 10) + 'T00:00:00');
  if (dayDate < today) return true;
  if (dayDate.getTime() === today.getTime() && session.time_end) {
    const [h, m] = session.time_end.split(':').map(Number);
    const end = new Date();
    end.setHours(h, m, 0, 0);
    return new Date() > end;
  }
  return false;
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
  const [feedback, setFeedback] = useState(null); // { kind: 'ok'|'warn'|'error', text, correction? }
  const [correctingId, setCorrectingId] = useState(null);

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
      const nonPresentLabel = data.alreadyCheckedIn ? NON_PRESENT_LABELS[data.status] : null;
      setFeedback({
        kind: data.alreadyCheckedIn ? "warn" : "ok",
        text: nonPresentLabel
          ? `${data.attendee.fullName} estaba marcado como "${nonPresentLabel}" — ¿corregir a Presente?`
          : data.alreadyCheckedIn
            ? `${data.attendee.fullName} ya estaba registrado`
            : `${data.attendee.fullName} — asistencia registrada`,
        correction: nonPresentLabel ? { regId: data.attendee.id, name: data.attendee.fullName } : null,
      });
      fetchAttendance();
    } catch (err) {
      setFeedback({ kind: "error", text: err.response?.data?.error || "No se pudo registrar." });
    }
    setSubmitting(false);
  }, [sessionId, submitting, fetchAttendance]);

  const handleCorrectToPresente = async (regId, name) => {
    setCorrectingId(regId);
    try {
      await conferenceService.markAttendance(sessionId, regId, "PRESENTE");
      setFeedback({ kind: "ok", text: `${name} — corregido a Presente` });
      fetchAttendance();
    } catch {
      setFeedback({ kind: "error", text: "No se pudo corregir el estado." });
    }
    setCorrectingId(null);
  };

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

  const selectedDay = days.find((d) => d.sessions.some((s) => s.id === sessionId));
  const selectedSession = selectedDay?.sessions.find((s) => s.id === sessionId);
  const sessionPast = isSessionPast(selectedDay, selectedSession);
  const sessionNoAttendance = selectedSession?.takes_attendance === false;
  const checkInDisabled = sessionPast || sessionNoAttendance;

  // Si la clase termina mientras la cámara sigue abierta (o al cambiar a
  // una sesión que ya pasó o que no lleva asistencia), hay que apagarla —
  // no tiene sentido seguir escaneando algo que el backend va a rechazar.
  useEffect(() => {
    if (checkInDisabled) stopCamera();
  }, [checkInDisabled, stopCamera]);

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
                    <span className="truncate flex items-center gap-1.5">
                      {s.title}
                      {s.takes_attendance === false && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide px-1 py-0.5 rounded bg-muted text-muted-foreground flex-shrink-0">
                          Sin asistencia
                        </span>
                      )}
                    </span>
                    {s.time_start && <span className="text-xs text-muted-foreground flex-shrink-0">{formatTime(s.time_start)}</span>}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sesión ya finalizada: no tiene caso ofrecer escanear */}
      {sessionPast && (
        <div className="mb-4 rounded-lg border px-4 py-3 flex items-center gap-2.5 text-sm font-semibold bg-muted/50 border-border text-muted-foreground">
          <Clock size={16} className="flex-shrink-0" />
          <span className="flex-1">Esta sesión ya finalizó. No se puede registrar más asistencia aquí.</span>
        </div>
      )}

      {/* Sesión marcada como "sin asistencia" (receso, comida, etc.) */}
      {!sessionPast && sessionNoAttendance && (
        <div className="mb-4 rounded-lg border px-4 py-3 flex items-center gap-2.5 text-sm font-semibold bg-muted/50 border-border text-muted-foreground">
          <Clock size={16} className="flex-shrink-0" />
          <span className="flex-1">Esta sesión no requiere control de asistencia.</span>
        </div>
      )}

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
          {feedback.correction && (
            <button
              onClick={() => handleCorrectToPresente(feedback.correction.regId, feedback.correction.name)}
              disabled={correctingId === feedback.correction.regId}
              className="flex-shrink-0 flex items-center gap-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 px-2.5 py-1 text-xs font-bold transition-colors disabled:opacity-60"
            >
              {correctingId === feedback.correction.regId
                ? <Loader2 size={12} className="animate-spin" />
                : <Check size={12} />}
              Corregir
            </button>
          )}
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
            disabled={!sessionId || checkInDisabled}
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
          placeholder="PIN de 6 dígitos, código del gafete, o un lector"
          value={manualToken}
          disabled={!sessionId || checkInDisabled}
          onChange={(e) => setManualToken(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={!sessionId || checkInDisabled || submitting || !manualToken.trim()}>
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
                  <div className="min-w-0 flex items-center gap-2">
                    {a.status !== "PRESENTE" && (
                      <span
                        title={NON_PRESENT_LABELS[a.status] || a.status}
                        className={cn(
                          "w-2 h-2 rounded-full flex-shrink-0",
                          a.status === "TARDE" ? "bg-amber-500" : "bg-blue-500",
                        )}
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{a.full_name}</p>
                      {a.origin_church && <p className="text-xs text-muted-foreground truncate">{a.origin_church}</p>}
                    </div>
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

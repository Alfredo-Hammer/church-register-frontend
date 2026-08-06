import {useEffect, useState} from "react";
import {visitorsService} from "@/services/api";
import {Button} from "@/components/ui/Button";
import {Input} from "@/components/ui/Input";
import {
  Dialog,
  DialogHeader,
  DialogContent,
  DialogFooter,
} from "@/components/ui/Dialog";
import {
  UserSearch,
  Plus,
  Search,
  AlertCircle,
  CheckCircle,
  Pencil,
  Trash2,
  XCircle,
  Phone,
  Mail,
  User,
  CalendarDays,
  MessageCircle,
  Home,
  PhoneCall,
  Users,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Clock,
  X,
  MapPin,
  ChevronLeft,
  ChevronRight,
  UserCheck,
} from "lucide-react";

// ── Constantes ───────────────────────────────────────────────────────────────

const STAGES = [
  {
    value: "PRIMERA_VISITA",
    label: "Primera Visita",
    color: "bg-blue-500/15 text-blue-300 border border-blue-500/30",
    dot: "bg-blue-400",
  },
  {
    value: "EN_SEGUIMIENTO",
    label: "En Seguimiento",
    color: "bg-yellow-500/15 text-yellow-300 border border-yellow-500/30",
    dot: "bg-yellow-400",
  },
  {
    value: "INTEGRADO",
    label: "Integrado",
    color: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
    dot: "bg-emerald-400",
  },
  {
    value: "INACTIVO",
    label: "Inactivo",
    color: "bg-slate-500/15 text-slate-400 border border-slate-500/30",
    dot: "bg-slate-500",
  },
];

const HOW = [
  {value: "INVITADO", label: "Invitado por alguien"},
  {value: "REDES_SOCIALES", label: "Redes sociales"},
  {value: "PASO_POR_AQUI", label: "Pasó por aquí"},
  {value: "BUSQUEDA_WEB", label: "Búsqueda en internet"},
  {value: "OTRO", label: "Otro"},
];

const FOLLOW_UP_TYPES = [
  {value: "LLAMADA", label: "Llamada", icon: PhoneCall},
  {value: "MENSAJE", label: "Mensaje", icon: MessageCircle},
  {value: "VISITA_DOMICILIO", label: "Visita a domicilio", icon: Home},
  {value: "REUNION", label: "Reunión", icon: Users},
  {value: "OTRO", label: "Otro", icon: User},
];

const RESULTS = [
  {value: "POSITIVO", label: "Positivo", color: "text-emerald-400"},
  {value: "NEUTRAL", label: "Neutral", color: "text-slate-400"},
  {value: "SIN_RESPUESTA", label: "Sin respuesta", color: "text-yellow-400"},
  {value: "NEGATIVO", label: "Negativo", color: "text-red-400"},
];

const getStage = (v) => STAGES.find((s) => s.value === v) || STAGES[0];
const getHow = (v) => HOW.find((h) => h.value === v)?.label || v;
const getResult = (v) => RESULTS.find((r) => r.value === v);

const formatDate = (val) => {
  if (!val) return "—";
  return new Date(val.slice(0, 10) + "T12:00:00").toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// WhatsApp: strip non-digits, prepend nothing (wa.me handles it)
const waLink = (phone) => {
  if (!phone) return null;
  const clean = phone.replace(/\D/g, "");
  if (!clean) return null;
  return `https://wa.me/${clean}`;
};

const emptyVisitorForm = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  address: "",
  birthDate: "",
  gender: "",
  firstVisitDate: "",
  howTheyCame: "OTRO",
  invitedBy: "",
  stage: "PRIMERA_VISITA",
  responsible: "",
  notes: "",
};

const emptyFollowUpForm = {
  date: "",
  type: "LLAMADA",
  notes: "",
  result: "NEUTRAL",
};

// ── Avatar ────────────────────────────────────────────────────────────────────

const TEAL_SHADES = [
  "from-teal-500 to-teal-700",
  "from-cyan-500 to-teal-600",
  "from-emerald-500 to-teal-700",
  "from-sky-500 to-cyan-700",
];
function avatarGrad(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return TEAL_SHADES[Math.abs(h) % TEAL_SHADES.length];
}
function VisitorAvatar({visitor, size = "md"}) {
  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-20 h-20 text-2xl",
  };
  const initials =
    `${visitor.first_name?.[0] ?? ""}${visitor.last_name?.[0] ?? ""}`.toUpperCase();
  return (
    <div
      className={`${sizes[size]} rounded-full shrink-0 overflow-hidden bg-gradient-to-br ${avatarGrad(visitor.first_name + visitor.last_name)} flex items-center justify-center font-bold text-white shadow`}
    >
      {initials}
    </div>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({visitor: v, onClose, onEdit, onDelete, onConverted}) {
  const [followUps, setFollowUps] = useState([]);
  const [loadingFU, setLoadingFU] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [fuForm, setFuForm] = useState(emptyFollowUpForm);
  const [savingFU, setSavingFU] = useState(false);
  const [fuError, setFuError] = useState("");
  const [converting, setConverting] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [convertError, setConvertError] = useState("");

  useEffect(() => {
    setFollowUps([]);
    setShowForm(false);
    setFuForm({
      ...emptyFollowUpForm,
      date: new Date().toISOString().slice(0, 10),
    });
    setLoadingFU(true);
    visitorsService
      .getFollowUps(v.id)
      .then((d) => setFollowUps(d.followUps || []))
      .catch(() => {})
      .finally(() => setLoadingFU(false));
  }, [v.id]);

  const handleAddFU = async (e) => {
    e.preventDefault();
    setSavingFU(true);
    setFuError("");
    try {
      await visitorsService.addFollowUp(v.id, fuForm);
      const d = await visitorsService.getFollowUps(v.id);
      setFollowUps(d.followUps || []);
      setFuForm({
        ...emptyFollowUpForm,
        date: new Date().toISOString().slice(0, 10),
      });
      setShowForm(false);
    } catch (err) {
      setFuError(err.response?.data?.error || "Error al guardar");
    } finally {
      setSavingFU(false);
    }
  };

  const handleDeleteFU = async (id) => {
    try {
      await visitorsService.deleteFollowUp(v.id, id);
      setFollowUps((prev) => prev.filter((f) => f.id !== id));
    } catch {
      /* silencioso */
    }
  };

  const handleConvertToMember = async () => {
    setConverting(true);
    setConvertError("");
    try {
      await visitorsService.convertToMember(v.id);
      setShowConvertDialog(false);
      onConverted();
    } catch (err) {
      setConvertError(
        err.response?.data?.error || "Error al convertir a miembro",
      );
    } finally {
      setConverting(false);
    }
  };

  const stage = getStage(v.stage);
  const wa = waLink(v.phone);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md bg-slate-800 border-l border-slate-700 h-full flex flex-col overflow-hidden shadow-2xl"
        style={{animation: "slideInRight .25s ease-out"}}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 shrink-0">
          <span className="text-sm text-gray-400 font-medium">
            Perfil del Visitante
          </span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Avatar + name + stage */}
          <div className="flex flex-col items-center px-5 pt-7 pb-5 border-b border-slate-700">
            <VisitorAvatar visitor={v} size="lg" />
            <h2 className="mt-3 text-xl font-bold text-white text-center">
              {v.first_name} {v.last_name}
            </h2>
            <span
              className={`mt-2 px-3 py-1 rounded-full text-xs font-semibold ${stage.color}`}
            >
              {stage.label}
            </span>
          </div>

          {/* Contact buttons */}
          <div className="px-5 py-4 border-b border-slate-700">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Contacto rápido
            </h3>
            <div className="flex flex-wrap gap-2">
              {v.phone && (
                <a
                  href={`tel:${v.phone}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-gray-200 text-sm transition-colors"
                >
                  <Phone className="w-4 h-4 text-blue-400" />
                  {v.phone}
                </a>
              )}
              {wa && (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600/20 hover:bg-green-600/35 border border-green-600/30 text-green-300 text-sm transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  WhatsApp
                </a>
              )}
              {v.email && (
                <a
                  href={`mailto:${v.email}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-gray-200 text-sm transition-colors"
                >
                  <Mail className="w-4 h-4 text-violet-400" />
                  {v.email}
                </a>
              )}
              {!v.phone && !v.email && (
                <p className="text-sm text-gray-500">Sin datos de contacto</p>
              )}
            </div>
          </div>

          {/* Visit info */}
          <div className="px-5 py-4 border-b border-slate-700 space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Información de visita
            </h3>
            <InfoRow
              icon={<CalendarDays className="w-4 h-4" />}
              label="Primera visita"
              value={formatDate(v.first_visit_date)}
            />
            <InfoRow
              icon={<User className="w-4 h-4" />}
              label="¿Cómo llegó?"
              value={getHow(v.how_they_came)}
            />
            {v.invited_by && (
              <InfoRow
                icon={<Users className="w-4 h-4" />}
                label="Referencia"
                value={v.invited_by}
              />
            )}
            {v.responsible && (
              <InfoRow
                icon={<User className="w-4 h-4" />}
                label="Responsable"
                value={v.responsible}
              />
            )}
            {v.address && (
              <InfoRow
                icon={<MapPin className="w-4 h-4" />}
                label="Dirección"
                value={v.address}
              />
            )}
            {v.notes && (
              <div className="mt-2 p-3 bg-slate-700/50 rounded-lg text-sm text-gray-300 italic border-l-2 border-teal-500">
                {v.notes}
              </div>
            )}
          </div>

          {/* Follow-ups */}
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Seguimientos
                {followUps.length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 bg-teal-500/20 text-teal-400 rounded-full text-xs">
                    {followUps.length}
                  </span>
                )}
              </h3>
              <button
                onClick={() => setShowForm((s) => !s)}
                className="flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar
              </button>
            </div>

            {/* Add form */}
            {showForm && (
              <form
                onSubmit={handleAddFU}
                className="space-y-3 p-3 bg-slate-700/50 rounded-lg border border-slate-600"
              >
                {fuError && <p className="text-red-400 text-xs">{fuError}</p>}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">
                      Tipo
                    </label>
                    <select
                      value={fuForm.type}
                      onChange={(e) =>
                        setFuForm({...fuForm, type: e.target.value})
                      }
                      className="w-full px-2 py-1.5 rounded bg-slate-700 border border-slate-600 text-white text-xs"
                    >
                      {FOLLOW_UP_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">
                      Fecha
                    </label>
                    <Input
                      type="date"
                      value={fuForm.date}
                      onChange={(e) =>
                        setFuForm({...fuForm, date: e.target.value})
                      }
                      required
                      className="bg-slate-700 border-slate-600 text-white text-xs h-8"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Resultado
                  </label>
                  <select
                    value={fuForm.result}
                    onChange={(e) =>
                      setFuForm({...fuForm, result: e.target.value})
                    }
                    className="w-full px-2 py-1.5 rounded bg-slate-700 border border-slate-600 text-white text-xs"
                  >
                    {RESULTS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Notas *
                  </label>
                  <textarea
                    value={fuForm.notes}
                    onChange={(e) =>
                      setFuForm({...fuForm, notes: e.target.value})
                    }
                    required
                    rows={2}
                    placeholder="¿Cómo fue el contacto?"
                    className="w-full px-2 py-1.5 rounded bg-slate-700 border border-slate-600 text-white text-xs resize-none focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="text-xs text-gray-400 hover:text-white px-2 py-1"
                  >
                    Cancelar
                  </button>
                  <Button
                    type="submit"
                    disabled={savingFU}
                    size="sm"
                    className="bg-teal-600 hover:bg-teal-700 text-xs h-7 px-3"
                  >
                    {savingFU ? "Guardando..." : "Guardar"}
                  </Button>
                </div>
              </form>
            )}

            {/* History */}
            {loadingFU ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : followUps.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-3">
                Sin seguimientos registrados
              </p>
            ) : (
              <div className="space-y-2">
                {followUps.map((fu) => {
                  const ti = FOLLOW_UP_TYPES.find((t) => t.value === fu.type);
                  const ri = getResult(fu.result);
                  const Icon = ti?.icon || MessageCircle;
                  return (
                    <div
                      key={fu.id}
                      className="flex gap-3 p-3 bg-slate-700/40 rounded-lg group"
                    >
                      <div className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-3.5 h-3.5 text-slate-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-slate-300">
                            {ti?.label} · {formatDate(fu.date)}
                          </span>
                          {ri && (
                            <span className={`text-xs ${ri.color}`}>
                              {ri.label}
                            </span>
                          )}
                        </div>
                        {fu.notes && (
                          <p className="text-sm text-gray-200 mt-1">
                            {fu.notes}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteFU(fu.id)}
                        className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Actions footer */}
        <div className="px-5 py-4 border-t border-slate-700 flex flex-col gap-2 shrink-0">
          {/* Botón de convertir a miembro */}
          <Button
            onClick={() => setShowConvertDialog(true)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            <UserCheck className="w-4 h-4 mr-2" />
            {v.stage === "INTEGRADO"
              ? "Sincronizar con Miembros"
              : "Convertir a Miembro"}
          </Button>

          {/* Acciones regulares */}
          <div className="flex gap-3">
            <Button
              onClick={() => onEdit(v)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Pencil className="w-4 h-4 mr-2" /> Editar
            </Button>
            <Button
              onClick={() => onDelete(v)}
              variant="outline"
              className="border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight { from { transform:translateX(100%); } to { transform:translateX(0); } }
      `}</style>

      {/* Dialog de confirmación para convertir */}
      {showConvertDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !converting && setShowConvertDialog(false)}
          />
          <div className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-slate-700">
              <h3 className="text-lg font-bold text-white">
                {v.stage === "INTEGRADO"
                  ? "Sincronizar con Miembros"
                  : "Convertir a Miembro"}
              </h3>
            </div>
            <div className="px-6 py-4">
              {convertError && (
                <div className="mb-4 flex items-start gap-2 p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{convertError}</span>
                </div>
              )}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-emerald-900/40 rounded-full flex items-center justify-center shrink-0">
                  <UserCheck className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white font-medium">
                    {v.first_name} {v.last_name}
                  </p>
                  <p className="text-slate-400 text-sm mt-1">
                    {v.stage === "INTEGRADO"
                      ? "Este visitante ya está marcado como integrado. Se creará su registro en la lista de miembros si no existe."
                      : "Se creará un nuevo miembro activo con los datos del visitante y se actualizará su estado a 'Integrado'."}
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-700 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowConvertDialog(false)}
                disabled={converting}
                className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConvertToMember}
                disabled={converting}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {converting ? "Procesando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({icon, label, value}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-gray-500 mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm text-gray-200 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function VisitorsPage() {
  const [visitors, setVisitors] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const LIMIT = 20;

  // Detail panel
  const [detailVisitor, setDetailVisitor] = useState(null);

  // Modal visitante
  const [visitorModal, setVisitorModal] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState(null);
  const [visitorForm, setVisitorForm] = useState(emptyVisitorForm);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Delete
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ── Carga ─────────────────────────────────────────────────────────────────

  const loadVisitors = async () => {
    setLoading(true);
    try {
      const params = {limit: LIMIT, offset: (page - 1) * LIMIT};
      if (filterStage !== "ALL") params.stage = filterStage;
      if (search.trim()) params.search = search.trim();
      const data = await visitorsService.getAll(params);
      setVisitors(data.visitors || []);
      setTotalItems(data.pagination?.total || 0);
    } catch {
      setErrorMsg("Error al cargar visitantes");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await visitorsService.getStats();
      setStats(data.stats);
    } catch {
      /* silencioso */
    }
  };

  useEffect(() => {
    loadStats();
  }, []);
  useEffect(() => {
    loadVisitors();
  }, [page, filterStage]);
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      loadVisitors();
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingVisitor(null);
    setVisitorForm({
      ...emptyVisitorForm,
      firstVisitDate: new Date().toISOString().slice(0, 10),
    });
    setErrorMsg("");
    setSuccessMsg("");
    setVisitorModal(true);
  };

  const openEdit = (visitor) => {
    setEditingVisitor(visitor);
    setVisitorForm({
      firstName: visitor.first_name || "",
      lastName: visitor.last_name || "",
      phone: visitor.phone || "",
      email: visitor.email || "",
      address: visitor.address || "",
      birthDate: visitor.birth_date ? visitor.birth_date.slice(0, 10) : "",
      gender: visitor.gender || "",
      firstVisitDate: visitor.first_visit_date
        ? visitor.first_visit_date.slice(0, 10)
        : "",
      howTheyCame: visitor.how_they_came || "OTRO",
      invitedBy: visitor.invited_by || "",
      stage: visitor.stage || "PRIMERA_VISITA",
      responsible: visitor.responsible || "",
      notes: visitor.notes || "",
    });
    setErrorMsg("");
    setSuccessMsg("");
    setVisitorModal(true);
  };

  const handleSaveVisitor = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    try {
      const payload = {
        firstName: visitorForm.firstName,
        lastName: visitorForm.lastName,
        phone: visitorForm.phone || undefined,
        email: visitorForm.email || undefined,
        address: visitorForm.address || undefined,
        birthDate: visitorForm.birthDate || undefined,
        gender: visitorForm.gender || undefined,
        firstVisitDate: visitorForm.firstVisitDate,
        howTheyCame: visitorForm.howTheyCame,
        invitedBy: visitorForm.invitedBy || undefined,
        stage: visitorForm.stage,
        responsible: visitorForm.responsible || undefined,
        notes: visitorForm.notes || undefined,
      };
      if (editingVisitor) {
        await visitorsService.update(editingVisitor.id, payload);
        setSuccessMsg("Visitante actualizado");
      } else {
        await visitorsService.create(payload);
        setSuccessMsg("Visitante registrado");
      }
      setTimeout(() => {
        setVisitorModal(false);
        setSuccessMsg("");
        loadVisitors();
        loadStats();
      }, 1200);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await visitorsService.delete(deleteTarget.id);
      setDeleteTarget(null);
      if (detailVisitor?.id === deleteTarget.id) setDetailVisitor(null);
      loadVisitors();
      loadStats();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || "Error al eliminar");
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(totalItems / LIMIT);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Visitantes</h1>
          <p className="text-gray-400 mt-1">
            Seguimiento de personas que visitan la iglesia
          </p>
        </div>
        <Button onClick={openCreate} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="h-4 w-4 mr-2" /> Registrar Visitante
        </Button>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-green-900/40 border border-green-700 rounded-lg text-green-300 text-sm">
          <CheckCircle className="h-4 w-4" /> {successMsg}
        </div>
      )}

      {/* Pipeline / Stats */}
      {stats && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <p className="text-xs text-slate-400 mb-3 font-semibold uppercase tracking-wider">
            Embudo de integración
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {STAGES.filter((s) => s.value !== "INACTIVO").map(
              (stage, i, arr) => {
                const key =
                  stage.value === "PRIMERA_VISITA"
                    ? "primera_visita"
                    : stage.value === "EN_SEGUIMIENTO"
                      ? "en_seguimiento"
                      : "integrados";
                const count = stats[key] ?? 0;
                return (
                  <div
                    key={stage.value}
                    className="flex items-center gap-2 flex-1"
                  >
                    <button
                      onClick={() => {
                        setFilterStage(stage.value);
                        setPage(1);
                      }}
                      className={`flex-1 rounded-lg p-3 text-center transition-colors border cursor-pointer
                      ${
                        filterStage === stage.value
                          ? "border-teal-500 bg-teal-900/30"
                          : "border-slate-600 hover:border-slate-500 bg-slate-700/40"
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${stage.dot} mx-auto mb-1`}
                      />
                      <p className="text-xl font-bold text-white">{count}</p>
                      <p className="text-xs text-slate-400">{stage.label}</p>
                    </button>
                    {i < arr.length - 1 && (
                      <ArrowRight className="h-4 w-4 text-slate-600 flex-shrink-0 hidden sm:block" />
                    )}
                  </div>
                );
              },
            )}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="hidden sm:block w-px h-10 bg-slate-600" />
              <div className="rounded-lg p-3 text-center bg-slate-700/40 border border-slate-600 min-w-[80px]">
                <p className="text-xl font-bold text-slate-400">
                  {stats.inactivos || 0}
                </p>
                <p className="text-xs text-slate-500">Inactivos</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            {filterStage !== "ALL" && (
              <button
                onClick={() => setFilterStage("ALL")}
                className="text-xs text-teal-400 hover:underline"
              >
                Ver todos
              </button>
            )}
            {stats.nuevos_este_mes > 0 && (
              <p className="text-xs text-slate-500 ml-auto">
                <span className="text-teal-400 font-medium">
                  {stats.nuevos_este_mes}
                </span>{" "}
                nuevos este mes
              </p>
            )}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar por nombre o teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-slate-800 border-slate-600 text-white placeholder-slate-400"
        />
      </div>

      {/* Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <span className="text-sm font-semibold text-white">
            Lista de Visitantes
            <span className="ml-2 text-gray-400 font-normal">
              ({totalItems})
            </span>
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : visitors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <UserSearch className="h-10 w-10 mb-3 opacity-30" />
            <p className="font-medium">No hay visitantes registrados</p>
            <p className="text-sm mt-1">
              Usa el botón de arriba para registrar el primero
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/60">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium text-xs uppercase tracking-wider">
                      Visitante
                    </th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium text-xs uppercase tracking-wider hidden md:table-cell">
                      Contacto
                    </th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium text-xs uppercase tracking-wider hidden sm:table-cell">
                      Primera Visita
                    </th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium text-xs uppercase tracking-wider">
                      Etapa
                    </th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium text-xs uppercase tracking-wider hidden lg:table-cell">
                      Seguimientos
                    </th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium text-xs uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {visitors.map((visitor) => {
                    const stage = getStage(visitor.stage);
                    const wa = waLink(visitor.phone);
                    return (
                      <tr
                        key={visitor.id}
                        className="hover:bg-slate-700/40 transition-colors cursor-pointer"
                        onClick={() => setDetailVisitor(visitor)}
                      >
                        {/* Name */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <VisitorAvatar visitor={visitor} size="md" />
                            <div>
                              <p className="text-white font-medium text-sm">
                                {visitor.first_name} {visitor.last_name}
                              </p>
                              {visitor.responsible && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  Resp: {visitor.responsible}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td
                          className="py-3 px-4 hidden md:table-cell"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex flex-col gap-1.5">
                            {visitor.phone && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-gray-400">
                                  {visitor.phone}
                                </span>
                                {wa && (
                                  <a
                                    href={wa}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 rounded bg-green-600/20 hover:bg-green-600/40 text-green-400 transition-colors"
                                    title="WhatsApp"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <svg
                                      className="w-3 h-3"
                                      viewBox="0 0 24 24"
                                      fill="currentColor"
                                    >
                                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                    </svg>
                                  </a>
                                )}
                              </div>
                            )}
                            {visitor.email && (
                              <p className="text-xs text-gray-400 truncate max-w-[160px]">
                                {visitor.email}
                              </p>
                            )}
                            {!visitor.phone && !visitor.email && (
                              <span className="text-gray-600 text-xs">—</span>
                            )}
                          </div>
                        </td>

                        {/* First visit */}
                        <td className="py-3 px-4 hidden sm:table-cell">
                          <span className="text-sm text-gray-300">
                            {formatDate(visitor.first_visit_date)}
                          </span>
                        </td>

                        {/* Stage */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${stage.color}`}
                          >
                            {stage.label}
                          </span>
                        </td>

                        {/* Follow-ups count */}
                        <td className="py-3 px-4 hidden lg:table-cell">
                          <div className="flex items-center gap-1.5">
                            <MessageCircle className="w-3.5 h-3.5 text-gray-500" />
                            <span className="text-sm text-gray-400">
                              {visitor.follow_up_count > 0
                                ? visitor.follow_up_count
                                : "—"}
                            </span>
                            {visitor.last_follow_up && (
                              <span className="text-xs text-gray-600 flex items-center gap-0.5">
                                <Clock className="w-3 h-3" />
                                {formatDate(visitor.last_follow_up)}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td
                          className="py-3 px-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(visitor)}
                              className="p-2 text-blue-400 hover:bg-slate-600 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(visitor)}
                              className="p-2 text-red-400 hover:bg-slate-600 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700">
                <p className="text-sm text-gray-400">
                  {totalItems} visitantes · Página {page} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail panel */}
      {detailVisitor && (
        <DetailPanel
          visitor={detailVisitor}
          onClose={() => setDetailVisitor(null)}
          onEdit={(v) => {
            setDetailVisitor(null);
            openEdit(v);
          }}
          onDelete={(v) => {
            setDetailVisitor(null);
            setDeleteTarget(v);
          }}
          onConverted={() => {
            setDetailVisitor(null);
            fetchVisitors();
            fetchStats();
          }}
        />
      )}

      {/* ── Modal: crear / editar ───────────────────────────────────────────── */}
      <Dialog open={visitorModal} onClose={() => setVisitorModal(false)}>
        <DialogHeader onClose={() => setVisitorModal(false)}>
          <h2 className="text-lg font-bold text-white">
            {editingVisitor ? "Editar Visitante" : "Registrar Visitante"}
          </h2>
        </DialogHeader>
        <form onSubmit={handleSaveVisitor}>
          <DialogContent className="space-y-4">
            {errorMsg && (
              <div className="flex items-center gap-2 p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" /> {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="flex items-center gap-2 p-3 bg-green-900/40 border border-green-700 rounded-lg text-green-300 text-sm">
                <CheckCircle className="h-4 w-4 shrink-0" /> {successMsg}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Nombre *
                </label>
                <Input
                  value={visitorForm.firstName}
                  onChange={(e) =>
                    setVisitorForm({...visitorForm, firstName: e.target.value})
                  }
                  placeholder="Nombre"
                  required
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Apellido *
                </label>
                <Input
                  value={visitorForm.lastName}
                  onChange={(e) =>
                    setVisitorForm({...visitorForm, lastName: e.target.value})
                  }
                  placeholder="Apellido"
                  required
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Teléfono
                </label>
                <Input
                  value={visitorForm.phone}
                  onChange={(e) =>
                    setVisitorForm({...visitorForm, phone: e.target.value})
                  }
                  placeholder="55 1234 5678"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  value={visitorForm.email}
                  onChange={(e) =>
                    setVisitorForm({...visitorForm, email: e.target.value})
                  }
                  placeholder="correo@ejemplo.com"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Fecha de primera visita *
                </label>
                <Input
                  type="date"
                  value={visitorForm.firstVisitDate}
                  onChange={(e) =>
                    setVisitorForm({
                      ...visitorForm,
                      firstVisitDate: e.target.value,
                    })
                  }
                  required
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Género
                </label>
                <select
                  value={visitorForm.gender}
                  onChange={(e) =>
                    setVisitorForm({...visitorForm, gender: e.target.value})
                  }
                  className="w-full px-3 py-2 rounded-md bg-slate-700 border border-slate-600 text-white text-sm"
                >
                  <option value="">Sin especificar</option>
                  <option value="MASCULINO">Masculino</option>
                  <option value="FEMENINO">Femenino</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  ¿Cómo llegó?
                </label>
                <select
                  value={visitorForm.howTheyCame}
                  onChange={(e) =>
                    setVisitorForm({
                      ...visitorForm,
                      howTheyCame: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-md bg-slate-700 border border-slate-600 text-white text-sm"
                >
                  {HOW.map((h) => (
                    <option key={h.value} value={h.value}>
                      {h.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  {visitorForm.howTheyCame === "INVITADO"
                    ? "Invitado por"
                    : "Referencia"}
                </label>
                <Input
                  value={visitorForm.invitedBy}
                  onChange={(e) =>
                    setVisitorForm({...visitorForm, invitedBy: e.target.value})
                  }
                  placeholder={
                    visitorForm.howTheyCame === "INVITADO"
                      ? "Nombre de quien invitó"
                      : "Referencia adicional"
                  }
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Etapa
                </label>
                <select
                  value={visitorForm.stage}
                  onChange={(e) =>
                    setVisitorForm({...visitorForm, stage: e.target.value})
                  }
                  className="w-full px-3 py-2 rounded-md bg-slate-700 border border-slate-600 text-white text-sm"
                >
                  {STAGES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Responsable
                </label>
                <Input
                  value={visitorForm.responsible}
                  onChange={(e) =>
                    setVisitorForm({
                      ...visitorForm,
                      responsible: e.target.value,
                    })
                  }
                  placeholder="Quién hace el seguimiento"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Notas generales
                </label>
                <textarea
                  value={visitorForm.notes}
                  onChange={(e) =>
                    setVisitorForm({...visitorForm, notes: e.target.value})
                  }
                  placeholder="Información relevante sobre el visitante..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-md bg-slate-700 border border-slate-600 text-white text-sm placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </DialogContent>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setVisitorModal(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {saving
                ? "Guardando..."
                : editingVisitor
                  ? "Guardar Cambios"
                  : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* ── Modal: confirmar eliminación ───────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogHeader onClose={() => setDeleteTarget(null)}>
          <h2 className="text-lg font-bold text-white">Eliminar Visitante</h2>
        </DialogHeader>
        <DialogContent>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-red-900/40 rounded-full flex items-center justify-center shrink-0">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-white font-medium">
                {deleteTarget?.first_name} {deleteTarget?.last_name}
              </p>
              <p className="text-slate-400 text-sm mt-1">
                Se eliminarán también todos sus seguimientos. Esta acción no se
                puede deshacer.
              </p>
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setDeleteTarget(null)}
            disabled={deleting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleting ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

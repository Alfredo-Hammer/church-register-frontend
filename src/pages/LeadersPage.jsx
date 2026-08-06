import React, {useState, useEffect, useCallback, useRef} from "react";
import {Card, CardContent} from "@/components/ui/Card";
import {Button} from "@/components/ui/Button";
import {Input} from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog";
import {
  Crown,
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  CheckCircle,
  Users,
  ChevronLeft,
  ChevronRight,
  MapPin,
  UserCircle2,
  Layers,
  Printer,
} from "lucide-react";
import {
  leadersService,
  membersService,
  groupsService,
  settingsService,
} from "@/services/api";
import {buildLeadersDirectoryPDF} from "@/utils/reportPrint";
import {useAuth} from "@/contexts/AuthContext";

// ── Constants ─────────────────────────────────────────────────────────────────

const POSITIONS = [
  "Pastor Principal",
  "Pastor Asociado",
  "Pastor de Jóvenes",
  "Anciano / Anciana",
  "Diácono / Diáconisa",
  "Líder de Alabanza",
  "Líder de Jóvenes",
  "Líder de Niños",
  "Líder de Células",
  "Líder de Parejas",
  "Líder de Damas",
  "Líder de Varones",
  "Coordinador de Finanzas",
  "Secretario(a)",
  "Otro",
];

const AREAS = [
  "Pastoral",
  "Adoración / Alabanza",
  "Jóvenes",
  "Niños",
  "Células / Grupos Pequeños",
  "Evangelismo",
  "Misiones",
  "Finanzas",
  "Administración",
  "Damas",
  "Varones",
  "Parejas",
  "Otro",
];

const AREA_COLORS = {
  Pastoral: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/25",
  "Adoración / Alabanza":
    "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-500/25",
  Jóvenes: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/25",
  Niños: "bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/25",
  "Células / Grupos Pequeños":
    "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/25",
  Evangelismo: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/25",
  Misiones: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/25",
  Finanzas: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
  Administración: "bg-muted text-muted-foreground border-border",
  Damas: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/25",
  Varones: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/25",
  Parejas: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/25",
};
const areaColor = (area) =>
  AREA_COLORS[area] || "bg-muted text-muted-foreground border-border";

// ── Avatar ────────────────────────────────────────────────────────────────────

const GRAD = [
  "from-violet-500 to-purple-700",
  "from-blue-500 to-blue-700",
  "from-emerald-500 to-green-700",
  "from-amber-500 to-orange-700",
  "from-rose-500 to-pink-700",
  "from-cyan-500 to-teal-700",
];
function grad(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return GRAD[Math.abs(h) % GRAD.length];
}
function LeaderAvatar({leader, size = "md"}) {
  const sizes = {
    sm: "w-9 h-9 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-20 h-20 text-2xl",
  };
  const initials =
    `${leader.firstName?.[0] ?? ""}${leader.lastName?.[0] ?? ""}`.toUpperCase();
  return (
    <div
      className={`${sizes[size]} rounded-full shrink-0 overflow-hidden bg-gradient-to-br ${grad(leader.firstName + leader.lastName)} flex items-center justify-center font-bold text-white shadow-md`}
    >
      {leader.photoUrl ? (
        <img
          src={leader.photoUrl}
          alt={leader.firstName}
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d.slice(0, 10) + "T12:00:00").toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

// ── Detail Panel ──────────────────────────────────────────────────────────────

function DetailPanel({leader, onClose, onEdit, onDelete}) {
  const wa = leader.phone
    ? `https://wa.me/${leader.phone.replace(/\D/g, "")}`
    : null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md bg-card border-l border-border h-full flex flex-col overflow-hidden shadow-2xl"
        style={{animation: "slideInRight .25s ease-out"}}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <span className="text-sm text-muted-foreground font-medium">
            Perfil del Líder
          </span>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-accent transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Avatar + name */}
          <div className="flex flex-col items-center px-5 pt-8 pb-5 border-b border-border">
            {/* Crown badge over avatar */}
            <div className="relative mb-1">
              <LeaderAvatar leader={leader} size="lg" />
              <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center shadow-lg">
                <Crown className="w-3.5 h-3.5 text-white" />
              </span>
            </div>
            <h2 className="mt-3 text-xl font-bold text-foreground text-center">
              {leader.firstName} {leader.lastName}
            </h2>
            {leader.position && (
              <p className="text-amber-700 dark:text-amber-400 font-medium text-sm mt-1">
                {leader.position}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
              {leader.area && (
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${areaColor(leader.area)}`}
                >
                  {leader.area}
                </span>
              )}
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                  leader.status === "ACTIVO"
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                {leader.status}
              </span>
            </div>
          </div>

          {/* Quick contact */}
          {(leader.phone || leader.email) && (
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Contacto
              </h3>
              <div className="flex flex-wrap gap-2">
                {leader.phone && (
                  <a
                    href={`tel:${leader.phone}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background hover:bg-accent text-foreground text-sm transition-colors"
                  >
                    <Phone className="w-4 h-4 text-blue-700 dark:text-blue-400" /> {leader.phone}
                  </a>
                )}
                {wa && (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600/20 hover:bg-green-600/35 border border-green-600/30 text-green-700 dark:text-green-300 text-sm transition-colors"
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
                {leader.email && (
                  <a
                    href={`mailto:${leader.email}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background hover:bg-accent text-foreground text-sm transition-colors"
                  >
                    <Mail className="w-4 h-4 text-violet-700 dark:text-violet-400" /> {leader.email}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="px-5 py-4 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Información
            </h3>
            {leader.groupName && (
              <InfoRow
                icon={<Users className="w-4 h-4" />}
                label="Grupo asignado"
                value={leader.groupName}
              />
            )}
            {leader.startDate && (
              <InfoRow
                icon={<Calendar className="w-4 h-4" />}
                label="En el liderazgo desde"
                value={fmtDate(leader.startDate)}
              />
            )}
            <InfoRow
              icon={<UserCircle2 className="w-4 h-4" />}
              label="Estado del miembro"
              value={leader.memberStatus}
            />
            {leader.notes && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground border-l-2 border-amber-500 italic">
                {leader.notes}
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-border flex gap-3 shrink-0">
          <Button
            onClick={() => onEdit(leader)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Edit className="w-4 h-4 mr-2" /> Editar
          </Button>
          <Button
            onClick={() => onDelete(leader)}
            variant="outline"
            className="border-red-500/40 text-red-700 dark:text-red-400 hover:bg-red-500/10 hover:border-red-500"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <style>{`@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
    </div>
  );
}

function InfoRow({icon, label, value}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground mt-0.5">{value}</p>
      </div>
    </div>
  );
}

// ── Member Search Dropdown ────────────────────────────────────────────────────

function MemberPicker({value, onChange, excludeIds = []}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Server-side search: fires on query change OR when dropdown opens (query="")
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const t = setTimeout(
      async () => {
        try {
          const params = {status: "ACTIVO", limit: 10};
          if (query.trim()) params.search = query.trim();
          const data = await membersService.getAll(params);
          setResults(
            (data.members || []).filter((m) => !excludeIds.includes(m.id)),
          );
        } catch {
          /* silencioso */
        } finally {
          setLoading(false);
        }
      },
      query.trim() ? 250 : 0,
    );
    return () => clearTimeout(t);
  }, [query, open]);

  const select = (m) => {
    onChange({memberId: m.id, memberName: `${m.first_name} ${m.last_name}`});
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      {value.memberName ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-md">
          <div
            className={`w-7 h-7 rounded-full shrink-0 overflow-hidden bg-gradient-to-br ${grad(value.memberName)} flex items-center justify-center text-xs font-bold text-white`}
          >
            {value.memberName
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </div>
          <span className="text-foreground text-sm flex-1">{value.memberName}</span>
          <button
            type="button"
            onClick={() => onChange({memberId: "", memberName: ""})}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="Buscar miembro..."
            className="pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
      )}

      {open && !value.memberName && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-xl overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              Solo miembros activos
            </span>
            {loading && (
              <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          <div className="max-h-52 overflow-y-auto">
            {!loading && results.length === 0 && (
              <p className="px-3 py-4 text-sm text-muted-foreground text-center">
                {query.trim() ? "Sin resultados" : "No hay miembros activos"}
              </p>
            )}
            {results.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => select(m)}
                className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-accent transition-colors text-left"
              >
                <div
                  className={`w-8 h-8 rounded-full shrink-0 overflow-hidden bg-gradient-to-br ${grad(m.first_name + m.last_name)} flex items-center justify-center text-xs font-bold text-white`}
                >
                  {m.photo_url ? (
                    <img
                      src={m.photo_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    `${m.first_name[0]}${m.last_name[0]}`
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-foreground font-medium truncate">
                    {m.first_name} {m.last_name}
                  </p>
                  {m.phone && (
                    <p className="text-xs text-muted-foreground">{m.phone}</p>
                  )}
                </div>
              </button>
            ))}
            {!loading && results.length === 10 && (
              <p className="px-3 py-2 text-xs text-muted-foreground text-center border-t border-border">
                Escribe para filtrar más resultados
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Add Option Dialog ─────────────────────────────────────────────────────────
// Small modal to add a new custom position or area.

function AddOptionDialog({open, onClose, label, onAdd}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setValue("");
      setError("");
    }
  }, [open]);

  const handleSave = () => {
    const trimmed = value.trim();
    if (!trimmed) return setError("Escribe un nombre.");
    onAdd(trimmed);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-sm w-full">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Plus className="w-4 h-4 text-amber-700 dark:text-amber-400" />
            Nuevo {label}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-3">
          <Input
            autoFocus
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError("");
            }}
            onKeyDown={(e) =>
              e.key === "Enter" && (e.preventDefault(), handleSave())
            }
            placeholder={`Nombre del ${label.toLowerCase()}...`}
            className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-amber-500"
          />
          {error && <p className="text-red-700 dark:text-red-400 text-xs">{error}</p>}
        </div>
        <DialogFooter className="mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-border text-muted-foreground hover:bg-accent"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            Agregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Create / Edit Modal ───────────────────────────────────────────────────────

const emptyForm = () => ({
  memberId: "",
  memberName: "",
  position: "",
  area: "",
  groupId: "",
  status: "ACTIVO",
  startDate: "",
  notes: "",
});

function LeaderModal({
  open,
  onClose,
  editing,
  existingIds,
  onSaved,
  customPositions,
  customAreas,
  onAddPosition,
  onAddArea,
}) {
  const [form, setForm] = useState(emptyForm());
  const [groups, setGroups] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [addPos, setAddPos] = useState(false); // AddOptionDialog for position
  const [addArea, setAddArea] = useState(false); // AddOptionDialog for area

  const allPositions = [
    ...new Set([...POSITIONS.filter((p) => p !== "Otro"), ...customPositions]),
  ];
  const allAreas = [
    ...new Set([...AREAS.filter((a) => a !== "Otro"), ...customAreas]),
  ];

  useEffect(() => {
    groupsService
      .getAll({limit: 200})
      .then((d) => setGroups(d.groups || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        memberId: editing.memberId,
        memberName: `${editing.firstName} ${editing.lastName}`,
        position: editing.position || "",
        area: editing.area || "",
        groupId: editing.groupId || "",
        status: editing.status || "ACTIVO",
        startDate: editing.startDate ? editing.startDate.slice(0, 10) : "",
        notes: editing.notes || "",
      });
    } else {
      setForm(emptyForm());
    }
    setError("");
    setSuccess("");
  }, [open, editing]);

  const set = (k, v) => setForm((p) => ({...p, [k]: v}));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.memberId) return setError("Selecciona un miembro.");
    setSaving(true);
    setError("");
    try {
      const payload = {
        memberId: form.memberId,
        groupId: form.groupId || undefined,
        position: form.position?.trim() || undefined,
        area: form.area?.trim() || undefined,
        status: form.status,
        startDate: form.startDate || undefined,
        notes: form.notes?.trim() || undefined,
      };
      const result = editing
        ? await leadersService.update(editing.id, payload)
        : await leadersService.create(payload);
      setSuccess(editing ? "Líder actualizado." : "Líder registrado.");
      setTimeout(() => {
        onSaved(result);
        onClose();
      }, 900);
    } catch (err) {
      setError(err.response?.data?.error || "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const fieldCls =
    "bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-violet-500";
  const selectCls =
    "flex-1 px-3 py-2 rounded-md bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-violet-500";

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="bg-card border-border max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground text-xl flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Crown className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              </span>
              {editing ? "Editar Líder" : "Registrar Líder"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2 p-3 bg-green-500/10 dark:bg-green-900/20 border border-green-300 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-sm">
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> {success}
              </div>
            )}

            {/* Member picker */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                Miembro *
              </label>
              {editing ? (
                <div className="px-3 py-2 bg-muted/50 border border-border rounded-md text-muted-foreground text-sm">
                  {form.memberName}{" "}
                  <span className="text-muted-foreground">(no se puede cambiar)</span>
                </div>
              ) : (
                <MemberPicker
                  value={{memberId: form.memberId, memberName: form.memberName}}
                  onChange={(v) => setForm((p) => ({...p, ...v}))}
                  excludeIds={existingIds}
                />
              )}
            </div>

            {/* Position */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                Posición / Cargo
              </label>
              <div className="flex gap-2">
                <select
                  value={form.position}
                  onChange={(e) => set("position", e.target.value)}
                  className={selectCls}
                >
                  <option value="">Sin especificar</option>
                  {allPositions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setAddPos(true)}
                  title="Agregar nueva posición"
                  className="shrink-0 w-9 h-9 flex items-center justify-center rounded-md bg-background border border-border text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Area */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                Área / Ministerio
              </label>
              <div className="flex gap-2">
                <select
                  value={form.area}
                  onChange={(e) => set("area", e.target.value)}
                  className={selectCls}
                >
                  <option value="">Sin especificar</option>
                  {allAreas.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setAddArea(true)}
                  title="Agregar nueva área"
                  className="shrink-0 w-9 h-9 flex items-center justify-center rounded-md bg-background border border-border text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Group */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">
                  Grupo asignado
                </label>
                <select
                  value={form.groupId}
                  onChange={(e) => set("groupId", e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">Ninguno</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">
                  Estado
                </label>
                <select
                  value={form.status}
                  onChange={(e) => set("status", e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="ACTIVO">Activo</option>
                  <option value="INACTIVO">Inactivo</option>
                </select>
              </div>
            </div>

            {/* Start date */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                Fecha de inicio en el liderazgo
              </label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
                className={fieldCls}
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Notas</label>
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
                placeholder="Notas o descripción del ministerio..."
                className="w-full px-3 py-2 rounded-md bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-border text-muted-foreground hover:bg-accent"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving || !!success}
                className="bg-amber-500 hover:bg-amber-600 text-white min-w-[120px]"
              >
                {saving
                  ? "Guardando..."
                  : editing
                    ? "Guardar Cambios"
                    : "Registrar Líder"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sub-modals for adding new options */}
      <AddOptionDialog
        open={addPos}
        onClose={() => setAddPos(false)}
        label="Cargo"
        onAdd={(v) => {
          onAddPosition(v);
          set("position", v);
        }}
      />
      <AddOptionDialog
        open={addArea}
        onClose={() => setAddArea(false)}
        label="Área"
        onAdd={(v) => {
          onAddArea(v);
          set("area", v);
        }}
      />
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function LeadersPage() {
  const [leaders, setLeaders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ACTIVO");
  const [filterArea, setFilterArea] = useState("");

  const [detail, setDetail] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Custom options added by the user this session (non-predefined)
  const [customPositions, setCustomPositions] = useState([]);
  const [customAreas, setCustomAreas] = useState([]);
  const [church, setChurch] = useState({});

  useEffect(() => {
    settingsService
      .getChurch()
      .then((r) => setChurch(r.church || r || {}))
      .catch(() => {});
  }, []);

  const handlePrint = () => {
    const html = buildLeadersDirectoryPDF(leaders, church);
    const win = window.open("", "_blank", "width=960,height=720");
    win.document.write(html);
    win.document.close();
  };

  const {user} = useAuth();
  const canEdit = user?.role === "ADMIN" || user?.role === "PASTOR";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterArea) params.area = filterArea;
      if (search.trim()) params.search = search.trim();
      const data = await leadersService.getAll(params);
      setLeaders(data.leaders || []);
      setStats(data.stats || null);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterArea, search]);

  useEffect(() => {
    load();
  }, [filterStatus, filterArea]);

  useEffect(() => {
    const t = setTimeout(() => load(), 350);
    return () => clearTimeout(t);
  }, [search]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (l) => {
    setEditing(l);
    setModalOpen(true);
  };

  const handleSaved = (saved) => {
    setLeaders((prev) => {
      const exists = prev.find((l) => l.id === saved.id);
      return exists
        ? prev.map((l) => (l.id === saved.id ? saved : l))
        : [saved, ...prev];
    });
    if (detail?.id === saved.id) setDetail(saved);
    load(); // refresh stats
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await leadersService.delete(deleteTarget.id);
      setLeaders((prev) => prev.filter((l) => l.id !== deleteTarget.id));
      if (detail?.id === deleteTarget.id) setDetail(null);
      setDeleteTarget(null);
      load();
    } catch (err) {
      alert(err.response?.data?.error || "Error al eliminar.");
    }
  };

  const existingMemberIds = leaders.map((l) => l.memberId);

  // Seed custom lists with values already in use but not in the predefined arrays
  useEffect(() => {
    const BASE_POS = POSITIONS.filter((p) => p !== "Otro");
    const BASE_AREA = AREAS.filter((a) => a !== "Otro");
    const fromPos = leaders
      .map((l) => l.position)
      .filter((p) => p && !BASE_POS.includes(p));
    const fromArea = leaders
      .map((l) => l.area)
      .filter((a) => a && !BASE_AREA.includes(a));
    if (fromPos.length)
      setCustomPositions((prev) => [...new Set([...prev, ...fromPos])]);
    if (fromArea.length)
      setCustomAreas((prev) => [...new Set([...prev, ...fromArea])]);
  }, [leaders]);

  // unique areas from current leaders for the filter dropdown
  const uniqueAreas = [...new Set(leaders.map((l) => l.area).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Crown className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            </span>
            Líderes
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona el equipo de liderazgo de tu iglesia
          </p>
        </div>
        <div className="flex items-center gap-2">
          {leaders.length > 0 && (
            <Button
              variant="outline"
              onClick={handlePrint}
              className="border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 gap-2"
            >
              <Printer className="w-4 h-4" /> PDF
            </Button>
          )}
          {canEdit && (
            <Button
              onClick={openCreate}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" /> Registrar Líder
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: "Total Líderes",
              value: stats.total,
              color: "text-foreground",
              bg: "bg-amber-500/10 border-amber-500/20",
            },
            {
              label: "Activos",
              value: stats.activos,
              color: "text-emerald-700 dark:text-emerald-400",
              bg: "bg-emerald-500/10 border-emerald-500/20",
            },
            {
              label: "Áreas activas",
              value: stats.areas,
              color: "text-blue-700 dark:text-blue-400",
              bg: "bg-blue-500/10 border-blue-500/20",
            },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl p-4 border ${s.bg}`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o posición..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-10 px-3 rounded-md border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500 sm:w-40"
        >
          <option value="">Todos</option>
          <option value="ACTIVO">Activos</option>
          <option value="INACTIVO">Inactivos</option>
        </select>
        <select
          value={filterArea}
          onChange={(e) => setFilterArea(e.target.value)}
          className="h-10 px-3 rounded-md border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500 sm:w-48"
        >
          <option value="">Todas las áreas</option>
          {uniqueAreas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold text-foreground">
            Equipo de Liderazgo
            <span className="ml-2 text-muted-foreground font-normal">
              ({leaders.length})
            </span>
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : leaders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Crown className="w-10 h-10 mb-3 opacity-30" />
            <p className="font-medium">No hay líderes registrados</p>
            <p className="text-sm mt-1">
              Registra el equipo de liderazgo de tu iglesia
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wider">
                    Líder
                  </th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wider hidden sm:table-cell">
                    Posición
                  </th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wider hidden md:table-cell">
                    Área
                  </th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wider hidden lg:table-cell">
                    Contacto
                  </th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wider hidden lg:table-cell">
                    Grupo
                  </th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leaders.map((l) => (
                  <tr
                    key={l.id}
                    className="hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setDetail(l)}
                  >
                    {/* Leader */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <LeaderAvatar leader={l} size="md" />
                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                            <Crown className="w-2.5 h-2.5 text-white" />
                          </span>
                        </div>
                        <div>
                          <p className="text-foreground font-medium text-sm">
                            {l.firstName} {l.lastName}
                          </p>
                          {l.startDate && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Desde {fmtDate(l.startDate)}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Position */}
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <span className="text-sm text-foreground">
                        {l.position || "—"}
                      </span>
                    </td>

                    {/* Area */}
                    <td className="py-3 px-4 hidden md:table-cell">
                      {l.area ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${areaColor(l.area)}`}
                        >
                          {l.area}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </td>

                    {/* Contact */}
                    <td
                      className="py-3 px-4 hidden lg:table-cell"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="space-y-1">
                        {l.phone && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">
                              {l.phone}
                            </span>
                            {l.phone && (
                              <a
                                href={`https://wa.me/${l.phone.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded bg-green-600/20 hover:bg-green-600/40 text-green-700 dark:text-green-400 transition-colors"
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
                        {l.email && (
                          <p className="text-xs text-muted-foreground truncate max-w-[160px]">
                            {l.email}
                          </p>
                        )}
                        {!l.phone && !l.email && (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </div>
                    </td>

                    {/* Group */}
                    <td className="py-3 px-4 hidden lg:table-cell">
                      {l.groupName ? (
                        <span className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {l.groupName}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          l.status === "ACTIVO"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                            : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>

                    {/* Actions */}
                    {canEdit && (
                      <td
                        className="py-3 px-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(l)}
                            className="p-2 text-blue-700 dark:text-blue-400 hover:bg-accent rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(l)}
                            className="p-2 text-red-700 dark:text-red-400 hover:bg-accent rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                    {!canEdit && <td />}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {detail && (
        <DetailPanel
          leader={detail}
          onClose={() => setDetail(null)}
          onEdit={(l) => {
            setDetail(null);
            openEdit(l);
          }}
          onDelete={(l) => {
            setDetail(null);
            setDeleteTarget(l);
          }}
        />
      )}

      {/* Create / Edit modal */}
      <LeaderModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        existingIds={existingMemberIds}
        customPositions={customPositions}
        customAreas={customAreas}
        onAddPosition={(v) =>
          setCustomPositions((p) => [...new Set([...p, v])])
        }
        onAddArea={(v) => setCustomAreas((p) => [...new Set([...p, v])])}
        onSaved={handleSaved}
      />

      {/* Delete confirm */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent className="bg-card border-border max-w-sm w-full">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-red-700 dark:text-red-400" />
              </span>
              Confirmar eliminación
            </DialogTitle>
          </DialogHeader>
          <p className="mt-3 text-muted-foreground text-sm">
            ¿Quitar a{" "}
            <span className="text-foreground font-semibold">
              {deleteTarget?.firstName} {deleteTarget?.lastName}
            </span>{" "}
            del equipo de liderazgo?
          </p>
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="border-border text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

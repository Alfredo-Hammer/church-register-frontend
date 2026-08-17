import React, {useState, useEffect, useRef} from "react";
import {useNavigate, useLocation} from "react-router-dom";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/Card";
import {Button} from "@/components/ui/Button";
import {Input} from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle,
  X,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Baby,
  GraduationCap,
  HeartPulse,
  ShieldAlert,
  UserCheck,
  Check,
  Printer,
  ArrowRightLeft,
  Loader2,
} from "lucide-react";
import {membersService, settingsService} from "@/services/api";
import {buildBlankMemberForm} from "@/utils/reportPrint";

// ── helpers ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "from-blue-500 to-blue-700",
  "from-violet-500 to-purple-700",
  "from-emerald-500 to-green-700",
  "from-rose-500 to-pink-700",
  "from-amber-500 to-orange-700",
  "from-cyan-500 to-teal-700",
];
function avatarColor(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function MemberAvatar({member, size = "md", onClick}) {
  const sizes = {
    sm: "w-9 h-9 text-sm",
    md: "w-10 h-10 text-sm",
    lg: "w-24 h-24 text-3xl",
  };
  const initials =
    `${member.first_name?.[0] ?? ""}${member.last_name?.[0] ?? ""}`.toUpperCase();
  const grad = avatarColor(`${member.first_name}${member.last_name}`);
  return (
    <div
      onClick={onClick}
      className={`${sizes[size]} rounded-full shrink-0 overflow-hidden flex items-center justify-center bg-gradient-to-br ${grad} font-bold text-white shadow-md ${onClick ? "cursor-pointer" : ""}`}
    >
      {member.photo_url ? (
        <img
          src={member.photo_url}
          alt={member.first_name}
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

// El tinte de fondo es claro en ambos temas, así que el texto necesita un tono
// oscuro en tema claro (-700/-800) y el claro original (-400) en tema oscuro.
const STATUS_STYLE = {
  ACTIVO:
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30",
  INACTIVO:
    "bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30",
  VISITANTE:
    "bg-amber-500/15 text-amber-800 dark:text-amber-400 border border-amber-500/30",
};
function StatusBadge({status}) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[status] ?? STATUS_STYLE.ACTIVO}`}
    >
      {status}
    </span>
  );
}

const AGE_GROUP_STYLE = {
  NIÑO: {
    style: "bg-teal-500/15 text-teal-700 dark:text-teal-400 border border-teal-500/30",
    icon: Baby,
    label: "Niño",
  },
  JOVEN: {
    style: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30",
    icon: GraduationCap,
    label: "Joven",
  },
  ADULTO: null,
};
function AgeBadge({ageGroup}) {
  const cfg = AGE_GROUP_STYLE[ageGroup];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.style}`}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
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
const calcAge = (d) => {
  if (!d) return null;
  const birth = new Date(d.slice(0, 10) + "T12:00:00");
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};
const suggestAgeGroup = (birthDate) => {
  if (!birthDate) return "ADULTO";
  const age = calcAge(birthDate);
  if (age === null) return "ADULTO";
  if (age < 12) return "NIÑO";
  if (age < 18) return "JOVEN";
  return "ADULTO";
};

const emptyForm = () => ({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  birthDate: "",
  gender: "MASCULINO",
  address: "",
  status: "ACTIVO",
  ageGroup: "ADULTO",
  guardianId: "",
  guardianName: "",
  grade: "",
  allergies: "",
  emergencyContact: "",
  documentId: "",
  memberSince: "",
  maritalStatus: "",
  occupation: "",
});

function PhotoUploader({preview, onChange, onRemove}) {
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
    <div className="flex items-center gap-4 mb-2">
      <div
        onClick={() => ref.current?.click()}
        className="w-16 h-16 rounded-full overflow-hidden bg-muted border-2 border-dashed border-border hover:border-blue-500 cursor-pointer flex items-center justify-center transition-colors shrink-0"
      >
        {preview ? (
          <img
            src={preview}
            alt="preview"
            className="w-full h-full object-cover"
          />
        ) : (
          <ImagePlus className="w-6 h-6 text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="text-xs text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-700 dark:text-blue-300 font-medium"
        >
          {preview ? "Cambiar foto" : "Subir foto (opcional)"}
        </button>
        {preview && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-red-700 dark:text-red-400 hover:text-red-700 dark:text-red-300 font-medium"
          >
            Quitar foto
          </button>
        )}
        <p className="text-xs text-muted-foreground">PNG, JPG — máx. 2MB</p>
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}

const TRANSFER_MARITAL_LABELS = {
  SOLTERO: "Soltero/a",
  CASADO: "Casado/a",
  DIVORCIADO: "Divorciado/a",
  VIUDO: "Viudo/a",
  UNION_LIBRE: "Unión libre",
};

function TransferRedeemDialog({open, onClose, onRedeemed}) {
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState(null);
  const [searching, setSearching] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setCode("");
    setPreview(null);
    setError("");
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setSearching(true);
    setError("");
    setPreview(null);
    try {
      const data = await membersService.previewTransfer(code.trim());
      setPreview(data.preview);
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo verificar el código.");
    } finally {
      setSearching(false);
    }
  };

  const handleConfirm = async () => {
    setRedeeming(true);
    setError("");
    try {
      await membersService.redeemTransfer(code.trim());
      reset();
      onRedeemed();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo recibir el traslado.");
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="bg-card border-border max-w-lg w-full">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-cyan-600/20 flex items-center justify-center shrink-0">
              <ArrowRightLeft className="w-5 h-5 text-cyan-700 dark:text-cyan-400" />
            </span>
            Recibir traslado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Pide el código a la iglesia que está dando de baja al miembro y pégalo aquí.
          </p>

          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX"
              className="bg-background border-border text-foreground font-mono tracking-wider"
            />
            <Button type="submit" variant="outline" disabled={searching || !code.trim()}>
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buscar"}
            </Button>
          </form>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 dark:bg-red-900/40 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          {preview && (
            <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/40">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-muted border border-border shrink-0 flex items-center justify-center">
                  {preview.photoUrl ? (
                    <img src={preview.photoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserCheck className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{preview.firstName} {preview.lastName}</p>
                  <p className="text-xs text-muted-foreground truncate">Viene de {preview.sourceChurchName}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                {preview.email && <p className="text-muted-foreground truncate">{preview.email}</p>}
                {preview.phone && <p className="text-muted-foreground truncate">{preview.phone}</p>}
                {preview.documentId && <p className="text-muted-foreground truncate">Doc: {preview.documentId}</p>}
                {preview.maritalStatus && (
                  <p className="text-muted-foreground truncate">{TRANSFER_MARITAL_LABELS[preview.maritalStatus] || preview.maritalStatus}</p>
                )}
              </div>

              {preview.baptism && (
                <p className="text-xs text-muted-foreground border-t border-border pt-2">
                  Bautizado el {new Date(preview.baptism.baptism_date.slice(0, 10) + "T12:00:00").toLocaleDateString("es-ES", {day: "numeric", month: "long", year: "numeric"})}
                  {preview.baptism.place ? ` en ${preview.baptism.place}` : ""}
                  {preview.baptism.minister ? ` — ${preview.baptism.minister}` : ""}.
                </p>
              )}

              {preview.groups.length > 0 && (
                <div className="flex flex-wrap gap-1.5 border-t border-border pt-2">
                  {preview.groups.map((g) => (
                    <span key={g} className="px-2 py-0.5 rounded-full text-xs bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300">
                      {g}
                    </span>
                  ))}
                </div>
              )}

              {preview.pastorNotes && (
                <p className="text-xs text-muted-foreground italic border-t border-border pt-2">{preview.pastorNotes}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }} disabled={redeeming}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!preview || redeeming}
            className="bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            {redeeming ? "Recibiendo…" : "Confirmar traslado"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function MembersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ageGroupFilter, setAgeGroupFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
  });

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentMember, setCurrentMember] = useState(null);
  const [formData, setFormData] = useState(emptyForm());
  const [formPhoto, setFormPhoto] = useState(null);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formSaving, setFormSaving] = useState(false);

  // Guardian search inside form
  const [guardianSearch, setGuardianSearch] = useState("");
  const [guardianResults, setGuardianResults] = useState([]);
  const [allMembers, setAllMembers] = useState([]);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Recibir traslado desde otra iglesia
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);

  // Datos de la iglesia, para el encabezado de la ficha en blanco
  const [church, setChurch] = useState({});
  useEffect(() => {
    settingsService
      .getChurch()
      .then((r) => setChurch(r.church || r || {}))
      .catch(() => {});
  }, []);

  const handlePrintBlankForm = () => {
    const html = buildBlankMemberForm(church);
    const win = window.open("", "_blank", "width=900,height=720");
    win.document.write(html);
    win.document.close();
  };

  useEffect(() => {
    fetchMembers();
  }, [statusFilter, ageGroupFilter, genderFilter, pagination.offset]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPagination((prev) => ({...prev, offset: 0}));
      fetchMembers();
    }, 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const params = {limit: pagination.limit, offset: pagination.offset};
      if (statusFilter !== "all") params.status = statusFilter.toUpperCase();
      if (ageGroupFilter !== "all") params.ageGroup = ageGroupFilter;
      if (genderFilter !== "all") params.gender = genderFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();
      const data = await membersService.getAll(params);
      setMembers(data.members || []);
      setPagination((prev) => ({...prev, total: data.total || 0}));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Load active members for guardian search when modal opens
  const loadAllMembers = async () => {
    try {
      const data = await membersService.getAll({limit: 500, status: "ACTIVO"});
      setAllMembers(data.members || []);
    } catch {
      /* silent */
    }
  };

  const openCreate = () => {
    setIsEditing(false);
    setCurrentMember(null);
    setFormData(emptyForm());
    setFormPhoto(null);
    setGuardianSearch("");
    setGuardianResults([]);
    setFormError("");
    setFormSuccess("");
    setIsModalOpen(true);
    loadAllMembers();
  };

  const openEdit = (member) => {
    setIsEditing(true);
    setCurrentMember(member);
    const guardianLabel = member.guardian_id
      ? `${member.guardian_first_name || ""} ${member.guardian_last_name || ""}`.trim()
      : member.guardian_name || "";
    setFormData({
      firstName: member.first_name || "",
      lastName: member.last_name || "",
      email: member.email || "",
      phone: member.phone || "",
      birthDate: member.birth_date ? member.birth_date.split("T")[0] : "",
      gender: member.gender || "MASCULINO",
      address: member.address || "",
      status: member.status || "ACTIVO",
      ageGroup: member.age_group || "ADULTO",
      guardianId: member.guardian_id || "",
      guardianName: member.guardian_name || "",
      grade: member.grade || "",
      allergies: member.allergies || "",
      emergencyContact: member.emergency_contact || "",
      documentId: member.document_id || "",
      memberSince: member.member_since ? member.member_since.split("T")[0] : "",
      maritalStatus: member.marital_status || "",
      occupation: member.occupation || "",
    });
    setGuardianSearch(guardianLabel);
    setFormPhoto(member.photo_url || null);
    setFormError("");
    setFormSuccess("");
    setIsModalOpen(true);
    loadAllMembers();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentMember(null);
    setFormError("");
    setFormSuccess("");
    setFormPhoto(null);
    setGuardianSearch("");
    setGuardianResults([]);
  };

  // MemberDetailPage manda aquí con este estado cuando el usuario pide
  // "Editar" desde la página completa — el formulario en sí sigue viviendo
  // solo aquí, así que en vez de duplicarlo se reabre el modal para ese
  // miembro y se limpia el estado de navegación para no reabrirlo de nuevo.
  useEffect(() => {
    const editMemberId = location.state?.editMemberId;
    if (!editMemberId) return;
    navigate(location.pathname, {replace: true});
    membersService
      .getById(editMemberId)
      .then((m) => openEdit(m))
      .catch(() => {});
  }, [location.state]);

  const handleInput = (e) => {
    const {name, value} = e.target;
    setFormData((p) => {
      const next = {...p, [name]: value};
      // Auto-suggest age group when birth date changes
      if (name === "birthDate") {
        const suggested = suggestAgeGroup(value);
        next.ageGroup = suggested;
        // Clear children fields if changed to ADULTO
        if (suggested === "ADULTO") {
          next.guardianId = "";
          next.guardianName = "";
          next.grade = "";
          next.allergies = "";
          next.emergencyContact = "";
          setGuardianSearch("");
        }
      }
      return next;
    });
  };

  // Guardian autocomplete
  useEffect(() => {
    if (!guardianSearch.trim() || formData.guardianId) {
      setGuardianResults([]);
      return;
    }
    const q = guardianSearch.toLowerCase();
    const pool = allMembers.filter((m) =>
      currentMember && m.id === currentMember.id ? false : true,
    );
    // Al editar, guardianSearch puede llegar con un guardian_name de texto
    // libre que no matchea a ningún miembro (se escribió a mano en vez de
    // vincularlo) — filtrar estricto contra ese texto dejaría la lista
    // vacía y parecería que no hay a quién elegir.
    const matches = pool.filter((m) =>
      `${m.first_name} ${m.last_name}`.toLowerCase().includes(q),
    );
    setGuardianResults((matches.length > 0 ? matches : pool).slice(0, 6));
  }, [guardianSearch, allMembers, formData.guardianId]);

  const selectGuardian = (m) => {
    setFormData((p) => ({...p, guardianId: m.id, guardianName: ""}));
    setGuardianSearch(`${m.first_name} ${m.last_name}`);
    setGuardianResults([]);
  };
  const clearGuardian = () => {
    setFormData((p) => ({...p, guardianId: "", guardianName: ""}));
    setGuardianSearch("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSaving(true);
    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || null,
        phone: formData.phone || null,
        birthDate: formData.birthDate || null,
        gender: formData.gender,
        address: formData.address || null,
        status: formData.status,
        ageGroup: formData.ageGroup,
        guardianId: formData.guardianId || null,
        guardianName:
          !formData.guardianId && guardianSearch
            ? guardianSearch
            : formData.guardianName || null,
        grade: formData.grade || null,
        allergies: formData.allergies || null,
        emergencyContact: formData.emergencyContact || null,
        documentId: formData.documentId || null,
        memberSince: formData.memberSince || null,
        maritalStatus: formData.maritalStatus || null,
        occupation: formData.occupation || null,
      };

      let saved;
      if (isEditing && currentMember) {
        const res = await membersService.update(currentMember.id, payload);
        saved = res.member ?? res;
        const originalPhoto = currentMember.photo_url || null;
        if (formPhoto !== originalPhoto) {
          if (formPhoto) {
            const pr = await membersService.uploadPhoto(saved.id, formPhoto);
            saved = {...saved, photo_url: pr.photoUrl};
          } else {
            await membersService.deletePhoto(saved.id);
            saved = {...saved, photo_url: null};
          }
        }
      } else {
        const res = await membersService.create(payload);
        saved = res.member ?? res;
        if (formPhoto) {
          const pr = await membersService.uploadPhoto(saved.id, formPhoto);
          saved = {...saved, photo_url: pr.photoUrl};
        }
      }

      setFormSuccess(isEditing ? "Miembro actualizado." : "Miembro creado.");
      setMembers((prev) =>
        isEditing
          ? prev.map((m) => (m.id === saved.id ? {...m, ...saved} : m))
          : [...prev, saved],
      );
      if (!isEditing) setPagination((p) => ({...p, total: p.total + 1}));
      setTimeout(closeModal, 900);
    } catch (err) {
      setFormError(
        err.response?.data?.error || "Error al guardar. Intenta de nuevo.",
      );
    } finally {
      setFormSaving(false);
    }
  };

  const confirmDelete = (member) => {
    setDeleteTarget(member);
    setIsModalOpen(false);
  };
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await membersService.delete(deleteTarget.id);
      setMembers((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      setPagination((p) => ({...p, total: p.total - 1}));
      setDeleteTarget(null);
    } catch (err) {
      alert(err.response?.data?.error || "Error al eliminar.");
    }
  };

  // El filtro de búsqueda ya se aplica en el backend (ver fetchMembers);
  // filtrar de nuevo acá solo sería correcto para la página actual, no
  // para el total de miembros de la iglesia.
  const filtered = members;

  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
  const goPage = (p) =>
    setPagination((prev) => ({...prev, offset: (p - 1) * prev.limit}));

  const showChildFields =
    formData.ageGroup === "NIÑO" || formData.ageGroup === "JOVEN";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Miembros</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los miembros de tu iglesia
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePrintBlankForm}
            className="border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 gap-2"
          >
            <Printer className="h-4 w-4" /> Ficha en blanco
          </Button>
          <Button
            variant="outline"
            onClick={() => setTransferDialogOpen(true)}
            className="border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 gap-2"
          >
            <ArrowRightLeft className="h-4 w-4" /> Recibir traslado
          </Button>
          <Button
            onClick={openCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" /> Nuevo Miembro
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination((p) => ({...p, offset: 0}));
              }}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">Todos los estados</option>
              <option value="activo">Activos</option>
              <option value="inactivo">Inactivos</option>
              <option value="visitante">Visitantes</option>
            </select>
            <select
              value={ageGroupFilter}
              onChange={(e) => {
                setAgeGroupFilter(e.target.value);
                setPagination((p) => ({...p, offset: 0}));
              }}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">Todas las categorías</option>
              <option value="ADULTO">Adultos</option>
              <option value="JOVEN">Jóvenes (12–17)</option>
              <option value="NIÑO">Niños (0–11)</option>
            </select>
            <select
              value={genderFilter}
              onChange={(e) => {
                setGenderFilter(e.target.value);
                setPagination((p) => ({...p, offset: 0}));
              }}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">Todos los géneros</option>
              <option value="MASCULINO">Masculino</option>
              <option value="FEMENINO">Femenino</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base">
            Lista de Miembros
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({pagination.total})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-14">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
              <p className="text-muted-foreground mt-4 text-sm">Cargando miembros...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No se encontraron miembros</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wider w-10">
                        #
                      </th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wider">
                        Miembro
                      </th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wider hidden md:table-cell">
                        Contacto
                      </th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wider hidden sm:table-cell">
                        Categoría
                      </th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filtered.map((member, index) => {
                      const isChildRow = member.age_group === "NIÑO";
                      const guardianLabel = member.guardian_id
                        ? `${member.guardian_first_name || ""} ${member.guardian_last_name || ""}`.trim()
                        : member.guardian_name || null;
                      return (
                        <tr
                          key={member.id}
                          className="hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => navigate(`/dashboard/members/${member.id}`)}
                        >
                          <td className="py-3 px-4 text-muted-foreground text-sm">
                            {pagination.offset + index + 1}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <MemberAvatar member={member} size="md" />
                              <div>
                                <p className="text-foreground font-medium text-sm">
                                  {member.first_name} {member.last_name}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  {member.birth_date && (
                                    <span className="text-xs text-muted-foreground">
                                      {calcAge(member.birth_date)} años
                                    </span>
                                  )}
                                  {isChildRow && guardianLabel && (
                                    <span className="text-xs text-muted-foreground">
                                      · {guardianLabel}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell">
                            <div className="space-y-1">
                              {member.email && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {member.email}
                                </p>
                              )}
                              {member.phone && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {member.phone}
                                </p>
                              )}
                              {!member.email && !member.phone && (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 hidden sm:table-cell">
                            <AgeBadge ageGroup={member.age_group} />
                            {(!member.age_group ||
                              member.age_group === "ADULTO") && (
                              <span className="text-muted-foreground text-xs">
                                Adulto
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <StatusBadge status={member.status} />
                          </td>
                          <td
                            className="py-3 px-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEdit(member)}
                                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-accent rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => confirmDelete(member)}
                                className="p-2 text-red-700 dark:text-red-400 hover:bg-accent rounded-lg transition-colors"
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
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => goPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      variant="outline"
                      size="sm"
                      className="bg-secondary border-border text-foreground hover:bg-accent"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => goPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      variant="outline"
                      size="sm"
                      className="bg-secondary border-border text-foreground hover:bg-accent"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>


      {/* Create / Edit modal */}
      <Dialog open={isModalOpen} onOpenChange={(o) => !o && closeModal()}>
        <DialogContent className="bg-card border-border max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground text-xl flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </span>
              {isEditing ? "Editar Miembro" : "Nuevo Miembro"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <PhotoUploader
              preview={formPhoto}
              onChange={setFormPhoto}
              onRemove={() => setFormPhoto(null)}
            />

            {formError && (
              <div className="bg-red-500/10 dark:bg-red-900/20 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span className="text-sm">{formError}</span>
              </div>
            )}
            {formSuccess && (
              <div className="bg-green-500/10 dark:bg-green-900/20 border border-green-300 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg p-3 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span className="text-sm">{formSuccess}</span>
              </div>
            )}

            {/* Nombre + apellido */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">
                  Nombre *
                </label>
                <Input
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInput}
                  required
                  className="bg-background border-border text-foreground"
                  placeholder="Juan"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">
                  Apellido *
                </label>
                <Input
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInput}
                  required
                  className="bg-background border-border text-foreground"
                  placeholder="Pérez"
                />
              </div>
            </div>

            {/* Fecha + género + categoría */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">
                  Fecha de Nacimiento
                </label>
                <Input
                  name="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={handleInput}
                  className="bg-background border-border text-foreground"
                />
                {formData.birthDate && (
                  <p className="text-xs text-muted-foreground">
                    {calcAge(formData.birthDate)} años
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">
                  Género *
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInput}
                  required
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="MASCULINO">Masculino</option>
                  <option value="FEMENINO">Femenino</option>
                </select>
              </div>
            </div>

            {/* Categoría de edad */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                Categoría de edad
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    value: "ADULTO",
                    label: "Adulto",
                    icon: null,
                    desc: "18+ años",
                  },
                  {
                    value: "JOVEN",
                    label: "Joven",
                    icon: GraduationCap,
                    desc: "12–17 años",
                  },
                  {value: "NIÑO", label: "Niño", icon: Baby, desc: "0–11 años"},
                ].map(({value, label, icon: Icon, desc}) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setFormData((p) => ({...p, ageGroup: value}))
                    }
                    className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border text-sm font-medium transition-all
                      ${
                        formData.ageGroup === value
                          ? value === "NIÑO"
                            ? "bg-teal-500/15 border-teal-500/50 text-teal-700 dark:text-teal-300"
                            : value === "JOVEN"
                              ? "bg-purple-500/15 border-purple-500/50 text-purple-700 dark:text-purple-300"
                              : "bg-blue-500/15 border-blue-500/50 text-blue-700 dark:text-blue-300"
                          : "bg-secondary border-border text-muted-foreground hover:border-primary"
                      }`}
                  >
                    {Icon && <Icon className="w-4 h-4" />}
                    <span>{label}</span>
                    <span className="text-[10px] opacity-70">{desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Documento + miembro desde */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">
                  Documento de identidad
                </label>
                <Input
                  name="documentId"
                  value={formData.documentId}
                  onChange={handleInput}
                  className="bg-background border-border text-foreground"
                  placeholder="Cédula, DNI, pasaporte…"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">
                  Miembro desde
                </label>
                <Input
                  name="memberSince"
                  type="date"
                  value={formData.memberSince}
                  onChange={handleInput}
                  className="bg-background border-border text-foreground"
                />
              </div>
            </div>

            {/* Estado civil + ocupación */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">
                  Estado civil
                </label>
                <select
                  name="maritalStatus"
                  value={formData.maritalStatus}
                  onChange={handleInput}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">Sin especificar</option>
                  <option value="SOLTERO">Soltero/a</option>
                  <option value="CASADO">Casado/a</option>
                  <option value="DIVORCIADO">Divorciado/a</option>
                  <option value="VIUDO">Viudo/a</option>
                  <option value="UNION_LIBRE">Unión libre</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">
                  Ocupación
                </label>
                <Input
                  name="occupation"
                  value={formData.occupation}
                  onChange={handleInput}
                  className="bg-background border-border text-foreground"
                  placeholder="Ej: Maestro, ingeniero…"
                />
              </div>
            </div>

            {/* Children / Youth extra fields */}
            {showChildFields && (
              <div
                className={`space-y-4 rounded-xl border p-4
                ${formData.ageGroup === "NIÑO" ? "bg-teal-500/5 border-teal-500/20" : "bg-purple-500/5 border-purple-500/20"}`}
              >
                <p
                  className={`text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5
                  ${formData.ageGroup === "NIÑO" ? "text-teal-700 dark:text-teal-400" : "text-purple-700 dark:text-purple-400"}`}
                >
                  {formData.ageGroup === "NIÑO" ? (
                    <Baby className="w-3.5 h-3.5" />
                  ) : (
                    <GraduationCap className="w-3.5 h-3.5" />
                  )}
                  {formData.ageGroup === "NIÑO"
                    ? "Información del Niño"
                    : "Información del Joven"}
                </p>

                {/* Guardian search */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Padre / Tutor
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={guardianSearch}
                      onChange={(e) => {
                        setGuardianSearch(e.target.value);
                        if (formData.guardianId)
                          setFormData((p) => ({...p, guardianId: ""}));
                      }}
                      placeholder="Buscar miembro activo o escribir nombre..."
                      className="pl-10 bg-background border-border text-foreground"
                    />
                    {formData.guardianId && (
                      <button
                        type="button"
                        onClick={clearGuardian}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {/* Dropdown */}
                  {guardianResults.length > 0 && (
                    <div className="bg-popover border border-border rounded-lg overflow-hidden max-h-40 overflow-y-auto shadow-xl">
                      {guardianResults.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => selectGuardian(m)}
                          className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-accent transition-colors text-left"
                        >
                          <MemberAvatar member={m} size="sm" />
                          <span className="text-sm text-foreground">
                            {m.first_name} {m.last_name}
                          </span>
                          <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 ml-auto shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                  {formData.guardianId && (
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Miembro registrado
                      seleccionado
                    </p>
                  )}
                </div>

                {/* Grade (only for NIÑO) */}
                {formData.ageGroup === "NIÑO" && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5" /> Grado escolar
                    </label>
                    <Input
                      name="grade"
                      value={formData.grade}
                      onChange={handleInput}
                      placeholder="Ej: 3° Primaria, Kinder, Pre-escolar..."
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                )}

                {/* Allergies */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <HeartPulse className="w-3.5 h-3.5 text-red-700 dark:text-red-400" /> Alergias
                    / Condiciones médicas
                  </label>
                  <textarea
                    name="allergies"
                    value={formData.allergies}
                    onChange={handleInput}
                    rows={2}
                    placeholder="Ej: Alergia a nueces, asma, ninguna..."
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                  />
                </div>

                {/* Emergency contact */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-orange-700 dark:text-orange-400" />{" "}
                    Contacto de emergencia
                  </label>
                  <Input
                    name="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={handleInput}
                    placeholder="Nombre y teléfono de emergencia..."
                    className="bg-background border-border text-foreground"
                  />
                </div>
              </div>
            )}

            {/* Email + teléfono */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInput}
                  className="bg-background border-border text-foreground"
                  placeholder="juan@ejemplo.com"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">
                  Teléfono
                </label>
                <Input
                  name="phone"
                  value={formData.phone}
                  onChange={handleInput}
                  className="bg-background border-border text-foreground"
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>

            {/* Dirección + estado */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">
                  Dirección
                </label>
                <Input
                  name="address"
                  value={formData.address}
                  onChange={handleInput}
                  className="bg-background border-border text-foreground"
                  placeholder="Calle Principal 123"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">
                  Estado *
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInput}
                  required
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="ACTIVO">Activo</option>
                  <option value="INACTIVO">Inactivo</option>
                  <option value="VISITANTE">Visitante</option>
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeModal}
                className="bg-secondary border-border text-muted-foreground hover:bg-accent"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!!formSuccess || formSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
              >
                {formSaving
                  ? "Guardando..."
                  : isEditing
                    ? "Actualizar"
                    : "Crear Miembro"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
            ¿Eliminar a{" "}
            <span className="text-foreground font-semibold">
              {deleteTarget?.first_name} {deleteTarget?.last_name}
            </span>
            ? Esta acción no puede deshacerse.
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

      <TransferRedeemDialog
        open={transferDialogOpen}
        onClose={() => setTransferDialogOpen(false)}
        onRedeemed={fetchMembers}
      />
    </div>
  );
}

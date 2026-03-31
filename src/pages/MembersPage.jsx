import React, {useState, useEffect, useRef} from "react";
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
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle,
  X,
  Camera,
  UserCircle2,
  ChevronLeft,
  ChevronRight,
  UsersRound,
  Clock,
  ImagePlus,
  Trash,
  Baby,
  GraduationCap,
  HeartPulse,
  ShieldAlert,
  UserCheck,
  Check,
  FileDown,
  MessageSquare,
  Pencil,
} from "lucide-react";
import {membersService} from "@/services/api";
import {useAuth} from "@/contexts/AuthContext";
import {PrintLayout, PrintPage} from "@/components/print";
import MemberPrintCard from "@/components/print/MemberPrintCard";
import {exportMemberPdf} from "@/utils/pdf/memberPdf";

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

const STATUS_STYLE = {
  ACTIVO: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  INACTIVO: "bg-red-500/15 text-red-400 border border-red-500/30",
  VISITANTE: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
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
    style: "bg-teal-500/15 text-teal-400 border border-teal-500/30",
    icon: Baby,
    label: "Niño",
  },
  JOVEN: {
    style: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
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
});

// ── Plantillas de notas del pastor / líder ───────────────────────────────────
const PASTOR_NOTE_TEMPLATES = [
  {
    label: "Miembro fiel",
    text: "Es un miembro fiel y comprometido con la congregación. Su coherencia entre la fe que profesa y la vida que vive es un testimonio constante de la gracia de Dios. Siempre dispuesto a servir con humildad y a colaborar en las actividades de la iglesia sin esperar reconocimiento.",
  },
  {
    label: "Columna de la iglesia",
    text: "Es una de las personas en quien esta congregación se sostiene. Su madurez espiritual, su amor por la Palabra y su disposición para servir lo hacen un ejemplo vivo para los demás hermanos. La iglesia cuenta con él/ella como un pilar de confianza y oración.",
  },
  {
    label: "Corazón de adoración",
    text: "Posee un corazón genuinamente entregado a la adoración y la presencia de Dios. Su participación en los momentos de alabanza inspira a la congregación y refleja una relación íntima y auténtica con el Señor.",
  },
  {
    label: "Líder potencial",
    text: "Muestra cualidades notables de liderazgo: escucha con atención, actúa con integridad y tiene un corazón de servicio hacia los demás. Se recomienda para formación y capacitación con miras a asumir responsabilidades de liderazgo dentro de la iglesia.",
  },
  {
    label: "Maestro de la Palabra",
    text: "Tiene un don especial para enseñar y comunicar la Palabra de Dios con claridad y profundidad. Su preparación, su amor por las Escrituras y su sensibilidad pastoral lo hacen apto para ministrar en la enseñanza bíblica y el discipulado.",
  },
  {
    label: "Servidor incansable",
    text: "Es de las personas que sirven sin que nadie se los pida. Se anticipa a las necesidades, trabaja en silencio y con excelencia, y pone los intereses del Reino por encima de los suyos. Su servicio desinteresado es un reflejo del carácter de Cristo.",
  },
  {
    label: "En proceso",
    text: "Se encuentra en un proceso activo de crecimiento espiritual. Ha mostrado apertura a la Palabra, disposición para aprender y deseo genuino de cambio. Se recomienda acompañamiento pastoral continuo, discipulado y oración de intercesión por su vida.",
  },
  {
    label: "Nuevo creyente",
    text: "Es un nuevo creyente que está dando sus primeros pasos en la fe. Su entrega ha sido sincera y su hambre espiritual es evidente. Necesita guía cercana, integración en un grupo pequeño y el apoyo afectuoso de la comunidad para consolidar su vida cristiana.",
  },
  {
    label: "Restauración",
    text: "Está atravesando un proceso de restauración espiritual y personal. La iglesia lo/la recibe con gracia y misericordia, creyendo en la obra transformadora de Dios. Se requiere acompañamiento pastoral cuidadoso, confidencialidad y amor fraternal.",
  },
  {
    label: "Visitante regular",
    text: "Asiste regularmente a los servicios como visitante y ha mostrado interés genuino en la comunidad de fe. Se sugiere un seguimiento pastoral personalizado para acompañar su proceso de integración y responder a sus preguntas espirituales.",
  },
  {
    label: "Recomendado para bautismo",
    text: "Ha demostrado un cambio genuino en su vida, una comprensión clara del significado del bautismo y un compromiso sólido con Cristo. Se recomienda su participación en el próximo bautismo como declaración pública de su fe.",
  },
  {
    label: "Intercesor",
    text: "Es una persona de oración. Tiene un ministerio de intercesión activo y constante que sostiene a la iglesia. Su vida de oración private es un fundamento poderoso para la obra que Dios hace en esta congregación.",
  },
  {
    label: "Familia pastoral",
    text: "Es una familia que ha dado frutos de fe dentro de la congregación. Su hogar es un reflejo del amor de Cristo y un modelo de vida cristiana para otras familias de la iglesia. Se les reconoce con gratitud por su entrega y ejemplo.",
  },
];

// ── Detail Panel ──────────────────────────────────────────────────────────────
function DetailPanel({
  member,
  onClose,
  onEdit,
  onDelete,
  onPhotoChange,
  onPrint,
  onNotesChange,
}) {
  const [groups, setGroups] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(member.pastor_notes || "");
  const [notesSaving, setNotesSaving] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    setGroups(null);
    membersService
      .getGroups(member.id)
      .then((d) => setGroups(d.groups ?? []))
      .catch(() => setGroups([]));
  }, [member.id]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return alert("Solo imágenes.");
    if (file.size > 2 * 1024 * 1024) return alert("Máximo 2MB.");
    setPhotoUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const res = await membersService.uploadPhoto(
          member.id,
          ev.target.result,
        );
        onPhotoChange(member.id, res.photoUrl);
      } catch {
        alert("Error al subir la foto.");
      } finally {
        setPhotoUploading(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleDeletePhoto = async () => {
    if (!window.confirm("¿Eliminar la foto de este miembro?")) return;
    setPhotoUploading(true);
    try {
      await membersService.deletePhoto(member.id);
      onPhotoChange(member.id, null);
    } catch {
      alert("Error al eliminar la foto.");
    } finally {
      setPhotoUploading(false);
    }
  };

  const age = calcAge(member.birth_date);
  const isChild = member.age_group === "NIÑO";
  const isYouth = member.age_group === "JOVEN";
  const guardianName = member.guardian_id
    ? `${member.guardian_first_name || ""} ${member.guardian_last_name || ""}`.trim()
    : member.guardian_name || null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-slate-800 border-l border-slate-700 h-full overflow-y-auto flex flex-col animate-slide-in-right shadow-2xl">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
          <span className="text-sm text-gray-400 font-medium">
            Perfil del Miembro
          </span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Avatar + name */}
        <div className="flex flex-col items-center px-5 pt-8 pb-6 border-b border-slate-700">
          <div className="relative mb-4">
            <MemberAvatar member={member} size="lg" />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={photoUploading}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg transition-colors disabled:opacity-50"
              title="Cambiar foto"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          {member.photo_url && (
            <button
              onClick={handleDeletePhoto}
              disabled={photoUploading}
              className="text-xs text-red-400 hover:text-red-300 mb-2 flex items-center gap-1 disabled:opacity-50"
            >
              <Trash className="w-3 h-3" /> Eliminar foto
            </button>
          )}
          <h2 className="text-xl font-bold text-white text-center">
            {member.first_name} {member.last_name}
          </h2>
          <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
            <StatusBadge status={member.status} />
            {member.age_group && member.age_group !== "ADULTO" && (
              <AgeBadge ageGroup={member.age_group} />
            )}
          </div>
        </div>

        {/* Info sections */}
        <div className="flex-1 px-5 py-4 space-y-5">
          {/* Personal */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Información Personal
            </h3>
            <div className="space-y-3">
              <InfoRow
                icon={<UserCircle2 className="w-4 h-4" />}
                label="Género"
                value={member.gender || "—"}
              />
              <InfoRow
                icon={<Calendar className="w-4 h-4" />}
                label="Fecha de nacimiento"
                value={
                  member.birth_date
                    ? `${fmtDate(member.birth_date)}${age !== null ? ` (${age} años)` : ""}`
                    : "—"
                }
              />
              <InfoRow
                icon={<Clock className="w-4 h-4" />}
                label="Miembro desde"
                value={fmtDate(member.created_at)}
              />
            </div>
          </section>

          {/* Children / Youth section */}
          {(isChild || isYouth) && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                {isChild ? (
                  <Baby className="w-3.5 h-3.5 text-teal-400" />
                ) : (
                  <GraduationCap className="w-3.5 h-3.5 text-purple-400" />
                )}
                {isChild ? "Información del Niño" : "Información del Joven"}
              </h3>
              <div className="space-y-3">
                {guardianName && (
                  <InfoRow
                    icon={<UserCheck className="w-4 h-4 text-blue-400" />}
                    label="Padre / Tutor"
                    value={guardianName + (member.guardian_id ? " ✓" : "")}
                  />
                )}
                {isChild && member.grade && (
                  <InfoRow
                    icon={<GraduationCap className="w-4 h-4" />}
                    label="Grado escolar"
                    value={member.grade}
                  />
                )}
                {member.emergency_contact && (
                  <InfoRow
                    icon={<Phone className="w-4 h-4 text-orange-400" />}
                    label="Contacto de emergencia"
                    value={member.emergency_contact}
                  />
                )}
                {member.allergies && (
                  <div className="flex items-start gap-3">
                    <span className="text-red-400 mt-0.5 shrink-0">
                      <HeartPulse className="w-4 h-4" />
                    </span>
                    <div>
                      <p className="text-xs text-gray-500">
                        Alergias / Condiciones médicas
                      </p>
                      <p className="text-sm text-red-300 mt-0.5 font-medium">
                        {member.allergies}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Contact */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Contacto
            </h3>
            <div className="space-y-3">
              <InfoRow
                icon={<Phone className="w-4 h-4" />}
                label="Teléfono"
                value={member.phone || "—"}
              />
              <InfoRow
                icon={<Mail className="w-4 h-4" />}
                label="Email"
                value={member.email || "—"}
              />
              <InfoRow
                icon={<MapPin className="w-4 h-4" />}
                label="Dirección"
                value={member.address || "—"}
              />
            </div>
          </section>

          {/* Groups */}
          {/* Palabras del Pastor / Líder */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                Palabras del Pastor / Líder
              </h3>
              {!editingNotes && (
                <button
                  onClick={() => {
                    setNotesValue(member.pastor_notes || "");
                    setEditingNotes(true);
                  }}
                  className="text-gray-500 hover:text-indigo-400 transition-colors"
                  title="Editar notas"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {editingNotes ? (
              <div className="space-y-2.5">
                {/* Plantillas rápidas */}
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">
                    Plantillas rápidas:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {PASTOR_NOTE_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.label}
                        onClick={() => setNotesValue(tpl.text)}
                        className="px-2.5 py-1 text-xs rounded-full border border-indigo-500/30 text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 hover:border-indigo-400/50 transition-colors text-left"
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  rows={4}
                  placeholder="Escribe aquí las palabras de referencia..."
                  className="w-full bg-slate-700/60 border border-slate-600 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setEditingNotes(false)}
                    className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
                    disabled={notesSaving}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      setNotesSaving(true);
                      try {
                        await membersService.update(member.id, {
                          pastorNotes: notesValue || null,
                        });
                        onNotesChange(member.id, notesValue || null);
                        setEditingNotes(false);
                      } catch {
                        alert("Error al guardar las notas.");
                      } finally {
                        setNotesSaving(false);
                      }
                    }}
                    disabled={notesSaving}
                    className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors disabled:opacity-60"
                  >
                    {notesSaving ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </div>
            ) : member.pastor_notes ? (
              <p className="text-sm text-gray-300 leading-relaxed italic border-l-2 border-indigo-500/40 pl-3">
                {member.pastor_notes}
              </p>
            ) : (
              <p className="text-sm text-gray-600 italic">
                Sin notas registradas.
              </p>
            )}
          </section>

          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Grupos
            </h3>
            {groups === null ? (
              <p className="text-gray-500 text-sm">Cargando...</p>
            ) : groups.length === 0 ? (
              <p className="text-gray-500 text-sm">
                No pertenece a ningún grupo.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {groups.map((g) => (
                  <span
                    key={g.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-full text-xs font-medium"
                  >
                    <UsersRound className="w-3 h-3" />
                    {g.name}
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-slate-700 flex gap-3 sticky bottom-0 bg-slate-800">
          <Button
            onClick={() => onEdit(member)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Edit className="w-4 h-4 mr-2" /> Editar
          </Button>
          <Button
            onClick={() => onPrint(member)}
            variant="outline"
            className="border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500"
            title="Imprimir / Exportar PDF"
          >
            <FileDown className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => onDelete(member)}
            variant="outline"
            className="border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-500"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-in-right { animation: slide-in-right 0.25s ease-out; }
      `}</style>
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
        className="w-16 h-16 rounded-full overflow-hidden bg-slate-700 border-2 border-dashed border-slate-500 hover:border-blue-500 cursor-pointer flex items-center justify-center transition-colors shrink-0"
      >
        {preview ? (
          <img
            src={preview}
            alt="preview"
            className="w-full h-full object-cover"
          />
        ) : (
          <ImagePlus className="w-6 h-6 text-gray-500" />
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="text-xs text-blue-400 hover:text-blue-300 font-medium"
        >
          {preview ? "Cambiar foto" : "Subir foto (opcional)"}
        </button>
        {preview && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-red-400 hover:text-red-300 font-medium"
          >
            Quitar foto
          </button>
        )}
        <p className="text-xs text-gray-600">PNG, JPG — máx. 2MB</p>
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

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function MembersPage() {
  const {user} = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ageGroupFilter, setAgeGroupFilter] = useState("all");
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
  });

  // Detail panel
  const [detailMember, setDetailMember] = useState(null);

  // Print preview
  const [printMember, setPrintMember] = useState(null);
  const [printGroups, setPrintGroups] = useState([]);

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

  useEffect(() => {
    fetchMembers();
  }, [statusFilter, ageGroupFilter, pagination.offset]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const params = {limit: pagination.limit, offset: pagination.offset};
      if (statusFilter !== "all") params.status = statusFilter.toUpperCase();
      if (ageGroupFilter !== "all") params.ageGroup = ageGroupFilter;
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

  const syncDetail = (updated) => {
    if (detailMember?.id === updated.id) setDetailMember(updated);
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
    setGuardianResults(
      allMembers
        .filter((m) =>
          currentMember && m.id === currentMember.id ? false : true,
        )
        .filter((m) =>
          `${m.first_name} ${m.last_name}`.toLowerCase().includes(q),
        )
        .slice(0, 6),
    );
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
      syncDetail(saved);
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
      if (detailMember?.id === deleteTarget.id) setDetailMember(null);
      setDeleteTarget(null);
    } catch (err) {
      alert(err.response?.data?.error || "Error al eliminar.");
    }
  };

  const handlePhotoChange = (memberId, photoUrl) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? {...m, photo_url: photoUrl} : m)),
    );
    setDetailMember((prev) => (prev ? {...prev, photo_url: photoUrl} : prev));
  };

  const filtered = members.filter((m) => {
    const name = `${m.first_name} ${m.last_name}`.toLowerCase();
    const email = (m.email || "").toLowerCase();
    const q = searchTerm.toLowerCase();
    return name.includes(q) || email.includes(q);
  });

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
          <h1 className="text-3xl font-bold text-white">Miembros</h1>
          <p className="text-gray-400 mt-1">
            Gestiona los miembros de tu iglesia
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" /> Nuevo Miembro
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-700 border-slate-600 text-white placeholder-gray-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination((p) => ({...p, offset: 0}));
              }}
              className="h-10 w-full rounded-md border border-slate-600 bg-slate-700 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
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
              className="h-10 w-full rounded-md border border-slate-600 bg-slate-700 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">Todas las categorías</option>
              <option value="ADULTO">Adultos</option>
              <option value="JOVEN">Jóvenes (12–17)</option>
              <option value="NIÑO">Niños (0–11)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-base">
            Lista de Miembros
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({pagination.total})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-14">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
              <p className="text-gray-400 mt-4 text-sm">Cargando miembros...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-14 text-gray-400">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No se encontraron miembros</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800/60">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium text-xs uppercase tracking-wider">
                        Miembro
                      </th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium text-xs uppercase tracking-wider hidden md:table-cell">
                        Contacto
                      </th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium text-xs uppercase tracking-wider hidden sm:table-cell">
                        Categoría
                      </th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium text-xs uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium text-xs uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {filtered.map((member) => {
                      const isChildRow = member.age_group === "NIÑO";
                      const guardianLabel = member.guardian_id
                        ? `${member.guardian_first_name || ""} ${member.guardian_last_name || ""}`.trim()
                        : member.guardian_name || null;
                      return (
                        <tr
                          key={member.id}
                          className="hover:bg-slate-700/40 transition-colors cursor-pointer"
                          onClick={() => setDetailMember(member)}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <MemberAvatar member={member} size="md" />
                              <div>
                                <p className="text-white font-medium text-sm">
                                  {member.first_name} {member.last_name}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  {member.birth_date && (
                                    <span className="text-xs text-gray-500">
                                      {calcAge(member.birth_date)} años
                                    </span>
                                  )}
                                  {isChildRow && guardianLabel && (
                                    <span className="text-xs text-gray-600">
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
                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {member.email}
                                </p>
                              )}
                              {member.phone && (
                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {member.phone}
                                </p>
                              )}
                              {!member.email && !member.phone && (
                                <span className="text-gray-600 text-xs">—</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 hidden sm:table-cell">
                            <AgeBadge ageGroup={member.age_group} />
                            {(!member.age_group ||
                              member.age_group === "ADULTO") && (
                              <span className="text-gray-500 text-xs">
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
                                className="p-2 text-blue-400 hover:bg-slate-600 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => confirmDelete(member)}
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
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700">
                  <p className="text-sm text-gray-400">
                    Página {currentPage} de {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => goPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      variant="outline"
                      size="sm"
                      className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => goPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      variant="outline"
                      size="sm"
                      className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
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

      {/* Detail side panel */}
      {detailMember && (
        <DetailPanel
          member={detailMember}
          onClose={() => setDetailMember(null)}
          onEdit={(m) => {
            setDetailMember(null);
            openEdit(m);
          }}
          onDelete={(m) => {
            setDetailMember(null);
            confirmDelete(m);
          }}
          onPhotoChange={handlePhotoChange}
          onNotesChange={(memberId, notes) => {
            setMembers((prev) =>
              prev.map((m) =>
                m.id === memberId ? {...m, pastor_notes: notes} : m,
              ),
            );
            setDetailMember((prev) =>
              prev ? {...prev, pastor_notes: notes} : prev,
            );
          }}
          onPrint={async (m) => {
            const groups = await membersService
              .getGroups(m.id)
              .then((d) => d.groups ?? [])
              .catch(() => []);
            setPrintGroups(groups);
            setPrintMember(m);
          }}
        />
      )}

      {/* ── Print / PDF preview ─────────────────────────────────────────── */}
      {printMember && (
        <PrintLayout
          title="Vista Previa — Ficha de Miembro"
          subtitle={`${printMember.first_name} ${printMember.last_name}`}
          onClose={() => setPrintMember(null)}
          onExportPdf={(onStart, onEnd) =>
            exportMemberPdf(printMember, onStart, onEnd)
          }
        >
          <MemberPrintCard
            member={printMember}
            groups={printGroups}
            church={{
              name: user?.churchName,
              logoUrl: user?.churchLogo ?? null,
            }}
          />
        </PrintLayout>
      )}

      {/* Create / Edit modal */}
      <Dialog open={isModalOpen} onOpenChange={(o) => !o && closeModal()}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-xl flex items-center gap-3">
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
              <div className="bg-red-900/20 border border-red-800 text-red-300 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span className="text-sm">{formError}</span>
              </div>
            )}
            {formSuccess && (
              <div className="bg-green-900/20 border border-green-800 text-green-300 rounded-lg p-3 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span className="text-sm">{formSuccess}</span>
              </div>
            )}

            {/* Nombre + apellido */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-300">
                  Nombre *
                </label>
                <Input
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInput}
                  required
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="Juan"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-300">
                  Apellido *
                </label>
                <Input
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInput}
                  required
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="Pérez"
                />
              </div>
            </div>

            {/* Fecha + género + categoría */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-300">
                  Fecha de Nacimiento
                </label>
                <Input
                  name="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={handleInput}
                  className="bg-slate-700 border-slate-600 text-white"
                />
                {formData.birthDate && (
                  <p className="text-xs text-gray-500">
                    {calcAge(formData.birthDate)} años
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-300">
                  Género *
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInput}
                  required
                  className="h-10 w-full rounded-md border border-slate-600 bg-slate-700 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="MASCULINO">Masculino</option>
                  <option value="FEMENINO">Femenino</option>
                </select>
              </div>
            </div>

            {/* Categoría de edad */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">
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
                            ? "bg-teal-500/15 border-teal-500/50 text-teal-300"
                            : value === "JOVEN"
                              ? "bg-purple-500/15 border-purple-500/50 text-purple-300"
                              : "bg-blue-500/15 border-blue-500/50 text-blue-300"
                          : "bg-slate-700 border-slate-600 text-gray-400 hover:border-slate-500"
                      }`}
                  >
                    {Icon && <Icon className="w-4 h-4" />}
                    <span>{label}</span>
                    <span className="text-[10px] opacity-70">{desc}</span>
                  </button>
                ))}
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
                  ${formData.ageGroup === "NIÑO" ? "text-teal-400" : "text-purple-400"}`}
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
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                    Padre / Tutor
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={guardianSearch}
                      onChange={(e) => {
                        setGuardianSearch(e.target.value);
                        if (formData.guardianId)
                          setFormData((p) => ({...p, guardianId: ""}));
                      }}
                      placeholder="Buscar miembro activo o escribir nombre..."
                      className="pl-10 bg-slate-700 border-slate-600 text-white"
                    />
                    {formData.guardianId && (
                      <button
                        type="button"
                        onClick={clearGuardian}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {/* Dropdown */}
                  {guardianResults.length > 0 && (
                    <div className="bg-slate-700 border border-slate-600 rounded-lg overflow-hidden max-h-40 overflow-y-auto shadow-xl">
                      {guardianResults.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => selectGuardian(m)}
                          className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-slate-600 transition-colors text-left"
                        >
                          <MemberAvatar member={m} size="sm" />
                          <span className="text-sm text-white">
                            {m.first_name} {m.last_name}
                          </span>
                          <Check className="w-3.5 h-3.5 text-emerald-400 ml-auto shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                  {formData.guardianId && (
                    <p className="text-xs text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Miembro registrado
                      seleccionado
                    </p>
                  )}
                </div>

                {/* Grade (only for NIÑO) */}
                {formData.ageGroup === "NIÑO" && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5" /> Grado escolar
                    </label>
                    <Input
                      name="grade"
                      value={formData.grade}
                      onChange={handleInput}
                      placeholder="Ej: 3° Primaria, Kinder, Pre-escolar..."
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                )}

                {/* Allergies */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                    <HeartPulse className="w-3.5 h-3.5 text-red-400" /> Alergias
                    / Condiciones médicas
                  </label>
                  <textarea
                    name="allergies"
                    value={formData.allergies}
                    onChange={handleInput}
                    rows={2}
                    placeholder="Ej: Alergia a nueces, asma, ninguna..."
                    className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                  />
                </div>

                {/* Emergency contact */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-orange-400" />{" "}
                    Contacto de emergencia
                  </label>
                  <Input
                    name="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={handleInput}
                    placeholder="Nombre y teléfono de emergencia..."
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>
            )}

            {/* Email + phone */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Email</label>
              <Input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInput}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="juan@ejemplo.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">
                Teléfono
              </label>
              <Input
                name="phone"
                value={formData.phone}
                onChange={handleInput}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="+1 234 567 8900"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">
                Dirección
              </label>
              <Input
                name="address"
                value={formData.address}
                onChange={handleInput}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="Calle Principal 123"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">
                Estado *
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInput}
                required
                className="h-10 w-full rounded-md border border-slate-600 bg-slate-700 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="ACTIVO">Activo</option>
                <option value="INACTIVO">Inactivo</option>
                <option value="VISITANTE">Visitante</option>
              </select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeModal}
                className="bg-slate-700 border-slate-600 text-gray-300 hover:bg-slate-600"
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
        <DialogContent className="bg-slate-800 border-slate-700 max-w-sm w-full">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-red-400" />
              </span>
              Confirmar eliminación
            </DialogTitle>
          </DialogHeader>
          <p className="mt-3 text-gray-300 text-sm">
            ¿Eliminar a{" "}
            <span className="text-white font-semibold">
              {deleteTarget?.first_name} {deleteTarget?.last_name}
            </span>
            ? Esta acción no puede deshacerse.
          </p>
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="border-slate-600 text-gray-300 hover:text-white"
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

import {useEffect, useState} from "react";
import {useParams, useNavigate} from "react-router-dom";
import {membersService} from "@/services/api";
import {useAuth} from "@/contexts/AuthContext";
import {PrintLayout} from "@/components/print";
import MemberPrintCard from "@/components/print/MemberPrintCard";
import {exportMemberPdf} from "@/utils/pdf/memberPdf";
import {Button} from "@/components/ui/Button";
import {
  ArrowLeft,
  Printer,
  Pencil,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  UserCircle2,
  UsersRound,
  MessageSquare,
  Baby,
  GraduationCap,
  UserCheck,
  HeartPulse,
  Contact,
  Briefcase,
  Heart,
  Loader2,
  ArrowRightLeft,
  Copy,
  Check,
} from "lucide-react";

// ── Helpers y mini-componentes (mismos que usaba el panel lateral que esta
// página reemplaza — ver MembersPage.jsx) ──────────────────────────────────

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
function MemberAvatar({member}) {
  const initials = `${member.first_name?.[0] ?? ""}${member.last_name?.[0] ?? ""}`.toUpperCase();
  const grad = avatarColor(`${member.first_name}${member.last_name}`);
  return (
    <div
      className={`w-24 h-24 text-3xl rounded-full shrink-0 overflow-hidden flex items-center justify-center bg-gradient-to-br ${grad} font-bold text-white shadow-md`}
    >
      {member.photo_url ? (
        <img src={member.photo_url} alt={member.first_name} className="w-full h-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

const STATUS_STYLE = {
  ACTIVO: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30",
  INACTIVO: "bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30",
  VISITANTE: "bg-amber-500/15 text-amber-800 dark:text-amber-400 border border-amber-500/30",
};
function StatusBadge({status}) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[status] ?? STATUS_STYLE.ACTIVO}`}>
      {status}
    </span>
  );
}

const AGE_GROUP_STYLE = {
  NIÑO: {style: "bg-teal-500/15 text-teal-700 dark:text-teal-400 border border-teal-500/30", icon: Baby, label: "Niño"},
  JOVEN: {style: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30", icon: GraduationCap, label: "Joven"},
  ADULTO: null,
};
function AgeBadge({ageGroup}) {
  const cfg = AGE_GROUP_STYLE[ageGroup];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.style}`}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

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

const MARITAL_LABELS = {
  SOLTERO: "Soltero/a",
  CASADO: "Casado/a",
  DIVORCIADO: "Divorciado/a",
  VIUDO: "Viudo/a",
  UNION_LIBRE: "Unión libre",
};

const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d.slice(0, 10) + "T12:00:00").toLocaleDateString("es-ES", {day: "numeric", month: "long", year: "numeric"});
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

function Section({title, icon, children}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
        {icon}
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function ConfirmDialog({message, onConfirm, onCancel}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <p className="text-foreground text-sm mb-5">{message}</p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>Cancelar</Button>
          <button className="flex-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 transition-colors" onClick={onConfirm}>
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
// Reemplaza el panel lateral que abría MembersPage: mismo contenido, más los
// campos que faltaban (documento, miembro desde, estado civil, ocupación),
// como página completa con su propia URL en vez de un modal.
export default function MemberDetailPage() {
  const {id} = useParams();
  const navigate = useNavigate();
  const {user} = useAuth();

  const [member, setMember] = useState(null);
  const [groups, setGroups] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [printOpen, setPrintOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await membersService.getById(id);
        if (ignore) return;
        setMember(data);
        setNotesValue(data.pastor_notes || "");
        membersService.getGroups(id).then((d) => !ignore && setGroups(d.groups ?? [])).catch(() => !ignore && setGroups([]));
      } catch {
        if (!ignore) setError("No se pudo cargar el miembro.");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [id]);

  const handleDelete = async () => {
    try {
      await membersService.delete(id);
      navigate("/dashboard/members");
    } catch {
      alert("Error al eliminar.");
    }
  };

  const handleGenerateTransferCode = async () => {
    setTransferLoading(true);
    setTransferError("");
    try {
      const data = await membersService.generateTransferCode(id);
      setMember((prev) => ({
        ...prev,
        transfer_code: data.transferCode,
        transfer_code_expires_at: data.expiresAt,
      }));
      setCodeCopied(false);
    } catch (err) {
      setTransferError(err.response?.data?.error || "No se pudo generar el código.");
    } finally {
      setTransferLoading(false);
    }
  };

  const handleCancelTransferCode = async () => {
    setTransferLoading(true);
    setTransferError("");
    try {
      await membersService.cancelTransferCode(id);
      setMember((prev) => ({
        ...prev,
        transfer_code: null,
        transfer_code_expires_at: null,
      }));
    } catch (err) {
      setTransferError(err.response?.data?.error || "No se pudo cancelar el código.");
    } finally {
      setTransferLoading(false);
    }
  };

  const handleCopyTransferCode = async () => {
    if (!member.transfer_code) return;
    try {
      await navigator.clipboard.writeText(member.transfer_code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      /* silent — algunos navegadores piden permiso/HTTPS para el portapapeles */
    }
  };

  const handleSaveNotes = async () => {
    setNotesSaving(true);
    try {
      await membersService.update(id, {pastorNotes: notesValue || null});
      setMember((prev) => ({...prev, pastor_notes: notesValue || null}));
      setEditingNotes(false);
    } catch {
      alert("Error al guardar las notas.");
    } finally {
      setNotesSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-4">
        <p className="text-muted-foreground">{error || "Miembro no encontrado."}</p>
        <Button variant="secondary" onClick={() => navigate("/dashboard/members")}>Volver a Miembros</Button>
      </div>
    );
  }

  const age = calcAge(member.birth_date);
  const isChild = member.age_group === "NIÑO";
  const isYouth = member.age_group === "JOVEN";
  const guardianName = member.guardian_id
    ? `${member.guardian_first_name || ""} ${member.guardian_last_name || ""}`.trim()
    : member.guardian_name || null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Barra superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate("/dashboard/members")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a Miembros
        </button>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setPrintOpen(true)}>
            <Printer className="w-4 h-4 mr-2" /> Imprimir / PDF
          </Button>
          <Button
            onClick={() => navigate("/dashboard/members", {state: {editMemberId: member.id}})}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Pencil className="w-4 h-4 mr-2" /> Editar
          </Button>
          <Button
            variant="outline"
            className="border-red-500/40 text-red-700 dark:text-red-400 hover:bg-red-500/10"
            onClick={() => setDeleteConfirm(true)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Encabezado */}
      <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center text-center">
        <MemberAvatar member={member} />
        <h1 className="text-2xl font-bold text-foreground mt-4">
          {member.first_name} {member.last_name}
        </h1>
        <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
          <StatusBadge status={member.status} />
          <AgeBadge ageGroup={member.age_group} />
        </div>
      </div>

      {/* Grid de secciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Section title="Información Personal">
          <InfoRow
            icon={<Calendar className="w-4 h-4" />}
            label="Fecha de nacimiento"
            value={member.birth_date ? `${fmtDate(member.birth_date)}${age !== null ? ` (${age} años)` : ""}` : "—"}
          />
          <InfoRow icon={<UserCircle2 className="w-4 h-4" />} label="Género" value={member.gender || "—"} />
          <InfoRow
            icon={<Clock className="w-4 h-4" />}
            label="Miembro desde"
            value={member.member_since ? fmtDate(member.member_since) : "No especificado"}
          />
          <InfoRow icon={<Contact className="w-4 h-4" />} label="Documento de identidad" value={member.document_id || "—"} />
          <InfoRow icon={<Heart className="w-4 h-4" />} label="Estado civil" value={MARITAL_LABELS[member.marital_status] || "—"} />
          <InfoRow icon={<Briefcase className="w-4 h-4" />} label="Ocupación" value={member.occupation || "—"} />
        </Section>

        <Section title="Contacto">
          <InfoRow icon={<Phone className="w-4 h-4" />} label="Teléfono" value={member.phone || "—"} />
          <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={member.email || "—"} />
          <InfoRow icon={<MapPin className="w-4 h-4" />} label="Dirección" value={member.address || "—"} />
        </Section>
      </div>

      {(isChild || isYouth) && (
        <Section
          title={isChild ? "Información del Niño" : "Información del Joven"}
          icon={isChild ? <Baby className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" /> : <GraduationCap className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />}
        >
          {guardianName && (
            <InfoRow icon={<UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />} label="Padre / Tutor" value={guardianName + (member.guardian_id ? " ✓" : "")} />
          )}
          {isChild && member.grade && <InfoRow icon={<GraduationCap className="w-4 h-4" />} label="Grado escolar" value={member.grade} />}
          {member.emergency_contact && (
            <InfoRow icon={<Phone className="w-4 h-4 text-orange-700 dark:text-orange-400" />} label="Contacto de emergencia" value={member.emergency_contact} />
          )}
          {member.allergies && (
            <div className="flex items-start gap-3">
              <span className="text-red-700 dark:text-red-400 mt-0.5 shrink-0"><HeartPulse className="w-4 h-4" /></span>
              <div>
                <p className="text-xs text-muted-foreground">Alergias / Condiciones médicas</p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-0.5 font-medium">{member.allergies}</p>
              </div>
            </div>
          )}
        </Section>
      )}

      <Section title="Palabras del Pastor / Líder" icon={<MessageSquare className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400" />}>
        {editingNotes ? (
          <div className="space-y-2.5">
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Plantillas rápidas:</p>
              <div className="flex flex-wrap gap-1.5">
                {PASTOR_NOTE_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.label}
                    type="button"
                    onClick={() => setNotesValue(tpl.text)}
                    className="px-2.5 py-1 text-xs rounded-full border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 hover:border-indigo-400/50 transition-colors text-left"
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
              placeholder="Escribe aquí las palabras de referencia…"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditingNotes(false)} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors" disabled={notesSaving}>
                Cancelar
              </button>
              <button onClick={handleSaveNotes} disabled={notesSaving} className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors disabled:opacity-60">
                {notesSaving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            {member.pastor_notes ? (
              <p className="text-sm text-muted-foreground leading-relaxed italic border-l-2 border-indigo-500/40 pl-3">{member.pastor_notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">Sin notas registradas.</p>
            )}
            <button
              onClick={() => { setNotesValue(member.pastor_notes || ""); setEditingNotes(true); }}
              className="text-muted-foreground hover:text-indigo-700 dark:text-indigo-400 transition-colors shrink-0"
              title="Editar notas"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </Section>

      <Section title="Grupos" icon={<UsersRound className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />}>
        {groups === null ? (
          <p className="text-muted-foreground text-sm">Cargando…</p>
        ) : groups.length === 0 ? (
          <p className="text-muted-foreground text-sm">No pertenece a ningún grupo.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => (
              <span key={g.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                <UsersRound className="w-3 h-3" /> {g.name}
              </span>
            ))}
          </div>
        )}
      </Section>

      <Section title="Traslado a otra iglesia" icon={<ArrowRightLeft className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-400" />}>
        {member.transferred_out_at ? (
          <p className="text-sm text-muted-foreground">
            Trasladado a <span className="font-medium text-foreground">{member.transferred_to_church}</span> el {fmtDate(member.transferred_out_at)}.
          </p>
        ) : member.transfer_code ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Comparte este código con la iglesia que va a recibir a {member.first_name} — debe canjearlo desde su propio panel de Congrega. Válido hasta el {fmtDate(member.transfer_code_expires_at)}.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-lg font-bold tracking-wider text-foreground bg-background border border-border rounded-lg px-3 py-1.5">
                {member.transfer_code}
              </span>
              <button
                onClick={handleCopyTransferCode}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-accent hover:bg-accent/70 text-foreground transition-colors"
              >
                {codeCopied ? <Check className="w-4 h-4 text-emerald-700 dark:text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {codeCopied ? "Copiado" : "Copiar"}
              </button>
            </div>
            <button
              onClick={handleCancelTransferCode}
              disabled={transferLoading}
              className="text-xs text-red-700 dark:text-red-400 hover:underline disabled:opacity-50"
            >
              Cancelar código
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            <p className="text-sm text-muted-foreground">
              Genera un código de un solo uso para que otra iglesia que use Congrega reciba a {member.first_name} con sus datos precargados. Tu registro queda marcado como trasladado recién cuando la otra iglesia lo canjea.
            </p>
            <Button variant="outline" onClick={handleGenerateTransferCode} disabled={transferLoading}>
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              {transferLoading ? "Generando…" : "Generar código de traslado"}
            </Button>
            <p className="text-xs text-muted-foreground">
              ¿La otra iglesia no usa Congrega?{" "}
              <button
                type="button"
                onClick={() => navigate("/dashboard/letters")}
                className="text-indigo-700 dark:text-indigo-400 font-medium hover:underline"
              >
                Genera una Carta de Transferencia
              </button>{" "}
              en su lugar.
            </p>
          </div>
        )}
        {transferError && <p className="text-xs text-red-700 dark:text-red-400 mt-2">{transferError}</p>}
      </Section>

      {printOpen && (
        <PrintLayout
          title="Vista Previa — Ficha de Miembro"
          subtitle={`${member.first_name} ${member.last_name}`}
          onClose={() => setPrintOpen(false)}
          onExportPdf={(onStart, onEnd) => exportMemberPdf(member, onStart, onEnd)}
        >
          <MemberPrintCard member={member} groups={groups || []} church={{name: user?.churchName, logoUrl: user?.churchLogo ?? null}} />
        </PrintLayout>
      )}

      {deleteConfirm && (
        <ConfirmDialog
          message={`¿Eliminar a "${member.first_name} ${member.last_name}"? Esta acción no se puede deshacer.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(false)}
        />
      )}
    </div>
  );
}

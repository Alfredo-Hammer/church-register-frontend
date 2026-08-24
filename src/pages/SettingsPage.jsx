import React, {useState, useEffect, useCallback} from "react";
import {toast} from "sonner";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/Card";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/Dialog";
import {Button} from "@/components/ui/Button";
import {Input} from "@/components/ui/Input";
import {
  Settings,
  Building2,
  User,
  Lock,
  Edit2,
  Save,
  Eye,
  EyeOff,
  ShieldCheck,
  ImagePlus,
  Images,
  Heart,
  MessageCircle,
  Radio,
  Wallet,
  BookOpen,
  Trash,
  Smartphone,
  Copy,
  RefreshCw,
  Check,
  Link2,
  UserPlus,
} from "lucide-react";
import {QRCodeSVG} from "qrcode.react";
import {settingsService} from "@/services/api";
import {useAuth} from "@/contexts/AuthContext";

// ── Helpers ───────────────────────────────────────────────────────────────────
const ROLE_BADGE = {
  ADMIN: "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30",
  PASTOR: "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30",
  TESORERO: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30",
  LIDER: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30",
};

function RoleBadge({role}) {
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${ROLE_BADGE[role] || "bg-muted text-muted-foreground border-border"}`}
    >
      {role}
    </span>
  );
}

function PasswordInput({value, onChange, placeholder, name}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="new-password"
        className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-violet-500 pr-10"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

const TABS = [
  {id: "profile", label: "Mi Perfil", icon: User},
  {id: "church", label: "Iglesia", icon: Building2},
  {id: "mobile", label: "App Móvil", icon: Smartphone},
];

// ─────────────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const {user, updateUser} = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const canManageLiveStream = ["ADMIN", "PASTOR", "LIDER"].includes(user?.role);

  const [activeTab, setActiveTab] = useState("profile");

  const notify = (msg, type = "success") =>
    type === "error" ? toast.error(msg) : toast.success(msg);

  // ─── Tab: MI PERFIL ─────────────────────────────────────────────────────
  const [profile, setProfile] = useState(null);
  const [profForm, setProfForm] = useState({fullName: ""});
  const [profSaving, setProfSaving] = useState(false);

  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [pwSaving, setPwSaving] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const data = await settingsService.getProfile();
      setProfile(data);
      setProfForm({fullName: data.fullName});
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    if (activeTab === "profile" && !profile) fetchProfile();
  }, [activeTab, profile, fetchProfile]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!profForm.fullName.trim())
      return notify("El nombre es obligatorio.", "error");
    setProfSaving(true);
    try {
      const updated = await settingsService.updateProfile({
        fullName: profForm.fullName,
      });
      setProfile((prev) => ({...prev, fullName: updated.fullName}));
      updateUser({fullName: updated.fullName});
      notify("Perfil actualizado correctamente.");
    } catch (e) {
      notify(
        e?.response?.data?.error || "Error al actualizar perfil.",
        "error",
      );
    } finally {
      setProfSaving(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (!pwForm.currentPassword || !pwForm.newPassword)
      return notify("Completa todos los campos.", "error");
    if (pwForm.newPassword.length < 6)
      return notify(
        "La nueva contraseña debe tener al menos 6 caracteres.",
        "error",
      );
    if (pwForm.newPassword !== pwForm.confirmPassword)
      return notify("Las contraseñas no coinciden.", "error");
    setPwSaving(true);
    try {
      await settingsService.changePassword({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwForm({currentPassword: "", newPassword: "", confirmPassword: ""});
      notify("Contraseña actualizada correctamente.");
    } catch (e) {
      notify(
        e?.response?.data?.error || "Error al cambiar contraseña.",
        "error",
      );
    } finally {
      setPwSaving(false);
    }
  };

  // ─── Tab: IGLESIA ────────────────────────────────────────────────────────
  const [church, setChurch] = useState(null);
  const EMPTY_CHURCH_FORM = {
    name: "",
    denomination: "",
    pastorName: "",
    foundedYear: "",
    city: "",
    country: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    description: "",
  };
  const [churchForm, setChurchForm] = useState(EMPTY_CHURCH_FORM);
  const [churchSaving, setChurchSaving] = useState(false);
  const [churchEditing, setChurchEditing] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [liveStreamSaving, setLiveStreamSaving] = useState(false);
  const [liveStreamInput, setLiveStreamInput] = useState("");
  const [defaultVideoSaving, setDefaultVideoSaving] = useState(false);
  const [defaultVideoInput, setDefaultVideoInput] = useState("");
  const [photos, setPhotos] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const MAX_CHURCH_PHOTOS = 8;
  const [givingLinks, setGivingLinks] = useState(null);
  const [givingLinkSaving, setGivingLinkSaving] = useState(false);
  const [givingLabelInput, setGivingLabelInput] = useState("");
  const [givingValueInput, setGivingValueInput] = useState("");
  const MAX_GIVING_LINKS = 10;
  const [sermons, setSermons] = useState(null);
  const [sermonSaving, setSermonSaving] = useState(false);
  const [sermonTitleInput, setSermonTitleInput] = useState("");
  const [sermonSpeakerInput, setSermonSpeakerInput] = useState("");
  const [sermonUrlInput, setSermonUrlInput] = useState("");
  const [sermonDateInput, setSermonDateInput] = useState("");

  const fetchPhotos = useCallback(async () => {
    try {
      const data = await settingsService.getChurchPhotos();
      setPhotos(data.photos || []);
    } catch {
      /* silent */
    }
  }, []);

  const fetchGivingLinks = useCallback(async () => {
    try {
      const data = await settingsService.getGivingLinks();
      setGivingLinks(data.givingLinks || []);
    } catch {
      /* silent */
    }
  }, []);

  const fetchSermons = useCallback(async () => {
    try {
      const data = await settingsService.getSermons();
      setSermons(data.sermons || []);
    } catch {
      /* silent */
    }
  }, []);

  // Código de invitación — lo que un miembro sin cuenta usa en la app móvil
  // para asociarse a esta iglesia.
  const [joinCode, setJoinCode] = useState(null);
  const [regeneratingCode, setRegeneratingCode] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(null);

  const fetchJoinCode = useCallback(async () => {
    try {
      const data = await settingsService.getJoinCode();
      setJoinCode(data.joinCode);
    } catch {
      /* silent */
    }
  }, []);

  const handleRegenerateCode = async () => {
    setRegeneratingCode(true);
    try {
      const data = await settingsService.regenerateJoinCode();
      setJoinCode(data.joinCode);
      setConfirmRegenerate(false);
    } catch {
      /* silent */
    }
    setRegeneratingCode(false);
  };

  const handleCopyCode = async () => {
    if (!joinCode) return;
    try {
      await navigator.clipboard.writeText(joinCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      /* silent — algunos navegadores piden permiso/HTTPS para el portapapeles */
    }
  };

  const memberRegistrationLink = joinCode
    ? `${window.location.origin}/registro-miembro/${joinCode}`
    : "";
  const visitorRegistrationLink = joinCode
    ? `${window.location.origin}/registro-visitante/${joinCode}`
    : "";

  const handleCopyLink = async (kind, url) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(kind);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch {
      /* silent — algunos navegadores piden permiso/HTTPS para el portapapeles */
    }
  };

  const fetchChurch = useCallback(async () => {
    try {
      const data = await settingsService.getChurch();
      setChurch(data);
      setChurchForm({
        name: data.name || "",
        denomination: data.denomination || "",
        pastorName: data.pastorName || "",
        foundedYear: data.foundedYear || "",
        city: data.city || "",
        country: data.country || "",
        address: data.address || "",
        phone: data.phone || "",
        email: data.email || "",
        website: data.website || "",
        description: data.description || "",
      });
      // Sync logo into auth context so sidebar updates immediately
      if (data.logoUrl !== undefined) updateUser({churchLogo: data.logoUrl || null});
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    if ((activeTab === "church" || activeTab === "mobile") && !church) fetchChurch();
  }, [activeTab, church, fetchChurch]);

  useEffect(() => {
    if (activeTab === "mobile" && !photos) fetchPhotos();
  }, [activeTab, photos, fetchPhotos]);

  useEffect(() => {
    if (activeTab === "mobile" && !givingLinks) fetchGivingLinks();
  }, [activeTab, givingLinks, fetchGivingLinks]);

  useEffect(() => {
    if (activeTab === "mobile" && !sermons) fetchSermons();
  }, [activeTab, sermons, fetchSermons]);

  useEffect(() => {
    if ((activeTab === "church" || activeTab === "mobile") && isAdmin && !joinCode) fetchJoinCode();
  }, [activeTab, isAdmin, joinCode, fetchJoinCode]);

  const handleChurchSave = async (e) => {
    e.preventDefault();
    if (!churchForm.name.trim())
      return notify("El nombre de la iglesia es obligatorio.", "error");
    setChurchSaving(true);
    try {
      const updated = await settingsService.updateChurch(churchForm);
      setChurch((prev) => ({...prev, ...updated}));
      setChurchForm({
        name: updated.name || "",
        denomination: updated.denomination || "",
        pastorName: updated.pastorName || "",
        foundedYear: updated.foundedYear || "",
        city: updated.city || "",
        country: updated.country || "",
        address: updated.address || "",
        phone: updated.phone || "",
        email: updated.email || "",
        website: updated.website || "",
        description: updated.description || "",
      });
      setChurchEditing(false);
      updateUser({churchName: updated.name});
      notify("Datos de la iglesia actualizados.");
    } catch (e) {
      notify(
        e?.response?.data?.error || "Error al actualizar iglesia.",
        "error",
      );
    } finally {
      setChurchSaving(false);
    }
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/"))
      return notify("Solo se permiten archivos de imagen.", "error");
    if (file.size > 2 * 1024 * 1024)
      return notify("La imagen debe ser menor a 2MB.", "error");
    setLogoUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target.result;
        try {
          const res = await settingsService.uploadLogo(base64);
          setChurch((prev) => ({...prev, logoUrl: res.logoUrl}));
          updateUser({churchLogo: res.logoUrl});
          notify("Logo actualizado correctamente.");
        } catch (err) {
          notify(err?.response?.data?.error || "Error al subir logo.", "error");
        } finally {
          setLogoUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setLogoUploading(false);
    }
    // reset input so same file can be re-selected
    e.target.value = "";
  };

  const handleLogoDelete = async () => {
    setLogoUploading(true);
    try {
      await settingsService.deleteLogo();
      setChurch((prev) => ({...prev, logoUrl: null}));
      updateUser({churchLogo: null});
      notify("Logo eliminado.");
    } catch (e) {
      notify(e?.response?.data?.error || "Error al eliminar logo.", "error");
    } finally {
      setLogoUploading(false);
    }
  };

  const handleStartLiveStream = async () => {
    if (!liveStreamInput.trim()) return;
    setLiveStreamSaving(true);
    try {
      const res = await settingsService.updateLiveStream(liveStreamInput.trim());
      setChurch((prev) => ({...prev, liveStreamUrl: res.liveStreamUrl}));
      setLiveStreamInput("");
      notify("Transmisión iniciada.");
    } catch (e) {
      notify(e?.response?.data?.error || "Error al iniciar la transmisión.", "error");
    } finally {
      setLiveStreamSaving(false);
    }
  };

  const handleEndLiveStream = async () => {
    setLiveStreamSaving(true);
    try {
      await settingsService.deleteLiveStream();
      setChurch((prev) => ({...prev, liveStreamUrl: null}));
      notify("Transmisión finalizada.");
    } catch (e) {
      notify(e?.response?.data?.error || "Error al finalizar la transmisión.", "error");
    } finally {
      setLiveStreamSaving(false);
    }
  };

  const handleSaveDefaultVideo = async () => {
    if (!defaultVideoInput.trim()) return;
    setDefaultVideoSaving(true);
    try {
      const res = await settingsService.updateDefaultVideo(defaultVideoInput.trim());
      setChurch((prev) => ({...prev, defaultVideoUrl: res.defaultVideoUrl}));
      setDefaultVideoInput("");
      notify("Video predeterminado guardado.");
    } catch (e) {
      notify(e?.response?.data?.error || "Error al guardar el video.", "error");
    } finally {
      setDefaultVideoSaving(false);
    }
  };

  const handleRemoveDefaultVideo = async () => {
    setDefaultVideoSaving(true);
    try {
      await settingsService.deleteDefaultVideo();
      setChurch((prev) => ({...prev, defaultVideoUrl: null}));
      notify("Video predeterminado eliminado.");
    } catch (e) {
      notify(e?.response?.data?.error || "Error al eliminar el video.", "error");
    } finally {
      setDefaultVideoSaving(false);
    }
  };

  const handleAddGivingLink = async () => {
    if (!givingLabelInput.trim() || !givingValueInput.trim()) return;
    setGivingLinkSaving(true);
    try {
      const res = await settingsService.addGivingLink(givingLabelInput.trim(), givingValueInput.trim());
      setGivingLinks((prev) => [...(prev || []), res.givingLink]);
      setGivingLabelInput("");
      setGivingValueInput("");
      notify("Forma de dar agregada.");
    } catch (e) {
      notify(e?.response?.data?.error || "Error al agregar.", "error");
    } finally {
      setGivingLinkSaving(false);
    }
  };

  const handleDeleteGivingLink = async (id) => {
    setGivingLinkSaving(true);
    try {
      await settingsService.deleteGivingLink(id);
      setGivingLinks((prev) => (prev || []).filter((g) => g.id !== id));
      notify("Forma de dar eliminada.");
    } catch (e) {
      notify(e?.response?.data?.error || "Error al eliminar.", "error");
    } finally {
      setGivingLinkSaving(false);
    }
  };

  const handleAddSermon = async () => {
    if (!sermonTitleInput.trim() || !sermonUrlInput.trim()) return;
    setSermonSaving(true);
    try {
      const res = await settingsService.addSermon({
        title: sermonTitleInput.trim(),
        speaker: sermonSpeakerInput.trim(),
        videoUrl: sermonUrlInput.trim(),
        sermonDate: sermonDateInput || null,
      });
      setSermons((prev) => [res.sermon, ...(prev || [])]);
      setSermonTitleInput("");
      setSermonSpeakerInput("");
      setSermonUrlInput("");
      setSermonDateInput("");
      notify("Prédica agregada.");
    } catch (e) {
      notify(e?.response?.data?.error || "Error al agregar.", "error");
    } finally {
      setSermonSaving(false);
    }
  };

  const handleDeleteSermon = async (id) => {
    setSermonSaving(true);
    try {
      await settingsService.deleteSermon(id);
      setSermons((prev) => (prev || []).filter((s) => s.id !== id));
      notify("Prédica eliminada.");
    } catch (e) {
      notify(e?.response?.data?.error || "Error al eliminar.", "error");
    } finally {
      setSermonSaving(false);
    }
  };

  const handlePhotoAdd = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/"))
      return notify("Solo se permiten archivos de imagen.", "error");
    if (file.size > 2 * 1024 * 1024)
      return notify("La imagen debe ser menor a 2MB.", "error");
    if ((photos?.length || 0) >= MAX_CHURCH_PHOTOS)
      return notify(`Máximo ${MAX_CHURCH_PHOTOS} fotos en la galería.`, "error");
    setPhotoUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target.result;
        try {
          const res = await settingsService.addChurchPhoto(base64);
          setPhotos((prev) => [...(prev || []), res.photo]);
          notify("Foto agregada.");
        } catch (err) {
          notify(err?.response?.data?.error || "Error al subir la foto.", "error");
        } finally {
          setPhotoUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setPhotoUploading(false);
    }
    e.target.value = "";
  };

  const handlePhotoDelete = async (id) => {
    setPhotoUploading(true);
    try {
      await settingsService.deleteChurchPhoto(id);
      setPhotos((prev) => (prev || []).filter((p) => p.id !== id));
      notify("Foto eliminada.");
    } catch (e) {
      notify(e?.response?.data?.error || "Error al eliminar la foto.", "error");
    } finally {
      setPhotoUploading(false);
    }
  };

  // Moderación: los comentarios los deja gente anónima desde el móvil (sin
  // cuenta ni login todavía), así que borrar acá es el único control que
  // tiene el staff sobre lo que se publica.
  const [commentsDialogPhoto, setCommentsDialogPhoto] = useState(null);
  const [photoComments, setPhotoComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  const openPhotoComments = async (photo) => {
    setCommentsDialogPhoto(photo);
    setCommentsLoading(true);
    try {
      const data = await settingsService.getPhotoComments(photo.id);
      setPhotoComments(data.comments || []);
    } catch {
      setPhotoComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await settingsService.deletePhotoComment(commentId);
      setPhotoComments((prev) => prev.filter((c) => c.id !== commentId));
      setPhotos((prev) => prev.map((p) =>
        p.id === commentsDialogPhoto?.id ? {...p, comment_count: Math.max(0, (p.comment_count || 1) - 1)} : p
      ));
      notify("Comentario eliminado.");
    } catch (e) {
      notify(e?.response?.data?.error || "Error al eliminar el comentario.", "error");
    }
  };

  // ─── Render Tabs ──────────────────────────────────────────────────────────
  const renderProfile = () => (
    <div className="space-y-6">
      {/* Info de sesión actual */}
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl border border-border">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
          {(profile?.fullName || user?.fullName)?.charAt(0)?.toUpperCase() ||
            "U"}
        </div>
        <div>
          <p className="text-foreground font-semibold text-lg">
            {profile?.fullName || user?.fullName}
          </p>
          <p className="text-muted-foreground text-sm">
            {profile?.email || user?.email}
          </p>
          <RoleBadge role={profile?.role || user?.role} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* Editar nombre */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base flex items-center gap-2">
            <User className="w-4 h-4 text-violet-700 dark:text-violet-400" />
            Información Personal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div>
              <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                Nombre Completo
              </label>
              <Input
                value={profForm.fullName}
                onChange={(e) =>
                  setProfForm((f) => ({...f, fullName: e.target.value}))
                }
                placeholder="Tu nombre completo"
                className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-violet-500"
              />
            </div>
            <div>
              <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                Email
              </label>
              <Input
                value={profile?.email || user?.email || ""}
                disabled
                className="bg-muted/50 border-border text-muted-foreground cursor-not-allowed"
              />
              <p className="text-muted-foreground text-xs mt-1">
                El email no puede modificarse.
              </p>
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={profSaving}
                className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
              >
                {profSaving ? (
                  "Guardando..."
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar cambios
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Cambiar contraseña */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base flex items-center gap-2">
            <Lock className="w-4 h-4 text-violet-700 dark:text-violet-400" />
            Cambiar Contraseña
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSave} className="space-y-4">
            <div>
              <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                Contraseña Actual
              </label>
              <PasswordInput
                name="currentPassword"
                value={pwForm.currentPassword}
                onChange={(e) =>
                  setPwForm((f) => ({...f, currentPassword: e.target.value}))
                }
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                Nueva Contraseña
              </label>
              <PasswordInput
                name="newPassword"
                value={pwForm.newPassword}
                onChange={(e) =>
                  setPwForm((f) => ({...f, newPassword: e.target.value}))
                }
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                Confirmar Nueva Contraseña
              </label>
              <PasswordInput
                name="confirmPassword"
                value={pwForm.confirmPassword}
                onChange={(e) =>
                  setPwForm((f) => ({...f, confirmPassword: e.target.value}))
                }
                placeholder="Repite la nueva contraseña"
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={pwSaving}
                className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
              >
                {pwSaving ? (
                  "Guardando..."
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Cambiar contraseña
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );

  const renderChurch = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
      {/* Logo Card */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base flex items-center gap-2">
            <ImagePlus className="w-4 h-4 text-violet-700 dark:text-violet-400" />
            Logo de la Iglesia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Preview */}
            <div className="w-24 h-24 rounded-2xl bg-background border-2 border-border flex items-center justify-center overflow-hidden shrink-0">
              {church?.logoUrl ? (
                <img
                  src={church.logoUrl}
                  alt="Logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-4xl text-muted-foreground">✝</span>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <p className="text-muted-foreground text-sm">
                El logo aparece en la barra lateral del sistema. Usa una imagen cuadrada en PNG o JPG (máx. 2MB).
              </p>
              {isAdmin && (
                <div className="flex flex-wrap gap-2">
                  <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors
                    ${logoUploading ? "bg-background text-muted-foreground cursor-not-allowed" : "bg-violet-600 hover:bg-violet-700 text-white"}`}>
                    <ImagePlus className="w-4 h-4" />
                    {logoUploading ? "Subiendo..." : church?.logoUrl ? "Cambiar logo" : "Subir logo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={logoUploading}
                      onChange={handleLogoChange}
                    />
                  </label>
                  {church?.logoUrl && (
                    <button
                      disabled={logoUploading}
                      onClick={handleLogoDelete}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-400 hover:text-red-700 dark:text-red-300 transition-colors disabled:opacity-40"
                    >
                      <Trash className="w-4 h-4" />
                      Eliminar
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Links de auto-registro (miembros y visitantes) */}
      {isAdmin && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground text-base flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-violet-700 dark:text-violet-400" />
              Links de Auto-Registro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Comparte estos links por WhatsApp, redes o tu página web para que las personas llenen sus propios datos desde el celular. Se registran directo en el sistema, sin necesitar cuenta.
            </p>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Registro de Miembros
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0 flex items-center gap-1.5 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground overflow-x-auto">
                    <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="whitespace-nowrap">{memberRegistrationLink || "···"}</span>
                  </div>
                  <button
                    onClick={() => handleCopyLink("member", memberRegistrationLink)}
                    disabled={!joinCode}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-accent hover:bg-accent/70 text-foreground transition-colors disabled:opacity-40 shrink-0"
                  >
                    {copiedLink === "member" ? <Check className="w-4 h-4 text-emerald-700 dark:text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedLink === "member" ? "Copiado" : "Copiar"}
                  </button>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Registro de Visitantes
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0 flex items-center gap-1.5 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground overflow-x-auto">
                    <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="whitespace-nowrap">{visitorRegistrationLink || "···"}</span>
                  </div>
                  <button
                    onClick={() => handleCopyLink("visitor", visitorRegistrationLink)}
                    disabled={!joinCode}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-accent hover:bg-accent/70 text-foreground transition-colors disabled:opacity-40 shrink-0"
                  >
                    {copiedLink === "visitor" ? <Check className="w-4 h-4 text-emerald-700 dark:text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedLink === "visitor" ? "Copiado" : "Copiar"}
                  </button>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Usan el mismo código de invitación de arriba — si lo regeneras, estos links también cambian.
            </p>
          </CardContent>
        </Card>
      )}
      </div>

      {/* Church data Card */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground text-base flex items-center gap-2">
            <Building2 className="w-4 h-4 text-violet-700 dark:text-violet-400" />
            Datos de la Iglesia
          </CardTitle>
          {isAdmin && !churchEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setChurchEditing(true)}
              className="border-border text-muted-foreground hover:text-foreground hover:border-violet-500"
            >
              <Edit2 className="w-3.5 h-3.5 mr-1.5" />
              Editar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!church ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando información...
            </div>
          ) : churchEditing ? (
            <form onSubmit={handleChurchSave} className="space-y-4">
              <div>
                <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                  Nombre de la Iglesia *
                </label>
                <Input
                  value={churchForm.name}
                  onChange={(e) =>
                    setChurchForm((f) => ({...f, name: e.target.value}))
                  }
                  placeholder="Nombre de la iglesia"
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-violet-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                    Denominación{" "}
                    <span className="text-muted-foreground font-normal">(opcional)</span>
                  </label>
                  <Input
                    value={churchForm.denomination}
                    onChange={(e) =>
                      setChurchForm((f) => ({...f, denomination: e.target.value}))
                    }
                    placeholder="Ej. Pentecostal, Bautista…"
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                    Pastor Principal{" "}
                    <span className="text-muted-foreground font-normal">(opcional)</span>
                  </label>
                  <Input
                    value={churchForm.pastorName}
                    onChange={(e) =>
                      setChurchForm((f) => ({...f, pastorName: e.target.value}))
                    }
                    placeholder="Nombre del pastor"
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                    Año de fundación{" "}
                    <span className="text-muted-foreground font-normal">(opcional)</span>
                  </label>
                  <Input
                    type="number"
                    value={churchForm.foundedYear}
                    onChange={(e) =>
                      setChurchForm((f) => ({...f, foundedYear: e.target.value}))
                    }
                    placeholder="Ej. 1998"
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                    Ciudad{" "}
                    <span className="text-muted-foreground font-normal">(opcional)</span>
                  </label>
                  <Input
                    value={churchForm.city}
                    onChange={(e) =>
                      setChurchForm((f) => ({...f, city: e.target.value}))
                    }
                    placeholder="Ciudad"
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                    País{" "}
                    <span className="text-muted-foreground font-normal">(opcional)</span>
                  </label>
                  <Input
                    value={churchForm.country}
                    onChange={(e) =>
                      setChurchForm((f) => ({...f, country: e.target.value}))
                    }
                    placeholder="País"
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                    Teléfono{" "}
                    <span className="text-muted-foreground font-normal">(opcional)</span>
                  </label>
                  <Input
                    value={churchForm.phone}
                    onChange={(e) =>
                      setChurchForm((f) => ({...f, phone: e.target.value}))
                    }
                    placeholder="Número de teléfono"
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                    Email{" "}
                    <span className="text-muted-foreground font-normal">(opcional)</span>
                  </label>
                  <Input
                    type="email"
                    value={churchForm.email}
                    onChange={(e) =>
                      setChurchForm((f) => ({...f, email: e.target.value}))
                    }
                    placeholder="contacto@iglesia.com"
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                    Sitio web{" "}
                    <span className="text-muted-foreground font-normal">(opcional)</span>
                  </label>
                  <Input
                    value={churchForm.website}
                    onChange={(e) =>
                      setChurchForm((f) => ({...f, website: e.target.value}))
                    }
                    placeholder="https://miiglesia.com"
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-violet-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                  Dirección{" "}
                  <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <Input
                  value={churchForm.address}
                  onChange={(e) =>
                    setChurchForm((f) => ({...f, address: e.target.value}))
                  }
                  placeholder="Dirección de la iglesia"
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-violet-500"
                />
              </div>
              <div>
                <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                  Descripción{" "}
                  <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <textarea
                  value={churchForm.description}
                  onChange={(e) =>
                    setChurchForm((f) => ({...f, description: e.target.value}))
                  }
                  placeholder="Breve descripción de la iglesia"
                  rows={3}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setChurchEditing(false);
                    setChurchForm({
                      name: church.name || "",
                      denomination: church.denomination || "",
                      pastorName: church.pastorName || "",
                      foundedYear: church.foundedYear || "",
                      city: church.city || "",
                      country: church.country || "",
                      address: church.address || "",
                      phone: church.phone || "",
                      email: church.email || "",
                      website: church.website || "",
                      description: church.description || "",
                    });
                  }}
                  className="border-border text-muted-foreground hover:text-foreground"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={churchSaving}
                  className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
                >
                  {churchSaving ? (
                    "Guardando..."
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {[
                {label: "Nombre", value: church.name},
                {label: "Denominación", value: church.denomination || "—"},
                {label: "Pastor Principal", value: church.pastorName || "—"},
                {label: "Año de fundación", value: church.foundedYear || "—"},
                {label: "Ciudad", value: church.city || "—"},
                {label: "País", value: church.country || "—"},
                {label: "Dirección", value: church.address || "—"},
                {label: "Teléfono", value: church.phone || "—"},
                {label: "Email", value: church.email || "—"},
                {label: "Sitio web", value: church.website || "—"},
                {label: "Descripción", value: church.description || "—"},
              ].map(({label, value}) => (
                <div key={label} className="flex items-start gap-3">
                  <span className="text-muted-foreground text-sm w-36 shrink-0 pt-0.5">
                    {label}
                  </span>
                  <span className="text-foreground text-sm font-medium">
                    {value}
                  </span>
                </div>
              ))}
              {!isAdmin && (
                <p className="text-muted-foreground text-xs mt-2 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Solo el ADMIN puede modificar estos datos.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderMobile = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
      {/* Código de invitación (app móvil) */}
      {isAdmin && (
        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-foreground text-base flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-violet-700 dark:text-violet-400" />
              Código de Invitación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start gap-5">
              <div className="bg-white p-3 rounded-xl shrink-0">
                {joinCode ? (
                  <QRCodeSVG value={joinCode} size={104} level="M" />
                ) : (
                  <div className="w-[104px] h-[104px] animate-pulse bg-muted rounded" />
                )}
              </div>
              <div className="flex-1 space-y-3 min-w-0">
                <p className="text-muted-foreground text-sm">
                  Compártelo con tu congregación para que se unan desde la app móvil, sin necesitar una cuenta — impreso, de palabra, o escaneando el QR.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-lg font-bold tracking-wider text-foreground bg-background border border-border rounded-lg px-3 py-1.5">
                    {joinCode || "···· ····"}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    disabled={!joinCode}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-accent hover:bg-accent/70 text-foreground transition-colors disabled:opacity-40"
                  >
                    {codeCopied ? <Check className="w-4 h-4 text-emerald-700 dark:text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {codeCopied ? "Copiado" : "Copiar"}
                  </button>
                </div>

                {confirmRegenerate ? (
                  <div className="flex flex-wrap items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                    <p className="text-xs text-amber-700 dark:text-amber-400 flex-1 min-w-[180px]">
                      El código actual dejará de funcionar. ¿Regenerar?
                    </p>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmRegenerate(false)} disabled={regeneratingCode}>
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleRegenerateCode} disabled={regeneratingCode}
                      className="bg-amber-600 hover:bg-amber-700 text-white">
                      {regeneratingCode ? "Regenerando..." : "Sí, regenerar"}
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmRegenerate(true)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Regenerar código
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transmisión en vivo (link manual de Facebook) */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base flex items-center gap-2">
            <Radio className="w-4 h-4 text-violet-700 dark:text-violet-400" />
            Transmisión en Vivo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {church?.liveStreamUrl ? (
            <>
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse shrink-0" />
                <span className="text-red-700 dark:text-red-400 text-sm font-semibold">Transmisión activa</span>
              </div>
              <p className="text-muted-foreground text-xs break-all">{church.liveStreamUrl}</p>
              {canManageLiveStream && (
                <button
                  disabled={liveStreamSaving}
                  onClick={handleEndLiveStream}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-400 transition-colors disabled:opacity-40"
                >
                  <Trash className="w-4 h-4" />
                  {liveStreamSaving ? "Finalizando..." : "Finalizar transmisión"}
                </button>
              )}
            </>
          ) : canManageLiveStream ? (
            <>
              <p className="text-muted-foreground text-sm">
                Pegá el link del video/transmisión de Facebook cuando arranque el culto. Se muestra embebido en el Inicio de la app móvil hasta que la finalices acá.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={liveStreamInput}
                  onChange={(e) => setLiveStreamInput(e.target.value)}
                  placeholder="https://www.facebook.com/..."
                  className="flex-1 h-10 px-3 rounded-lg bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <button
                  disabled={liveStreamSaving || !liveStreamInput.trim()}
                  onClick={handleStartLiveStream}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  {liveStreamSaving ? "Guardando..." : "Iniciar transmisión"}
                </button>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">No hay ninguna transmisión activa en este momento.</p>
          )}

          <div className="border-t border-border pt-3 mt-1">
            <p className="text-foreground text-sm font-semibold mb-1">Video predeterminado</p>
            <p className="text-muted-foreground text-xs mb-2">
              Se muestra en el Inicio de la app cuando no hay transmisión en vivo — por ejemplo, la grabación del último culto — para que siempre haya un video de la iglesia disponible.
            </p>
            {church?.defaultVideoUrl ? (
              <>
                <p className="text-muted-foreground text-xs break-all mb-2">{church.defaultVideoUrl}</p>
                {canManageLiveStream && (
                  <button
                    disabled={defaultVideoSaving}
                    onClick={handleRemoveDefaultVideo}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-400 transition-colors disabled:opacity-40"
                  >
                    <Trash className="w-4 h-4" />
                    {defaultVideoSaving ? "Eliminando..." : "Quitar video predeterminado"}
                  </button>
                )}
              </>
            ) : canManageLiveStream ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={defaultVideoInput}
                  onChange={(e) => setDefaultVideoInput(e.target.value)}
                  placeholder="https://www.facebook.com/..."
                  className="flex-1 h-10 px-3 rounded-lg bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <button
                  disabled={defaultVideoSaving || !defaultVideoInput.trim()}
                  onClick={handleSaveDefaultVideo}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-accent hover:bg-accent/70 text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  {defaultVideoSaving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">No hay ningún video predeterminado configurado.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Formas de dar (links externos — la app no procesa pagos) */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base flex items-center gap-2">
            <Wallet className="w-4 h-4 text-violet-700 dark:text-violet-400" />
            Formas de Dar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Aparece en la pestaña "Dar" de la app móvil. Cada fila es un link o dato externo (Zelle, Cashapp, sitio web...) — nunca procesamos pagos nosotros, solo mostramos cómo dar.
          </p>
          {(givingLinks || []).length > 0 && (
            <div className="space-y-2">
              {givingLinks.map((g) => (
                <div key={g.id} className="flex items-center justify-between gap-3 bg-background border border-border rounded-lg px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{g.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{g.value}</p>
                  </div>
                  {isAdmin && (
                    <button
                      disabled={givingLinkSaving}
                      onClick={() => handleDeleteGivingLink(g.id)}
                      className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-red-700 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {isAdmin && (givingLinks?.length || 0) < MAX_GIVING_LINKS && (
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={givingLabelInput}
                onChange={(e) => setGivingLabelInput(e.target.value)}
                placeholder="Nombre (ej. Zelle)"
                className="w-full sm:w-40 h-10 px-3 rounded-lg bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <input
                type="text"
                value={givingValueInput}
                onChange={(e) => setGivingValueInput(e.target.value)}
                placeholder="Link, correo o dato"
                className="flex-1 h-10 px-3 rounded-lg bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <button
                disabled={givingLinkSaving || !givingLabelInput.trim() || !givingValueInput.trim()}
                onClick={handleAddGivingLink}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                {givingLinkSaving ? "Guardando..." : "Agregar"}
              </button>
            </div>
          )}
          {givingLinks && givingLinks.length === 0 && !isAdmin && (
            <p className="text-muted-foreground text-xs">No hay formas de dar configuradas.</p>
          )}
        </CardContent>
      </Card>

      {/* Prédicas (pestaña "Mensajes" de la app móvil) */}
      <Card className="bg-card border-border lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-foreground text-base flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-violet-700 dark:text-violet-400" />
            Prédicas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Aparecen en la pestaña "Mensajes" de la app móvil, más recientes primero. Cada una es un link de Facebook (video normal o guardado de una transmisión pasada).
          </p>
          {(sermons || []).length > 0 && (
            <div className="space-y-2">
              {sermons.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 bg-background border border-border rounded-lg px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{s.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[s.speaker, s.sermon_date ? new Date(s.sermon_date).toLocaleDateString("es", {day: "numeric", month: "long", year: "numeric"}) : null].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      disabled={sermonSaving}
                      onClick={() => handleDeleteSermon(s.id)}
                      className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-red-700 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {isAdmin && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={sermonTitleInput}
                onChange={(e) => setSermonTitleInput(e.target.value)}
                placeholder="Título"
                className="h-10 px-3 rounded-lg bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <input
                type="text"
                value={sermonSpeakerInput}
                onChange={(e) => setSermonSpeakerInput(e.target.value)}
                placeholder="Predicador (opcional)"
                className="h-10 px-3 rounded-lg bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <input
                type="text"
                value={sermonUrlInput}
                onChange={(e) => setSermonUrlInput(e.target.value)}
                placeholder="https://www.facebook.com/..."
                className="h-10 px-3 rounded-lg bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <input
                type="date"
                value={sermonDateInput}
                onChange={(e) => setSermonDateInput(e.target.value)}
                className="h-10 px-3 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <button
                disabled={sermonSaving || !sermonTitleInput.trim() || !sermonUrlInput.trim()}
                onClick={handleAddSermon}
                className="sm:col-span-2 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sermonSaving ? "Guardando..." : "Agregar prédica"}
              </button>
            </div>
          )}
          {sermons && sermons.length === 0 && !isAdmin && (
            <p className="text-muted-foreground text-xs">Todavía no hay prédicas publicadas.</p>
          )}
        </CardContent>
      </Card>

      {/* Galería de fotos (carrusel de la app móvil) */}
      <Card className="bg-card border-border lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-foreground text-base flex items-center gap-2">
            <Images className="w-4 h-4 text-violet-700 dark:text-violet-400" />
            Galería de Fotos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Estas fotos aparecen en el carrusel de "presentación" del Inicio de la app móvil. Hasta {MAX_CHURCH_PHOTOS} fotos, máx. 2MB cada una.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {(photos || []).map((photo) => (
              <div key={photo.id} className="relative group aspect-square rounded-xl overflow-hidden border border-border bg-background">
                <img src={photo.photo_url} alt="" className="w-full h-full object-cover" />
                {isAdmin && (
                  <button
                    disabled={photoUploading}
                    onClick={() => handlePhotoDelete(photo.id)}
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-40"
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                )}
                <div className="absolute bottom-0 inset-x-0 flex items-center gap-2 px-2 py-1.5 bg-gradient-to-t from-black/70 to-transparent">
                  <span className="inline-flex items-center gap-1 text-white text-[11px] font-semibold">
                    <Heart className="w-3 h-3 fill-current" />
                    {photo.like_count || 0}
                  </span>
                  <button
                    onClick={() => openPhotoComments(photo)}
                    className="inline-flex items-center gap-1 text-white text-[11px] font-semibold hover:text-violet-300 transition-colors"
                  >
                    <MessageCircle className="w-3 h-3" />
                    {photo.comment_count || 0}
                  </button>
                </div>
              </div>
            ))}
            {isAdmin && (photos?.length || 0) < MAX_CHURCH_PHOTOS && (
              <label className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors
                ${photoUploading ? "border-border text-muted-foreground cursor-not-allowed" : "border-border hover:border-violet-500 text-muted-foreground hover:text-violet-700 dark:hover:text-violet-400"}`}>
                <ImagePlus className="w-5 h-5" />
                <span className="text-xs font-medium">{photoUploading ? "Subiendo..." : "Agregar"}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={photoUploading}
                  onChange={handlePhotoAdd}
                />
              </label>
            )}
          </div>
          {photos && photos.length === 0 && (
            <p className="text-muted-foreground text-xs">Todavía no hay fotos en la galería.</p>
          )}
        </CardContent>
      </Card>
      </div>

      <Dialog open={!!commentsDialogPhoto} onOpenChange={(open) => !open && setCommentsDialogPhoto(null)}>
        <DialogContent onClose={() => setCommentsDialogPhoto(null)} className="max-w-md">
          <DialogHeader>
            <DialogTitle>Comentarios</DialogTitle>
          </DialogHeader>
          {commentsDialogPhoto && (
            <img src={commentsDialogPhoto.photo_url} alt="" className="w-full h-32 object-cover rounded-lg mt-2" />
          )}
          <div className="mt-4 space-y-3 max-h-80 overflow-y-auto">
            {commentsLoading ? (
              <p className="text-muted-foreground text-sm text-center py-6">Cargando...</p>
            ) : photoComments.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">Todavía no hay comentarios.</p>
            ) : (
              photoComments.map((c) => (
                <div key={c.id} className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{c.author_name}</p>
                    <p className="text-sm text-foreground/90 break-words">{c.body}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(c.created_at).toLocaleDateString("es", {day: "numeric", month: "long", hour: "2-digit", minute: "2-digit"})}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteComment(c.id)}
                    className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-red-700 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Eliminar comentario"
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Settings className="w-5 h-5 text-white" />
          </span>
          Configuración
        </h1>
        <p className="text-muted-foreground mt-1">
          Administra tu perfil y los datos de tu iglesia
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === t.id
                  ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg"
                  : "bg-background text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Contenido — usa todo el ancho disponible en ambas pestañas (el
          grid de dos columnas dentro de cada una evita que los inputs se
          vean absurdamente anchos en monitores grandes) */}
      <div>
        {activeTab === "profile" && renderProfile()}
        {activeTab === "church" && renderChurch()}
        {activeTab === "mobile" && renderMobile()}
      </div>
    </div>
  );
}

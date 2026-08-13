import React, {useState, useEffect, useCallback, useRef} from "react";
import {toast} from "sonner";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/Card";
import {Button} from "@/components/ui/Button";
import {Input} from "@/components/ui/Input";
import {
  User,
  Mail,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  Save,
  Edit2,
  Building2,
  Calendar,
  Camera,
  Trash2,
  Loader2,
} from "lucide-react";
import {settingsService} from "@/services/api";
import {useAuth} from "@/contexts/AuthContext";

// ── Utilidades ────────────────────────────────────────────────────────────────
const ROLE_META = {
  ADMIN: {
    label: "Administrador",
    color: "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30",
  },
  PASTOR: {
    label: "Pastor",
    color: "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30",
  },
  TESORERO: {
    label: "Tesorero",
    color: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30",
  },
  LIDER: {
    label: "Líder",
    color: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30",
  },
};

function RoleBadge({role}) {
  const m = ROLE_META[role] || {
    label: role,
    color: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span
      className={`px-3 py-1 rounded-full text-sm font-semibold border ${m.color}`}
    >
      {m.label}
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
        className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-blue-500 pr-10"
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

// ── Componente principal ──────────────────────────────────────────────────────
export default function ProfilePage() {
  const {user, updateUser} = useAuth();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);

  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [pwSaving, setPwSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef(null);

  const notify = (msg, type = "success") =>
    type === "error" ? toast.error(msg) : toast.success(msg);

  const fetchProfile = useCallback(async () => {
    try {
      const data = await settingsService.getProfile();
      setProfile(data);
      setFullName(data.fullName || "");
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSaveName = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) return notify("El nombre es obligatorio.", "error");
    setSaving(true);
    try {
      const updated = await settingsService.updateProfile({
        fullName: fullName.trim(),
      });
      setProfile((prev) => ({...prev, fullName: updated.fullName}));
      updateUser({fullName: updated.fullName});
      setEditing(false);
      notify("Nombre actualizado correctamente.");
    } catch (err) {
      notify(
        err?.response?.data?.error || "Error al actualizar nombre.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/"))
      return notify("Solo se permiten archivos de imagen.", "error");
    if (file.size > 2 * 1024 * 1024)
      return notify("La imagen debe ser menor a 2MB.", "error");
    setPhotoUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target.result;
        try {
          const res = await settingsService.uploadProfilePhoto(base64);
          setProfile((prev) => ({...prev, photoUrl: res.photoUrl}));
          updateUser({photoUrl: res.photoUrl});
          notify("Foto de perfil actualizada.");
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

  const handlePhotoDelete = async () => {
    setPhotoUploading(true);
    try {
      await settingsService.deleteProfilePhoto();
      setProfile((prev) => ({...prev, photoUrl: null}));
      updateUser({photoUrl: null});
      notify("Foto de perfil eliminada.");
    } catch (err) {
      notify(err?.response?.data?.error || "Error al eliminar la foto.", "error");
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleChangePassword = async (e) => {
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
    } catch (err) {
      notify(
        err?.response?.data?.error || "Error al cambiar contraseña.",
        "error",
      );
    } finally {
      setPwSaving(false);
    }
  };

  const initials = (profile?.fullName || user?.fullName || "U")
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const role = profile?.role || user?.role;
  const email = profile?.email || user?.email;
  const churchName = profile?.churchName || user?.churchName;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </span>
          Mi Perfil
        </h1>
        <p className="text-muted-foreground mt-1">Información de tu cuenta</p>
      </div>

      {/* Tarjeta de identidad */}
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg">
                {profile?.photoUrl ? (
                  <img
                    src={profile.photoUrl}
                    alt={profile?.fullName || "Foto de perfil"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-white">{initials}</span>
                )}
                {photoUploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={photoUploading}
                title="Cambiar foto"
                className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-blue-500 transition-colors shadow"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              {profile?.photoUrl && (
                <button
                  type="button"
                  onClick={handlePhotoDelete}
                  disabled={photoUploading}
                  title="Quitar foto"
                  className="absolute -bottom-1.5 -left-1.5 w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-red-700 dark:hover:text-red-400 hover:border-red-500/50 transition-colors shadow"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {/* Nombre editable */}
              {editing ? (
                <form
                  onSubmit={handleSaveName}
                  className="flex items-center gap-2 mb-2"
                >
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-background border-border text-foreground text-xl font-bold focus:border-blue-500 h-9 py-1"
                    autoFocus
                  />
                  <Button
                    type="submit"
                    disabled={saving}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                  >
                    <Save className="w-3.5 h-3.5 mr-1" />
                    {saving ? "..." : "Guardar"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditing(false);
                      setFullName(profile?.fullName || "");
                    }}
                    className="border-border text-muted-foreground hover:text-foreground shrink-0"
                  >
                    Cancelar
                  </Button>
                </form>
              ) : (
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-xl font-bold text-foreground truncate">
                    {profile?.fullName || user?.fullName || "—"}
                  </h2>
                  <button
                    onClick={() => setEditing(true)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="Editar nombre"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Rol */}
              <div className="mb-3">
                <RoleBadge role={role} />
              </div>

              {/* Datos */}
              <div className="space-y-1.5 text-sm">
                {email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4 shrink-0" />
                    <span>{email}</span>
                  </div>
                )}
                {churchName && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="w-4 h-4 shrink-0" />
                    <span>{churchName}</span>
                  </div>
                )}
                {profile?.createdAt && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span>
                      Miembro desde{" "}
                      {new Date(profile.createdAt).toLocaleDateString("es-ES", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cambiar contraseña */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground text-base flex items-center gap-2">
            <Lock className="w-4 h-4 text-muted-foreground" />
            Cambiar Contraseña
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Contraseña actual</label>
              <PasswordInput
                name="currentPassword"
                value={pwForm.currentPassword}
                onChange={(e) =>
                  setPwForm((p) => ({...p, currentPassword: e.target.value}))
                }
                placeholder="Tu contraseña actual"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">
                  Nueva contraseña
                </label>
                <PasswordInput
                  name="newPassword"
                  value={pwForm.newPassword}
                  onChange={(e) =>
                    setPwForm((p) => ({...p, newPassword: e.target.value}))
                  }
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">
                  Confirmar contraseña
                </label>
                <PasswordInput
                  name="confirmPassword"
                  value={pwForm.confirmPassword}
                  onChange={(e) =>
                    setPwForm((p) => ({...p, confirmPassword: e.target.value}))
                  }
                  placeholder="Repite la contraseña"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={pwSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                {pwSaving ? "Guardando..." : "Actualizar contraseña"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

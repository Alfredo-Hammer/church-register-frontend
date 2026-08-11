import React, {useState, useEffect, useCallback} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/Card";
import {Button} from "@/components/ui/Button";
import {Input} from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import {
  Settings,
  Building2,
  User,
  Users,
  Lock,
  Edit2,
  Trash2,
  Plus,
  Save,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  ChevronDown,
  ImagePlus,
  Trash,
  Smartphone,
  Copy,
  RefreshCw,
  Check,
} from "lucide-react";
import {QRCodeSVG} from "qrcode.react";
import {settingsService} from "@/services/api";
import {useAuth} from "@/contexts/AuthContext";

// ── Helpers ───────────────────────────────────────────────────────────────────
const ROLES = ["ADMIN", "PASTOR", "TESORERO", "LIDER"];

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

function Toast({msg, type, onClose}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [msg, onClose]);
  if (!msg) return null;
  const isErr = type === "error";
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border
      ${isErr ? "bg-red-500/10 dark:bg-red-900/90 border-red-300 dark:border-red-700 text-red-700 dark:text-red-200" : "bg-green-500/10 dark:bg-green-900/90 border-green-300 dark:border-green-700 text-green-700 dark:text-green-200"}`}
    >
      {isErr ? (
        <AlertCircle className="w-5 h-5 shrink-0" />
      ) : (
        <CheckCircle className="w-5 h-5 shrink-0" />
      )}
      <span className="text-sm font-medium">{msg}</span>
    </div>
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
  {id: "users", label: "Usuarios", icon: Users},
];

// ─────────────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const {user, updateUser} = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [activeTab, setActiveTab] = useState("profile");
  const [toast, setToast] = useState({msg: "", type: ""});

  const notify = (msg, type = "success") => setToast({msg, type});
  const clearToast = () => setToast({msg: "", type: ""});

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
  const [churchForm, setChurchForm] = useState({
    name: "",
    address: "",
    phone: "",
  });
  const [churchSaving, setChurchSaving] = useState(false);
  const [churchEditing, setChurchEditing] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  // Código de invitación — lo que un miembro sin cuenta usa en la app móvil
  // para asociarse a esta iglesia.
  const [joinCode, setJoinCode] = useState(null);
  const [regeneratingCode, setRegeneratingCode] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

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

  const fetchChurch = useCallback(async () => {
    try {
      const data = await settingsService.getChurch();
      setChurch(data);
      setChurchForm({
        name: data.name || "",
        address: data.address || "",
        phone: data.phone || "",
      });
      // Sync logo into auth context so sidebar updates immediately
      if (data.logoUrl !== undefined) updateUser({churchLogo: data.logoUrl || null});
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    if (activeTab === "church" && !church) fetchChurch();
  }, [activeTab, church, fetchChurch]);

  useEffect(() => {
    if (activeTab === "church" && isAdmin && !joinCode) fetchJoinCode();
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
        address: updated.address || "",
        phone: updated.phone || "",
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

  // ─── Tab: USUARIOS ───────────────────────────────────────────────────────
  const [usersData, setUsersData] = useState(null);
  const [userModal, setUserModal] = useState(false);
  const [editUserId, setEditUserId] = useState(null);
  const [userForm, setUserForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "LIDER",
  });
  const [userSaving, setUserSaving] = useState(false);
  const [deleteUserModal, setDeleteUserModal] = useState(false);
  const [deleteUserTarget, setDeleteUserTarget] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await settingsService.getUsers();
      setUsersData(data.users || []);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    if (activeTab === "users" && !usersData) fetchUsers();
  }, [activeTab, usersData, fetchUsers]);

  const openCreateUser = () => {
    setEditUserId(null);
    setUserForm({fullName: "", email: "", password: "", role: "LIDER"});
    setUserModal(true);
  };

  const openEditUser = (u) => {
    setEditUserId(u.id);
    setUserForm({
      fullName: u.fullName,
      email: u.email,
      password: "",
      role: u.role,
    });
    setUserModal(true);
  };

  const handleUserSave = async (e) => {
    e.preventDefault();
    setUserSaving(true);
    try {
      if (editUserId) {
        await settingsService.updateUser(editUserId, {
          fullName: userForm.fullName,
          role: userForm.role,
        });
        notify("Usuario actualizado.");
      } else {
        await settingsService.createUser(userForm);
        notify("Usuario creado correctamente.");
      }
      setUserModal(false);
      fetchUsers();
    } catch (e) {
      notify(e?.response?.data?.error || "Error al guardar usuario.", "error");
    } finally {
      setUserSaving(false);
    }
  };

  const confirmDeleteUser = (u) => {
    setDeleteUserTarget(u);
    setDeleteUserModal(true);
  };

  const handleDeleteUser = async () => {
    try {
      await settingsService.deleteUser(deleteUserTarget.id);
      setDeleteUserModal(false);
      setDeleteUserTarget(null);
      notify("Usuario eliminado.");
      fetchUsers();
    } catch (e) {
      notify(e?.response?.data?.error || "Error al eliminar usuario.", "error");
    }
  };

  // ─── Render Tabs ──────────────────────────────────────────────────────────
  const renderProfile = () => (
    <div className="space-y-6 max-w-xl md:max-w-2xl lg:max-w-3xl">
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
  );

  const renderChurch = () => (
    <div className="space-y-5 max-w-xl md:max-w-2xl lg:max-w-3xl">
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

      {/* Código de invitación (app móvil) */}
      {isAdmin && (
        <Card className="bg-card border-border">
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
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setChurchEditing(false);
                    setChurchForm({
                      name: church.name || "",
                      address: church.address || "",
                      phone: church.phone || "",
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
                {label: "Dirección", value: church.address || "—"},
                {label: "Teléfono", value: church.phone || "—"},
              ].map(({label, value}) => (
                <div key={label} className="flex items-start gap-3">
                  <span className="text-muted-foreground text-sm w-24 shrink-0 pt-0.5">
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

  const renderUsers = () => {
    if (!isAdmin) {
      return (
        <div className="text-center py-16 text-muted-foreground">
          <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-lg font-medium">Acceso restringido</p>
          <p className="text-sm mt-1">
            Solo los administradores pueden gestionar usuarios.
          </p>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground text-sm">
            {usersData?.length || 0} usuarios registrados
          </p>
          <Button
            onClick={openCreateUser}
            className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Usuario
          </Button>
        </div>

        {!usersData ? (
          <div className="text-center py-10 text-muted-foreground">
            Cargando usuarios...
          </div>
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-4 py-3 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                        Usuario
                      </th>
                      <th className="px-4 py-3 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-4 py-3 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                        Rol
                      </th>
                      <th className="px-4 py-3 text-muted-foreground text-xs font-semibold uppercase tracking-wider text-center">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {usersData.map((u) => (
                      <tr
                        key={u.id}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-700 dark:text-violet-400 font-bold text-sm shrink-0">
                              {u.fullName?.charAt(0)?.toUpperCase()}
                            </div>
                            <div>
                              <p className="text-foreground text-sm font-medium">
                                {u.fullName}
                              </p>
                              {u.id === user?.userId && (
                                <span className="text-xs text-violet-700 dark:text-violet-400">
                                  (tú)
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-sm">
                          {u.email}
                        </td>
                        <td className="px-4 py-3">
                          <RoleBadge role={u.role} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openEditUser(u)}
                              className="w-7 h-7 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 hover:text-blue-700 dark:text-blue-300 flex items-center justify-center transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => confirmDeleteUser(u)}
                              disabled={u.id === user?.userId}
                              className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-400 hover:text-red-700 dark:text-red-300 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

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
          Administra tu perfil, iglesia y usuarios del sistema
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          // Ocultar pestaña de usuarios si no es admin
          if (t.id === "users" && !isAdmin) return null;
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

      {/* Contenido */}
      <div>
        {activeTab === "profile" && renderProfile()}
        {activeTab === "church" && renderChurch()}
        {activeTab === "users" && renderUsers()}
      </div>

      {/* Modal crear/editar usuario */}
      <Dialog
        open={userModal}
        onOpenChange={(open) => !open && setUserModal(false)}
      >
        <DialogContent className="bg-card border-border max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-3 text-xl">
              <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </span>
              {editUserId ? "Editar Usuario" : "Nuevo Usuario"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUserSave} className="mt-4 space-y-4">
            <div>
              <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                Nombre Completo
              </label>
              <Input
                value={userForm.fullName}
                onChange={(e) =>
                  setUserForm((f) => ({...f, fullName: e.target.value}))
                }
                placeholder="Nombre completo"
                required
                className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-violet-500"
              />
            </div>

            {!editUserId && (
              <div>
                <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                  Email
                </label>
                <Input
                  type="email"
                  value={userForm.email}
                  onChange={(e) =>
                    setUserForm((f) => ({...f, email: e.target.value}))
                  }
                  placeholder="correo@ejemplo.com"
                  required
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-violet-500"
                />
              </div>
            )}

            {!editUserId && (
              <div>
                <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                  Contraseña
                </label>
                <PasswordInput
                  name="newUserPass"
                  value={userForm.password}
                  onChange={(e) =>
                    setUserForm((f) => ({...f, password: e.target.value}))
                  }
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            )}

            <div>
              <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                Rol
              </label>
              <div className="relative">
                <select
                  value={userForm.role}
                  onChange={(e) =>
                    setUserForm((f) => ({...f, role: e.target.value}))
                  }
                  className="w-full px-3 py-2 pr-8 bg-background border border-border text-foreground rounded-md text-sm focus:outline-none focus:border-violet-500 appearance-none"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
              <p className="text-muted-foreground text-xs mt-1">
                ADMIN: acceso total · PASTOR: gestión pastoral · TESORERO:
                finanzas · LIDER: solo lectura
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setUserModal(false)}
                className="border-border text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={userSaving}
                className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white min-w-[100px]"
              >
                {userSaving
                  ? "Guardando..."
                  : editUserId
                    ? "Guardar cambios"
                    : "Crear usuario"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal confirmar eliminar usuario */}
      <Dialog
        open={deleteUserModal}
        onOpenChange={(open) => !open && setDeleteUserModal(false)}
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
            ¿Eliminar al usuario{" "}
            <span className="text-foreground font-semibold">
              {deleteUserTarget?.fullName}
            </span>
            ? Esta acción no puede deshacerse.
          </p>
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setDeleteUserModal(false)}
              className="border-border text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Toast de notificaciones */}
      <Toast msg={toast.msg} type={toast.type} onClose={clearToast} />
    </div>
  );
}

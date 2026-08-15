import React, {useState, useEffect, useCallback} from "react";
import {toast} from "sonner";
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
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Search,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  X,
  Mail,
  Shield,
  ChevronLeft,
  ChevronRight,
  Power,
} from "lucide-react";
import {settingsService, membersService} from "@/services/api";
import {useAuth} from "@/contexts/AuthContext";
import {ConfirmDialog} from "@/components/ui/ConfirmDialog";

// ── Constantes ────────────────────────────────────────────────────────────────
const ROLES = ["ADMIN", "PASTOR", "TESORERO", "LIDER"];

const ROLE_META = {
  ADMIN: {
    bg: "bg-red-500/20",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-500/30",
  },
  PASTOR: {
    bg: "bg-purple-500/20",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-500/30",
  },
  TESORERO: {
    bg: "bg-amber-500/20",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-500/30",
  },
  LIDER: {
    bg: "bg-blue-500/20",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-500/30",
  },
};

// ── Componentes pequeños ──────────────────────────────────────────────────────
function StatusBadge({isActive}) {
  return isActive ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
      Activo
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-muted text-muted-foreground border-border">
      Inactivo
    </span>
  );
}

function RoleBadge({role}) {
  const m = ROLE_META[role] || {
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${m.bg} ${m.text} ${m.border}`}
    >
      <Shield className="w-3 h-3" />
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

// ── Formulario vacío ──────────────────────────────────────────────────────────
const EMPTY_FORM = {fullName: "", email: "", password: "", role: "LIDER"};

// ── Página principal ──────────────────────────────────────────────────────────
export default function UsersPage() {
  const {user} = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("TODOS");
  const [pagination, setPagination] = useState({total: 0, limit: 20, offset: 0});

  // Modal crear/editar
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null = crear
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Sugerencias de miembros activos para autocompletar el nombre completo
  const [activeMembers, setActiveMembers] = useState([]);
  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Modal confirmar eliminar
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Activar/desactivar
  const [togglingId, setTogglingId] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null); // usuario a activar/desactivar (pendiente de confirmar)

  const notify = useCallback(
    (msg, type = "ok") => (type === "error" ? toast.error(msg) : toast.success(msg)),
    [],
  );

  // ─── Carga ────────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {limit: pagination.limit, offset: pagination.offset};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (roleFilter !== "TODOS") params.role = roleFilter;
      const data = await settingsService.getUsers(params);
      setUsers(data.users || []);
      setPagination((prev) => ({...prev, total: data.total || 0}));
    } catch {
      notify("Error al cargar usuarios.", "error");
    } finally {
      setLoading(false);
    }
  }, [notify, pagination.limit, pagination.offset, searchTerm, roleFilter]);

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin, roleFilter, pagination.offset]);

  useEffect(() => {
    if (!isAdmin) return;
    membersService
      .getAll({status: "ACTIVO", limit: 500})
      .then((r) => setActiveMembers(r.members || []))
      .catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const t = setTimeout(() => {
      setPagination((prev) => ({...prev, offset: 0}));
      fetchUsers();
    }, 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // La búsqueda y el filtro de rol ya se aplican en el backend (ver fetchUsers).
  const filtered = users;
  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
  const goPage = (p) =>
    setPagination((prev) => ({...prev, offset: (p - 1) * prev.limit}));

  // ─── Abrir modales ────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setForm({fullName: u.fullName, email: u.email, password: "", role: u.role});
    setFormError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setNameSuggestions([]);
    setShowSuggestions(false);
  };

  // ─── Autocompletar con miembros activos ────────────────────────────────────
  const handleFullNameChange = (value) => {
    setForm((f) => ({...f, fullName: value}));
    if (value.trim().length < 2) {
      setNameSuggestions([]);
      return;
    }
    const q = value.trim().toLowerCase();
    setNameSuggestions(
      activeMembers
        .filter((m) => `${m.first_name} ${m.last_name}`.toLowerCase().includes(q))
        .slice(0, 6),
    );
  };

  const selectSuggestedMember = (m) => {
    setForm((f) => ({
      ...f,
      fullName: `${m.first_name} ${m.last_name}`,
      email: !editingUser && !f.email && m.email ? m.email : f.email,
    }));
    setNameSuggestions([]);
    setShowSuggestions(false);
  };

  // ─── Guardar ──────────────────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!form.fullName.trim()) return setFormError("El nombre es obligatorio.");
    if (!editingUser && !form.email.trim())
      return setFormError("El email es obligatorio.");
    if (!editingUser && !form.password)
      return setFormError("La contraseña es obligatoria.");
    if (!editingUser && form.password.length < 6)
      return setFormError("La contraseña debe tener al menos 6 caracteres.");

    setSaving(true);
    try {
      if (editingUser) {
        await settingsService.updateUser(editingUser.id, {
          fullName: form.fullName.trim(),
          role: form.role,
        });
        notify("Usuario actualizado correctamente.");
      } else {
        await settingsService.createUser({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
        });
        notify("Usuario creado correctamente.");
      }
      closeModal();
      fetchUsers();
    } catch (err) {
      const msg = err?.response?.data?.error || "Error al guardar usuario.";
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  // ─── Activar/Desactivar ───────────────────────────────────────────────────
  const handleToggleActive = async (u) => {
    setTogglingId(u.id);
    try {
      const data = await settingsService.toggleUserActive(u.id);
      setUsers((prev) =>
        prev.map((item) =>
          item.id === u.id ? {...item, isActive: data.isActive} : item,
        ),
      );
      notify(data.message);
    } catch (err) {
      const msg = err?.response?.data?.error || "Error al cambiar el estado del usuario.";
      notify(msg, "error");
    } finally {
      setTogglingId(null);
      setToggleTarget(null);
    }
  };

  // ─── Eliminar ─────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await settingsService.deleteUser(deleteTarget.id);
      notify("Usuario eliminado.");
      setDeleteTarget(null);
      fetchUsers();
    } catch (err) {
      const msg = err?.response?.data?.error || "Error al eliminar usuario.";
      notify(msg, "error");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  // ─── Stats ────────────────────────────────────────────────────────────────
  const totalByRole = ROLES.reduce((acc, r) => {
    acc[r] = users.filter((u) => u.role === r).length;
    return acc;
  }, {});

  // ─── Acceso denegado ──────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
        <ShieldCheck className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-xl font-semibold text-muted-foreground">
          Acceso restringido
        </p>
        <p className="text-sm mt-2">
          Solo los administradores pueden gestionar usuarios.
        </p>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Usuarios</h1>
              <p className="text-muted-foreground text-sm">
                Gestión de acceso y roles del sistema
              </p>
            </div>
          </div>
        </div>
        <Button
          onClick={openCreate}
          className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {ROLES.map((role) => {
          const m = ROLE_META[role];
          return (
            <Card key={role} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                      {role}
                    </p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {totalByRole[role]}
                    </p>
                  </div>
                  <div
                    className={`w-10 h-10 rounded-lg ${m.bg} flex items-center justify-center`}
                  >
                    <Shield className={`w-5 h-5 ${m.text}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filtros */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {["TODOS", ...ROLES].map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRoleFilter(r);
                    setPagination((p) => ({...p, offset: 0}));
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    roleFilter === r
                      ? "bg-violet-600 text-white"
                      : "bg-background text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {r === "TODOS" ? "Todos" : r}
                  {r !== "TODOS" && (
                    <span className="ml-1.5 text-xs opacity-70">
                      ({totalByRole[r]})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card className="bg-card border-border">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-foreground text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4 text-violet-700 dark:text-violet-400" />
              Lista de Usuarios
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              {pagination.total} resultado{pagination.total !== 1 ? "s" : ""}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm">Cargando usuarios...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No se encontraron usuarios</p>
              {searchTerm && (
                <p className="text-sm mt-1">
                  No hay resultados para "{searchTerm}"
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Email
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Registro
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((u) => {
                    const isSelf = u.id === user?.userId;
                    const initials =
                      u.fullName
                        ?.split(" ")
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase() || "?";
                    return (
                      <tr
                        key={u.id}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                              {initials}
                            </div>
                            <div>
                              <p className="text-foreground font-medium text-sm">
                                {u.fullName}
                              </p>
                              {isSelf && (
                                <span className="text-xs text-violet-700 dark:text-violet-400 font-medium">
                                  (tú)
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            {u.email}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <RoleBadge role={u.role} />
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge isActive={u.isActive} />
                        </td>
                        <td className="px-6 py-4 text-muted-foreground text-sm">
                          {u.createdAt
                            ? new Date(u.createdAt).toLocaleDateString("es", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => !isSelf && setToggleTarget(u)}
                              disabled={isSelf || togglingId === u.id}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isSelf
                                  ? "text-muted-foreground cursor-not-allowed"
                                  : u.isActive
                                    ? "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                                    : "text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-500/10"
                              }`}
                              title={
                                isSelf
                                  ? "No puedes desactivar tu propio usuario"
                                  : u.isActive
                                    ? "Desactivar cuenta"
                                    : "Activar cuenta"
                              }
                            >
                              <Power className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openEdit(u)}
                              className="p-1.5 text-muted-foreground hover:text-violet-700 dark:text-violet-400 hover:bg-violet-500/10 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => !isSelf && setDeleteTarget(u)}
                              disabled={isSelf}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isSelf
                                  ? "text-muted-foreground cursor-not-allowed"
                                  : "text-muted-foreground hover:text-red-700 dark:text-red-400 hover:bg-red-500/10"
                              }`}
                              title={
                                isSelf
                                  ? "No puedes eliminar tu propio usuario"
                                  : "Eliminar"
                              }
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Modal crear/editar ──────────────────────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent onClose={closeModal}>
          <DialogHeader>
            <DialogTitle className="text-foreground text-lg flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-violet-700 dark:text-violet-400" />
              {editingUser ? "Editar Usuario" : "Nuevo Usuario"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="mt-4 space-y-4">
            {formError && (
              <div className="bg-red-500/10 dark:bg-red-900/20 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span className="text-sm">{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 relative">
                <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                  Nombre Completo *
                </label>
                <Input
                  value={form.fullName}
                  onChange={(e) => handleFullNameChange(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="Nombre completo o busca un miembro activo…"
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-violet-500"
                  autoComplete="off"
                />
                {showSuggestions && nameSuggestions.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl overflow-hidden max-h-52 overflow-y-auto">
                    {nameSuggestions.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onMouseDown={() => selectSuggestedMember(m)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-accent transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-foreground">
                            {m.first_name?.[0]}
                            {m.last_name?.[0]}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-foreground font-medium truncate">
                            {m.first_name} {m.last_name}
                          </p>
                          {m.email && (
                            <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {!editingUser && (
                <>
                  <div className="sm:col-span-2">
                    <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                      Email *
                    </label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm((f) => ({...f, email: e.target.value}))
                      }
                      placeholder="correo@ejemplo.com"
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-violet-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                      Contraseña *{" "}
                      <span className="text-muted-foreground font-normal">
                        (mín. 6 caracteres)
                      </span>
                    </label>
                    <PasswordInput
                      name="password"
                      value={form.password}
                      onChange={(e) =>
                        setForm((f) => ({...f, password: e.target.value}))
                      }
                      placeholder="Contraseña de acceso"
                    />
                  </div>
                </>
              )}

              <div className="sm:col-span-2">
                <label className="text-muted-foreground text-sm font-medium block mb-1.5">
                  Rol *
                </label>
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm((f) => ({...f, role: e.target.value}))
                  }
                  className="w-full h-10 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <p className="text-muted-foreground text-xs mt-1.5">
                  ADMIN: acceso total · PASTOR: lectura/escritura · TESORERO:
                  finanzas · LIDER: grupos/asistencia
                </p>
              </div>
            </div>

            {editingUser && (
              <p className="text-muted-foreground text-xs">
                El email no puede modificarse. Para cambiar contraseña usa la
                sección Configuración.
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeModal}
                className="border-border text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
              >
                {saving
                  ? "Guardando..."
                  : editingUser
                    ? "Actualizar"
                    : "Crear Usuario"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal confirmar eliminar ──────────────────────────────────────── */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent
          onClose={() => setDeleteTarget(null)}
          className="max-w-md"
        >
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-700 dark:text-red-400" />
              Eliminar Usuario
            </DialogTitle>
          </DialogHeader>
          <div className="mt-3 space-y-4">
            <p className="text-muted-foreground text-sm">
              ¿Estás seguro que deseas eliminar al usuario{" "}
              <span className="text-foreground font-semibold">
                {deleteTarget?.fullName}
              </span>
              ? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                className="border-border text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleting ? "Eliminando..." : "Sí, eliminar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toggleTarget}
        onOpenChange={(open) => !open && setToggleTarget(null)}
        title={
          toggleTarget?.isActive
            ? "¿Desactivar usuario?"
            : "¿Activar usuario?"
        }
        description={
          toggleTarget?.isActive
            ? `${toggleTarget?.fullName} no podrá iniciar sesión hasta que reactives su cuenta.`
            : `${toggleTarget?.fullName} podrá volver a iniciar sesión.`
        }
        confirmLabel={toggleTarget?.isActive ? "Sí, desactivar" : "Sí, activar"}
        confirmingLabel={toggleTarget?.isActive ? "Desactivando…" : "Activando…"}
        variant={toggleTarget?.isActive ? "destructive" : "default"}
        onConfirm={() => handleToggleActive(toggleTarget)}
      />
    </div>
  );
}

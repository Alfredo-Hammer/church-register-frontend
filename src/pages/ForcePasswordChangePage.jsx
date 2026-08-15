import React, {useState} from "react";
import {useNavigate} from "react-router-dom";
import {toast} from "sonner";
import {Button} from "@/components/ui/Button";
import {Input} from "@/components/ui/Input";
import {ShieldAlert, Eye, EyeOff} from "lucide-react";
import {settingsService} from "@/services/api";
import {useAuth} from "@/contexts/AuthContext";

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

export default function ForcePasswordChangePage() {
  const {user, updateUser, logout} = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.currentPassword || !form.newPassword) {
      return setError("Completa todos los campos.");
    }
    if (form.newPassword.length < 6) {
      return setError("La nueva contraseña debe tener al menos 6 caracteres.");
    }
    if (form.newPassword === form.currentPassword) {
      return setError("La nueva contraseña debe ser distinta a la temporal.");
    }
    if (form.newPassword !== form.confirmPassword) {
      return setError("Las contraseñas no coinciden.");
    }
    setSaving(true);
    try {
      await settingsService.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      updateUser({mustChangePassword: false});
      toast.success("Contraseña actualizada. ¡Bienvenido!");
      navigate("/dashboard", {replace: true});
    } catch (err) {
      setError(err?.response?.data?.error || "Error al cambiar la contraseña.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl p-6 sm:p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4">
            <ShieldAlert className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            Cambia tu contraseña temporal
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5">
            {user?.fullName ? `Hola ${user.fullName}, por` : "Por"} seguridad,
            debes elegir una contraseña propia antes de continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 dark:bg-red-900/20 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">
              Contraseña temporal
            </label>
            <PasswordInput
              name="currentPassword"
              value={form.currentPassword}
              onChange={(e) =>
                setForm((f) => ({...f, currentPassword: e.target.value}))
              }
              placeholder="La que recibiste por correo"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">
              Nueva contraseña
            </label>
            <PasswordInput
              name="newPassword"
              value={form.newPassword}
              onChange={(e) =>
                setForm((f) => ({...f, newPassword: e.target.value}))
              }
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">
              Confirmar nueva contraseña
            </label>
            <PasswordInput
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={(e) =>
                setForm((f) => ({...f, confirmPassword: e.target.value}))
              }
              placeholder="Repite la contraseña"
            />
          </div>

          <Button
            type="submit"
            disabled={saving}
            className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
          >
            {saving ? "Guardando..." : "Cambiar contraseña"}
          </Button>
        </form>

        <button
          type="button"
          onClick={logout}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground mt-5"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

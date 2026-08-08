import React, { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, Lock } from "lucide-react";
import { authService } from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const email = useMemo(() => searchParams.get("email") || "", [searchParams]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const invalidLink = !token || !email;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (newPassword.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const response = await authService.resetPassword(token, email, newPassword);
      setMessage(response.message || "Contraseña actualizada correctamente.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo restablecer la contraseña.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="surface-public min-h-screen bg-gradient-to-br from-background via-muted to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-border bg-card">
          <CardHeader>
            <CardTitle className="text-2xl text-foreground">Nueva contraseña</CardTitle>
            <CardDescription className="text-muted-foreground">
              Crea una nueva contraseña para tu cuenta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invalidLink ? (
              <div className="space-y-4">
                <div className="bg-red-500/10 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg p-3 text-sm">
                  El enlace no es válido. Solicita uno nuevo.
                </div>
                <Link to="/forgot-password" className="text-blue-700 dark:text-blue-400 hover:underline font-medium text-sm">
                  Solicitar nuevo enlace
                </Link>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                {message && (
                  <div className="bg-emerald-500/10 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-lg p-3 flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 mt-0.5" />
                    <span className="text-sm">{message}</span>
                  </div>
                )}

                {error && (
                  <div className="bg-red-500/10 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 mt-0.5" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="newPassword" className="text-sm font-medium text-muted-foreground">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type="password"
                      className="pl-10"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-muted-foreground">
                    Confirmar contraseña
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading ? "Actualizando..." : "Restablecer contraseña"}
                </Button>
              </form>
            )}

            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link to="/login" className="text-blue-700 dark:text-blue-400 hover:underline font-medium">
                Volver al inicio de sesión
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

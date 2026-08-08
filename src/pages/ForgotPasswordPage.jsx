import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import { authService } from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await authService.forgotPassword(email.trim().toLowerCase());
      setMessage(response.message || "Si el correo existe, te enviamos un enlace de recuperación.");
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo procesar la solicitud.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="surface-public min-h-screen bg-gradient-to-br from-background via-muted to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-border bg-card">
          <CardHeader>
            <CardTitle className="text-2xl text-foreground">Recuperar contraseña</CardTitle>
            <CardDescription className="text-muted-foreground">
              Te enviaremos un enlace para crear una nueva contraseña.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                <label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    className="pl-10"
                    placeholder="usuario@iglesia.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? "Enviando..." : "Enviar enlace"}
              </Button>
            </form>

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

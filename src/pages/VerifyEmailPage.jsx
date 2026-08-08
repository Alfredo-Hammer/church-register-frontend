import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, Mail } from "lucide-react";
import { authService } from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const emailFromLink = useMemo(() => searchParams.get("email") || "", [searchParams]);

  const [status, setStatus] = useState("loading");
  const [feedback, setFeedback] = useState("Validando enlace de verificación...");
  const [emailForResend, setEmailForResend] = useState(emailFromLink);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    const verify = async () => {
      // Sin token no hay nada que verificar todavía. Aquí se llega también
      // desde el login, a propósito, para pedir otro correo: mostrar un error
      // en ese caso hace pensar que algo se rompió.
      if (!token) {
        setStatus("idle");
        setFeedback("");
        return;
      }
      if (!emailFromLink) {
        setStatus("error");
        setFeedback("El enlace no es válido o está incompleto.");
        return;
      }

      try {
        const response = await authService.verifyEmail(token, emailFromLink);
        setStatus("success");
        setFeedback(response.message || "Correo verificado correctamente.");
      } catch (err) {
        setStatus("error");
        setFeedback(err.response?.data?.error || "No se pudo verificar el correo.");
      }
    };

    verify();
  }, [token, emailFromLink]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!emailForResend.trim()) {
      setFeedback("Ingresa un correo válido.");
      setStatus("error");
      return;
    }

    setResendLoading(true);
    try {
      const response = await authService.requestEmailVerification(emailForResend.trim().toLowerCase());
      setStatus("success");
      setFeedback(response.message || "Si el correo existe, enviamos un nuevo enlace.");
    } catch (err) {
      setStatus("error");
      setFeedback(err.response?.data?.error || "No se pudo enviar un nuevo enlace.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="surface-public min-h-screen bg-gradient-to-br from-background via-muted to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-border bg-card">
          <CardHeader>
            <CardTitle className="text-2xl text-foreground">Verificación de correo</CardTitle>
            <CardDescription className="text-muted-foreground">
              Confirma tu correo para activar el acceso a tu cuenta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {feedback && (
              <div className={`rounded-lg border p-3 text-sm flex items-start gap-2 ${status === "success" ? "bg-emerald-500/10 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300" : "bg-red-500/10 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300"}`}>
                {status === "success" ? <CheckCircle2 className="h-5 w-5 mt-0.5" /> : <AlertCircle className="h-5 w-5 mt-0.5" />}
                <span>{feedback}</span>
              </div>
            )}

            {(status === "error" || status === "idle") && (
              <form className="space-y-3" onSubmit={handleResend}>
                <label htmlFor="resendEmail" className="text-sm font-medium text-muted-foreground">
                  Reenviar enlace
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="resendEmail"
                    type="email"
                    className="pl-10"
                    value={emailForResend}
                    onChange={(e) => setEmailForResend(e.target.value)}
                    placeholder="usuario@iglesia.com"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={resendLoading}>
                  {resendLoading ? "Enviando..." : "Reenviar verificación"}
                </Button>
              </form>
            )}

            <p className="text-center text-sm text-muted-foreground">
              <Link to="/login" className="text-blue-700 dark:text-blue-400 hover:underline font-medium">
                Ir al inicio de sesión
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

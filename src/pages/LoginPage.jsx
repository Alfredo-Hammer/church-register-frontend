import React, {useState} from "react";
import {useNavigate, Link} from "react-router-dom";
import {useAuth} from "@/contexts/AuthContext";
import {Button} from "@/components/ui/Button";
import {Input} from "@/components/ui/Input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {Church, Mail, Lock, AlertCircle} from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const {login} = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(email, password);

      if (result.success) {
        navigate("/dashboard");
      } else {
        setError(result.error || "Error al iniciar sesión");
        // Sin esto el usuario queda con un mensaje que le dice que verifique
        // su correo pero sin ningún sitio adonde ir a pedirlo de nuevo.
        setNeedsVerification(result.code === "EMAIL_NOT_VERIFIED");
      }
    } catch (err) {
      setError("Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="surface-public min-h-screen bg-gradient-to-br from-background via-muted to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg mb-4">
            <Church className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Sistema de Control Eclesiástico
          </h1>
          <p className="text-muted-foreground">Inicia sesión para continuar</p>
        </div>

        {/* Card de login */}
        <Card className="shadow-xl border-border bg-card">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold text-center text-foreground">
              Bienvenido
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              Ingresa tus credenciales para acceder
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error message */}
              {error && (
                <div className="bg-red-500/10 dark:bg-red-900/20 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg p-3 flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p>{error}</p>
                    {needsVerification && (
                      <Link
                        to={`/verify-email${email ? `?email=${encodeURIComponent(email)}` : ""}`}
                        className="mt-1 inline-block font-medium underline underline-offset-2"
                      >
                        Reenviar correo de verificación
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {/* Email field */}
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-muted-foreground"
                >
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@iglesia.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-muted-foreground"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                className="w-full h-11 text-base font-medium"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Iniciando sesión...
                  </div>
                ) : (
                  "Iniciar sesión"
                )}
              </Button>

              <div className="text-right">
                <Link
                  to="/forgot-password"
                  className="text-sm text-blue-700 dark:text-blue-400 hover:text-blue-700 dark:text-blue-300 hover:underline font-medium"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </form>

            {/* Footer */}
            <div className="mt-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                ¿No tienes una cuenta?{" "}
                <Link
                  to="/register"
                  className="text-blue-700 dark:text-blue-400 hover:text-blue-700 dark:text-blue-300 hover:underline font-medium"
                >
                  Registra tu iglesia aquí
                </Link>
              </p>
              <p className="text-xs text-muted-foreground">
                ¿Necesitas ayuda?{" "}
                <a
                  href="#"
                  className="text-blue-700 dark:text-blue-400 hover:text-blue-700 dark:text-blue-300 hover:underline font-medium"
                >
                  Contacta al administrador
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer text */}
        <p className="mt-8 text-center text-sm text-muted-foreground">
          © 2026 Sistema de Control Eclesiástico. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}

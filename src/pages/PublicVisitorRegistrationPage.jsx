import {useEffect, useState} from "react";
import {useParams} from "react-router-dom";
import {Button} from "@/components/ui/Button";
import {Input} from "@/components/ui/Input";
import {
  Church,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Ban,
} from "lucide-react";

// Hermana de PublicMemberRegistrationPage.jsx — mismo patrón, mismo join_code,
// distinto endpoint y campos (ver ese archivo para el razonamiento completo).
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const emptyForm = () => ({
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  address: "",
  birthDate: "",
  gender: "",
  howTheyCame: "",
  invitedBy: "",
  notes: "",
});

const HOW_THEY_CAME_OPTIONS = [
  {value: "", label: "Sin especificar"},
  {value: "INVITADO", label: "Invitado por alguien"},
  {value: "REDES_SOCIALES", label: "Redes sociales"},
  {value: "PASO_POR_AQUI", label: "Pasaba por aquí"},
  {value: "BUSQUEDA_WEB", label: "Búsqueda web"},
  {value: "OTRO", label: "Otro"},
];

export default function PublicVisitorRegistrationPage() {
  const {joinCode} = useParams();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [church, setChurch] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/public/church/${joinCode}`);
        if (!res.ok) {
          setNotFound(true);
        } else {
          const body = await res.json();
          setChurch(body.church);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [joinCode]);

  const set = (k, v) => setForm((f) => ({...f, [k]: v}));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.firstName.trim()) return setError("Tu nombre es obligatorio.");
    if (!form.lastName.trim()) return setError("Tu apellido es obligatorio.");
    if (!form.birthDate) return setError("La fecha de nacimiento es obligatoria.");
    if (!form.gender) return setError("El género es obligatorio.");

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/public/self-register/visitor/${joinCode}`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          address: form.address.trim() || undefined,
          birthDate: form.birthDate,
          gender: form.gender,
          howTheyCame: form.howTheyCame || undefined,
          invitedBy: form.invitedBy.trim() || undefined,
          notes: form.notes.trim() || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "No se pudo completar el registro. Intenta de nuevo.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("No se pudo conectar con el servidor. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="surface-public min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="surface-public min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-background p-4">
        <div className="text-center max-w-sm">
          <Ban className="w-10 h-10 mx-auto mb-4 text-muted-foreground opacity-40" />
          <h1 className="text-lg font-bold text-foreground mb-1">Link no válido</h1>
          <p className="text-sm text-muted-foreground">
            Este link de registro no existe o ya no está disponible. Verifica que lo copiaste completo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-public min-h-screen bg-gradient-to-br from-background via-muted to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          {church.logoUrl ? (
            <img
              src={church.logoUrl}
              alt={church.name}
              className="w-16 h-16 rounded-2xl object-cover mx-auto mb-3 shadow-lg"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center mx-auto mb-3 shadow-lg">
              <Church className="w-7 h-7 text-white" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-foreground mt-1">{church.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">¡Bienvenido! Cuéntanos de ti</p>
        </div>

        {success ? (
          <div className="bg-card border border-emerald-500/30 rounded-2xl p-6 text-center shadow-xl">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-600 dark:text-emerald-400" />
            <p className="text-foreground font-semibold">¡Gracias por visitarnos, {form.firstName}!</p>
            <p className="text-sm text-muted-foreground mt-2">
              Nos alegra que estés aquí. Tus datos quedaron registrados.
            </p>
            <button
              onClick={() => {
                setForm(emptyForm());
                setSuccess(false);
              }}
              className="mt-4 text-sm font-medium text-blue-700 dark:text-blue-400 hover:underline"
            >
              Registrar a otra persona
            </button>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
            <p className="text-sm text-muted-foreground mb-4">
              Nos encantaría conocerte mejor — puedes dejar en blanco lo que no sepas ahora, salvo los campos marcados con *.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                    Nombre *
                  </label>
                  <Input
                    value={form.firstName}
                    onChange={(e) => set("firstName", e.target.value)}
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                    Apellido *
                  </label>
                  <Input
                    value={form.lastName}
                    onChange={(e) => set("lastName", e.target.value)}
                    className="bg-background border-border text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                    Teléfono
                  </label>
                  <Input
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="Opcional"
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="Opcional"
                    className="bg-background border-border text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                    Fecha de nacimiento *
                  </label>
                  <Input
                    type="date"
                    value={form.birthDate}
                    onChange={(e) => set("birthDate", e.target.value)}
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                    Género *
                  </label>
                  <select
                    value={form.gender}
                    onChange={(e) => set("gender", e.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">Selecciona...</option>
                    <option value="MASCULINO">Masculino</option>
                    <option value="FEMENINO">Femenino</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                  ¿Cómo llegaste a nosotros?
                </label>
                <select
                  value={form.howTheyCame}
                  onChange={(e) => set("howTheyCame", e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {HOW_THEY_CAME_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {form.howTheyCame === "INVITADO" && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                    ¿Quién te invitó?
                  </label>
                  <Input
                    value={form.invitedBy}
                    onChange={(e) => set("invitedBy", e.target.value)}
                    className="bg-background border-border text-foreground"
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                  Dirección
                </label>
                <Input
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder="Opcional"
                  className="bg-background border-border text-foreground"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                  ¿Algo más que quieras contarnos?
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                  placeholder="Opcional"
                />
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Enviando…" : "Enviar mis datos"}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

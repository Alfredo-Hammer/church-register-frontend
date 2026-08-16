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

// Página pública, sin sesión — la iglesia comparte este link (o su QR) para
// que un miembro complete sus propios datos desde el celular. Usa el mismo
// join_code que la app móvil ("unirme con código de iglesia"): reusar ese
// código en vez de inventar un token nuevo significa que regenerarlo desde
// Configuración invalida las tres cosas a la vez. Por eso fetch crudo en vez
// del cliente axios: ese adjunta el token de sesión de quien esté logeado en
// este navegador, y acá no aplica.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const emptyForm = () => ({
  firstName: "",
  lastName: "",
  birthDate: "",
  gender: "",
  ageGroup: "ADULTO",
  documentId: "",
  maritalStatus: "",
  occupation: "",
  guardianName: "",
  grade: "",
  allergies: "",
  emergencyContact: "",
  email: "",
  phone: "",
  address: "",
  memberSince: "",
});

const MARITAL_OPTIONS = [
  {value: "", label: "Sin especificar"},
  {value: "SOLTERO", label: "Soltero/a"},
  {value: "CASADO", label: "Casado/a"},
  {value: "DIVORCIADO", label: "Divorciado/a"},
  {value: "VIUDO", label: "Viudo/a"},
  {value: "UNION_LIBRE", label: "Unión libre"},
];

export default function PublicMemberRegistrationPage() {
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
  const showChildFields = form.ageGroup === "NIÑO" || form.ageGroup === "JOVEN";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.firstName.trim()) return setError("Tu nombre es obligatorio.");
    if (!form.lastName.trim()) return setError("Tu apellido es obligatorio.");

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/public/self-register/member/${joinCode}`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          birthDate: form.birthDate || undefined,
          gender: form.gender || undefined,
          ageGroup: form.ageGroup,
          documentId: form.documentId.trim() || undefined,
          maritalStatus: form.maritalStatus || undefined,
          occupation: form.occupation.trim() || undefined,
          guardianName: showChildFields ? form.guardianName.trim() || undefined : undefined,
          grade: showChildFields ? form.grade.trim() || undefined : undefined,
          allergies: showChildFields ? form.allergies.trim() || undefined : undefined,
          emergencyContact: showChildFields ? form.emergencyContact.trim() || undefined : undefined,
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          address: form.address.trim() || undefined,
          memberSince: form.memberSince || undefined,
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
        {/* Encabezado con la iglesia */}
        <div className="text-center mb-6">
          {church.logoUrl ? (
            <img
              src={church.logoUrl}
              alt={church.name}
              className="w-16 h-16 rounded-2xl object-cover mx-auto mb-3 shadow-lg"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mx-auto mb-3 shadow-lg">
              <Church className="w-7 h-7 text-white" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-foreground mt-1">{church.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">Ficha de Registro de Miembro</p>
        </div>

        {success ? (
          <div className="bg-card border border-emerald-500/30 rounded-2xl p-6 text-center shadow-xl">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-600 dark:text-emerald-400" />
            <p className="text-foreground font-semibold">¡Gracias, {form.firstName}!</p>
            <p className="text-sm text-muted-foreground mt-2">
              Tus datos quedaron registrados. El equipo de la iglesia los revisará pronto.
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
              Completa tus datos con calma — puedes dejar en blanco lo que no sepas ahora.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                    Fecha de nacimiento
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
                    Género
                  </label>
                  <select
                    value={form.gender}
                    onChange={(e) => set("gender", e.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">Sin especificar</option>
                    <option value="MASCULINO">Masculino</option>
                    <option value="FEMENINO">Femenino</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                  Categoría de edad
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {value: "ADULTO", label: "Adulto"},
                    {value: "JOVEN", label: "Joven"},
                    {value: "NIÑO", label: "Niño"},
                  ].map(({value, label}) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => set("ageGroup", value)}
                      className={`py-2.5 px-2 rounded-xl border text-sm font-medium transition-all ${
                        form.ageGroup === value
                          ? "bg-blue-500/15 border-blue-500/50 text-blue-700 dark:text-blue-300"
                          : "bg-secondary border-border text-muted-foreground hover:border-primary"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                  Documento de identidad{" "}
                  <span className="font-normal">(cédula, DNI, pasaporte)</span>
                </label>
                <Input
                  value={form.documentId}
                  onChange={(e) => set("documentId", e.target.value)}
                  placeholder="Opcional"
                  className="bg-background border-border text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                    Estado civil
                  </label>
                  <select
                    value={form.maritalStatus}
                    onChange={(e) => set("maritalStatus", e.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {MARITAL_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                    Ocupación
                  </label>
                  <Input
                    value={form.occupation}
                    onChange={(e) => set("occupation", e.target.value)}
                    placeholder="Opcional"
                    className="bg-background border-border text-foreground"
                  />
                </div>
              </div>

              {showChildFields && (
                <div className="space-y-4 border border-border rounded-xl p-3 bg-muted/40">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Datos de menor de edad
                  </p>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                      Nombre del Padre / Tutor
                    </label>
                    <Input
                      value={form.guardianName}
                      onChange={(e) => set("guardianName", e.target.value)}
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                  {form.ageGroup === "NIÑO" && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                        Grado escolar
                      </label>
                      <Input
                        value={form.grade}
                        onChange={(e) => set("grade", e.target.value)}
                        className="bg-background border-border text-foreground"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                      Alergias / Condiciones médicas
                    </label>
                    <Input
                      value={form.allergies}
                      onChange={(e) => set("allergies", e.target.value)}
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                      Contacto de emergencia
                    </label>
                    <Input
                      value={form.emergencyContact}
                      onChange={(e) => set("emergencyContact", e.target.value)}
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                </div>
              )}

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

              <div className="grid grid-cols-2 gap-4">
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
                    Miembro desde
                  </label>
                  <Input
                    type="date"
                    value={form.memberSince}
                    onChange={(e) => set("memberSince", e.target.value)}
                    className="bg-background border-border text-foreground"
                  />
                </div>
              </div>

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

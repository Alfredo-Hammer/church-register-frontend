import {useEffect, useState} from "react";
import {useParams} from "react-router-dom";
import {Button} from "@/components/ui/Button";
import {Input} from "@/components/ui/Input";
import {
  Church,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Ban,
  Baby,
  GraduationCap,
  User,
} from "lucide-react";

// Página pública, sin sesión — la comparte la iglesia anfitriona con las
// iglesias invitadas para que registren a sus miembros de antemano. Por eso
// usa fetch crudo en vez del cliente axios de la app: ese adjunta el token
// de sesión de quien esté logeado en este navegador y no aplica aquí.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const fmtFecha = (iso) =>
  new Date(iso.slice(0, 10) + "T12:00:00").toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const AGE_GROUPS = [
  {value: "ADULTO", label: "Adulto", icon: null},
  {value: "JOVEN", label: "Joven", icon: GraduationCap},
  {value: "NIÑO", label: "Niño", icon: Baby},
];

const emptyForm = () => ({
  fullName: "",
  originChurch: "",
  city: "",
  phone: "",
  birthDate: "",
  gender: "",
  ageGroup: "ADULTO",
});

export default function PublicConferenceRegistrationPage() {
  const {token} = useParams();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [data, setData] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [useOtherChurch, setUseOtherChurch] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/public/registration/${token}`);
        if (!res.ok) {
          setNotFound(true);
        } else {
          setData(await res.json());
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const set = (k, v) => setForm((f) => ({...f, [k]: v}));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.fullName.trim()) return setError("Tu nombre completo es obligatorio.");
    if (!form.originChurch.trim()) return setError("El nombre de tu iglesia es obligatorio.");

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/public/registration/${token}`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          originChurch: form.originChurch.trim(),
          city: form.city.trim() || undefined,
          phone: form.phone.trim() || undefined,
          birthDate: form.birthDate || undefined,
          gender: form.gender || undefined,
          ageGroup: form.ageGroup,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "No se pudo completar el registro. Intenta de nuevo.");
      } else {
        setSuccess(body);
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

  const {conference, church} = data;

  return (
    <div className="surface-public min-h-screen bg-gradient-to-br from-background via-muted to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Encabezado: iglesia anfitriona + conferencia */}
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
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {church.name}
          </p>
          <h1 className="text-2xl font-bold text-foreground mt-1">{conference.name}</h1>
          <div className="flex items-center justify-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {fmtFecha(conference.startDate)} – {fmtFecha(conference.endDate)}
            </span>
            {conference.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {conference.location}
              </span>
            )}
          </div>
        </div>

        {conference.closed ? (
          <div className="bg-card border border-border rounded-2xl p-6 text-center shadow-xl">
            <Ban className="w-8 h-8 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-foreground font-semibold">Las inscripciones anticipadas están cerradas.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Consulta con la iglesia anfitriona sobre el registro el día del evento.
            </p>
          </div>
        ) : success ? (
          <div className="bg-card border border-emerald-500/30 rounded-2xl p-6 text-center shadow-xl">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-600 dark:text-emerald-400" />
            <p className="text-foreground font-semibold">¡{success.registration.full_name} está registrado!</p>
            <p className="text-sm text-muted-foreground mt-2">{success.message}</p>
            <button
              onClick={() => {
                setForm(emptyForm());
                setSuccess(null);
              }}
              className="mt-4 text-sm font-medium text-blue-700 dark:text-blue-400 hover:underline"
            >
              Registrar a otra persona
            </button>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
            <p className="text-sm text-muted-foreground mb-4">
              Regístrate desde ahora — al llegar solo tienes que dar tu nombre para recoger tu gafete.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                  Nombre completo *
                </label>
                <Input
                  value={form.fullName}
                  onChange={(e) => set("fullName", e.target.value)}
                  placeholder="Tu nombre completo"
                  className="bg-background border-border text-foreground"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                  Tu iglesia *
                </label>
                {data.participatingChurches?.length > 0 && !useOtherChurch ? (
                  <>
                    <select
                      value={form.originChurch}
                      onChange={(e) => {
                        if (e.target.value === "__OTHER__") {
                          setUseOtherChurch(true);
                          set("originChurch", "");
                        } else {
                          set("originChurch", e.target.value);
                        }
                      }}
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="" disabled>Selecciona tu iglesia…</option>
                      {data.participatingChurches.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                      <option value="__OTHER__">Otra (no está en la lista)</option>
                    </select>
                  </>
                ) : (
                  <>
                    <Input
                      value={form.originChurch}
                      onChange={(e) => set("originChurch", e.target.value)}
                      placeholder="Nombre de tu iglesia"
                      className="bg-background border-border text-foreground"
                    />
                    {data.participatingChurches?.length > 0 && (
                      <button
                        type="button"
                        onClick={() => { setUseOtherChurch(false); set("originChurch", ""); }}
                        className="text-xs text-blue-700 dark:text-blue-400 hover:underline mt-1.5"
                      >
                        Elegir de la lista
                      </button>
                    )}
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                    Ciudad
                  </label>
                  <Input
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                    placeholder="Opcional"
                    className="bg-background border-border text-foreground"
                  />
                </div>
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
                    Sexo
                  </label>
                  <select
                    value={form.gender}
                    onChange={(e) => set("gender", e.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">Sin especificar</option>
                    <option value="MASCULINO">Masculino</option>
                    <option value="FEMENINO">Femenino</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                  Categoría
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {AGE_GROUPS.map(({value, label, icon: Icon}) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => set("ageGroup", value)}
                      className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border text-sm font-medium transition-all ${
                        form.ageGroup === value
                          ? "bg-blue-500/15 border-blue-500/50 text-blue-700 dark:text-blue-300"
                          : "bg-secondary border-border text-muted-foreground hover:border-primary"
                      }`}
                    >
                      {Icon ? <Icon className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Registrando…" : "Confirmar registro"}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

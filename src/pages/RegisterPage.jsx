import React, { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/Input";
import {
  Church,
  Mail,
  Lock,
  User,
  Building2,
  AlertCircle,
  CheckCircle,
  Phone,
  MapPin,
  Globe,
  Eye,
  EyeOff,
  Camera,
  X,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Calendar,
  Hash,
  Image,
} from "lucide-react";
import api from "@/services/api";

// ─── Denominaciones ────────────────────────────────────────────────────────────
const DENOMINATIONS = [
  "Bautista",
  "Pentecostal",
  "Evangélica",
  "Católica",
  "Adventista",
  "Presbiteriana",
  "Metodista",
  "Luterana",
  "Anglicana",
  "Carismática",
  "Morava",
  "No Denominacional",
  "Otra",
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// ─── Step indicator ────────────────────────────────────────────────────────────
function StepIndicator({ step }) {
  const steps = [
    { n: 1, label: "Iglesia" },
    { n: 2, label: "Administrador" },
  ];
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300
                ${step > s.n
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                  : step === s.n
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-4 ring-blue-500/20"
                  : "bg-slate-700 text-gray-500"}`}
            >
              {step > s.n ? <CheckCircle className="w-5 h-5" /> : s.n}
            </div>
            <span className={`text-xs font-medium ${step >= s.n ? "text-white" : "text-gray-500"}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-20 h-0.5 mb-5 mx-1 transition-all duration-300 ${step > 1 ? "bg-emerald-500" : "bg-slate-700"}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Logo uploader ─────────────────────────────────────────────────────────────
function LogoUploader({ logo, onChange }) {
  const inputRef = useRef();
  const [drag, setDrag] = useState(false);

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("La imagen debe pesar menos de 2MB.");
      return;
    }
    const b64 = await toBase64(file);
    onChange(b64);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="flex flex-col items-center gap-1.5 shrink-0">
      <div
        className={`relative w-20 h-20 rounded-xl border-2 border-dashed cursor-pointer overflow-hidden transition-all duration-200 group
          ${drag
            ? "border-blue-400 bg-blue-500/10 scale-105"
            : logo
            ? "border-slate-600 bg-slate-700/30 hover:border-blue-500"
            : "border-slate-600 bg-slate-700/40 hover:border-blue-500 hover:bg-blue-500/5"}`}
        onClick={() => inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
      >
        {logo ? (
          <>
            <img src={logo} alt="Logo" className="w-full h-full object-contain p-1.5" />
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-1">
            <Camera className="w-6 h-6 text-gray-500 group-hover:text-blue-400 transition-colors" />
            <span className="text-[10px] text-gray-500 group-hover:text-blue-400 transition-colors font-medium leading-tight text-center px-1">
              Logo
            </span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files[0])}
      />
      <p className="text-[10px] text-gray-600 text-center leading-tight">
        PNG · JPG<br />máx. 2MB
      </p>
    </div>
  );
}

// ─── Field helper ──────────────────────────────────────────────────────────────
function Field({ label, required, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-300">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

function IconInput({ icon: Icon, ...props }) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <Input {...props} className={`pl-9 bg-slate-700/60 border-slate-600 text-white placeholder-gray-500 focus:border-blue-500 ${props.className || ""}`} />
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Church fields
  const [logo, setLogo] = useState(null);
  const [churchName, setChurchName] = useState("");
  const [denomination, setDenomination] = useState("");
  const [pastorName, setPastorName] = useState("");
  const [foundedYear, setFoundedYear] = useState("");
  const [churchCity, setChurchCity] = useState("");
  const [churchCountry, setChurchCountry] = useState("República Dominicana");
  const [churchAddress, setChurchAddress] = useState("");
  const [churchPhone, setChurchPhone] = useState("");
  const [churchEmail, setChurchEmail] = useState("");
  const [churchWebsite, setChurchWebsite] = useState("");
  const [churchDescription, setChurchDescription] = useState("");

  // Admin fields
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ─── Step 1 validation ──────────────────────────────────────────────────────
  const validateStep1 = () => {
    if (!churchName.trim()) {
      setError("El nombre de la iglesia es obligatorio.");
      return false;
    }
    setError("");
    return true;
  };

  const goToStep2 = () => {
    if (validateStep1()) setStep(2);
  };

  // ─── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!adminName.trim()) return setError("El nombre del administrador es obligatorio.");
    if (!adminEmail.trim()) return setError("El correo del administrador es obligatorio.");
    if (password.length < 6) return setError("La contraseña debe tener al menos 6 caracteres.");
    if (password !== confirmPassword) return setError("Las contraseñas no coinciden.");

    setLoading(true);
    try {
      await api.post("/auth/register-church", {
        churchName,
        churchAddress: churchAddress || undefined,
        churchPhone:   churchPhone   || undefined,
        churchEmail:   churchEmail   || undefined,
        churchWebsite: churchWebsite || undefined,
        churchDenomination: denomination || undefined,
        churchDescription:  churchDescription || undefined,
        churchCity:    churchCity    || undefined,
        churchCountry: churchCountry || undefined,
        pastorName:    pastorName    || undefined,
        foundedYear:   foundedYear   || undefined,
        logoBase64:    logo          || undefined,
        adminName,
        adminEmail,
        adminPassword: password,
      });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Error al registrar la iglesia. Intente de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Success screen ─────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-24 h-24 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-6 animate-pulse">
            <CheckCircle className="w-12 h-12 text-emerald-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">¡Bienvenido!</h2>
          <p className="text-gray-300 mb-2 font-medium">{churchName}</p>
          <p className="text-gray-400 text-sm mb-6">
            Tu iglesia ha sido registrada exitosamente. Serás redirigido al inicio de sesión en unos segundos.
          </p>
          <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full animate-[progress_3s_ease-in-out_forwards]" style={{ width: "100%", animation: "width 3s linear" }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-8 px-4">
      <div className="relative w-full max-w-2xl mx-auto">
        {/* Header compacto */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Registra tu Iglesia</h1>
            <p className="text-gray-400 text-sm mt-0.5">Comienza a gestionar tu comunidad hoy</p>
          </div>
          <Link to="/login" className="text-sm text-blue-400 hover:text-blue-300 font-medium">
            Iniciar sesión
          </Link>
        </div>

        {/* Step indicator */}
        <StepIndicator step={step} />

        {/* Card */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden">
          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-3 px-6 pt-5 pb-0">
              <div className="flex items-start gap-3 w-full bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* ── STEP 1: CHURCH INFO ─────────────────────────────────────────── */}
          {step === 1 && (
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-700/50">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-white font-semibold">Información de la Iglesia</h2>
                  <p className="text-gray-500 text-xs">Los campos marcados con * son obligatorios</p>
                </div>
              </div>

              {/* Logo + nombre + denominación en una fila */}
              <div className="flex gap-4 items-start">
                {/* Logo compacto */}
                <LogoUploader logo={logo} onChange={setLogo} />

                {/* Nombre + denominación apilados */}
                <div className="flex-1 space-y-3">
                  <Field label="Nombre de la Iglesia" required>
                    <IconInput
                      icon={Building2}
                      placeholder="Iglesia Cristiana Vida Nueva"
                      value={churchName}
                      onChange={(e) => setChurchName(e.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Denominación">
                    <div className="relative">
                      <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <select
                        value={denomination}
                        onChange={(e) => setDenomination(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-700/60 border border-slate-600 text-white rounded-md text-sm focus:outline-none focus:border-blue-500 appearance-none"
                      >
                        <option value="">— Seleccionar —</option>
                        {DENOMINATIONS.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </Field>
                </div>
              </div>

              {/* Pastor + founded year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Pastor Principal">
                  <IconInput
                    icon={User}
                    placeholder="Nombre del pastor"
                    value={pastorName}
                    onChange={(e) => setPastorName(e.target.value)}
                  />
                </Field>
                <Field label="Año de Fundación">
                  <IconInput
                    icon={Calendar}
                    type="number"
                    placeholder={`Ej: ${new Date().getFullYear()}`}
                    min="1800"
                    max={new Date().getFullYear()}
                    value={foundedYear}
                    onChange={(e) => setFoundedYear(e.target.value)}
                  />
                </Field>
              </div>

              {/* City + country */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Ciudad">
                  <IconInput
                    icon={MapPin}
                    placeholder="Santo Domingo"
                    value={churchCity}
                    onChange={(e) => setChurchCity(e.target.value)}
                  />
                </Field>
                <Field label="País">
                  <IconInput
                    icon={Globe}
                    placeholder="República Dominicana"
                    value={churchCountry}
                    onChange={(e) => setChurchCountry(e.target.value)}
                  />
                </Field>
              </div>

              {/* Address */}
              <Field label="Dirección">
                <IconInput
                  icon={MapPin}
                  placeholder="Av. Principal #123, Sector, Ciudad"
                  value={churchAddress}
                  onChange={(e) => setChurchAddress(e.target.value)}
                />
              </Field>

              {/* Phone + email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Teléfono">
                  <IconInput
                    icon={Phone}
                    type="tel"
                    placeholder="+1 (809) 000-0000"
                    value={churchPhone}
                    onChange={(e) => setChurchPhone(e.target.value)}
                  />
                </Field>
                <Field label="Correo de la Iglesia">
                  <IconInput
                    icon={Mail}
                    type="email"
                    placeholder="info@miglesia.com"
                    value={churchEmail}
                    onChange={(e) => setChurchEmail(e.target.value)}
                  />
                </Field>
              </div>

              {/* Website */}
              <Field label="Sitio Web">
                <IconInput
                  icon={Globe}
                  type="url"
                  placeholder="https://www.miglesia.com"
                  value={churchWebsite}
                  onChange={(e) => setChurchWebsite(e.target.value)}
                />
              </Field>

              {/* Description */}
              <Field label="Visión / Descripción">
                <textarea
                  rows={3}
                  placeholder="Describe brevemente la misión y visión de tu iglesia..."
                  value={churchDescription}
                  onChange={(e) => setChurchDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700/60 border border-slate-600 text-white placeholder-gray-500 rounded-md text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </Field>

              {/* Next button */}
              <button
                type="button"
                onClick={goToStep2}
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
              >
                Continuar
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* ── STEP 2: ADMIN ACCOUNT ───────────────────────────────────────── */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-700/50">
                <div className="w-8 h-8 rounded-lg bg-emerald-600/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-white font-semibold">Cuenta del Administrador</h2>
                  <p className="text-gray-500 text-xs">Estas credenciales serán para acceder al sistema</p>
                </div>
              </div>

              {/* Church summary */}
              <div className="bg-slate-700/40 border border-slate-600/50 rounded-xl px-4 py-3 flex items-center gap-3">
                {logo
                  ? <img src={logo} alt="Logo" className="w-10 h-10 rounded-lg object-contain bg-white/5 p-0.5" />
                  : <div className="w-10 h-10 rounded-lg bg-slate-600 flex items-center justify-center">
                      <Church className="w-5 h-5 text-gray-400" />
                    </div>
                }
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{churchName}</p>
                  <p className="text-gray-400 text-xs">{denomination || "Sin denominación especificada"}{churchCity ? ` · ${churchCity}` : ""}</p>
                </div>
                <button type="button" onClick={() => { setStep(1); setError(""); }}
                  className="ml-auto text-blue-400 hover:text-blue-300 text-xs font-medium whitespace-nowrap flex items-center gap-1">
                  <ChevronLeft className="w-3.5 h-3.5" />Editar
                </button>
              </div>

              {/* Admin name */}
              <Field label="Nombre Completo del Administrador" required>
                <IconInput
                  icon={User}
                  placeholder="Juan Pérez"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </Field>

              {/* Admin email */}
              <Field label="Correo de Acceso" required>
                <IconInput
                  icon={Mail}
                  type="email"
                  placeholder="admin@miglesia.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </Field>

              {/* Password */}
              <Field label="Contraseña" required>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <Input
                    type={showPass ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="pl-9 pr-10 bg-slate-700/60 border-slate-600 text-white placeholder-gray-500 focus:border-blue-500"
                  />
                  <button type="button" onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password && (
                  <PasswordStrength password={password} />
                )}
              </Field>

              {/* Confirm password */}
              <Field label="Confirmar Contraseña" required>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <Input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repite tu contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className={`pl-9 pr-10 bg-slate-700/60 border-slate-600 text-white placeholder-gray-500 focus:border-blue-500
                      ${confirmPassword && (confirmPassword === password ? "border-emerald-500 focus:border-emerald-500" : "border-red-500 focus:border-red-500")}`}
                  />
                  <button type="button" onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-xs text-red-400 mt-1">Las contraseñas no coinciden</p>
                )}
              </Field>

              {/* Action buttons */}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setStep(1); setError(""); }}
                  className="flex-1 h-11 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors">
                  <ChevronLeft className="w-4 h-4" />Atrás
                </button>
                <button type="submit" disabled={loading}
                  className="flex-[2] h-11 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20">
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Registrando...</>
                    : <><CheckCircle className="w-5 h-5" />Registrar Iglesia</>}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-600 mt-4 pb-4">
          Al registrarte, aceptas nuestros términos de servicio y política de privacidad
        </p>
      </div>
    </div>
  );
}

// ─── Password strength meter ───────────────────────────────────────────────────
function PasswordStrength({ password }) {
  const checks = [
    { label: "Al menos 6 caracteres", ok: password.length >= 6 },
    { label: "Letras mayúsculas",      ok: /[A-Z]/.test(password) },
    { label: "Números",                ok: /\d/.test(password) },
    { label: "Caracteres especiales",  ok: /[^a-zA-Z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-emerald-500"];
  const labels = ["Muy débil", "Débil", "Moderada", "Fuerte"];

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < score ? colors[score - 1] : "bg-slate-600"}`} />
        ))}
      </div>
      <p className={`text-xs font-medium ${score < 2 ? "text-red-400" : score < 3 ? "text-yellow-400" : "text-emerald-400"}`}>
        {labels[score - 1] || "Muy débil"}
      </p>
    </div>
  );
}

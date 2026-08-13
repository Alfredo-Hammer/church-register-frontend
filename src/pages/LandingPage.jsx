import React from "react";
import {Link} from "react-router-dom";
import {
  Church,
  Users,
  UserSearch,
  UserPlus,
  UsersRound,
  Crown,
  CheckSquare,
  CalendarDays,
  ClipboardList,
  Rocket,
  DollarSign,
  Heart,
  Droplet,
  Wine,
  Flame,
  FileText,
  BarChart3,
  ShieldCheck,
  Lock,
  History,
  Printer,
  Languages,
  Moon,
  Sun,
  ArrowRight,
  Check,
  Search,
  TrendingUp,
} from "lucide-react";
import {Button} from "@/components/ui/Button";
import {useTheme} from "@/contexts/ThemeContext";

// Foto de comunidad: aquí una imagen de personas sí aporta. El hero, en
// cambio, muestra el producto (ver <AppPreview/>): a un visitante le dice
// mucho más ver la aplicación que una foto de archivo.
const COMMUNITY_IMAGE =
  "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=1200&q=80";

// Los módulos listados son los que el sistema realmente incluye (uno por
// página en src/pages/). Si se agrega o quita un módulo, actualizar también
// esta lista para que la landing no prometa de más.
const MODULES = [
  {icon: Users, name: "Miembros", desc: "Ficha completa, foto, notas pastorales y categoría por edad."},
  {icon: UserSearch, name: "Visitantes", desc: "Seguimiento por etapas hasta integrarlos como miembros."},
  {icon: UserPlus, name: "Familias", desc: "Agrupa miembros por núcleo familiar y parentesco."},
  {icon: UsersRound, name: "Grupos y ministerios", desc: "Integrantes, actividades y finanzas de cada grupo."},
  {icon: Crown, name: "Líderes", desc: "Cargos por grupo, con autorización pastoral registrada."},
  {icon: CheckSquare, name: "Asistencia", desc: "Registro por evento, con invitados y comparativas."},
  {icon: CalendarDays, name: "Eventos", desc: "Cultos, reuniones, especiales y conferencias."},
  {icon: ClipboardList, name: "Programa de culto", desc: "Orden litúrgico reordenable, de borrador a publicado."},
  {icon: Rocket, name: "Actividades", desc: "Proyectos, recolecciones y servicio comunitario."},
  {icon: DollarSign, name: "Finanzas", desc: "Ingresos, egresos y categorías con exportación."},
  {icon: Heart, name: "Donaciones", desc: "Diezmos, ofrendas, misiones y ofrendas especiales."},
  {icon: Droplet, name: "Bautismos", desc: "Registro histórico con certificado imprimible."},
  {icon: Wine, name: "Santa Cena", desc: "Participantes por celebración y conteo de invitados."},
  {icon: Flame, name: "Días de oración", desc: "Días recurrentes, asistencia y reportes por período."},
  {icon: FileText, name: "Cartas de referencia", desc: "Membresía, buena conducta, traslado, visa y más."},
  {icon: BarChart3, name: "Reportes", desc: "Gráficos y estadísticas de toda la congregación."},
];

// Diferenciadores concretos y verificables en el producto. Evitar aquí
// afirmaciones genéricas del tipo "diseño moderno": no distinguen nada.
const PILLARS = [
  {
    icon: Languages,
    title: "Pensado y escrito en español",
    desc: "No es una traducción. Los términos son los que tu congregación ya usa: culto, diezmo, ofrenda, santa cena, ujier, discipulado.",
  },
  {
    icon: Lock,
    title: "Los datos de cada iglesia, separados",
    desc: "Cada congregación es un espacio aislado. Ninguna consulta del sistema puede alcanzar la información de otra iglesia, ni por accidente ni a propósito.",
  },
  {
    icon: ShieldCheck,
    title: "Permisos por rol",
    desc: "Administrador, pastor, tesorero y líder ven y hacen cosas distintas. Las finanzas y los documentos oficiales quedan en manos de quien corresponde.",
  },
  {
    icon: History,
    title: "Registro de auditoría",
    desc: "El sistema guarda quién creó, modificó o eliminó cada registro, y cuándo. Las decisiones sensibles quedan documentadas.",
  },
  {
    icon: Printer,
    title: "Listo para imprimir",
    desc: "Certificados de bautismo, cartas de referencia y fichas de miembros salen con el logo de tu iglesia, en formato de papel.",
  },
  {
    icon: TrendingUp,
    title: "Reportes que se arman solos",
    desc: "Asistencia, ingresos, crecimiento y bautismos se calculan con lo que registras a diario. Sin armar planillas aparte.",
  },
];

function ThemeToggle() {
  const {theme, toggleTheme} = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

/**
 * Maqueta de la aplicación construida con los mismos tokens del sistema.
 * Se prefiere sobre una captura de pantalla porque se adapta a claro/oscuro,
 * se ve nítida en cualquier resolución y no queda desactualizada ni depende
 * de un archivo externo. Es decorativa: se oculta a lectores de pantalla.
 */
function AppPreview() {
  const stats = [
    {label: "Miembros", value: "248", tone: "text-blue-700 dark:text-blue-400", bg: "bg-blue-500/10"},
    {label: "Asistencia", value: "186", tone: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-500/10"},
    {label: "Ofrendas", value: "$12.4k", tone: "text-violet-700 dark:text-violet-400", bg: "bg-violet-500/10"},
  ];
  const rows = [
    {ini: "MG", name: "María González", group: "Alabanza", status: "ACTIVO"},
    {ini: "CR", name: "Carlos Ramírez", group: "Jóvenes", status: "ACTIVO"},
    {ini: "AT", name: "Ana Torres", group: "Damas", status: "VISITANTE"},
    {ini: "LF", name: "Lucía Fernández", group: "Niños", status: "ACTIVO"},
  ];
  const badge = {
    ACTIVO: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    VISITANTE: "bg-amber-500/15 text-amber-800 dark:text-amber-400 border-amber-500/30",
  };

  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl select-none"
    >
      {/* Barra de ventana */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <div className="ml-3 flex flex-1 items-center gap-1.5 rounded-md bg-background px-2.5 py-1">
          <Search className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">Buscar…</span>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="hidden w-40 shrink-0 border-r border-border bg-card p-3 sm:block">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600">
              <Church className="h-3.5 w-3.5 text-white" />
            </span>
            <span className="truncate text-[11px] font-bold text-foreground">
              Mi Iglesia
            </span>
          </div>
          {[
            {i: BarChart3, t: "Inicio"},
            {i: Users, t: "Miembros", on: true},
            {i: UserSearch, t: "Visitantes"},
            {i: UsersRound, t: "Grupos"},
            {i: CheckSquare, t: "Asistencia"},
            {i: DollarSign, t: "Finanzas"},
            {i: Droplet, t: "Bautismos"},
          ].map(({i: Icon, t, on}) => (
            <div
              key={t}
              className={`mb-0.5 flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] ${
                on
                  ? "bg-blue-600 font-medium text-white"
                  : "text-muted-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {t}
            </div>
          ))}
        </div>

        {/* Contenido */}
        <div className="min-w-0 flex-1 bg-background p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">Miembros</p>
              <p className="text-[10px] text-muted-foreground">
                248 registrados
              </p>
            </div>
            <span className="rounded-md bg-blue-600 px-2.5 py-1 text-[10px] font-medium text-white">
              + Nuevo
            </span>
          </div>

          <div className="mb-3 grid grid-cols-3 gap-2">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-lg border border-border bg-card p-2.5"
              >
                <div className={`mb-1 h-1 w-6 rounded-full ${s.bg}`} />
                <p className={`text-base font-bold ${s.tone}`}>{s.value}</p>
                <p className="text-[9px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-card">
            {rows.map((r, idx) => (
              <div
                key={r.name}
                className={`flex items-center gap-2.5 px-3 py-2 ${
                  idx > 0 ? "border-t border-border" : ""
                }`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-[9px] font-bold text-white">
                  {r.ini}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium text-foreground">
                    {r.name}
                  </p>
                  <p className="text-[9px] text-muted-foreground">{r.group}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-semibold ${badge[r.status]}`}
                >
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="surface-public min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600">
              <Church className="h-5 w-5 text-white" />
            </span>
            {/* En móvil no cabe junto al toggle y el botón: queda solo el
                icono, y el nombre lo retoma el titular del hero */}
            <span className="hidden truncate font-bold text-foreground sm:inline">
              CONGREGA
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <Link to="/login">
              <Button variant="ghost" className="text-foreground">
                Iniciar sesión
              </Button>
            </Link>
            <Link to="/register" className="hidden sm:block">
              <Button className="bg-blue-600 text-white hover:bg-blue-700">
                Registra tu iglesia
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.16),_transparent_55%)]"
          />
          <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
            <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr]">
              <div className="text-center lg:text-left">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
                  <Languages className="h-3.5 w-3.5" />
                  Pensado y escrito en español
                </span>

                <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground text-balance sm:text-5xl lg:text-6xl">
                  La administración de tu iglesia,{" "}
                  <span className="text-blue-700 dark:text-blue-400">
                    en un solo lugar
                  </span>
                </h1>

                <p className="mt-5 max-w-xl text-lg text-muted-foreground text-pretty lg:max-w-none">
                  Miembros, visitantes, finanzas, asistencia y bautismos, con la
                  historia de tu congregación guardada y a la mano. Deja las
                  hojas de cálculo y los cuadernos.
                </p>

                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                  <Link to="/register">
                    <Button
                      size="lg"
                      className="w-full gap-2 bg-blue-600 text-white hover:bg-blue-700 sm:w-auto"
                    >
                      Registra tu iglesia gratis
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto">
                      Ya tengo cuenta
                    </Button>
                  </Link>
                </div>

                <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground lg:justify-start">
                  {[
                    "Sin instalar nada",
                    "Funciona desde el celular",
                    "Tema claro y oscuro",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-1.5">
                      <Check className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* El producto, no una foto de archivo */}
              <div className="relative">
                <div
                  aria-hidden="true"
                  className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-blue-500/20 to-transparent blur-3xl"
                />
                <div className="relative">
                  <AppPreview />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Módulos ────────────────────────────────────────────────────── */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Todo lo que una iglesia necesita registrar
              </h2>
              <p className="mt-4 text-muted-foreground text-pretty">
                Dieciséis módulos que cubren la vida de la congregación, desde la
                primera visita de alguien hasta el informe anual.
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {MODULES.map(({icon: Icon, name, desc}) => (
                <div
                  key={name}
                  className="rounded-xl border border-border bg-card p-5 transition-all hover:border-blue-500/50 hover:shadow-md"
                >
                  <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                    <Icon className="h-5 w-5 text-blue-700 dark:text-blue-400" />
                  </span>
                  <h3 className="font-semibold text-foreground">{name}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Diferenciadores ────────────────────────────────────────────── */}
        <section className="border-t border-border bg-muted/40">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Información sensible, tratada como tal
              </h2>
              <p className="mt-4 text-muted-foreground text-pretty">
                Una iglesia guarda datos de familias, de menores y del dinero de
                la congregación. El sistema está construido asumiendo esa
                responsabilidad.
              </p>
            </div>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {PILLARS.map(({icon: Icon, title, desc}) => (
                <div
                  key={title}
                  className="rounded-xl border border-border bg-card p-6"
                >
                  <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500/10">
                    <Icon className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                  </span>
                  <h3 className="font-semibold text-foreground">{title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground text-pretty">
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Comunidad + cómo empezar ───────────────────────────────────── */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div className="overflow-hidden rounded-2xl border border-border">
                <img
                  src={COMMUNITY_IMAGE}
                  alt=""
                  loading="lazy"
                  className="h-72 w-full object-cover lg:h-96"
                />
              </div>

              <div>
                <h2 className="text-3xl font-bold tracking-tight text-foreground text-balance sm:text-4xl">
                  Empezar toma unos minutos
                </h2>
                <p className="mt-4 text-muted-foreground text-pretty">
                  No necesitas instalar nada ni contratar a nadie para
                  configurarlo.
                </p>

                <ol className="mt-8 space-y-5">
                  {[
                    {
                      n: "1",
                      t: "Registra tu iglesia",
                      d: "Creas la cuenta de la congregación y quedas como administrador.",
                    },
                    {
                      n: "2",
                      t: "Carga a tu gente",
                      d: "Agrega miembros, familias y grupos. Invita al equipo con su propio rol.",
                    },
                    {
                      n: "3",
                      t: "Usa el día a día",
                      d: "Registra asistencia, ofrendas y bautismos. Los reportes se arman solos.",
                    },
                  ].map(({n, t, d}) => (
                    <li key={n} className="flex gap-4">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
                        {n}
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground">{t}</h3>
                        <p className="mt-1 text-sm text-muted-foreground text-pretty">
                          {d}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* ── Llamado final ──────────────────────────────────────────────── */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 px-6 py-14 text-center shadow-xl sm:px-12">
              <Church className="mx-auto h-10 w-10 text-white" />
              <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-bold tracking-tight text-white text-balance sm:text-4xl">
                Dedica menos tiempo a la administración y más a las personas
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-blue-50 text-pretty">
                Registra tu congregación y empieza a ordenar la información hoy
                mismo.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link to="/register">
                  <Button
                    size="lg"
                    className="w-full gap-2 bg-white text-blue-700 hover:bg-blue-50 sm:w-auto"
                  >
                    Registra tu iglesia
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button
                    size="lg"
                    variant="ghost"
                    className="w-full border border-white/40 text-white hover:bg-white/10 sm:w-auto"
                  >
                    Iniciar sesión
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <Church className="h-4 w-4" />
            CONGREGA
          </div>
          <div className="flex items-center gap-6">
            <Link to="/login" className="transition-colors hover:text-foreground">
              Iniciar sesión
            </Link>
            <Link
              to="/register"
              className="transition-colors hover:text-foreground"
            >
              Registrar iglesia
            </Link>
          </div>
          <p>© {new Date().getFullYear()} Todos los derechos reservados.</p>
          {/* Developed by Alfredo Hammer */}
          <p className="text-gray-500">Desarrollado por Alfredo Hammer</p>
        </div>
      </footer>
    </div>
  );
}

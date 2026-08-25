import React, {useState, useEffect, useRef, useCallback} from "react";
import {Link, useLocation, useNavigate} from "react-router-dom";
import {toast} from "sonner";
import {useAuth} from "@/contexts/AuthContext";
import {settingsService, searchService} from "@/services/api";
import {
  Home,
  Users,
  UsersRound,
  DollarSign,
  Settings,
  UserCog,
  Menu,
  X,
  LogOut,
  ChevronDown,
  UserPlus,
  CalendarDays,
  CheckSquare,
  Heart,
  Droplet,
  BarChart3,
  Rocket,
  Boxes,
  UserSearch,
  ClipboardList,
  Crown,
  Wine,
  Search,
  Loader2,
  User,
  Flame,
  FileText,
  Scale,
  BookOpen,
  Megaphone,
  Cake,
  Sun,
  Moon,
  Target,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import {Button} from "@/components/ui/Button";
import {ConfirmDialog} from "@/components/ui/ConfirmDialog";
import {useTheme} from "@/contexts/ThemeContext";
import {cn} from "@/lib/utils";

/** Botón para alternar entre tema claro y oscuro */
function ThemeToggle() {
  const {theme, toggleTheme} = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      title={isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      aria-label={isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

const STATUS_COLOR = {
  ACTIVO: "text-green-700 dark:text-green-400",
  INACTIVO: "text-muted-foreground",
  VISITANTE: "text-amber-700 dark:text-yellow-400",
};

const EVENT_TYPE_LABEL = {
  CULTO: "Culto",
  REUNION: "Reunión",
  ESPECIAL: "Especial",
};

function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const navigate = useNavigate();

  const doSearch = useCallback(async (q) => {
    if (q.trim().length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const data = await searchService.search(q.trim(), 5);
      setResults(data.results);
      setOpen(true);
    } catch {
      setResults(null);
    }
    setLoading(false);
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (val.trim().length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(val), 320);
  };

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ⌘K / Ctrl+K abre la búsqueda; Escape la cierra
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setOpen(results ? true : false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [results]);

  const go = (href) => {
    setOpen(false);
    setQuery("");
    setResults(null);
    navigate(href);
  };

  const hasResults =
    results &&
    (results.members?.length ||
      results.families?.length ||
      results.groups?.length ||
      results.events?.length);

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => results && setOpen(true)}
          placeholder="Buscar… (⌘K)"
          className="w-full pl-9 pr-16 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-colors"
        />
        {loading && (
          <Loader2 className="absolute right-3 w-4 h-4 text-muted-foreground animate-spin" />
        )}
        {!loading && query && (
          <button
            onClick={() => {
              setQuery("");
              setResults(null);
              setOpen(false);
            }}
            className="absolute right-3 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {!loading && !query && (
          <kbd className="absolute right-3 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border text-[10px] font-medium text-muted-foreground bg-card pointer-events-none">
            ⌘K
          </kbd>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto">
          {!hasResults ? (
            <p className="text-muted-foreground text-sm px-4 py-5 text-center">
              Sin resultados para "{query}"
            </p>
          ) : (
            <div>
              {results.members?.length > 0 && (
                <section>
                  <p className="px-4 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Miembros
                  </p>
                  {results.members.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => go(`/dashboard/members`)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-foreground">
                          {m.first_name?.[0]}
                          {m.last_name?.[0]}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground font-medium truncate">
                          {m.first_name} {m.last_name}
                        </p>
                        {m.email && (
                          <p className="text-xs text-muted-foreground truncate">
                            {m.email}
                          </p>
                        )}
                      </div>
                      <span
                        className={`text-xs shrink-0 ${STATUS_COLOR[m.status] || "text-muted-foreground"}`}
                      >
                        {m.status}
                      </span>
                    </button>
                  ))}
                </section>
              )}

              {results.families?.length > 0 && (
                <section>
                  <p className="px-4 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Familias
                  </p>
                  {results.families.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => go(`/dashboard/families`)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent transition-colors text-left"
                    >
                      <UserPlus className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm text-foreground">
                        {f.family_name}
                      </span>
                    </button>
                  ))}
                </section>
              )}

              {results.groups?.length > 0 && (
                <section>
                  <p className="px-4 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Grupos
                  </p>
                  {results.groups.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => go(`/dashboard/groups`)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent transition-colors text-left"
                    >
                      <UsersRound className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">{g.name}</p>
                        {g.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {g.description}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </section>
              )}

              {results.events?.length > 0 && (
                <section className="pb-1">
                  <p className="px-4 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Eventos
                  </p>
                  {results.events.map((ev) => (
                    <button
                      key={ev.id}
                      onClick={() => go(`/dashboard/events`)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent transition-colors text-left"
                    >
                      <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">
                          {ev.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {EVENT_TYPE_LABEL[ev.event_type] || ev.event_type} ·{" "}
                          {ev.date?.slice(0, 10)}
                        </p>
                      </div>
                    </button>
                  ))}
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const navigation = [
  {name: "Inicio", href: "/dashboard", icon: Home},
  {name: "Miembros", href: "/dashboard/members", icon: Users},
  {name: "Cumpleaños", href: "/dashboard/birthdays", icon: Cake},
  {name: "Visitantes", href: "/dashboard/visitors", icon: UserSearch},
  {name: "Familias", href: "/dashboard/families", icon: UserPlus},
  {name: "Grupos", href: "/dashboard/groups", icon: UsersRound},
  {name: "Líderes", href: "/dashboard/leaders", icon: Crown},
  {name: "Asistencia", href: "/dashboard/attendance", icon: CheckSquare},
  {name: "Eventos", href: "/dashboard/events", icon: CalendarDays},
  {name: "Programa", href: "/dashboard/programs", icon: ClipboardList},
  {name: "Actividades", href: "/dashboard/activities", icon: Rocket},
  {name: "Planificación", href: "/dashboard/planning", icon: Target},
  {name: "Inventario", href: "/dashboard/inventory", icon: Boxes},
  {name: "Finanzas", href: "/dashboard/finances", icon: DollarSign, roles: ["ADMIN", "PASTOR", "TESORERO"]},
  {name: "Bautismos", href: "/dashboard/baptisms", icon: Droplet},
  {name: "Santa Cena", href: "/dashboard/communion", icon: Wine},
  {name: "Días de Oración", href: "/dashboard/prayer", icon: Flame},
  {name: "Avisos", href: "/dashboard/announcements", icon: Megaphone},
  {name: "Cartas de Referencia", href: "/dashboard/letters", icon: FileText},
  {name: "Normas Internas", href: "/dashboard/normas-internas", icon: Scale},
  {name: "Reportes", href: "/dashboard/reports", icon: BarChart3},
  {name: "Usuarios", href: "/dashboard/users", icon: UserCog},
  {name: "Configuración", href: "/dashboard/settings", icon: Settings},
];

export const DashboardLayout = ({children}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Colapsado (icon-only) es un ajuste de escritorio nomás — en el drawer de
  // móvil no tendría sentido (una pestaña angosta encima del contenido no
  // ahorra nada). Se aplica siempre con clases lg: para que el flag JS no
  // afecte al drawer móvil, que renderiza el mismo DOM. Persiste entre
  // sesiones porque es una preferencia de "cómo quiero mi pantalla", no un
  // estado temporal como el drawer abierto/cerrado.
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("sidebarCollapsed") === "true",
  );
  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", String(collapsed));
  }, [collapsed]);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const headerMenuRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const {user, logout, updateUser} = useAuth();

  // Fetch church logo once if not already in auth context
  useEffect(() => {
    if (user && !user.churchLogo) {
      settingsService
        .getChurch()
        .then((data) => {
          if (data.logoUrl) updateUser({churchLogo: data.logoUrl});
        })
        .catch(() => {});
    }
  }, []);

  // Cerrar el menú del header al hacer clic fuera (queda visible en toda
  // la página, a diferencia del menú del sidebar que vive en un drawer).
  useEffect(() => {
    if (!headerMenuOpen) return;
    const handleClickOutside = (e) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target)) {
        setHeaderMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [headerMenuOpen]);

  const requestLogout = () => {
    setUserMenuOpen(false);
    setHeaderMenuOpen(false);
    setLogoutConfirmOpen(true);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
    toast.success("Sesión cerrada correctamente");
  };

  const initials =
    user?.fullName
      ?.split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar para móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-all duration-300 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "lg:w-20" : "lg:w-64",
        )}
      >
        {/* Botón para colapsar/expandir — solo escritorio, a caballo sobre
            el borde derecho del sidebar como en Notion/Linear. */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? "Expandir menú" : "Colapsar menú"}
          className="hidden lg:flex absolute -right-3 top-20 z-10 w-6 h-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:border-blue-500 shadow-sm transition-colors"
        >
          {collapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
        </button>

        <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="border-b border-border px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {/* Logo / icon — si la iglesia no subió su propio logo,
                    mostramos el logo de Congrega en su lugar. */}
                <div
                  className={cn(
                    "w-11 h-11 rounded-xl overflow-hidden shrink-0 flex items-center justify-center shadow-lg",
                    user?.churchLogo
                      ? "bg-background ring-1 ring-border"
                      : "ring-2 ring-blue-500/30",
                  )}
                >
                  <img
                    src={user?.churchLogo || "/logo.png"}
                    alt={user?.churchLogo ? "Logo" : "Congrega"}
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Church name + tagline — oculto en escritorio colapsado,
                    siempre visible en el drawer móvil (mismo DOM, la clase
                    lg: es lo que hace la diferencia). */}
                <div className={cn("min-w-0", collapsed && "lg:hidden")}>
                  <p className="text-foreground font-bold text-sm leading-tight truncate">
                    {user?.churchName || "Iglesia"}
                  </p>
                  <p className="text-blue-700 dark:text-blue-400 text-xs mt-0.5 truncate">
                    Congrega
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-muted-foreground hover:text-foreground shrink-0 ml-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation
              .filter((item) => !item.roles || item.roles.includes(user?.role))
              .map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  title={collapsed ? item.name : undefined}
                  className={cn(
                    "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    collapsed && "lg:justify-center lg:px-0",
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className={cn("h-5 w-5 shrink-0 mr-3", collapsed && "lg:mr-0")} />
                  <span className={cn(collapsed && "lg:hidden")}>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-border p-4">
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                title={collapsed ? (user?.fullName || "Usuario") : undefined}
                className={cn(
                  "flex items-center w-full px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-accent rounded-lg transition-colors",
                  collapsed && "lg:justify-center lg:px-0",
                )}
              >
                <div className={cn("flex-1 flex items-center", collapsed && "lg:flex-none")}>
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full overflow-hidden shrink-0 flex items-center justify-center",
                      user?.photoUrl
                        ? "bg-background ring-1 ring-border"
                        : "bg-gradient-to-br from-blue-500 to-blue-700",
                    )}
                  >
                    {user?.photoUrl ? (
                      <img
                        src={user.photoUrl}
                        alt={user.fullName || "Foto de perfil"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-white">
                        {initials}
                      </span>
                    )}
                  </div>
                  <div className={cn("ml-3 text-left min-w-0", collapsed && "lg:hidden")}>
                    <p className="text-sm font-medium text-foreground truncate">
                      {user?.fullName || "Usuario"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user?.role || "Rol"}
                    </p>
                  </div>
                </div>
                <ChevronDown className={cn("h-4 w-4 ml-2 shrink-0", collapsed && "lg:hidden")} />
              </button>

              {userMenuOpen && (
                <div className={cn(
                  "absolute bottom-full left-0 right-0 mb-2 bg-popover border border-border rounded-lg shadow-lg overflow-hidden",
                  collapsed && "lg:right-auto lg:w-56",
                )}>
                  <Link
                    to="/dashboard/profile"
                    onClick={() => {
                      setUserMenuOpen(false);
                      setSidebarOpen(false);
                    }}
                    className="flex items-center w-full px-4 py-3 text-sm text-muted-foreground hover:bg-accent transition-colors"
                  >
                    <User className="h-4 w-4 mr-3" />
                    Mi Perfil
                  </Link>
                  <button
                    onClick={requestLogout}
                    className="flex items-center w-full px-4 py-3 text-sm text-muted-foreground hover:bg-accent transition-colors"
                  >
                    <LogOut className="h-4 w-4 mr-3" />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={cn("transition-all duration-300 ease-in-out", collapsed ? "lg:pl-20" : "lg:pl-64")}>
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-card border-b border-border">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-muted-foreground hover:text-foreground"
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="flex-1 mx-4">
              <GlobalSearch />
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <ThemeToggle />

              {/* Desktop user menu */}
              <div className="hidden lg:block relative" ref={headerMenuRef}>
                <button
                  onClick={() => setHeaderMenuOpen((v) => !v)}
                  className="flex items-center gap-2.5 pl-1.5 pr-2 py-1.5 rounded-lg hover:bg-accent transition-colors"
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full overflow-hidden shrink-0 flex items-center justify-center",
                      user?.photoUrl || user?.churchLogo
                        ? "bg-background ring-1 ring-border"
                        : "bg-gradient-to-br from-blue-500 to-blue-700",
                    )}
                  >
                    {user?.photoUrl ? (
                      <img
                        src={user.photoUrl}
                        alt={user.fullName || "Foto de perfil"}
                        className="w-full h-full object-cover"
                      />
                    ) : user?.churchLogo ? (
                      <img
                        src={user.churchLogo}
                        alt="Logo"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-semibold text-white">
                        {initials}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {user?.fullName?.split(" ")[0]}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>

                {headerMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-20">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-medium text-foreground truncate">
                        {user?.fullName || "Usuario"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user?.email}
                      </p>
                    </div>
                    <Link
                      to="/dashboard/profile"
                      onClick={() => setHeaderMenuOpen(false)}
                      className="flex items-center w-full px-4 py-3 text-sm text-muted-foreground hover:bg-accent transition-colors"
                    >
                      <User className="h-4 w-4 mr-3" />
                      Mi Perfil
                    </Link>
                    <button
                      onClick={requestLogout}
                      className="flex items-center w-full px-4 py-3 text-sm text-muted-foreground hover:bg-accent transition-colors"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6 px-4 sm:px-6 lg:px-8">{children}</main>
      </div>

      <ConfirmDialog
        open={logoutConfirmOpen}
        onOpenChange={setLogoutConfirmOpen}
        title="¿Cerrar sesión?"
        description="Vas a salir de tu cuenta. Podrás volver a iniciar sesión cuando quieras."
        confirmLabel="Cerrar sesión"
        confirmingLabel="Cerrando sesión…"
        onConfirm={handleLogout}
      />
    </div>
  );
};

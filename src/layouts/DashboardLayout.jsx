import React, {useState, useEffect} from "react";
import {Link, useLocation, useNavigate} from "react-router-dom";
import {useAuth} from "@/contexts/AuthContext";
import {settingsService} from "@/services/api";
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
  UserSearch,
  ClipboardList,
  Crown,
  Wine,
} from "lucide-react";
import {Button} from "@/components/ui/Button";
import {cn} from "@/lib/utils";

const navigation = [
  {name: "Inicio", href: "/dashboard", icon: Home},
  {name: "Miembros", href: "/dashboard/members", icon: Users},
  {name: "Visitantes", href: "/dashboard/visitors", icon: UserSearch},
  {name: "Familias", href: "/dashboard/families", icon: UserPlus},
  {name: "Grupos", href: "/dashboard/groups", icon: UsersRound},
  {name: "Líderes", href: "/dashboard/leaders", icon: Crown},
  {name: "Asistencia", href: "/dashboard/attendance", icon: CheckSquare},
  {name: "Eventos", href: "/dashboard/events", icon: CalendarDays},
  {name: "Programa", href: "/dashboard/programs", icon: ClipboardList},
  {name: "Actividades", href: "/dashboard/activities", icon: Rocket},
  {name: "Finanzas", href: "/dashboard/finances", icon: DollarSign},
  {name: "Bautismos", href: "/dashboard/baptisms", icon: Droplet},
  {name: "Santa Cena", href: "/dashboard/communion", icon: Wine},
  {name: "Reportes", href: "/dashboard/reports", icon: BarChart3},
  {name: "Usuarios", href: "/dashboard/users", icon: UserCog},
  {name: "Configuración", href: "/dashboard/settings", icon: Settings},
];

export const DashboardLayout = ({children}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const {user, logout, updateUser} = useAuth();

  // Fetch church logo once if not already in auth context
  useEffect(() => {
    if (user && !user.churchLogo) {
      settingsService.getChurch().then((data) => {
        if (data.logoUrl) updateUser({churchLogo: data.logoUrl});
      }).catch(() => {});
    }
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Sidebar para móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-slate-800 border-r border-slate-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="border-b border-slate-700 px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {/* Logo / icon */}
                <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg ring-2 ring-blue-500/30">
                  {user?.churchLogo ? (
                    <img
                      src={user.churchLogo}
                      alt="Logo"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-white font-bold text-xl leading-none">✝</span>
                  )}
                </div>
                {/* Church name + tagline */}
                <div className="min-w-0">
                  <p className="text-white font-bold text-sm leading-tight truncate">
                    {user?.churchName || "Iglesia"}
                  </p>
                  <p className="text-blue-400 text-xs mt-0.5 truncate">
                    Sistema de Gestión
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-gray-400 hover:text-gray-200 shrink-0 ml-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-slate-700 hover:text-white",
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-slate-700 p-4">
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-300 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <div className="flex-1 flex items-center">
                  <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-gray-200">
                      {user?.fullName?.charAt(0) || "U"}
                    </span>
                  </div>
                  <div className="ml-3 text-left">
                    <p className="text-sm font-medium text-white">
                      {user?.fullName || "Usuario"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {user?.role || "Rol"}
                    </p>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 ml-2" />
              </button>

              {userMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-700 border border-slate-600 rounded-lg shadow-lg overflow-hidden">
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-3 text-sm text-gray-300 hover:bg-slate-600 transition-colors"
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
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-slate-800 border-b border-slate-700">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-400 hover:text-gray-200"
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="flex-1 lg:ml-0"></div>

            {/* Desktop user menu */}
            <div className="hidden lg:block">
              <span className="text-sm text-gray-400">
                Bienvenido,{" "}
                <span className="font-semibold text-white">
                  {user?.fullName}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6 px-4 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
};

import React from "react";
import {Navigate, useLocation} from "react-router-dom";
import {useAuth} from "@/contexts/AuthContext";

const FORCE_PASSWORD_CHANGE_PATH = "/dashboard/cambiar-password";

export const ProtectedRoute = ({children, roles}) => {
  const {isAuthenticated, loading, user} = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Cuenta creada con contraseña temporal: no puede usar el resto del
  // sistema hasta que la cambie, sin importar el rol.
  if (
    user?.mustChangePassword &&
    location.pathname !== FORCE_PASSWORD_CHANGE_PATH
  ) {
    return <Navigate to={FORCE_PASSWORD_CHANGE_PATH} replace />;
  }

  // roles es opcional — sin él, la ruta solo exige sesión iniciada, igual
  // que antes. Cuando se pasa, un rol fuera de la lista se manda de vuelta
  // al dashboard en lugar de dejarlo entrar a una página que de todos
  // modos le va a devolver 403 en cada llamada al backend.
  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

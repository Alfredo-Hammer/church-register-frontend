import React from "react";
import {Navigate} from "react-router-dom";

// Chequeo simple de presencia de token: no hay un contexto/provider dedicado
// para el superadmin (es un scope aparte, sin church_id), así que basta con
// mirar localStorage directamente. El backend sigue siendo quien de verdad
// valida el token en cada request.
export const PlatformProtectedRoute = ({children}) => {
  const token = localStorage.getItem("platformToken");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

import React, {createContext, useState, useContext, useEffect} from "react";
import {authService} from "@/services/api";

const AuthContext = createContext(null);

/**
 * ¿El token guardado sigue vigente?
 *
 * Solo lee la fecha de expiración del payload; no valida la firma, cosa que el
 * navegador no puede hacer. Quien decide de verdad es el servidor, que ya
 * rechaza los tokens vencidos con un 401. Esto evita el paso intermedio feo:
 * sin la comprobación, la app da la sesión por buena, monta el panel, lanza
 * varias peticiones que fallan y recién entonces te expulsa al login.
 */
const isTokenActive = (token) => {
  try {
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    // Sin exp no hay nada que comprobar; que decida el servidor.
    if (!payload?.exp) return true;
    return payload.exp * 1000 > Date.now();
  } catch {
    // Token ilegible: tratarlo como inválido.
    return false;
  }
};

export const AuthProvider = ({children}) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cargar usuario desde localStorage al iniciar
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (storedUser && token && isTokenActive(token)) {
      setUser(JSON.parse(storedUser));
    } else if (token || storedUser) {
      // Sesión vencida o datos corruptos: limpiar para no volver a intentarlo
      // en cada recarga.
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);

      const u = response.user ?? response;
      const userData = {
        userId: u.id ?? u.userId,
        churchId: u.churchId,
        churchName: u.churchName,
        churchLogo: u.churchLogo ?? null,
        role: u.role,
        fullName: u.fullName,
        email: u.email,
        photoUrl: u.photoUrl ?? null,
      };

      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);

      return {success: true};
    } catch (error) {
      console.error("Error en login:", error);
      return {
        success: false,
        error: error.response?.data?.error || "Error al iniciar sesión",
        // p. ej. EMAIL_NOT_VERIFIED, para que la pantalla pueda ofrecer
        // reenviar el correo en vez de solo mostrar el mensaje de error.
        code: error.response?.data?.code,
      };
    }
  };

  const updateUser = (partial) => {
    setUser((prev) => {
      const updated = {...prev, ...partial};
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    updateUser,
    loading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

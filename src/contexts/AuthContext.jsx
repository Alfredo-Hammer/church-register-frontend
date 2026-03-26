import React, {createContext, useState, useContext, useEffect} from "react";
import {authService} from "@/services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({children}) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cargar usuario desde localStorage al iniciar
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
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

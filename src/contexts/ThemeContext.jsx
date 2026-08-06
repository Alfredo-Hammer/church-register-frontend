import React, {createContext, useState, useContext, useEffect} from "react";

const ThemeContext = createContext(null);

const STORAGE_KEY = "theme";

/**
 * Devuelve el tema inicial: el guardado por el usuario si existe,
 * si no la preferencia del sistema operativo.
 */
export const getInitialTheme = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const ThemeProvider = ({children}) => {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    // El tema se aplica como clase en <html>; Tailwind está en darkMode: "class"
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{theme, setTheme, toggleTheme}}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme debe usarse dentro de un ThemeProvider");
  }
  return context;
};

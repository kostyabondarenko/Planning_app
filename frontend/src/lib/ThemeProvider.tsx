"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark" | "auto";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "auto",
  setTheme: () => {},
});

function getAutoTheme(): "light" | "dark" {
  const hour = new Date().getHours();
  return hour >= 7 && hour < 19 ? "light" : "dark";
}

function resolveTheme(theme: Theme): "light" | "dark" {
  return theme === "auto" ? getAutoTheme() : theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("auto");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored && ["light", "dark", "auto"].includes(stored)) {
      setThemeState(stored);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute("data-theme", resolveTheme(theme));
  }, [theme, mounted]);

  // For auto mode, update theme when hour changes
  useEffect(() => {
    if (theme !== "auto") return;
    const interval = setInterval(() => {
      document.documentElement.setAttribute("data-theme", getAutoTheme());
    }, 60_000);
    return () => clearInterval(interval);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

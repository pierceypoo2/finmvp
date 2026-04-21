"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useSyncExternalStore,
} from "react";

export type Theme = "light" | "sundown" | "dark";
type Ctx = { theme: Theme; toggle: () => void };

const ThemeCtx = createContext<Ctx | null>(null);

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("ta-theme", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("ta-theme", onStoreChange);
  };
}

function getThemeSnapshot(): Theme {
  const saved = localStorage.getItem("ta_theme");
  if (saved === "light") return "light";
  if (saved === "sundown") return "sundown";
  if (saved === "dark") return "dark";
  return "dark";
}

function getServerThemeSnapshot(): Theme {
  return "dark";
}

function applyThemeToDom(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("sundown", theme === "sundown");
  root.style.colorScheme = theme === "dark" ? "dark" : "light";
  const mesh = document.getElementById("bg-mesh");
  if (mesh) {
    mesh.classList.remove("mesh-bg-light", "mesh-bg-dark", "mesh-bg-sundown");
    mesh.classList.add(
      theme === "light" ? "mesh-bg-light" : theme === "sundown" ? "mesh-bg-sundown" : "mesh-bg-dark",
    );
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getThemeSnapshot, getServerThemeSnapshot);

  useLayoutEffect(() => {
    applyThemeToDom(theme);
  }, [theme]);

  const toggle = useCallback(() => {
    const next: Theme = theme === "light" ? "sundown" : theme === "sundown" ? "dark" : "light";
    localStorage.setItem("ta_theme", next);
    // Apply before the store notifies subscribers so the next paint matches (avoids one-frame flash).
    applyThemeToDom(next);
    window.dispatchEvent(new Event("ta-theme"));
  }, [theme]);

  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const c = useContext(ThemeCtx);
  if (!c) throw new Error("useTheme must be inside ThemeProvider");
  return c;
}

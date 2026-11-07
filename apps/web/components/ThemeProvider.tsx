"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "dark" | "light" | "system";
const Ctx = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({
  theme: "dark",
  setTheme: () => {},
});

function apply(t: Theme) {
  const effective = t === "system"
    ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
    : t;
  document.documentElement.setAttribute("data-theme", effective);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setT] = useState<Theme>("dark");

  useEffect(() => {
    let saved: Theme = "dark";
    try {
      const stored = localStorage.getItem("mb_theme") as Theme;
      if (stored) saved = stored;
    } catch {}
    setT(saved);
    apply(saved);
  }, []);

  const setTheme = (t: Theme) => {
    setT(t);
    try {
      localStorage.setItem("mb_theme", t);
    } catch {}
    apply(t);
  };

  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);

"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "dark" | "light" | "system";
const Ctx = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({
  theme: "light",
  setTheme: () => {},
});

function apply(t: Theme) {
  const effective =
    t === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : t;
  document.documentElement.setAttribute("data-theme", effective);
  if (effective === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setT] = useState<Theme>("light");

  useEffect(() => {
    let saved: Theme = "light";
    try {
      const stored = localStorage.getItem("mb_theme") as Theme;
      if (stored === "dark" || stored === "light" || stored === "system") {
        saved = stored;
      }
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

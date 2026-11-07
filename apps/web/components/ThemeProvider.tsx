"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
type Theme = "dark" | "light" | "system";
const Ctx = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({ theme: "system", setTheme: () => {} });

function apply(t: Theme) {
  const sys = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", t === "system" ? sys : t);
}
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setT] = useState<Theme>("light"); // default: clean light theme; user choice is remembered
  useEffect(() => {
    let saved: Theme = "light";
    try { saved = (localStorage.getItem("mb_theme") as Theme) || "light"; } catch {}
    setT(saved); apply(saved);
  }, []);
  const setTheme = (t: Theme) => { setT(t); try { localStorage.setItem("mb_theme", t); } catch {} apply(t); };
  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>;
}
export const useTheme = () => useContext(Ctx);

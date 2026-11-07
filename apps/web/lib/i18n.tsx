"use client";
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import en from "@/messages/en.json";
import bn from "@/messages/bn.json";
import { api, getToken } from "@/lib/api";

export type Locale = "en" | "bn";
const dict: Record<Locale, Record<string, string>> = { en, bn };
const Ctx = createContext<{ locale: Locale; setLocale: (l: Locale) => void; t: (k: string) => string }>({ locale: "en", setLocale: () => {}, t: (k) => k });

function readCookie(): Locale {
  if (typeof document === "undefined") return "en";
  const m = document.cookie.match(/NEXT_LOCALE=(en|bn)/);
  return (m?.[1] as Locale) || "en"; // first visit is always English
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setL] = useState<Locale>("en");
  useEffect(() => { setL(readCookie()); }, []);
  useEffect(() => {
    document.documentElement.setAttribute("data-locale", locale);
    document.documentElement.lang = locale;
    if (locale === "bn" && !document.getElementById("bn-font")) { // Bangla font loads only for bn
      const l = document.createElement("link");
      l.id = "bn-font"; l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600&family=Noto+Sans+Bengali:wght@400;600&display=swap";
      document.head.appendChild(l);
    }
  }, [locale]);
  const setLocale = useCallback((l: Locale) => {
    document.cookie = `NEXT_LOCALE=${l}; path=/; max-age=31536000; samesite=lax`;
    setL(l);
    if (getToken()) api("/patients/me", { method: "PUT", body: { language: l } }).catch(() => {}); // saved to profile when logged in as patient
  }, []);
  const t = useCallback((k: string) => dict[locale][k] ?? dict.en[k] ?? k, [locale]); // fall back to English, never a raw key if en has it
  return <Ctx.Provider value={{ locale, setLocale, t }}>{children}</Ctx.Provider>;
}
export const useI18n = () => useContext(Ctx);

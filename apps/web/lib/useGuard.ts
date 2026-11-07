"use client";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { clearSession, getRole, getToken, homeFor, setUnauthorizedHandler } from "@/lib/api";

/** Client-side convenience only. The API enforces every permission; this just avoids showing screens you can't use. */
export function useGuard(roles: string[]) {
  const router = useRouter();
  const key = useMemo(() => roles.join(","), [roles]); // stable dependency (arrays are new every render)
  useEffect(() => {
    const currentPath = typeof window !== "undefined" ? window.location.pathname + window.location.search : "";
    const nextParam = currentPath && currentPath !== "/" && currentPath !== "/login" ? `?next=${encodeURIComponent(currentPath)}` : "";

    setUnauthorizedHandler(() => {
      clearSession();
      router.replace(`/login${nextParam}`);
    });

    const role = getRole();
    if (!getToken()) {
      router.replace(`/login${nextParam}`);
    } else if (!key.split(",").includes(role || "")) {
      router.replace(homeFor(role));
    }
    return () => setUnauthorizedHandler(null);
  }, [router, key]);
}

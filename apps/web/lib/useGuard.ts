"use client";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { clearSession, getRole, getToken, homeFor, setUnauthorizedHandler } from "@/lib/api";

/** Client-side convenience only. The API enforces every permission; this just avoids showing screens you can't use. */
export function useGuard(roles: string[]) {
  const router = useRouter();
  const key = useMemo(() => roles.join(","), [roles]);   // stable dependency (arrays are new every render)
  useEffect(() => {
    setUnauthorizedHandler(() => { clearSession(); router.replace("/login"); });
    const role = getRole();
    if (!getToken()) router.replace("/login");
    else if (!key.split(",").includes(role || "")) router.replace(homeFor(role));
    return () => setUnauthorizedHandler(null);
  }, [router, key]);
}

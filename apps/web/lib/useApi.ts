"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

/**
 * Loading / error / data hook.
 * - Cancels in-flight requests on unmount and whenever `path` changes (no stale response can overwrite newer data).
 * - Keeps the previous data visible while refreshing (`refreshing` flag) instead of flashing a skeleton.
 */
export function useApi<T = any>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [refreshing, setRefreshing] = useState(false);
  const seq = useRef(0);
  const ctrl = useRef<AbortController | null>(null);
  const hasData = useRef(false);

  const load = useCallback(() => {
    if (!path) { setLoading(false); return; }
    ctrl.current?.abort();
    const c = new AbortController(); ctrl.current = c;
    const mine = ++seq.current;
    setError(null);
    if (hasData.current) setRefreshing(true); else setLoading(true);
    api<T>(path, { signal: c.signal })
      .then((d) => { if (mine === seq.current) { setData(d); hasData.current = true; } })
      .catch((e) => { if (mine === seq.current && e?.name !== "AbortError") setError(e.message || "Error"); })
      .finally(() => { if (mine === seq.current) { setLoading(false); setRefreshing(false); } });
  }, [path]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { hasData.current = false; setData(null); load(); return () => { ctrl.current?.abort(); seq.current++; }; }, [load]);
  return { data, error, loading, refreshing, reload: load };
}

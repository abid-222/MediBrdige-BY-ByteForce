const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const TIMEOUT_MS = 20_000;

// Session storage note: the JWT lives in sessionStorage (cleared when the tab closes) and is revoked server-side on logout.
// A fully httpOnly-cookie session needs same-site hosting + CSRF tokens; see docs/SECURITY.md for the trade-off.
const store = () => (typeof window === "undefined" ? null : window.sessionStorage);
export const getToken = () => store()?.getItem("mb_token") ?? null;
export const getRole = () => store()?.getItem("mb_role") ?? null;
export const setSession = (token: string, role: string) => { store()?.setItem("mb_token", token); store()?.setItem("mb_role", role); };
export const clearSession = () => { store()?.removeItem("mb_token"); store()?.removeItem("mb_role"); };

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details: Record<string, unknown> = {}) { super(message); this.name = "ApiError"; }
}

/** Plain-language messages. Server stack traces / SQL never reach the UI. */
const FRIENDLY: Record<number, string> = {
  400: "That request wasn't valid. Please check and try again.",
  401: "Your session has ended. Please log in again.",
  403: "You don't have permission to do that.",
  404: "We couldn't find what you were looking for.",
  409: "That conflicts with something that already exists (for example, a time that is already booked).",
  413: "That file is too large.",
  415: "That file type is not supported.",
  422: "Some of the information entered is not valid.",
  429: "Too many attempts. Please wait a moment and try again.",
  500: "Something went wrong on our side. Please try again.",
  503: "The service is temporarily unavailable. Please try again shortly.",
};

type Opts = { method?: string; body?: unknown; form?: FormData; headers?: Record<string, string>; signal?: AbortSignal; timeoutMs?: number; retry?: boolean };

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => { onUnauthorized = fn; };

async function once(path: string, opts: Opts): Promise<Response> {
  const headers: Record<string, string> = { ...(opts.headers || {}) };
  const tok = getToken();
  if (tok) headers.Authorization = `Bearer ${tok}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new DOMException("timeout", "TimeoutError")), opts.timeoutMs ?? TIMEOUT_MS);
  const onAbort = () => ctrl.abort(opts.signal?.reason);
  opts.signal?.addEventListener("abort", onAbort, { once: true });
  try {
    return await fetch(BASE + path, {
      method: opts.method || (opts.body !== undefined || opts.form ? "POST" : "GET"), headers,
      body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined), signal: ctrl.signal,
    });
  } finally { clearTimeout(timer); opts.signal?.removeEventListener("abort", onAbort); }
}

export async function api<T = any>(path: string, opts: Opts = {}): Promise<T> {
  const method = (opts.method || (opts.body !== undefined || opts.form ? "POST" : "GET")).toUpperCase();
  const canRetry = method === "GET" && opts.retry !== false;      // writes are never retried automatically (no duplicate bookings/uploads)
  let res: Response;
  try {
    try { res = await once(path, opts); }
    catch (e) {
      if (opts.signal?.aborted) throw e;                           // caller cancelled: propagate as AbortError, never as a failure message
      if (!canRetry) throw e;
      res = await once(path, opts);                                // one safe retry for idempotent reads after a network blip
    }
  } catch (e: any) {
    if (opts.signal?.aborted) throw e;
    if (e?.name === "TimeoutError" || e?.name === "AbortError") throw new ApiError(0, "timeout", "The server took too long to respond. Please try again.");
    throw new ApiError(0, "network", "Can't reach the server. Check your connection and try again.");
  }
  const ct = res.headers.get("content-type") || "";
  const raw = res.status === 204 ? "" : await res.text();
  let parsed: any = null;
  if (raw) {
    if (ct.includes("json")) {
      try { parsed = JSON.parse(raw); }
      catch { throw new ApiError(res.status, "bad_response", "The server sent an unreadable response."); }
    } else parsed = raw;
  }
  if (!res.ok) {
    const e = parsed?.error || {};
    if (res.status === 401 && getToken() && e.code !== "invalid_credentials") { clearSession(); onUnauthorized?.(); }
    const known = FRIENDLY[res.status];
    // Use the server's message for 4xx (it's written for users); generic text for 5xx.
    const message = res.status >= 500 ? known : (e.message || known || res.statusText);
    throw new ApiError(res.status, e.code || "error", message || "Request failed", e.details || {});
  }
  return (parsed ?? null) as T;   // empty body (204) -> null
}

/** Upload with progress (fetch cannot report upload progress). */
export function uploadWithProgress<T = any>(path: string, form: FormData, onProgress: (pct: number) => void, headers: Record<string, string> = {}, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", BASE + path);
    const tok = getToken();
    if (tok) xhr.setRequestHeader("Authorization", `Bearer ${tok}`);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onerror = () => reject(new ApiError(0, "network", "Upload failed: can't reach the server."));
    xhr.ontimeout = () => reject(new ApiError(0, "timeout", "Upload timed out."));
    xhr.timeout = 120_000;
    signal?.addEventListener("abort", () => { xhr.abort(); reject(new DOMException("aborted", "AbortError")); });
    xhr.onload = () => {
      let body: any = null;
      try { body = xhr.responseText ? JSON.parse(xhr.responseText) : null; } catch { /* handled below */ }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(body as T);
      const e = body?.error || {};
      if (xhr.status === 401) { clearSession(); onUnauthorized?.(); }
      reject(new ApiError(xhr.status, e.code || "error", xhr.status >= 500 ? FRIENDLY[500] : e.message || FRIENDLY[xhr.status] || "Upload failed"));
    };
    xhr.send(form);
  });
}

export const homeFor = (role: string | null) =>
  ({ patient: "/dashboard", doctor: "/doctor", facility_admin: "/facility", facility_staff: "/facility", super_admin: "/admin", reviewer: "/admin" } as Record<string, string>)[role || ""] || "/login";

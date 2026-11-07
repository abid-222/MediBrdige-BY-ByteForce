import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mk = (status: number, body?: any, ct = "application/json") =>
  new Response(body === undefined ? null : typeof body === "string" ? body : JSON.stringify(body), { status, headers: { "content-type": ct } });

describe("api client", () => {
  let api: typeof import("./api");
  beforeEach(async () => { vi.resetModules(); (globalThis as any).window = { sessionStorage: (() => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => m.set(k, v), removeItem: (k: string) => m.delete(k) }; })() }; api = await import("./api"); });
  afterEach(() => { vi.restoreAllMocks(); delete (globalThis as any).window; });

  it("parses JSON, sends bearer token, handles empty 204", async () => {
    api.setSession("tok", "patient");
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mk(200, { ok: 1 })).mockResolvedValueOnce(mk(204));
    expect(await api.api("/x")).toEqual({ ok: 1 });
    expect((f.mock.calls[0][1] as any).headers.Authorization).toBe("Bearer tok");
    expect(await api.api("/y", { method: "DELETE" })).toBeNull();
  });
  it.each([[400, "validation"], [403, "forbidden"], [404, "nf"], [409, "conflict"], [422, "validation"], [429, "slow"]])("maps HTTP %i to ApiError with code", async (status, code) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mk(status, { error: { code, message: "Readable message", details: {} } }));
    await expect(api.api("/x", { method: "POST", body: {} })).rejects.toMatchObject({ status, code, message: "Readable message" });
  });
  it("hides server internals on 5xx", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mk(500, { error: { code: "internal_error", message: "psycopg2 SELECT * FROM users" } }));
    const e: any = await api.api("/x").catch((x) => x);
    expect(e.message).not.toContain("SELECT");
  });
  it("invalid JSON becomes a clean error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mk(200, "{not json"));
    await expect(api.api("/x")).rejects.toMatchObject({ code: "bad_response" });
  });
  it("retries a GET once after a network failure, but never a POST", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("net")).mockResolvedValueOnce(mk(200, { a: 1 }));
    expect(await api.api("/x")).toEqual({ a: 1 }); expect(f).toHaveBeenCalledTimes(2);
    f.mockReset().mockRejectedValue(new TypeError("net"));
    await expect(api.api("/x", { method: "POST", body: {} })).rejects.toMatchObject({ code: "network" });
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("401 on an authenticated call clears the session and notifies", async () => {
    api.setSession("tok", "patient"); const cb = vi.fn(); api.setUnauthorizedHandler(cb);
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mk(401, { error: { code: "invalid_token", message: "x" } }));
    await expect(api.api("/me")).rejects.toMatchObject({ status: 401 });
    expect(api.getToken()).toBeNull(); expect(cb).toHaveBeenCalled();
  });
  it("wrong password 401 does not log the user out of anything", async () => {
    const cb = vi.fn(); api.setUnauthorizedHandler(cb);
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mk(401, { error: { code: "invalid_credentials", message: "Invalid email or password" } }));
    await expect(api.api("/auth/login", { body: {} })).rejects.toMatchObject({ code: "invalid_credentials" }); expect(cb).not.toHaveBeenCalled();
  });
  it("aborted requests surface as AbortError, not as a failure message", async () => {
    const c = new AbortController();
    vi.spyOn(globalThis, "fetch").mockImplementation((_u, o: any) => new Promise((_r, rej) => o.signal.addEventListener("abort", () => rej(new DOMException("a", "AbortError")))));
    const p = api.api("/x", { signal: c.signal }); c.abort();
    await expect(p).rejects.toMatchObject({ name: "AbortError" });
  });
});

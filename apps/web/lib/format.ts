// One date strategy for the whole app:
//  - date-only strings ("2026-10-02", from lab reports / DOB) are shown as-is, calendar date, NEVER timezone-shifted;
//  - timestamps (ISO with time/offset, from the API in UTC) are shown in Bangladesh time (Asia/Dhaka);
//  - invalid / empty values render "—" and never throw.
const TZ = "Asia/Dhaka";
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function parseDate(v?: string | Date | null): Date | null {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  const s = String(v);
  // Server datetimes from SQLite may lack an offset: treat them as UTC.
  const iso = /T|\s\d/.test(s) && !/(Z|[+-]\d{2}:?\d{2})$/.test(s) ? s.replace(" ", "T") + "Z" : s;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

export function fmtDate(v?: string | Date | null): string {
  if (!v) return "—";
  if (typeof v === "string" && DATE_ONLY.test(v)) {
    const [y, m, d] = v.split("-").map(Number);
    if (m < 1 || m > 12 || d < 1 || d > 31) return "—";
    return `${String(d).padStart(2, "0")} ${MONTHS[m - 1]} ${y}`;
  }
  const d = parseDate(v);
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric", numberingSystem: "latn" } as any).format(d);
}

export function fmtDateTime(v?: string | Date | null): string {
  const d = parseDate(v);
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true, numberingSystem: "latn" } as any).format(d);
}

export function fmtTime(v?: string | Date | null): string {
  const d = parseDate(v);
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: true } as any).format(d);
}

/** Calendar day (Asia/Dhaka) of a timestamp as YYYY-MM-DD, for "today" comparisons. */
export function dhakaDay(v?: string | Date | null): string | null {
  const d = parseDate(v);
  if (!d) return null;
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}
export const todayDhaka = () => dhakaDay(new Date())!;

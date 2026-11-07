import { describe, expect, it } from "vitest";
import { dhakaDay, fmtDate, fmtDateTime, parseDate } from "./format";

describe("date formatting", () => {
  it("never throws on bad input", () => {
    for (const v of [undefined, null, "", "garbage", "2026-13-45", "0000-00-00"]) { expect(() => fmtDate(v as any)).not.toThrow(); expect(fmtDate(v as any)).toBe("—"); expect(fmtDateTime(v as any)).toBe("—"); }
  });
  it("shows date-only values without a timezone shift", () => { expect(fmtDate("2026-10-02")).toBe("02 Oct 2026"); expect(fmtDate("2026-01-01")).toBe("01 Jan 2026"); });
  it("converts UTC timestamps to Bangladesh time (+6)", () => {
    expect(dhakaDay("2026-10-02T20:00:00Z")).toBe("2026-10-03");     // 02:00 next day in Dhaka
    expect(fmtDateTime("2026-10-02T06:00:00Z")).toContain("12:00");
  });
  it("treats offset-less server timestamps as UTC", () => { expect(parseDate("2026-10-02 06:00:00")?.toISOString()).toBe("2026-10-02T06:00:00.000Z"); });
});

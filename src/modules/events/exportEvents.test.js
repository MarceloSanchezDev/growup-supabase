import { describe, expect, it, vi } from "vitest";
import { downloadEventsCsv } from "./exportEvents";

describe("downloadEventsCsv", () => {
  it("exports core event values as a CSV download", () => {
    const click = vi.fn(); const createObjectURL = vi.fn(() => "blob:test"); const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL }); vi.spyOn(document, "createElement").mockReturnValue({ click, set href(value) {}, set download(value) {} });
    downloadEventsCsv([{ client: "Ana", scheduledAt: "2026-10-10T15:00:00.000Z", packageName: "Cabina", total: 100000, paid: 10000, status: "confirmed" }]);
    expect(createObjectURL).toHaveBeenCalledOnce(); expect(click).toHaveBeenCalledOnce(); expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");
  });
});

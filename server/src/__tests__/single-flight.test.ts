import { describe, expect, it, vi } from "vitest";
import { singleFlight } from "@/lib/singleFlight";

describe("overlapping dashboard reads", () => {
  it("shares overlapping reads without retaining a stale result", async () => {
    const load = vi.fn().mockResolvedValueOnce([1]).mockResolvedValueOnce([2]);
    const read = singleFlight(load);
    expect(await Promise.all([read(), read(), read()])).toEqual([[1], [1], [1]]);
    expect(load).toHaveBeenCalledOnce();
    expect(await read()).toEqual([2]);
    expect(load).toHaveBeenCalledTimes(2);
  });
  it("releases failed reads so a later request can retry", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("Database unavailable")).mockResolvedValueOnce("fresh");
    const read = singleFlight(load);
    const results = await Promise.allSettled([read(), read()]);
    expect(results.every(result => result.status === "rejected")).toBe(true);
    expect(load).toHaveBeenCalledOnce();
    expect(await read()).toBe("fresh");
  });
});

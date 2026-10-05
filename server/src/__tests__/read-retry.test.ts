import { expect, it, vi } from "vitest";
import { retrySafeRead } from "@/lib/readRetry";
it("does not repeat a write after a connection failure whose commit result is unknown", async () => {
  let writes=0;const run=vi.fn(async()=>{writes++;throw new Error("Connection lost after commit");});
  await expect(retrySafeRead("create",run,()=>true,async()=>{})).rejects.toThrow("lost");
  expect(writes).toBe(1);
});
it("retries a transient read once", async () => {
  const run=vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue([1]);
  expect(await retrySafeRead("findMany",run,()=>true,async()=>{})).toEqual([1]);expect(run).toHaveBeenCalledTimes(2);
});
it("does not retry arbitrary raw SQL or a permanent read error", async()=>{
  for(const operation of ["$queryRawUnsafe","update","delete","upsert"]){const run=vi.fn().mockRejectedValue(new Error("lost"));await expect(retrySafeRead(operation,run,()=>true,async()=>{})).rejects.toThrow();expect(run).toHaveBeenCalledOnce();}
  const run=vi.fn().mockRejectedValue(new Error("constraint"));await expect(retrySafeRead("findMany",run,()=>false,async()=>{})).rejects.toThrow();expect(run).toHaveBeenCalledOnce();
});

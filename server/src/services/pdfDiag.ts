// TEMPORARY diagnostics (to be removed): the container's memory through each PDF render,
// saved to the database as it goes, so the last reading survives an out-of-memory kill.
import { readFileSync } from "node:fs";

const KEY = "zz.pdfDiag";
function containerMb(): number {
  for (const f of ["/sys/fs/cgroup/memory.current", "/sys/fs/cgroup/memory/memory.usage_in_bytes"]) {
    try { return Math.round(Number(readFileSync(f, "utf8").trim()) / 1048576); } catch { /* not this layout */ }
  }
  return -1;
}
function limitMb(): number {
  for (const f of ["/sys/fs/cgroup/memory.max", "/sys/fs/cgroup/memory/memory.limit_in_bytes"]) {
    try { const v = readFileSync(f, "utf8").trim(); return v === "max" ? -1 : Math.round(Number(v) / 1048576); } catch { /* not this layout */ }
  }
  return -1;
}

export function pdfDiag(label: string) {
  if (process.env.VITEST || process.platform !== "linux") return { async phase(_name: string) {}, async end() {} };
  const t0 = Date.now();
  const state = { label, start: new Date().toISOString(), limitMb: limitMb(), peakMb: containerMb(), phases: [] as { name: string; ms: number; mb: number; rssMb: number }[] };
  const save = async () => (await import("@/lib/prisma")).prisma.setting.upsert({ where: { key: KEY }, create: { key: KEY, value: state as never }, update: { value: state as never } }).catch(() => undefined);
  const timer = setInterval(() => {
    const mb = containerMb();
    if (mb > state.peakMb) { state.peakMb = mb; void save(); }
  }, 150);
  timer.unref?.();
  return {
    async phase(name: string) {
      state.phases.push({ name, ms: Date.now() - t0, mb: containerMb(), rssMb: Math.round(process.memoryUsage().rss / 1048576) });
      await save();
    },
    async end() { clearInterval(timer); await this.phase("end"); },
  };
}

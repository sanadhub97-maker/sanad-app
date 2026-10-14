import { api } from "@/lib/api";

/* The first print on a fresh server instance used to wait for the print
   browser to start and the logo, stamp and signatures to load. Opening a page
   that prints asks the server to get them ready first, at most every few
   minutes; nothing is printed and nothing waits on it. */

const PRINTING_PAGES = /^\/(reports|payments|vehicles|violations|daily-tasks|employees\/[^/]+|settings\/print)(\/|$)/;
const EVERY_MS = 4 * 60_000;
let last = 0;

export function warmPrintingFor(path: string) {
  if (!PRINTING_PAGES.test(path)) return;
  const now = Date.now();
  if (now - last < EVERY_MS) return;
  last = now;
  void api.post("/maintenance/print-warm").catch(() => {
    last = 0;
  });
}

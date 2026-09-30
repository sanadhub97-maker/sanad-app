import { prisma } from "@/lib/prisma";

/* A company document is named after its establishment, typed in Arabic and
   sometimes a little differently from the branch record ("شركة ديزاين
   للديكور" / "ديزاين للديكور", "الإدارية" / "الادارية"). These find the
   establishment a name means, so its English name can be shown in English. */

const norm = (s: string) =>
  s
    .normalize("NFKC")
    .replace(/[ً-ْـ]/g, "") // harakat and tatweel
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/^(شركه|مؤسسه|موسسه)\s+/, "")
    .replace(/\s+/g, "")
    .toLowerCase();

export type BranchNames = { id: string; name: string; nameEn: string | null };

export function loadBranchNames(): Promise<BranchNames[]> {
  return prisma.branch.findMany({ where: { deletedAt: null }, select: { id: true, name: true, nameEn: true } });
}

/** The English name for an establishment's name: the branch with the same name
 * (not the document's linked branch — a document is sometimes filed under another). */
export function establishmentNameEn(name: string, branches: BranchNames[]): string | null {
  const n = norm(name);
  const same = branches.find((b) => b.nameEn && (norm(b.name) === n || norm(b.nameEn) === n));
  if (same) return same.nameEn;
  if (/[A-Za-z]/.test(name) && !/[؀-ۿ]/.test(name)) return name; // already English
  return null;
}

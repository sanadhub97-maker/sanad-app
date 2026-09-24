import { api } from "@/lib/api";

export type TranslateKind = "text" | "nationality";

/** Arabic → English via the server (see server/src/modules/translate). */
export async function translateText(text: string, kind: TranslateKind = "text"): Promise<string> {
  const res = await api.post<{ data: { text: string } }>("/translate", { text, kind });
  return res.data.data.text;
}

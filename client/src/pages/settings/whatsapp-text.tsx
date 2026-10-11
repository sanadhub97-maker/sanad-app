import { Fragment, type ReactNode } from "react";

/* Renders WhatsApp's text markup the way the chat shows it: *bold*, _italic_,
   `monospace`, "> " lines as a quoted panel and "- " lines as a bulleted list. */

function inline(text: string): ReactNode[] {
  return text.split(/(\*[^*\n]+\*|_[^_\n]+_|`[^`\n]+`)/g).map((p, i) => {
    if (p.length > 2 && p.startsWith("*") && p.endsWith("*")) return <b key={i} className="font-bold">{inline(p.slice(1, -1))}</b>;
    if (p.length > 2 && p.startsWith("_") && p.endsWith("_")) return <i key={i} className="italic opacity-80">{p.slice(1, -1)}</i>;
    if (p.length > 2 && p.startsWith("`") && p.endsWith("`"))
      return (
        <code key={i} dir="ltr" className="rounded bg-black/[0.06] px-1 font-mono text-[0.92em] dark:bg-white/[0.08]">
          {p.slice(1, -1)}
        </code>
      );
    return <Fragment key={i}>{p}</Fragment>;
  });
}

export function WhatsappText({ text }: { text: string }) {
  // Consecutive "> " lines form one panel, and "- " lines one list.
  const blocks: { kind: "quote" | "list" | "line"; lines: string[] }[] = [];
  for (const line of text.split("\n")) {
    const kind = line.startsWith("> ") ? "quote" : line.startsWith("- ") ? "list" : "line";
    const body = kind === "line" ? line : line.slice(2);
    const last = blocks[blocks.length - 1];
    if (kind !== "line" && last?.kind === kind) last.lines.push(body);
    else blocks.push({ kind, lines: [body] });
  }
  return (
    <>
      {blocks.map((b, i) =>
        b.kind === "quote" ? (
          <span key={i} className="my-0.5 block rounded-md border-s-4 border-[#25d366]/70 bg-black/[0.04] px-2 py-1 dark:bg-white/[0.05]">
            {b.lines.map((l, k) => (
              <span key={k} className="block">
                {inline(l)}
              </span>
            ))}
          </span>
        ) : b.kind === "list" ? (
          <span key={i} className="block">
            {b.lines.map((l, k) => (
              <span key={k} className="relative block ps-4 before:absolute before:start-1 before:content-['•']">
                {inline(l)}
              </span>
            ))}
          </span>
        ) : (
          <span key={i} className="block min-h-[1.2em]">
            {inline(b.lines[0])}
          </span>
        )
      )}
    </>
  );
}

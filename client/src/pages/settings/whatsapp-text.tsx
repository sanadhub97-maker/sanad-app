import { Fragment } from "react";

/** Renders WhatsApp's "*bold*" and "_italic_" markup the way the app shows it. */
export function WhatsappText({ text }: { text: string }) {
  const parts = text.split(/(\*[^*\n]+\*|_[^_\n]+_)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("*") && p.endsWith("*") && p.length > 2 ? (
          <b key={i} className="font-bold">
            {p.slice(1, -1)}
          </b>
        ) : p.startsWith("_") && p.endsWith("_") && p.length > 2 ? (
          <i key={i} className="italic opacity-80">
            {p.slice(1, -1)}
          </i>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        )
      )}
    </>
  );
}

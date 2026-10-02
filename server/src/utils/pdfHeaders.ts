/** Keep record numbers in filenames without invalid Unicode HTTP headers. */
export function pdfContentDisposition(filename: string) {
  const safe = filename.replace(/[\x00-\x1f\x7f\\/]/g, "_");
  const fallback = safe.replace(/[^a-zA-Z0-9._-]/g, "_");
  const encoded = encodeURIComponent(safe).replace(/['()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `inline; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

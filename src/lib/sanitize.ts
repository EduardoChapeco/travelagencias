import dompurify from "dompurify";

export function sanitizeHtml(html: string): string {
  if (typeof window !== "undefined") {
    return dompurify.sanitize(html);
  }
  return html;
}

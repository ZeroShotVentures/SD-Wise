export const defaultRedirect = "/graph";

const base = "http://localhost";

// Only same-origin paths. Browsers drop tabs and newlines from URLs and read
// "\" as "/", so "/\t/host" and "/\host" both become a protocol-relative URL.
export function safeRedirect(value: unknown): string {
  if (typeof value !== "string") return defaultRedirect;
  if (/[\s\\]/.test(value)) return defaultRedirect;
  if (!value.startsWith("/") || value.startsWith("//")) return defaultRedirect;
  const url = new URL(value, base);
  if (url.origin !== base) return defaultRedirect;
  return `${url.pathname}${url.search}${url.hash}`;
}

export const defaultRedirect = "/graph";

const base = "http://localhost";

// Only same-origin paths. Browsers drop tabs and newlines from URLs and read
// "\" as "/", so "/\t/host" and "/\host" both become a protocol-relative URL.
// Dot segments collapse when parsed ("/.//host" is "//host"), so the parsed
// path is checked again.
export function safeRedirect(value: unknown): string {
  if (typeof value !== "string") return defaultRedirect;
  if (/[\s\\]/.test(value)) return defaultRedirect;
  if (!value.startsWith("/") || value.startsWith("//")) return defaultRedirect;
  const url = new URL(value, base);
  if (url.origin !== base || url.pathname.startsWith("//")) {
    return defaultRedirect;
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

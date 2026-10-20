export const defaultRedirect = "/graph";

const base = "http://localhost";

// Control characters (C0 and DEL), whitespace and "\", raw or percent-encoded.
// Browsers drop tabs, newlines and leading C0 controls from URLs and read "\"
// as "/", so "/\t/host", "/\x01/host" and "/\host" can all become a
// protocol-relative URL, and the auth client may decode "%01" back into one.
// oxlint-disable-next-line no-control-regex
const UNSAFE = /[\u0000-\u0020\u007f\\]|%(?:[01][0-9a-f]|7f|5c)/i;

// Only same-origin paths. Dot segments collapse when parsed ("/.//host" is
// "//host"), so the parsed path is checked again.
export function safeRedirect(value: unknown): string {
  if (typeof value !== "string") return defaultRedirect;
  if (/\s/.test(value) || UNSAFE.test(value)) return defaultRedirect;
  if (!value.startsWith("/") || value.startsWith("//")) return defaultRedirect;
  const url = new URL(value, base);
  if (url.origin !== base || url.pathname.startsWith("//")) {
    return defaultRedirect;
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

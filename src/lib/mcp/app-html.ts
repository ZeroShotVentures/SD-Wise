import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// The MCP Apps client, bundled with its dependencies. The host renders cards
// in a sandboxed iframe with no network access, so it's inlined.
const BUNDLE = join(
  process.cwd(),
  "node_modules/@modelcontextprotocol/ext-apps/dist/src/app-with-deps.js",
);

// The bundle is an ES module ending in one `export {…}`. Swapping that for
// local bindings lets the card's script share the module.
async function appClient() {
  const src = await readFile(BUNDLE, "utf8");
  const at = src.lastIndexOf("export{");
  const list = src.slice(at + "export{".length, src.indexOf("}", at));
  const bind = (name: string) => {
    const local = list
      .split(",")
      .map((s) => s.trim().split(/\s+as\s+/))
      .find(([, as]) => as === name)?.[0];
    if (!local) throw new Error(`ext-apps bundle has no ${name}`);
    return `const ${name} = ${local};`;
  };
  return `${src.slice(0, at)}\n${bind("App")}\n${bind("PostMessageTransport")}`;
}

let client: Promise<string> | undefined;

const BASE_STYLE = `
  :root { color-scheme: light dark; --fg: #10233f; --muted: #6b7280; --line: #e5e7eb; --brand: #2563eb; --card: #fff; --soft: #f5f7fa; }
  @media (prefers-color-scheme: dark) { :root { --fg: #e5e7eb; --muted: #9ca3af; --line: #374151; --card: #1f2937; --soft: #111827; } }
  * { box-sizing: border-box; }
  body { margin: 0; font: 14px/1.5 system-ui, sans-serif; color: var(--fg); background: transparent; }
  .card { border: 1px solid var(--line); border-radius: 14px; background: var(--card); padding: 16px; display: grid; gap: 14px; }
  h3 { margin: 0 0 6px; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
  p { margin: 0; }
  button { border: 0; border-radius: 8px; background: var(--brand); color: #fff; padding: 7px 12px; font: 500 13px system-ui, sans-serif; cursor: pointer; }
  button:disabled { opacity: .5; cursor: default; }
`;

// Card scripts get `app`, `root` and `el`. Everything from a tool result must
// go through textContent, never innerHTML.
const PRELUDE = `
const root = document.getElementById("root");
const app = new App({ name: "SD Wise", version: "0.1.0" }, {});
const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};
`;

export async function appHtml(style: string, script: string) {
  client ??= appClient();
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>${BASE_STYLE}${style}</style></head>
<body><div id="root"></div>
<script type="module">
${await client}
${PRELUDE}
${script}
await app.connect(new PostMessageTransport(window.parent, window.parent));
</script></body></html>`;
}

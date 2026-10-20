"use client";

import {
  ArrowUpRight,
  Eye,
  Loader2,
  MousePointerClick,
  Send,
  TriangleAlert,
  Unplug,
} from "lucide-react";
import { Fragment, useEffect, useState, useTransition } from "react";
import { disconnectClient } from "@/app/(app)/integrations/actions";
import { dateFormat, timeAgo } from "@/lib/graph/meta";
import type { McpClient } from "@/lib/mcp/clients";
import type { ToolSummary } from "@/lib/mcp/tools";
import { CopyButton } from "./copy-button";
import { Logo } from "./logo";

type Guide = {
  id: string;
  name: string;
  logo: string;
  tagline: string;
  // Connects from the vendor's cloud, so it can't reach localhost.
  cloud?: boolean;
  steps: string[];
  snippet?: { label: string; code: string };
  action?: { label: string; href: string };
};

const json = (value: unknown) => JSON.stringify(value, null, 2);

function guides(url: string): Guide[] {
  return [
    {
      id: "claude",
      name: "Claude",
      logo: "claude",
      tagline: "claude.ai, desktop and mobile",
      cloud: true,
      steps: [
        "In Claude, open **Settings → Connectors**",
        "Click **Add custom connector**, name it SD Wise and paste the server URL",
        "Click **Connect**, sign in to SD Wise and allow access",
      ],
      action: {
        label: "Open Claude connectors",
        href: "https://claude.ai/settings/connectors",
      },
    },
    {
      id: "chatgpt",
      name: "ChatGPT",
      logo: "openai",
      tagline: "Apps in developer mode",
      cloud: true,
      steps: [
        "In ChatGPT, open **Settings → Apps & Connectors → Advanced** and turn on **Developer mode**",
        "Click **Create**, name it SD Wise, paste the server URL and pick **OAuth**",
        "Sign in to SD Wise and allow access",
      ],
      action: {
        label: "Open ChatGPT settings",
        href: "https://chatgpt.com/#settings/Connectors",
      },
    },
    {
      id: "copilot-studio",
      name: "Copilot Studio",
      logo: "microsoft",
      tagline: "Agents in Microsoft 365 Copilot",
      cloud: true,
      steps: [
        "Open your agent and go to **Tools → Add a tool → Model Context Protocol**",
        "Name it SD Wise and paste the server URL",
        "Pick **OAuth 2.0 → Dynamic discovery**, then create the connection and sign in",
      ],
      action: {
        label: "Open Copilot Studio",
        href: "https://copilotstudio.microsoft.com",
      },
    },
    {
      id: "claude-code",
      name: "Claude Code",
      logo: "claude",
      tagline: "In your terminal",
      steps: [
        "Run this in your terminal",
        "Start Claude Code, run `/mcp` and pick **sdwise** to sign in",
      ],
      snippet: {
        label: "Terminal",
        code: `claude mcp add --transport http sdwise ${url}`,
      },
    },
    {
      id: "cursor",
      name: "Cursor",
      logo: "cursor",
      tagline: "One click, or mcp.json",
      steps: [
        "Click **Add to Cursor**, or add this to `~/.cursor/mcp.json`",
        "Cursor opens SD Wise in your browser: sign in and allow access",
      ],
      snippet: {
        label: "~/.cursor/mcp.json",
        code: json({ mcpServers: { sdwise: { url } } }),
      },
      action: {
        label: "Add to Cursor",
        href: `cursor://anysphere.cursor-deeplink/mcp/install?name=sdwise&config=${btoa(JSON.stringify({ url }))}`,
      },
    },
    {
      id: "vscode",
      name: "VS Code",
      logo: "vscode",
      tagline: "GitHub Copilot agent mode",
      steps: [
        "Click **Install in VS Code**, or add this to `.vscode/mcp.json`",
        "Start **sdwise** from the MCP servers list and sign in when asked",
      ],
      snippet: {
        label: ".vscode/mcp.json",
        code: json({ servers: { sdwise: { type: "http", url } } }),
      },
      action: {
        label: "Install in VS Code",
        href: `vscode:mcp/install?${encodeURIComponent(JSON.stringify({ name: "sdwise", type: "http", url }))}`,
      },
    },
    {
      id: "windsurf",
      name: "Windsurf",
      logo: "windsurf",
      tagline: "Cascade",
      steps: [
        "Add this to `~/.codeium/windsurf/mcp_config.json`",
        "Refresh the MCP servers in Cascade and sign in when asked",
      ],
      snippet: {
        label: "mcp_config.json",
        code: json({ mcpServers: { sdwise: { serverUrl: url } } }),
      },
    },
  ];
}

const PROMPTS = [
  "Ask SD Wise when the December payroll cut-off is",
  "Is there a deploy freeze over the holidays?",
  "What's waiting in my SD Wise inbox?",
];

// Which logo a registered client gets, from the name it registered with.
const BRANDS: [RegExp, string][] = [
  [/claude|anthropic/, "claude"],
  [/chatgpt|openai/, "openai"],
  [/copilot studio|microsoft|power ?(platform|apps|automate)/, "microsoft"],
  [/cursor/, "cursor"],
  [/visual studio code|vs ?code/, "vscode"],
  [/windsurf|codeium/, "windsurf"],
  [/github/, "github-copilot"],
];

const brandOf = (client: McpClient) => {
  const text =
    `${client.name} ${client.clientId} ${client.uri ?? ""}`.toLowerCase();
  return BRANDS.find(([pattern]) => pattern.test(text))?.[1] ?? null;
};

// What the OAuth scopes a client holds mean, in words.
const GRANTS: Record<string, string> = {
  profile: "Your name",
  email: "Your email",
  offline_access: "Stays signed in",
};

const grants = (scopes: string[]) => [
  "Acts as you",
  ...scopes.flatMap((scope) => GRANTS[scope] ?? []),
];

// **bold** and `code`, enough for setup steps. Parts are keyed by where they
// start in the text.
function Rich({ text }: { text: string }) {
  let at = 0;
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/).map((part) => {
    const key = at;
    at += part.length;
    if (part.startsWith("**")) {
      return (
        <strong key={key} className="font-semibold text-navy">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`")) {
      return (
        <code
          key={key}
          className="rounded bg-canvas px-1 py-0.5 font-mono text-[12px] text-navy"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={key}>{part}</Fragment>;
  });
}

export function Mcp({
  url,
  clients,
  tools,
}: {
  url: string;
  clients: McpClient[];
  tools: ToolSummary[];
}) {
  return (
    <div className="flex flex-col gap-10">
      <Hero url={url} tools={tools.length} />
      <ConnectedClients clients={clients} />
      <Setup url={url} />
      <Tools tools={tools} />
    </div>
  );
}

function Hero({ url, tools }: { url: string; tools: number }) {
  const [status, setStatus] = useState<"checking" | "online" | "offline">(
    "checking",
  );

  // A real check: MCP clients start at the protected resource metadata.
  useEffect(() => {
    const path = new URL(url).pathname;
    fetch(`/.well-known/oauth-protected-resource${path}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setStatus(data?.resource === url ? "online" : "offline"))
      .catch(() => setStatus("offline"));
  }, [url]);

  return (
    <section className="relative overflow-hidden rounded-3xl bg-navy p-6 text-white sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-24 size-96 rounded-full bg-brand/30 blur-3xl"
      />
      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-white">
              <Logo name="mcp" size="sm" className="ring-0" />
            </span>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                SD Wise MCP server
              </h2>
              <StatusDot status={status} />
            </div>
          </div>
          <p className="mt-4 text-sm text-white/70">
            Bring the company brain into Claude, ChatGPT, Copilot, Cursor or VS
            Code. Your AI signs in as you, so it sees exactly what you can see
            and nothing more.
          </p>
        </div>
        <ClientStack />
      </div>

      <div className="relative mt-6 flex items-center gap-2 rounded-xl bg-white/5 p-1.5 pl-4 ring-1 ring-white/10">
        <span className="shrink-0 text-xs font-medium text-white/50">URL</span>
        <code className="min-w-0 flex-1 truncate font-mono text-sm">{url}</code>
        <CopyButton value={url} tone="dark" />
      </div>
      <ul className="relative mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-white/60">
        <li>Streamable HTTP</li>
        <li>OAuth 2.1 sign-in with PKCE</li>
        <li>{tools} tools</li>
        <li>Same visibility rules as the app</li>
      </ul>
    </section>
  );
}

function StatusDot({ status }: { status: "checking" | "online" | "offline" }) {
  const { dot, label } = {
    checking: { dot: "bg-white/40", label: "Checking discovery…" },
    online: { dot: "bg-emerald-400", label: "Online, ready for clients" },
    offline: { dot: "bg-worx-red", label: "Discovery unreachable" },
  }[status];
  return (
    <p className="flex items-center gap-1.5 text-xs text-white/60">
      <span className="relative flex size-1.5">
        {status === "online" && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        )}
        <span className={`relative inline-flex size-1.5 rounded-full ${dot}`} />
      </span>
      {label}
    </p>
  );
}

function ClientStack() {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs whitespace-nowrap text-white/50">
        Works with
      </span>
      <div className="flex -space-x-2">
        {["claude", "openai", "microsoft", "cursor", "vscode"].map((logo) => (
          <Logo
            key={logo}
            name={logo}
            size="sm"
            className="animate-rise ring-2 ring-navy transition-transform hover:z-10 hover:-translate-y-1"
          />
        ))}
      </div>
    </div>
  );
}

function SectionTitle({
  title,
  description,
  aside,
}: {
  title: string;
  description: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-base font-semibold text-navy">{title}</h2>
        <p className="mt-0.5 text-sm text-muted">{description}</p>
      </div>
      {aside}
    </div>
  );
}

function ConnectedClients({ clients }: { clients: McpClient[] }) {
  return (
    <section>
      <SectionTitle
        title="Your AI clients"
        description="Apps you allowed to use SD Wise as you."
        aside={
          clients.length > 0 && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              {clients.length} connected
            </span>
          )
        }
      />
      {clients.length === 0 ? (
        <div className="flex items-center gap-4 rounded-2xl border border-dashed border-line p-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-canvas">
            <Unplug className="size-5 text-muted" />
          </span>
          <div className="text-sm">
            <p className="font-medium text-navy">No AI clients yet</p>
            <p className="text-muted">
              Add SD Wise to one below. Once you allow it, it shows up here and
              you can cut it off any time.
            </p>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-white ring-1 ring-line">
          {clients.map((client) => (
            <ClientRow key={client.clientId} client={client} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ClientRow({ client }: { client: McpClient }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const brand = brandOf(client);

  return (
    <li
      className={`animate-fade flex flex-wrap items-center gap-4 p-4 transition-opacity ${
        pending ? "opacity-50" : ""
      }`}
    >
      {brand ? (
        <Logo name={brand} />
      ) : (
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-canvas text-sm font-semibold text-navy ring-1 ring-line">
          {client.name.slice(0, 2)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-navy">{client.name}</p>
        <p className="text-xs text-muted">
          Allowed {dateFormat.format(new Date(client.connectedAt))}
          {client.lastActiveAt &&
            ` · last active ${timeAgo(client.lastActiveAt)}`}
        </p>
      </div>
      {!confirming && (
        <div className="hidden flex-wrap gap-1 md:flex">
          {grants(client.scopes).map((grant) => (
            <span
              key={grant}
              className="rounded-full bg-canvas px-2 py-0.5 text-[11px] text-muted"
            >
              {grant}
            </span>
          ))}
        </div>
      )}
      {confirming ? (
        <div className="animate-fade flex items-center gap-2">
          <span className="text-xs text-muted">
            Access ends within the hour.
          </span>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-canvas hover:text-navy"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(() => disconnectClient(client.clientId))
            }
            className="flex items-center gap-1.5 rounded-lg bg-worx-red px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {pending && <Loader2 className="size-3 animate-spin" />}
            Disconnect
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-red-50 hover:text-worx-red"
        >
          Disconnect
        </button>
      )}
    </li>
  );
}

function Setup({ url }: { url: string }) {
  const all = guides(url);
  const [active, setActive] = useState("claude");
  const guide = all.find((g) => g.id === active);
  const local = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(
    new URL(url).hostname,
  );

  return (
    <section>
      <SectionTitle
        title="Add SD Wise to your AI"
        description="Pick your client. Setup takes about a minute."
      />
      <div className="grid overflow-hidden rounded-2xl bg-white ring-1 ring-line md:grid-cols-[15rem_1fr]">
        <div
          role="tablist"
          aria-orientation="vertical"
          aria-label="MCP clients"
          className="flex gap-1 overflow-x-auto border-b border-line bg-canvas/50 p-2 md:flex-col md:border-r md:border-b-0"
        >
          {all.map((g) => (
            <button
              key={g.id}
              type="button"
              role="tab"
              id={`tab-${g.id}`}
              aria-selected={g.id === active}
              aria-controls="mcp-guide"
              onClick={() => setActive(g.id)}
              className={`flex shrink-0 items-center gap-3 rounded-xl p-2 text-left transition-all ${
                g.id === active
                  ? "bg-white shadow-sm ring-1 ring-line"
                  : "hover:bg-white/60"
              }`}
            >
              <Logo name={g.logo} size="sm" />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-navy">
                  {g.name}
                </span>
                <span className="hidden truncate text-xs text-muted md:block">
                  {g.tagline}
                </span>
              </span>
            </button>
          ))}
        </div>

        {guide && (
          <div
            key={guide.id}
            id="mcp-guide"
            role="tabpanel"
            aria-labelledby={`tab-${guide.id}`}
            className="animate-fade flex min-w-0 flex-col gap-5 p-6"
          >
            <div className="flex items-center gap-3">
              <Logo name={guide.logo} />
              <div>
                <h3 className="font-semibold text-navy">{guide.name}</h3>
                <p className="text-sm text-muted">{guide.tagline}</p>
              </div>
            </div>

            {guide.cloud && local && (
              <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <span>
                  {guide.name} connects from the cloud, so it needs a public
                  HTTPS URL. This server runs on {new URL(url).host}: deploy SD
                  Wise or open a tunnel first.
                </span>
              </p>
            )}

            <ol className="flex flex-col gap-3">
              {guide.steps.map((step, i) => (
                <li key={step} className="flex gap-3 text-sm text-ink">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">
                    <Rich text={step} />
                  </span>
                </li>
              ))}
            </ol>

            {guide.snippet ? (
              <Snippet label={guide.snippet.label} code={guide.snippet.code} />
            ) : (
              <Snippet label="Server URL" code={url} />
            )}

            {guide.action && (
              <a
                href={guide.action.href}
                target={
                  guide.action.href.startsWith("http") ? "_blank" : undefined
                }
                rel="noreferrer"
                className="group inline-flex items-center gap-2 self-start rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-deep"
              >
                <Logo name={guide.logo} size="xs" className="ring-0" />
                {guide.action.label}
                <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            )}

            <div className="border-t border-line pt-4">
              <p className="text-xs font-semibold tracking-wider text-muted uppercase">
                Then try
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {PROMPTS.map((prompt) => (
                  <span
                    key={prompt}
                    className="inline-flex items-center gap-1 rounded-full bg-canvas py-1 pr-1 pl-3 text-xs text-ink"
                  >
                    “{prompt}”
                    <CopyButton value={prompt} label="Copy prompt" compact />
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Snippet({ label, code }: { label: string; code: string }) {
  return (
    <div className="overflow-hidden rounded-xl bg-navy-deep text-white">
      <div className="flex items-center justify-between border-b border-white/10 py-1.5 pr-1.5 pl-4">
        <span className="font-mono text-xs text-white/50">{label}</span>
        <CopyButton value={code} tone="dark" />
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed">
        {code}
      </pre>
    </div>
  );
}

function Tools({ tools }: { tools: ToolSummary[] }) {
  return (
    <section>
      <SectionTitle
        title="Tools"
        description="What your AI can do in SD Wise. Every call runs as you."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {tools.map((tool) => (
          <article
            key={tool.name}
            className="flex flex-col rounded-2xl bg-white p-5 ring-1 ring-line"
          >
            <div className="flex items-start justify-between gap-3">
              <code className="font-mono text-sm font-semibold text-navy">
                {tool.name}
              </code>
              {tool.appOnly ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand">
                  <MousePointerClick className="size-3" /> Only from the answer
                  card
                </span>
              ) : tool.readOnly ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                  <Eye className="size-3" /> Read-only
                </span>
              ) : (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                  <Send className="size-3" /> Sends as you
                </span>
              )}
            </div>
            <p className="mt-1 text-sm font-medium text-ink">{tool.title}</p>
            <p className="mt-1 flex-1 text-sm text-muted">
              <Rich text={tool.description} />
            </p>
            {tool.params.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {tool.params.map((param) => (
                  <code
                    key={param.name}
                    className="rounded-md bg-canvas px-1.5 py-0.5 font-mono text-[11px] text-muted"
                  >
                    {param.name}
                    {param.required ? "" : "?"}:{" "}
                    <span className="text-brand">{param.type}</span>
                  </code>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import { createMcpToken } from "@/app/(app)/settings/actions";
import {
  errorClass,
  inputClass,
  labelClass,
  primaryButtonClass,
} from "./styles";

export function McpTokenForm({ endpoint }: { endpoint: string }) {
  const [label, setLabel] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      setToken(await createMcpToken(label));
      setLabel("");
    } catch {
      setError("Unable to create token");
    }
    setBusy(false);
  };

  const cursor = JSON.stringify(
    {
      mcpServers: {
        sdwise: {
          url: endpoint,
          headers: { Authorization: `Bearer ${token}` },
        },
      },
    },
    null,
    2,
  );
  const claude = `claude mcp add --transport http sdwise ${endpoint} --header "Authorization: Bearer ${token}"`;

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="max-w-sm space-y-2">
        <label htmlFor="mcp-label" className={labelClass}>
          Token name
        </label>
        <input
          id="mcp-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Cursor on my laptop"
          maxLength={60}
          required
          className={inputClass}
        />
        {error && <p className={errorClass}>{error}</p>}
        <button type="submit" disabled={busy} className={primaryButtonClass}>
          {busy ? "Creating..." : "Create token"}
        </button>
      </form>
      {token && (
        <div className="space-y-3 text-sm">
          <p className="font-medium text-zinc-900 dark:text-zinc-50">
            Copy it now, it won't be shown again.
          </p>
          <p className={labelClass}>Cursor (.cursor/mcp.json)</p>
          <pre className="overflow-x-auto rounded-lg bg-zinc-100 p-3 text-xs dark:bg-zinc-800">
            {cursor}
          </pre>
          <p className={labelClass}>Claude Code</p>
          <pre className="overflow-x-auto rounded-lg bg-zinc-100 p-3 text-xs dark:bg-zinc-800">
            {claude}
          </pre>
        </div>
      )}
    </div>
  );
}

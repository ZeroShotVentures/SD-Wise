"use client";

import { Check, Loader2, ShieldCheck, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { setConnected } from "@/app/(app)/integrations/actions";
import { dateFormat, INTEGRATIONS } from "@/lib/graph/meta";
import type { Integration } from "@/lib/graph/types";

type IntegrationStats = Integration & { facts: number; people: number };

const CATEGORIES = ["Chat", "Email", "Meetings"];

export function IntegrationGrid({
  integrations,
}: {
  integrations: IntegrationStats[];
}) {
  const [connecting, setConnecting] = useState<IntegrationStats | null>(null);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-start gap-3 rounded-2xl bg-navy p-5 text-white">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-worx-yellow" />
        <div className="text-sm">
          <p className="font-medium">Private by default</p>
          <p className="mt-1 text-white/70">
            Every fact is owned by the people who were in the conversation.
            Nobody else sees it unless an owner shares it.
          </p>
        </div>
      </div>

      {CATEGORIES.map((category) => (
        <section key={category}>
          <h2 className="text-xs font-semibold tracking-wider text-muted uppercase">
            {category}
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {integrations
              .filter((i) => INTEGRATIONS[i.type].category === category)
              .map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  onConnect={() => setConnecting(integration)}
                />
              ))}
          </div>
        </section>
      ))}

      {connecting && (
        <ConnectDialog
          integration={connecting}
          onClose={() => setConnecting(null)}
        />
      )}
    </div>
  );
}

function Mark({ type }: { type: Integration["type"] }) {
  const meta = INTEGRATIONS[type];
  return (
    <span
      aria-hidden
      className="flex size-10 items-center justify-center rounded-xl text-base font-bold text-white"
      style={{ backgroundColor: meta.mark }}
    >
      {meta.label[0]}
    </span>
  );
}

function IntegrationCard({
  integration,
  onConnect,
}: {
  integration: IntegrationStats;
  onConnect: () => void;
}) {
  const meta = INTEGRATIONS[integration.type];
  const [pending, startTransition] = useTransition();

  return (
    <article className="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-line">
      <div className="flex items-start justify-between">
        <Mark type={integration.type} />
        {integration.connected && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Connected
          </span>
        )}
      </div>
      <h3 className="mt-4 font-semibold text-navy">{meta.label}</h3>
      <p className="mt-1 flex-1 text-sm text-muted">{meta.description}</p>
      {integration.connected ? (
        <>
          <p className="mt-4 text-xs text-muted">
            {integration.facts} facts from {integration.people} people
            {integration.connectedAt &&
              ` · since ${dateFormat.format(new Date(integration.connectedAt))}`}
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(() =>
                setConnected({ id: integration.id, connected: false }),
              )
            }
            className="mt-3 rounded-lg border border-line px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-worx-red hover:text-worx-red disabled:opacity-50"
          >
            {pending ? "Disconnecting..." : "Disconnect"}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={onConnect}
          className="mt-4 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
        >
          Connect
        </button>
      )}
    </article>
  );
}

const STEPS = [
  "Signing in",
  "Mapping who is in which conversation",
  "Extracting facts",
];

function ConnectDialog({
  integration,
  onClose,
}: {
  integration: IntegrationStats;
  onClose: () => void;
}) {
  const meta = INTEGRATIONS[integration.type];
  const [step, setStep] = useState(-1);
  const [error, setError] = useState("");

  useEffect(() => {
    if (step < 0 || step >= STEPS.length) return;
    const timer = setTimeout(async () => {
      if (step < STEPS.length - 1) {
        setStep(step + 1);
        return;
      }
      try {
        await setConnected({ id: integration.id, connected: true });
        setStep(STEPS.length);
      } catch {
        setError("Couldn't connect. Try again.");
        setStep(-1);
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [step, integration.id]);

  const done = step >= STEPS.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-6 backdrop-blur-sm">
      <dialog
        open
        aria-modal
        aria-label={`Connect ${meta.label}`}
        className="animate-rise static m-0 w-full max-w-md rounded-2xl bg-white p-6 text-ink shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <Mark type={integration.type} />
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted hover:bg-canvas hover:text-navy"
          >
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>
        <h2 className="mt-4 text-lg font-semibold text-navy">
          Connect {meta.label}
        </h2>

        {step < 0 ? (
          <>
            <p className="mt-2 text-sm text-muted">SD Wise will be able to:</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {[
                "Read conversations you're part of",
                "See who took part in each conversation",
                "Never post, reply or share on your behalf",
              ].map((line) => (
                <li key={line} className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-600" /> {line}
                </li>
              ))}
            </ul>
            {error && <p className="mt-4 text-sm text-worx-red">{error}</p>}
            <button
              type="button"
              onClick={() => setStep(0)}
              className="mt-6 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-dark"
            >
              Allow access
            </button>
          </>
        ) : (
          <>
            <ol className="mt-4 flex flex-col gap-3">
              {STEPS.map((label, i) => (
                <li key={label} className="flex items-center gap-3 text-sm">
                  {i < step || done ? (
                    <Check className="size-4 text-emerald-600" />
                  ) : i === step ? (
                    <Loader2 className="size-4 animate-spin text-brand" />
                  ) : (
                    <span className="size-4 rounded-full border border-line" />
                  )}
                  <span className={i > step && !done ? "text-muted" : ""}>
                    {label}
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-canvas">
              <div
                className="h-full rounded-full bg-brand transition-all duration-700"
                style={{
                  width: `${Math.min(100, ((step + 1) / STEPS.length) * 100)}%`,
                }}
              />
            </div>
            {done && (
              <button
                type="button"
                onClick={onClose}
                className="mt-6 w-full rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-deep"
              >
                Done
              </button>
            )}
          </>
        )}
      </dialog>
    </div>
  );
}

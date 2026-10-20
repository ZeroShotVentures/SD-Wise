"use client";

import { ArrowRight, Check, Loader2, Lock, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { setConnected } from "@/app/(app)/integrations/actions";
import { INTEGRATIONS, SUITES, type Suite } from "@/lib/graph/meta";
import type { IntegrationStats } from "@/lib/graph/types";
import { Logo, SdWiseMark } from "./logo";

const STEP_MS = 650;

const list = (labels: string[]) =>
  labels.length < 2
    ? labels.join("")
    : `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;

// Connects one integration, or several from one suite with a single sign-in.
// Mocked: the steps are timed, then the integrations flip to connected.
export function ConnectDialog({
  items,
  suite,
  onClose,
}: {
  items: [IntegrationStats, ...IntegrationStats[]];
  suite?: Suite;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState(() => items.map((i) => i.id));
  const [step, setStep] = useState(-1);
  const [error, setError] = useState("");

  const chosen = items.filter((i) => selected.includes(i.id));
  const first = INTEGRATIONS[items[0].type];
  const isSuite = !!suite && items.length > 1;
  const provider = suite ? SUITES[suite].provider : first.provider;
  const title = isSuite && suite ? SUITES[suite].label : first.label;
  const scopes = [
    ...new Set(chosen.flatMap((i) => INTEGRATIONS[i.type].scopes)),
  ];
  const documents = chosen.every(
    (i) => INTEGRATIONS[i.type].category === "Documents",
  );

  const steps = [
    {
      label: `Signing in with ${provider}`,
      logo: suite ? SUITES[suite].logo : first.logo,
    },
    ...(isSuite
      ? chosen.map((i) => ({
          label: `Reading ${INTEGRATIONS[i.type].label}`,
          logo: INTEGRATIONS[i.type].logo,
        }))
      : [
          {
            label: documents
              ? "Mapping who can open which file"
              : "Mapping who is in which conversation",
            logo: null,
          },
        ]),
    { label: "Extracting facts", logo: null },
  ];
  const running = step >= 0 && step < steps.length;
  const done = step >= steps.length;

  // Clicking the backdrop closes the dialog, except while connecting. The
  // backdrop isn't an element, so listen on the dialog itself.
  const busy = useRef(false);
  useEffect(() => {
    busy.current = running;
  });
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    const onClick = (e: MouseEvent) => {
      if (e.target === dialog && !busy.current) dialog.close();
    };
    dialog.addEventListener("click", onClick);
    return () => dialog.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(async () => {
      if (step < steps.length - 1) {
        setStep(step + 1);
        return;
      }
      try {
        await setConnected({ ids: selected, connected: true });
        setStep(steps.length);
      } catch {
        setError("Couldn't connect. Try again.");
        setStep(-1);
      }
    }, STEP_MS);
    return () => clearTimeout(timer);
  }, [running, step, steps.length, selected]);

  const close = () => ref.current?.close();

  return (
    <dialog
      ref={ref}
      aria-label={`Connect ${title}`}
      onClose={onClose}
      onCancel={(e) => running && e.preventDefault()}
      className="animate-pop mx-auto mt-[12vh] w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-2xl bg-white p-0 text-ink shadow-2xl backdrop:bg-navy/60 backdrop:backdrop-blur-sm"
    >
      <div className="relative p-6">
        {!running && (
          <button
            type="button"
            onClick={close}
            className="absolute top-4 right-4 rounded-md p-1 text-muted transition-colors hover:bg-canvas hover:text-navy"
          >
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </button>
        )}

        <Handshake
          logo={isSuite && suite ? SUITES[suite].logo : first.logo}
          state={done ? "done" : running ? "running" : "idle"}
        />

        {done ? (
          <Done
            labels={chosen.map((i) => INTEGRATIONS[i.type].label)}
            onClose={close}
          />
        ) : (
          <>
            <h2 className="mt-5 text-center text-lg font-semibold text-navy">
              Connect {title}
            </h2>
            <p className="mt-1 text-center text-sm text-muted">
              {isSuite
                ? `One ${provider} sign-in for every app you pick.`
                : first.description}
            </p>

            {step < 0 ? (
              <>
                {isSuite && (
                  <fieldset className="mt-5">
                    <legend className="text-xs font-semibold tracking-wider text-muted uppercase">
                      Apps
                    </legend>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {items.map((item) => {
                        const meta = INTEGRATIONS[item.type];
                        const on = selected.includes(item.id);
                        return (
                          <label
                            key={item.id}
                            className={`flex cursor-pointer items-center gap-2.5 rounded-xl p-2 text-sm ring-1 transition-all ${
                              on
                                ? "bg-brand-soft/60 ring-brand/40"
                                : "ring-line hover:bg-canvas"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={on}
                              onChange={() =>
                                setSelected((ids) =>
                                  on
                                    ? ids.filter((id) => id !== item.id)
                                    : [...ids, item.id],
                                )
                              }
                            />
                            <Logo name={meta.logo} size="sm" />
                            <span className="min-w-0 flex-1 truncate font-medium text-navy">
                              {meta.label}
                            </span>
                            <span
                              className={`flex size-4 items-center justify-center rounded-full transition-colors ${
                                on ? "bg-brand text-white" : "ring-1 ring-line"
                              }`}
                            >
                              {on && (
                                <Check className="size-3" strokeWidth={3} />
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                )}

                <ul className="mt-5 flex flex-col gap-2 text-sm">
                  {[
                    documents
                      ? "Read files and pages you can open"
                      : "Read conversations you're part of",
                    documents
                      ? "See who else can open each one"
                      : "See who took part in each conversation",
                  ].map((line) => (
                    <li key={line} className="flex items-center gap-2.5">
                      <Check className="size-4 text-emerald-600" /> {line}
                    </li>
                  ))}
                  <li className="flex items-center gap-2.5">
                    <X className="size-4 text-worx-red" /> Never post, reply or
                    share on your behalf
                  </li>
                </ul>

                <div className="mt-5 rounded-xl bg-canvas p-3">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
                    <Lock className="size-3" />
                    Read-only {suite ? SUITES[suite].api : provider} permissions
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {scopes.map((scope) => (
                      <code
                        key={scope}
                        className="animate-fade rounded-md bg-white px-1.5 py-0.5 font-mono text-[11px] text-navy ring-1 ring-line"
                      >
                        {scope}
                      </code>
                    ))}
                  </div>
                </div>

                {error && (
                  <p role="alert" className="mt-4 text-sm text-worx-red">
                    {error}
                  </p>
                )}

                <ProviderButton
                  provider={provider}
                  logo={suite ? SUITES[suite].logo : first.logo}
                  microsoft={suite === "microsoft"}
                  disabled={chosen.length === 0}
                  onClick={() => {
                    setError("");
                    setStep(0);
                  }}
                />
              </>
            ) : (
              <Progress steps={steps} step={step} />
            )}
          </>
        )}
      </div>
    </dialog>
  );
}

function Handshake({
  logo,
  state,
}: {
  logo: string;
  state: "idle" | "running" | "done";
}) {
  return (
    <div className="flex items-center justify-center gap-3 pt-2">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-white ring-1 ring-line">
        <SdWiseMark className="h-7" />
      </span>
      <span className="relative flex w-16 items-center justify-center">
        <span
          className={`h-1 w-full ${
            state === "running"
              ? "animate-flow text-brand"
              : state === "done"
                ? "rounded-full bg-emerald-500"
                : "animate-flow text-line [animation-play-state:paused]"
          }`}
        />
        {state === "done" && (
          <span className="animate-pop absolute flex size-6 items-center justify-center rounded-full bg-emerald-500 text-white ring-4 ring-white">
            <Check className="size-3.5" strokeWidth={3} />
          </span>
        )}
      </span>
      <Logo name={logo} size="lg" />
    </div>
  );
}

function ProviderButton({
  provider,
  logo,
  microsoft,
  disabled,
  onClick,
}: {
  provider: string;
  logo: string;
  microsoft: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  // Microsoft's sign-in button: dark, square logo, Segoe-like weight.
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`group mt-6 flex w-full items-center justify-center gap-2.5 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 ${
        microsoft
          ? "bg-[#2f2f2f] hover:bg-black"
          : "bg-brand hover:bg-brand-dark"
      }`}
    >
      <Logo
        name={microsoft ? "microsoft" : logo}
        size="xs"
        className="ring-0"
      />
      {microsoft ? "Sign in with Microsoft" : `Continue with ${provider}`}
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

function Progress({
  steps,
  step,
}: {
  steps: { label: string; logo: string | null }[];
  step: number;
}) {
  return (
    <>
      <ol className="mt-6 flex flex-col gap-3" aria-live="polite">
        {steps.map(({ label, logo }, i) => (
          <li
            key={label}
            className={`flex items-center gap-3 text-sm transition-opacity duration-300 ${
              i > step ? "opacity-40" : ""
            }`}
          >
            <span className="flex size-5 items-center justify-center">
              {i < step ? (
                <span className="animate-pop flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Check className="size-3" strokeWidth={3} />
                </span>
              ) : i === step ? (
                <Loader2 className="size-4 animate-spin text-brand" />
              ) : (
                <span className="size-4 rounded-full border border-line" />
              )}
            </span>
            <span className="flex-1">{label}</span>
            {logo && <Logo name={logo} size="xs" />}
          </li>
        ))}
      </ol>
      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-canvas">
        <div
          className="h-full rounded-full bg-brand transition-all duration-500 ease-out"
          style={{ width: `${((step + 1) / steps.length) * 100}%` }}
        />
      </div>
    </>
  );
}

function Done({ labels, onClose }: { labels: string[]; onClose: () => void }) {
  // The button that started connecting is gone; move focus to the next step.
  const done = useRef<HTMLButtonElement>(null);
  useEffect(() => done.current?.focus(), []);

  return (
    <div className="animate-rise text-center">
      <h2 className="mt-5 text-lg font-semibold text-navy">
        {labels.length > 1 ? "You're connected" : `${labels[0]} is connected`}
      </h2>
      <p className="mt-1 text-sm text-muted">
        {labels.length > 1 && `${list(labels)} are in. `}
        New facts appear in your graph as SD Wise extracts them, visible only to
        the people they belong to.
      </p>
      <div className="mt-6 flex gap-2">
        <Link
          href="/graph"
          className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-navy ring-1 ring-line transition-colors hover:bg-canvas"
        >
          Open graph
        </Link>
        <button
          type="button"
          ref={done}
          onClick={onClose}
          className="flex-1 rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-deep"
        >
          Done
        </button>
      </div>
    </div>
  );
}

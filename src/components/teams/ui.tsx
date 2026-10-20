"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export const ICON_BUTTON =
  "inline-flex size-8 items-center justify-center rounded-md text-[#616161] transition-colors hover:bg-[#f0f0f0] hover:text-[#5b5fc7] disabled:pointer-events-none disabled:opacity-40";

export function IconButton({
  label,
  onClick,
  active,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`${ICON_BUTTON} ${active ? "bg-[#e8ebfa] text-[#5b5fc7]" : ""}`}
    >
      {children}
      <span className="sr-only">{label}</span>
    </button>
  );
}

const PLACEMENT = {
  "bottom-end": "top-full right-0 mt-1",
  "bottom-start": "top-full left-0 mt-1",
  "top-start": "bottom-full left-0 mb-1",
  "top-end": "bottom-full right-0 mb-1",
  right: "top-0 left-full ml-2",
};

export function Popover({
  label,
  trigger,
  triggerClassName = ICON_BUTTON,
  placement = "bottom-end",
  children,
}: {
  label: string;
  trigger: ReactNode;
  triggerClassName?: string;
  placement?: keyof typeof PLACEMENT;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title={label}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`${triggerClassName} ${open ? "bg-[#e8ebfa] text-[#5b5fc7]" : ""}`}
      >
        {trigger}
        <span className="sr-only">{label}</span>
      </button>
      {open && (
        <div
          className={`animate-pop absolute z-30 min-w-52 rounded-lg border border-[#e0e0e0] bg-white p-1 text-[#242424] shadow-xl ${PLACEMENT[placement]}`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  icon,
  onClick,
  selected,
  children,
}: {
  icon?: ReactNode;
  onClick: () => void;
  selected?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-[#f5f5f5] ${
        selected ? "font-semibold text-[#5b5fc7]" : ""
      }`}
    >
      {icon && (
        <span className="flex size-4 shrink-0 items-center justify-center text-[#616161]">
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </button>
  );
}

type Toast = { message: string; action?: { label: string; run: () => void } };

const NotifyContext = createContext<
  (message: string, action?: Toast["action"]) => void
>(() => {});

export const useNotify = () => useContext(NotifyContext);

export function NotifyProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const notify = useCallback((message: string, action?: Toast["action"]) => {
    setToast({ message, action });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(
      () => setToast(null),
      action ? 6000 : 2500,
    );
  }, []);

  return (
    <NotifyContext value={notify}>
      {children}
      {toast && (
        <output className="animate-rise fixed bottom-6 left-1/2 z-50 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-3 rounded-md bg-[#242424] py-2 pr-2 pl-4 text-sm text-white shadow-lg">
          <span className="min-w-0 truncate">{toast.message}</span>
          {toast.action ? (
            <button
              type="button"
              onClick={() => {
                toast.action?.run();
                setToast(null);
              }}
              className="shrink-0 rounded px-2 py-1 font-semibold text-[#c5c7f5] hover:bg-white/10"
            >
              {toast.action.label}
            </button>
          ) : (
            <span className="w-2" />
          )}
        </output>
      )}
    </NotifyContext>
  );
}

// The three bars of the SD Wise logo, legible at avatar size.
export function WiseMark({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md border border-[#e0e0e0] bg-white ${className}`}
    >
      <svg viewBox="0 0 32 32" className="size-[78%]" aria-hidden>
        <polygon points="5,25 9,25 10.2,18 6.2,18" fill="#7a8399" />
        <polygon points="11,28 15,28 18,11 14,11" fill="#e0003c" />
        <polygon points="17,24 21,24 25,4 21,4" fill="#f5a800" />
      </svg>
    </span>
  );
}

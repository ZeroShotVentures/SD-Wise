const TONES = {
  neutral: "bg-subtle text-muted ring-line",
  brand: "bg-brand-soft text-brand-dark ring-brand/15",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  warning: "bg-amber-50 text-amber-800 ring-amber-600/20",
  danger: "bg-red-50 text-red-700 ring-red-600/15",
} as const;

export type BadgeTone = keyof typeof TONES;

// A status label. `dot` adds a leading status dot in the tone's colour.
export function Badge({
  tone = "neutral",
  dot = false,
  className = "",
  children,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset ${TONES[tone]} ${className}`}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

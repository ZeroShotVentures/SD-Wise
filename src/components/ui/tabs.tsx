"use client";

export type TabItem<K extends string> = {
  key: K;
  label: string;
  count?: number | string;
  icon?: React.ReactNode;
};

// Underlined tabs under a page header. Selecting one updates `?tab=` in the
// URL without a navigation, so a reload or shared link opens the same tab.
export function Tabs<K extends string>({
  label,
  items,
  value,
  onChange,
  param = "tab",
}: {
  label: string;
  items: TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  param?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="-mx-4 flex gap-6 overflow-x-auto border-b border-line px-4 [scrollbar-width:none] sm:mx-0 sm:px-0"
    >
      {items.map((item) => {
        const active = item.key === value;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => {
              onChange(item.key);
              const url = new URL(window.location.href);
              url.searchParams.set(param, item.key);
              window.history.replaceState(null, "", url);
            }}
            className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "border-brand text-ink"
                : "border-transparent text-muted hover:border-line-strong hover:text-ink"
            }`}
          >
            {item.icon}
            {item.label}
            {item.count !== undefined && item.count !== "" && (
              <span
                className={`rounded-full px-1.5 py-px text-[11px] font-semibold tabular-nums ${
                  active
                    ? "bg-brand-soft text-brand-dark"
                    : "bg-subtle text-muted"
                }`}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

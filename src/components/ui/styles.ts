// The app's controls, as class strings so links, buttons and form elements
// share them. Below sm, inputs use 16px text so iOS doesn't zoom in on focus,
// and primary actions go full width at a thumb-friendly height.

const control =
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50";

export const primaryButtonClass = `${control} bg-brand px-3.5 py-2.5 text-white shadow-xs hover:bg-brand-dark max-sm:w-full sm:py-2`;

export const secondaryButtonClass = `${control} border border-line-strong bg-white px-3 py-2 text-ink shadow-xs hover:bg-subtle sm:py-1.5`;

export const ghostButtonClass = `${control} px-3 py-2 text-muted hover:bg-subtle hover:text-ink sm:py-1.5`;

export const dangerButtonClass = `${control} bg-worx-red px-3.5 py-2.5 text-white shadow-xs hover:bg-[#b80032] max-sm:w-full sm:py-2`;

export const iconButtonClass =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-subtle hover:text-ink";

export const inputClass =
  "w-full rounded-md border border-line-strong bg-white px-3 py-2.5 text-base text-ink shadow-xs transition-[border-color,box-shadow] placeholder:text-faint focus:border-brand focus:ring-3 focus:ring-brand/15 focus:outline-none sm:py-2 sm:text-sm";

export const labelClass = "block text-sm font-medium text-ink";

export const hintClass = "text-xs text-muted";

export const cardClass = "rounded-lg border border-line bg-white shadow-xs";

export const eyebrowClass =
  "text-[11px] font-semibold tracking-wider text-muted uppercase";

export const errorClass = "text-sm text-worx-red";

export const successClass = "text-sm text-emerald-700";

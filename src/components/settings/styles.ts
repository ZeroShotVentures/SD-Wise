// Below sm, inputs use 16px text so iOS doesn't zoom in on focus, and
// primary actions go full width at a thumb-friendly height.
export const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 sm:py-2 sm:text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-400 dark:focus:ring-zinc-400";

export const labelClass =
  "text-sm font-medium text-zinc-700 dark:text-zinc-300";

export const primaryButtonClass =
  "w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 sm:w-auto sm:py-2 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200";

export const secondaryButtonClass =
  "rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 sm:py-1.5 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

export const dangerButtonClass =
  "w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50 sm:w-auto sm:py-2";

export const errorClass = "text-sm text-red-600 dark:text-red-400";

export const successClass = "text-sm text-emerald-700 dark:text-emerald-400";

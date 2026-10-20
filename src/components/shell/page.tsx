import Link from "next/link";

// Every page but the graph: a header with the title and the page's actions,
// then the content, both on one centred column.
export function Page({
  title,
  description,
  actions,
  back,
  width = "default",
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
  width?: "default" | "narrow";
  children: React.ReactNode;
}) {
  const column = width === "narrow" ? "max-w-3xl" : "max-w-6xl";
  return (
    <div
      className={`mx-auto w-full ${column} px-4 pt-6 pb-16 sm:px-8 sm:pt-10`}
    >
      <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {back && (
            <Link
              href={back.href}
              className="mb-2 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-ink"
            >
              <span aria-hidden>←</span> {back.label}
            </Link>
          )}
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
      </header>
      {children}
    </div>
  );
}

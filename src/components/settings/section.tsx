type SectionProps = {
  title: string;
  description?: string;
  tone?: "default" | "danger";
  children: React.ReactNode;
};

// A settings group: what it is on the left, the controls in a card on the
// right. Stacks on phones.
export function Section({
  title,
  description,
  tone = "default",
  children,
}: SectionProps) {
  return (
    <section className="grid gap-3 border-t border-line pt-6 first:border-t-0 first:pt-0 md:grid-cols-[15rem_1fr] md:gap-8 md:pt-8">
      <div>
        <h2
          className={`text-sm font-semibold ${tone === "danger" ? "text-worx-red" : "text-ink"}`}
        >
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-muted">{description}</p>
        )}
      </div>
      <div
        className={`min-w-0 rounded-lg border bg-white p-4 shadow-xs sm:p-5 ${
          tone === "danger" ? "border-red-200" : "border-line"
        }`}
      >
        {children}
      </div>
    </section>
  );
}

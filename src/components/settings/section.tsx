type SectionProps = {
  title: string;
  description?: string;
  tone?: "default" | "danger";
  children: React.ReactNode;
};

export function Section({
  title,
  description,
  tone = "default",
  children,
}: SectionProps) {
  const border = tone === "danger" ? "border-red-200" : "border-zinc-200";

  return (
    <section
      className={`rounded-xl border bg-white p-4 shadow-sm sm:p-6 ${border}`}
    >
      <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
      {description && (
        <p className="mt-1 text-sm text-zinc-500">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

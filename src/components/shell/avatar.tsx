const TONES = [
  "bg-brand text-white",
  "bg-worx-yellow text-navy",
  "bg-worx-red text-white",
  "bg-navy text-white",
  "bg-sky-200 text-navy",
  "bg-amber-100 text-navy",
];

function tone(id: string) {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return TONES[Math.abs(hash) % TONES.length];
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Avatar({
  id,
  name,
  size = "md",
}: {
  id: string;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "size-6 text-[10px]",
    md: "size-8 text-xs",
    lg: "size-10 text-sm",
  };
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${sizes[size]} ${tone(id)}`}
    >
      {initials(name)}
    </span>
  );
}

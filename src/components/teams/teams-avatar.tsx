import { Avatar } from "@/components/shell/avatar";
import { type Presence, WISE_ID } from "./data";
import { WiseMark } from "./ui";

export const PRESENCE: Record<Presence, { label: string; dot: string }> = {
  available: { label: "Available", dot: "bg-emerald-500" },
  busy: { label: "Busy", dot: "bg-red-500" },
  away: { label: "Away", dot: "bg-amber-400" },
  offline: {
    label: "Appear offline",
    dot: "bg-white ring-1 ring-inset ring-neutral-400",
  },
};

export function PresenceDot({
  presence,
  className = "",
}: {
  presence: Presence;
  className?: string;
}) {
  return (
    <span
      className={`size-3 rounded-full ring-2 ring-white ${PRESENCE[presence].dot} ${className}`}
    />
  );
}

// A colleague's avatar with the SD Wise mark: the bot brought this question.
// While SD Wise keeps the colleague hidden, it's just the bot.
export function RequestAvatar({ id, name }: { id: string; name: string }) {
  if (id === WISE_ID) return <TeamsAvatar id={id} name={name} />;
  return (
    <span className="relative inline-flex shrink-0">
      <TeamsAvatar id={id} name={name} />
      <WiseMark className="absolute -right-1 -bottom-1 size-4 rounded ring-2 ring-white" />
    </span>
  );
}

export function TeamsAvatar({
  id,
  name,
  size = "md",
  presence,
}: {
  id: string;
  name: string;
  size?: "sm" | "md" | "lg";
  presence?: Presence;
}) {
  const box = { sm: "size-6", md: "size-8", lg: "size-10" }[size];
  return (
    <span className="relative inline-flex shrink-0">
      {id === WISE_ID ? (
        <WiseMark className={box} />
      ) : (
        <Avatar id={id} name={name} size={size} />
      )}
      {presence && (
        <PresenceDot
          presence={presence}
          className="absolute -right-0.5 -bottom-0.5"
        />
      )}
    </span>
  );
}

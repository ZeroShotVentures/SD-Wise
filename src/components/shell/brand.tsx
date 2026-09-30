import Image from "next/image";

export function Brand({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <span className="flex items-center gap-2.5">
      <Image
        src={tone === "light" ? "/brand/sdworx-white.svg" : "/brand/sdworx.svg"}
        alt="SD Worx"
        width={72}
        height={28}
        priority
        className="h-7 w-auto"
      />
      <span
        className={`border-l pl-2.5 text-lg font-semibold tracking-tight ${
          tone === "light"
            ? "border-white/20 text-white"
            : "border-line text-navy"
        }`}
      >
        Wise
      </span>
    </span>
  );
}

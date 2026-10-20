import Image from "next/image";

export function Brand({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <Image
      src={tone === "light" ? "/brand/sd-wise-white.png" : "/brand/sd-wise.png"}
      alt="SD Wise"
      width={640}
      height={220}
      priority
      className="h-8 w-auto"
    />
  );
}

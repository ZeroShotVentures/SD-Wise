import Image from "next/image";

// A brand logo from public/logos on a white tile, the way app stores show
// them. `name` is the file name without .svg.
export function Logo({
  name,
  size = "md",
  className = "",
}: {
  name: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const { tile, px } = SIZES[size];
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center bg-white ring-1 ring-line ${tile} ${className}`}
    >
      <Image
        src={`/logos/${name}.svg`}
        alt=""
        width={px}
        height={px}
        className="object-contain"
        style={{ width: px, height: px }}
      />
    </span>
  );
}

const SIZES = {
  xs: { tile: "size-6 rounded-md", px: 14 },
  sm: { tile: "size-8 rounded-lg", px: 18 },
  md: { tile: "size-11 rounded-xl", px: 26 },
  lg: { tile: "size-14 rounded-2xl", px: 32 },
};

// The three bars of the SD Wise logo, for square spots.
export function SdWiseMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 502 690" aria-hidden className={className}>
      <path fill="#7a819a" d="M0 348h85l33 189H34z" />
      <path fill="#d6003a" d="M193 192h93l-58 498h-90z" />
      <path fill="#f2a900" d="M406 0h95L383 537h-91z" />
    </svg>
  );
}

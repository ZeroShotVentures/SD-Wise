import { Brand } from "@/components/shell/brand";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-canvas px-4 py-10 sm:px-6">
      <Brand tone="dark" />
      {children}
    </div>
  );
}

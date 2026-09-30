import { Brand } from "@/components/shell/brand";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-canvas px-6">
      <Brand tone="dark" />
      {children}
    </div>
  );
}

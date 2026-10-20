import { Brand } from "@/components/shell/brand";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="flex h-16 items-center px-6 sm:px-10">
        <Brand />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        {children}
      </main>
      <footer className="px-6 pb-6 text-center text-xs text-faint sm:px-10">
        SD Wise answers only with what you&apos;re allowed to see.
      </footer>
    </div>
  );
}

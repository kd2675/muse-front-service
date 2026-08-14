type PageShellProps = {
  children: React.ReactNode;
};

export default function PageShell({ children }: PageShellProps) {
  return (
    <div className="museum-grain relative min-h-screen overflow-hidden bg-[var(--canvas)] text-[var(--canvas-ink)]">
      <main id="main-content" tabIndex={-1} className="relative z-10 mx-auto max-w-6xl px-5 pb-28 pt-8 md:px-8 md:pt-12">
        {children}
      </main>
    </div>
  );
}

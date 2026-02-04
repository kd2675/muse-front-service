type PageShellProps = {
  children: React.ReactNode;
};

export default function PageShell({ children }: PageShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(11,91,91,0.12)_0%,_rgba(245,241,232,1)_46%,_rgba(245,241,232,1)_100%)]">
      <div className="mx-auto max-w-6xl px-6 pb-20 pt-10">{children}</div>
    </div>
  );
}

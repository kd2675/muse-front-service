import PageShell from "./components/PageShell";

export default function Loading() {
  return (
    <PageShell>
      <div className="mt-12 grid gap-10">
        <div className="rounded-[32px] border border-[color:var(--line)] bg-white/70 p-10 shadow-[var(--shadow)] backdrop-blur">
          <div className="skeleton h-6 w-32 rounded-full" />
          <div className="skeleton mt-6 h-10 w-4/5 rounded-[18px]" />
          <div className="mt-4 grid gap-2">
            <div className="skeleton h-3 w-full rounded-full" />
            <div className="skeleton h-3 w-full rounded-full" />
            <div className="skeleton h-3 w-3/5 rounded-full" />
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <div className="skeleton h-12 w-40 rounded-full" />
            <div className="skeleton h-12 w-36 rounded-full" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="skeleton h-36 rounded-[28px]" />
          <div className="skeleton h-36 rounded-[28px]" />
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="skeleton h-52 rounded-[24px]"
            />
          ))}
        </div>
      </div>
    </PageShell>
  );
}

export default function Card({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 ${className}`}>
      {title ? <h3 className="mb-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200">{title}</h3> : null}
      {children}
    </div>
  );
}

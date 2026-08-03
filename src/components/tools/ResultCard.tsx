interface ResultRow {
  label: string;
  value: string;
  emphasis?: boolean;
  negative?: boolean;
}

export default function ResultCard({ title, rows }: { title: string; rows: ResultRow[] }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
      <h3 className="mb-3 text-sm font-semibold text-zinc-500 dark:text-zinc-400">{title}</h3>
      <dl className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4">
            <dt className={row.emphasis ? "text-sm font-medium text-zinc-900 dark:text-zinc-100" : "text-sm text-zinc-500 dark:text-zinc-400"}>
              {row.label}
            </dt>
            <dd
              className={
                row.emphasis
                  ? "text-lg font-bold text-emerald-600 dark:text-emerald-400"
                  : row.negative
                    ? "text-sm font-medium text-rose-500"
                    : "text-sm font-medium text-zinc-700 dark:text-zinc-300"
              }
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

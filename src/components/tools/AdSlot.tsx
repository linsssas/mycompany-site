/**
 * Renders nothing until NEXT_PUBLIC_ADSENSE_CLIENT is set (requires a real,
 * approved AdSense account — see docs/sellculator-business-plan.md).
 */
export default function AdSlot({ label }: { label: string }) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  if (!client) return null;

  return (
    <div className="flex h-24 w-full items-center justify-center rounded-md border border-dashed border-zinc-300 text-xs text-zinc-400 dark:border-zinc-700">
      {label} ad slot ({client})
    </div>
  );
}

"use client";

interface ToggleFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}

export default function ToggleField({ label, checked, onChange, hint }: ToggleFieldProps) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 accent-indigo-600"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
        {hint && <span className="block text-xs text-zinc-400">{hint}</span>}
      </span>
    </label>
  );
}

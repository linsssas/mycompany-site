"use client";

interface FieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
}

export default function Field({ label, value, onChange, min = 0, max, step = 0.01, prefix, suffix }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      <div className="flex items-center overflow-hidden rounded-md border border-zinc-300 bg-white focus-within:ring-2 focus-within:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900">
        {prefix && <span className="pl-3 text-sm text-zinc-400">{prefix}</span>}
        <input
          type="number"
          className="w-full bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none dark:text-zinc-100"
          value={Number.isFinite(value) ? value : 0}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(e.target.valueAsNumber || 0)}
        />
        {suffix && <span className="pr-3 text-sm text-zinc-400">{suffix}</span>}
      </div>
    </label>
  );
}

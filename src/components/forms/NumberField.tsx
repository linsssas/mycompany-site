"use client";

interface NumberFieldProps {
  label: string;
  value: number;
  unit?: string;
  step?: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

export default function NumberField({ label, value, unit, step = 1, min, max, onChange }: NumberFieldProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-600 dark:text-zinc-400">
        {label} {unit ? <span className="text-zinc-400">({unit})</span> : null}
      </span>
      <input
        type="number"
        className="rounded-none border border-zinc-300 bg-white px-2 py-1.5 text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        value={Number.isFinite(value) ? value : 0}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      />
    </label>
  );
}

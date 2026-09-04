"use client";

import { useId, useState } from "react";

/** Подсказка: что это за величина, где в норме, типичные значения. */
export function Hint({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label="Подсказка"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="ml-1 grid h-4 w-4 shrink-0 place-items-center rounded-full border border-zinc-300 text-[10px] leading-none text-zinc-500 hover:border-zinc-500 hover:text-zinc-800 dark:border-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        ?
      </button>
      {open ? (
        <span className="absolute left-5 top-0 z-30 w-64 rounded border border-zinc-300 bg-white p-2 text-xs font-normal leading-snug text-zinc-700 shadow-lg dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200">
          {text}
        </span>
      ) : null}
    </span>
  );
}

interface BaseProps {
  label: string;
  hint?: string;
  unit?: string;
  /** Отметка ★ — параметр, вынесенный заказчиком на видное место */
  starred?: boolean;
  warning?: string;
}

function Label({ label, hint, unit, starred, htmlFor }: BaseProps & { htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="flex items-start justify-between gap-2 text-xs text-zinc-600 dark:text-zinc-400">
      <span className="flex items-center">
        {starred ? <span className="mr-1 text-amber-500">★</span> : null}
        {label}
        {hint ? <Hint text={hint} /> : null}
      </span>
      {unit ? <span className="shrink-0 font-mono text-[10px] text-zinc-400">{unit}</span> : null}
    </label>
  );
}

const inputClass =
  "w-full rounded border border-zinc-300 bg-white px-2 py-1 font-mono text-sm text-zinc-900 outline-none transition-colors focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-blue-400";

export function NumberField({
  label,
  hint,
  unit,
  starred,
  value,
  onChange,
  min,
  max,
  step = 1,
  slider,
  warning,
  disabled,
}: BaseProps & {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  slider?: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  // Локальное состояние, чтобы не мешать вводу промежуточных значений («1», «-», «1,»).
  // Синхронизация с внешним значением выполняется во время рендера (рекомендованный
  // React способ вместо эффекта): текст перезаписывается только если значение
  // изменилось снаружи — например, при загрузке пресета или пересчёте связанного поля.
  const [text, setText] = useState(String(value));
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    if (Number(text.replace(",", ".")) !== value) setText(String(value));
  }

  const commit = (raw: string) => {
    setText(raw);
    const parsed = Number(raw.replace(",", "."));
    if (raw.trim() !== "" && isFinite(parsed)) onChange(parsed);
  };

  const outOfRange = (min !== undefined && value < min) || (max !== undefined && value > max);

  return (
    <div className="space-y-1">
      <Label label={label} hint={hint} unit={unit} starred={starred} htmlFor={id} />
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={text}
          disabled={disabled}
          onChange={(e) => commit(e.target.value)}
          onBlur={() => setText(String(value))}
          className={`${inputClass} ${outOfRange ? "border-amber-500 dark:border-amber-500" : ""} ${
            slider ? "w-24 shrink-0" : ""
          } ${disabled ? "opacity-50" : ""}`}
        />
        {slider && min !== undefined && max !== undefined ? (
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={Math.min(Math.max(value, min), max)}
            disabled={disabled}
            onChange={(e) => onChange(Number(e.target.value))}
            className="h-1 w-full cursor-pointer appearance-none rounded bg-zinc-200 accent-blue-600 dark:bg-zinc-700"
          />
        ) : null}
      </div>
      {outOfRange ? (
        <p className="text-[11px] text-amber-600 dark:text-amber-400">
          Значение вне рекомендуемого диапазона {min ?? "−∞"}…{max ?? "∞"} — расчёт выполняется, проверьте исходные данные.
        </p>
      ) : null}
      {warning ? <p className="text-[11px] text-amber-600 dark:text-amber-400">{warning}</p> : null}
    </div>
  );
}

export function SelectField<T extends string>({
  label,
  hint,
  unit,
  starred,
  value,
  options,
  onChange,
  disabled,
}: BaseProps & {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="space-y-1">
      <Label label={label} hint={hint} unit={unit} starred={starred} htmlFor={id} />
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
        className={`${inputClass} font-sans ${disabled ? "opacity-50" : ""}`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TextField({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: BaseProps & { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const id = useId();
  return (
    <div className="space-y-1">
      <Label label={label} hint={hint} htmlFor={id} />
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} font-sans`}
      />
    </div>
  );
}

export function CheckboxField({
  label,
  hint,
  checked,
  onChange,
}: BaseProps & { checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-blue-600"
      />
      <span className="flex items-center">
        {label}
        {hint ? <Hint text={hint} /> : null}
      </span>
    </label>
  );
}

/** Числовое поле с возможностью «авто» (значение null). */
export function OptionalNumberField({
  label,
  hint,
  unit,
  starred,
  value,
  onChange,
  autoLabel = "по району",
  autoValue,
}: BaseProps & {
  value: number | null;
  onChange: (v: number | null) => void;
  autoLabel?: string;
  autoValue: number;
}) {
  const manual = value !== null;
  return (
    <div className="space-y-1">
      <Label label={label} hint={hint} unit={unit} starred={starred} />
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="decimal"
          value={manual ? String(value) : String(autoValue)}
          onChange={(e) => {
            const parsed = Number(e.target.value.replace(",", "."));
            if (isFinite(parsed)) onChange(parsed);
          }}
          disabled={!manual}
          className={`${inputClass} ${manual ? "" : "opacity-60"}`}
        />
        <button
          type="button"
          onClick={() => onChange(manual ? null : autoValue)}
          className="shrink-0 rounded border border-zinc-300 px-2 py-1 text-[11px] text-zinc-600 hover:border-zinc-500 dark:border-zinc-600 dark:text-zinc-300"
        >
          {manual ? "сброс" : "задать"}
        </button>
      </div>
      <p className="text-[11px] text-zinc-500">{manual ? "Значение задано вручную" : `Значение ${autoLabel}`}</p>
    </div>
  );
}

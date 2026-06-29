import * as React from "react";

export interface PeriodFilterProps {
  /** Period options to render as a button row (e.g. ["7 дней", "30 дней", …]). */
  options: string[];
  /** Currently-selected option (gets the cyan `active` treatment). */
  value?: string;
  onChange?: (period: string) => void;
  className?: string;
}

/** Segmented period picker — a row of pill buttons with one active (cyan) option. */
export function PeriodFilter({ options, value, onChange, className }: PeriodFilterProps) {
  return (
    <div className={["periodFilter", className].filter(Boolean).join(" ")}>
      {options.map((p) => (
        <button
          key={p}
          className={p === value ? "active" : undefined}
          onClick={() => onChange?.(p)}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

import * as React from "react";
import { cx } from "./util";

export interface FunnelStep {
  /** Stage name (e.g. "Отклики", "Интервью"). */
  label: React.ReactNode;
  /** Stage count — drives the bar width relative to the first stage. */
  value: number | string;
}

export interface FunnelProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: FunnelStep[];
}

/**
 * Recruitment funnel — stacked stages, each a label/value row above a bar whose
 * width is the stage count relative to the first (top) stage. Same visual family
 * as {@link Metric}, ordered top-to-bottom as a narrowing funnel.
 */
export function Funnel({ steps, className, ...rest }: FunnelProps) {
  const first = Number(steps[0]?.value) || 1;
  return (
    <div className={cx("funnel", className)} {...rest}>
      {steps.map((s, i) => {
        const num = Number(s.value) || 0;
        const pct = Math.max(6, Math.min(100, Math.round((num / first) * 100)));
        return (
          <React.Fragment key={i}>
            <div>
              <span>{s.label}</span>
              <b>{s.value}</b>
            </div>
            <i>
              <em style={{ width: `${pct}%` }} />
            </i>
          </React.Fragment>
        );
      })}
    </div>
  );
}

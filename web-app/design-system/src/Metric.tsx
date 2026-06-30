import * as React from "react";
import { cx } from "./util";

export interface MetricProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Left-aligned muted label. */
  label: React.ReactNode;
  /** Right-aligned bold value. */
  value: React.ReactNode;
  /** Fill of the progress track, 0–100. Defaults to full. */
  percent?: number;
}

/**
 * Labelled progress metric — a label/value row above a gradient-filled bar
 * (cyan→blue). The building block for distribution and progress readouts.
 */
export function Metric({ label, value, percent = 100, className, ...rest }: MetricProps) {
  const w = Math.max(0, Math.min(100, percent));
  return (
    <div className={cx("metric", className)} {...rest}>
      <div>
        <span>{label}</span>
        <b>{value}</b>
      </div>
      <i>
        <em style={{ width: `${w}%` }} />
      </i>
    </div>
  );
}

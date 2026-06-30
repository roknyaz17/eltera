import * as React from "react";
import { cx } from "./util";

export interface KpiGridProps extends React.HTMLAttributes<HTMLDivElement> {}

/** Responsive auto-fill grid for {@link KpiCard}s (min 150px columns, 14px gap). */
export function KpiGrid({ className, children, ...rest }: KpiGridProps) {
  return (
    <section className={cx("kpiGrid", className)} {...rest}>
      {children}
    </section>
  );
}

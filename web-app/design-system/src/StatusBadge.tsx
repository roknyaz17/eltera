import * as React from "react";
import { cx, statusClass, Status } from "./util";

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Drives the color set: green/amber/red/blue/grey. */
  status?: Status;
  children: React.ReactNode;
}

/** Pill-shaped status badge — tinted background + border + text from the status token set. */
export function StatusBadge({ status = "neutral", className, children, ...rest }: StatusBadgeProps) {
  return (
    <span className={cx("statusBadge", statusClass(status), className)} {...rest}>
      {children}
    </span>
  );
}

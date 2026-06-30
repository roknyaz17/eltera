import * as React from "react";
import { cx } from "./util";

export interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
}

/** Eyebrow / kicker label — uppercase, letter-spaced, cyan. Used above headings and on cards. */
export function Pill({ className, children, ...rest }: PillProps) {
  return (
    <span className={cx("pill", className)} {...rest}>
      {children}
    </span>
  );
}

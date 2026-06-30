import * as React from "react";
import { cx, statusClass, Status } from "./util";

export interface StatusDotProps extends React.HTMLAttributes<HTMLElement> {
  /** Drives the dot color from the status token set. */
  status?: Status;
}

/** Small round status indicator. Pairs with labels in card headers and list rows. */
export function StatusDot({ status = "neutral", className, ...rest }: StatusDotProps) {
  return <i className={cx("statusDot", statusClass(status), className)} {...rest} />;
}

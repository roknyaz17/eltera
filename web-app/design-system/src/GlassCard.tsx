import * as React from "react";
import { cx } from "./util";

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Frosted-glass hero card — blurred translucent slate with a soft shadow, used
 * for the landing hero panel and feature highlights on the dark surface.
 * Self-padded (grid, 20px). Drop any content inside.
 */
export function GlassCard({ className, children, ...rest }: GlassCardProps) {
  return (
    <div className={cx("glass", "heroCard", className)} {...rest}>
      {children}
    </div>
  );
}

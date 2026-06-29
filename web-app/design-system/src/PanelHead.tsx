import * as React from "react";
import { cx } from "./util";

export interface PanelHeadProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Section title (rendered as an `h2`). */
  title: React.ReactNode;
  /** Optional right-aligned muted caption (count, period, hint). */
  caption?: React.ReactNode;
}

/** Header row for a {@link Panel}: bold title on the left, muted caption on the right. */
export function PanelHead({ title, caption, className, ...rest }: PanelHeadProps) {
  return (
    <div className={cx("panelHead", className)} {...rest}>
      <h2>{title}</h2>
      {caption != null && <span>{caption}</span>}
    </div>
  );
}

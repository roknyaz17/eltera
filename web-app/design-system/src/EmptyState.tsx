import * as React from "react";
import { cx } from "./util";

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Bold headline (e.g. "Пусто"). */
  title: React.ReactNode;
  /** Muted explanatory line. */
  text?: React.ReactNode;
}

/** Centered empty-state block — bold title over a muted explanatory line. */
export function EmptyState({ title, text, className, ...rest }: EmptyStateProps) {
  return (
    <div className={cx("emptyState", className)} {...rest}>
      <b>{title}</b>
      {text != null && <span>{text}</span>}
    </div>
  );
}

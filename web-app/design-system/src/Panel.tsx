import * as React from "react";
import { cx } from "./util";

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Apply default inner padding (18px). Set false for full-bleed content like tables. */
  padded?: boolean;
}

/**
 * Surface card — the base container for dashboard content. Translucent slate on
 * the dark surface, white on `lightTheme`. Compose with {@link PanelHead} and any
 * content. Bare `.panel` carries no padding, so the wrapper adds a sensible default.
 */
export function Panel({ padded = true, className, style, children, ...rest }: PanelProps) {
  return (
    <article
      className={cx("panel", className)}
      style={{ ...(padded ? { padding: 18 } : null), ...style }}
      {...rest}
    >
      {children}
    </article>
  );
}

import * as React from "react";
import { cx } from "./util";

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  /** `dark` = the navy brand surface (default). `light` = the app's light dashboard surface. */
  theme?: "dark" | "light";
}

/**
 * Root surface that establishes Eltera's theme context. Every Eltera screen
 * is built inside a Surface: `dark` paints the navy brand background with light
 * text, `light` paints the app's `#F8FAFC` dashboard background and enables the
 * `lightTheme` token overrides. Components below it inherit the right colors.
 */
export function Surface({ theme = "dark", className, style, children, ...rest }: SurfaceProps) {
  const dark = theme === "dark";
  return (
    <div
      className={cx(dark ? "landingBody" : "candidateBody lightTheme", className)}
      style={{ padding: 24, minHeight: "100%", ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}

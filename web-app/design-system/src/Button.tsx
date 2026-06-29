import * as React from "react";
import { cx } from "./util";

export type ButtonVariant = "primary" | "ghost";
export type ButtonSize = "default" | "large";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** `primary` = solid blue CTA (`blueButton`). `ghost` = translucent outline (`ghostOnDark`). */
  variant?: ButtonVariant;
  /** `large` bumps the height/padding for hero CTAs. */
  size?: ButtonSize;
  /** Stretch to the full width of the container. */
  wide?: boolean;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "blueButton",
  ghost: "ghostOnDark",
};

/** Eltera action button. Solid blue primary or translucent ghost, on the dark surface. */
export function Button({
  variant = "primary",
  size = "default",
  wide,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cx(VARIANT_CLASS[variant], size === "large" && "large", wide && "wide", className)}
      {...rest}
    >
      {children}
    </button>
  );
}

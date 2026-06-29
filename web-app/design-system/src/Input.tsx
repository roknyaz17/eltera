import * as React from "react";
import { cx } from "./util";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

/**
 * Text input styled for the Eltera light (app) theme. Render inside a `light`
 * {@link Surface} so the form tokens (background, border, focus ring) apply.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...rest },
  ref
) {
  return <input ref={ref} className={cx("elt-input", className)} {...rest} />;
});

import * as React from "react";
import { cx, statusClass, Status } from "./util";
import { StatusDot } from "./StatusDot";

export interface KpiCardProps {
  /** Metric caption under the value (e.g. "Кандидаты в работе"). */
  label: React.ReactNode;
  /** The headline number/value (e.g. "248", "92%"). */
  value: React.ReactNode;
  /** Optional supporting line under the label. */
  caption?: React.ReactNode;
  /** Tints the status dot and hover accent. */
  status?: Status;
  /** Optional leading glyph shown in the top-left icon chip. */
  icon?: React.ReactNode;
  /** Add the clickable hover lift. */
  clickable?: boolean;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLElement>;
}

/** Compact KPI card — icon + status dot, large value, label and caption. The dashboard's metric tile. */
export function KpiCard({
  label,
  value,
  caption,
  status = "neutral",
  icon,
  clickable,
  className,
  onClick,
}: KpiCardProps) {
  return (
    <article
      className={cx("panel", "kpi", statusClass(status), clickable && "clickable", className)}
      onClick={onClick}
    >
      <div className="kpi-top-row">
        {icon ? <div className="kpi-icon-wrap">{icon}</div> : <span />}
        <StatusDot status={status} />
      </div>
      <strong>{value}</strong>
      <span className="kpi-label">{label}</span>
      {caption != null && <p>{caption}</p>}
    </article>
  );
}

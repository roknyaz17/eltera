import * as React from "react";
import { cx, statusClass, Status } from "./util";

export interface HeatCell {
  /** Cell headline value. */
  value: React.ReactNode;
  /** Optional small caption under the value. */
  caption?: React.ReactNode;
  /** Tints the cell from the status token set. */
  status?: Status;
}

export interface HeatRow {
  /** Row label (left column). */
  label: React.ReactNode;
  cells: HeatCell[];
}

export interface HeatmapProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Column headers. */
  columns: React.ReactNode[];
  rows: HeatRow[];
}

/**
 * Status heatmap grid — a labelled column header row plus one row per entity,
 * each cell tinted by status. Used for department/competency breakdowns.
 */
export function Heatmap({ columns, rows, className, style, ...rest }: HeatmapProps) {
  return (
    <div
      className={cx("heatmap", "heatmapCard", className)}
      style={{ ["--heat-cols" as string]: String(columns.length), ...style } as React.CSSProperties}
      {...rest}
    >
      <div className="heatmapHead">
        <span />
        {columns.map((c, i) => (
          <b key={i}>{c}</b>
        ))}
      </div>
      {rows.map((r, i) => (
        <div className="heatmapRow" key={i}>
          <b>{r.label}</b>
          {r.cells.map((cell, j) => (
            <button className={cx("heatCell", statusClass(cell.status))} key={j}>
              <strong>{cell.value}</strong>
              {cell.caption != null && <span>{cell.caption}</span>}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

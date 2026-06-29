import * as React from "react";
import { cx, statusClass, Status } from "./util";

export interface AttentionItem {
  /** Bold signal title. */
  title: React.ReactNode;
  /** Supporting description line. */
  text: React.ReactNode;
  /** Tints the item from the status token set. */
  status?: Status;
}

export interface AttentionPanelProps {
  items: AttentionItem[];
  /** Panel heading. */
  title?: React.ReactNode;
  /** Right-aligned caption; defaults to a "<n> сигналов" count. */
  caption?: React.ReactNode;
  className?: string;
}

/**
 * "Needs attention" panel — a {@link Panel} with a header and a two-column grid
 * of tinted signal cards (title + description), each colored by status.
 */
export function AttentionPanel({
  items,
  title = "Требует внимания",
  caption,
  className,
}: AttentionPanelProps) {
  return (
    <article className={cx("panel", "attentionPanel", className)}>
      <div className="panelHead">
        <h2>{title}</h2>
        <span>{caption ?? `${items.length} сигналов`}</span>
      </div>
      <div className="attentionList">
        {items.map((it, i) => (
          <button className={cx("attentionItem", statusClass(it.status ?? "neutral"))} key={i}>
            <b>{it.title}</b>
            <span>{it.text}</span>
          </button>
        ))}
      </div>
    </article>
  );
}

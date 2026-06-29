/** Eltera status scale — drives the `status-*` token sets in styles.css. */
export type Status = "good" | "medium" | "bad" | "neutral" | "noData";

/** Join class names, dropping falsy values. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Map a {@link Status} to its Eltera CSS class (`status-good`, …). */
export function statusClass(status?: Status): string {
  return status ? `status-${status}` : "";
}

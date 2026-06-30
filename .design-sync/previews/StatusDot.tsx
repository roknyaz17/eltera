import { Surface, StatusDot } from "@eltera/design-system";

const Row = ({ status, label }: { status: any; label: string }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <StatusDot status={status} />
    <span style={{ color: "var(--mutedDark)" }}>{label}</span>
  </div>
);

export const Legend = () => (
  <Surface>
    <div style={{ display: "grid", gap: 10 }}>
      <Row status="good" label="В норме" />
      <Row status="medium" label="Требует внимания" />
      <Row status="bad" label="Критично" />
      <Row status="neutral" label="В процессе" />
    </div>
  </Surface>
);

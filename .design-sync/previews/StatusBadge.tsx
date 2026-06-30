import { Surface, StatusBadge } from "@eltera/design-system";

export const AllStatuses = () => (
  <Surface>
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <StatusBadge status="good">92% соответствие</StatusBadge>
      <StatusBadge status="medium">Средний риск</StatusBadge>
      <StatusBadge status="bad">Высокий риск</StatusBadge>
      <StatusBadge status="neutral">В работе</StatusBadge>
      <StatusBadge status="noData">Нет данных</StatusBadge>
    </div>
  </Surface>
);

export const Inline = () => (
  <Surface>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span>Анна Петрова</span>
      <StatusBadge status="good">Прошла оценку</StatusBadge>
    </div>
  </Surface>
);

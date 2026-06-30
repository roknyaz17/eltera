import { Surface, KpiGrid, KpiCard } from "@eltera/design-system";

export const Dashboard = () => (
  <Surface>
    <KpiGrid>
      <KpiCard label="Кандидаты" value="248" caption="+18 за неделю" status="neutral" />
      <KpiCard label="Соответствие" value="92%" caption="средний fit" status="good" />
      <KpiCard label="Конверсия" value="11%" caption="ниже цели" status="medium" />
      <KpiCard label="В зоне риска" value="7" caption="сотрудников" status="bad" />
    </KpiGrid>
  </Surface>
);

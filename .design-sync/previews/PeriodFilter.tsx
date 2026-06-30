import { Surface, PeriodFilter } from "@eltera/design-system";

export const Default = () => (
  <Surface>
    <PeriodFilter
      options={["7 дней", "14 дней", "30 дней", "90 дней", "Весь период"]}
      value="30 дней"
    />
  </Surface>
);

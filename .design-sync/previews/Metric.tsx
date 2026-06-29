import { Surface, Metric } from "@eltera/design-system";

export const Distribution = () => (
  <Surface>
    <div style={{ display: "grid", gap: 14, maxWidth: 420 }}>
      <Metric label="Лидерство" value="86%" percent={86} />
      <Metric label="Коммуникация" value="74%" percent={74} />
      <Metric label="Аналитика" value="61%" percent={61} />
      <Metric label="Стрессоустойчивость" value="48%" percent={48} />
    </div>
  </Surface>
);

export const Single = () => (
  <Surface>
    <div style={{ maxWidth: 420 }}>
      <Metric label="Соответствие роли" value="92%" percent={92} />
    </div>
  </Surface>
);

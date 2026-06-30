import { Surface, Panel, PanelHead, Metric } from "@eltera/design-system";

export const WithHeader = () => (
  <Surface>
    <Panel>
      <PanelHead title="Источники откликов" caption="30 дней" />
      <div style={{ display: "grid", gap: 12 }}>
        <Metric label="hh.ru" value="248" percent={100} />
        <Metric label="Telegram" value="121" percent={49} />
        <Metric label="Реферальная программа" value="64" percent={26} />
      </div>
    </Panel>
  </Surface>
);

export const Plain = () => (
  <Surface>
    <Panel>
      <h3 style={{ margin: "0 0 6px" }}>Сводка по команде</h3>
      <p style={{ margin: 0, color: "var(--mutedDark)" }}>
        12 сотрудников оценены, 3 в зоне риска удержания.
      </p>
    </Panel>
  </Surface>
);

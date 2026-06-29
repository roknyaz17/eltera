import { Surface, Panel, PanelHead, Funnel } from "@eltera/design-system";

export const Recruitment = () => (
  <Surface>
    <div style={{ maxWidth: 460 }}>
      <Panel>
        <PanelHead title="Воронка подбора" caption="30 дней" />
        <Funnel
          steps={[
            { label: "Отклики", value: 248 },
            { label: "Скрининг", value: 132 },
            { label: "Оценка", value: 64 },
            { label: "Интервью", value: 28 },
            { label: "Оффер", value: 11 },
          ]}
        />
      </Panel>
    </div>
  </Surface>
);

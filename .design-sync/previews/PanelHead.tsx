import { Surface, Panel, PanelHead } from "@eltera/design-system";

export const TitleAndCaption = () => (
  <Surface>
    <Panel>
      <PanelHead title="Воронка подбора" caption="Q2 2026" />
    </Panel>
  </Surface>
);

export const TitleOnly = () => (
  <Surface>
    <Panel>
      <PanelHead title="Распределение по компетенциям" />
    </Panel>
  </Surface>
);

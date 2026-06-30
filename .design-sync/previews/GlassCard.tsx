import { Surface, GlassCard, Pill, Metric, Button } from "@eltera/design-system";

export const HeroPanel = () => (
  <Surface>
    <div style={{ maxWidth: 380 }}>
      <GlassCard>
        <Pill>Отчёт по кандидату</Pill>
        <h3 style={{ margin: "4px 0 0" }}>Анна Петрова</h3>
        <Metric label="Соответствие роли" value="92%" percent={92} />
        <Metric label="Риск ухода" value="Низкий" percent={18} />
        <Button wide>Открыть полный отчёт</Button>
      </GlassCard>
    </div>
  </Surface>
);

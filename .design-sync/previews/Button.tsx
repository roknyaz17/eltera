import { Surface, Button } from "@eltera/design-system";

export const Primary = () => (
  <Surface>
    <Button>Создать оценку</Button>
  </Surface>
);

export const Variants = () => (
  <Surface>
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <Button variant="primary">Пригласить кандидата</Button>
      <Button variant="ghost">Экспорт</Button>
    </div>
  </Surface>
);

export const Sizes = () => (
  <Surface>
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <Button size="default">Обычная</Button>
      <Button size="large">Крупная CTA</Button>
    </div>
  </Surface>
);

export const Wide = () => (
  <Surface>
    <div style={{ maxWidth: 320 }}>
      <Button wide size="large">
        Запустить тестирование
      </Button>
    </div>
  </Surface>
);

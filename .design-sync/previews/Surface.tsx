import { Surface, Pill, Button } from "@eltera/design-system";

export const Dark = () => (
  <Surface theme="dark">
    <Pill>Платформа оценки</Pill>
    <h2 style={{ margin: "12px 0 8px" }}>Тёмная поверхность</h2>
    <p style={{ color: "var(--mutedDark)", margin: "0 0 16px" }}>
      Навигационный фон бренда — навигация, лендинг и дашборды строятся здесь.
    </p>
    <Button>Начать оценку</Button>
  </Surface>
);

export const Light = () => (
  <Surface theme="light">
    <Pill>Кабинет</Pill>
    <h2 style={{ margin: "12px 0 8px" }}>Светлая поверхность</h2>
    <p style={{ color: "var(--mutedLight)", margin: 0 }}>
      Рабочая область приложения — таблицы, формы и карточки кандидатов.
    </p>
  </Surface>
);

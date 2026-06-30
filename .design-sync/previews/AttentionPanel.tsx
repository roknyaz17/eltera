import { Surface, AttentionPanel } from "@eltera/design-system";

export const Signals = () => (
  <Surface>
    <AttentionPanel
      items={[
        {
          title: "3 сотрудника в зоне риска",
          text: "Соответствие ниже 70% и повышенный риск ухода",
          status: "bad",
        },
        {
          title: "Вакансия «Аналитик» зависла",
          text: "40 откликов, конверсия в оценку 4%",
          status: "medium",
        },
        {
          title: "12 оценок ждут проверки",
          text: "Завершены кандидатами более 3 дней назад",
          status: "neutral",
        },
        {
          title: "Адаптация: 5 чек-инов сегодня",
          text: "Новые сотрудники на 30-й день цикла",
          status: "good",
        },
      ]}
    />
  </Surface>
);

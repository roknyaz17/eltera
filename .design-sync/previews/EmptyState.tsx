import { Surface, Panel, EmptyState } from "@eltera/design-system";

export const InPanel = () => (
  <Surface>
    <Panel>
      <EmptyState
        title="Пока нет кандидатов"
        text="Пригласите кандидатов или импортируйте список, чтобы начать оценку."
      />
    </Panel>
  </Surface>
);

export const Bare = () => (
  <Surface>
    <EmptyState title="Нет данных за период" text="Измените фильтр периода, чтобы увидеть результаты." />
  </Surface>
);

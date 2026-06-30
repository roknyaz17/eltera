import { Surface, KpiCard } from "@eltera/design-system";

const CandidatesIcon = (
  <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="1.4" />
    <path d="M3 15c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export const Single = () => (
  <Surface>
    <div style={{ maxWidth: 220 }}>
      <KpiCard
        icon={CandidatesIcon}
        label="Кандидаты в работе"
        value="248"
        caption="+18 за неделю"
        status="neutral"
      />
    </div>
  </Surface>
);

export const Statuses = () => (
  <Surface>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
      <KpiCard label="Средн. соответствие" value="92%" caption="по 64 оценкам" status="good" />
      <KpiCard label="Конверсия в найм" value="11%" caption="ниже цели 15%" status="medium" />
      <KpiCard label="В зоне риска" value="7" caption="из 42 сотрудников" status="bad" />
    </div>
  </Surface>
);

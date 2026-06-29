import { Surface, Input } from "@eltera/design-system";

export const Fields = () => (
  <Surface theme="light">
    <div style={{ display: "grid", gap: 12, maxWidth: 360 }}>
      <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700 }}>
        ФИО кандидата
        <Input placeholder="Анна Петрова" defaultValue="Анна Петрова" />
      </label>
      <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 700 }}>
        Email
        <Input type="email" placeholder="anna@company.ru" />
      </label>
    </div>
  </Surface>
);

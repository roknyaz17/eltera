import { Surface, Heatmap } from "@eltera/design-system";

export const Competencies = () => (
  <Surface>
    <Heatmap
      columns={["Лидерство", "Коммуникация", "Аналитика", "Исполнение"]}
      rows={[
        {
          label: "Продажи",
          cells: [
            { value: "84%", caption: "12 чел.", status: "good" },
            { value: "71%", caption: "12 чел.", status: "medium" },
            { value: "58%", caption: "12 чел.", status: "bad" },
            { value: "79%", caption: "12 чел.", status: "good" },
          ],
        },
        {
          label: "Разработка",
          cells: [
            { value: "62%", caption: "9 чел.", status: "medium" },
            { value: "68%", caption: "9 чел.", status: "medium" },
            { value: "91%", caption: "9 чел.", status: "good" },
            { value: "83%", caption: "9 чел.", status: "good" },
          ],
        },
        {
          label: "Поддержка",
          cells: [
            { value: "55%", caption: "6 чел.", status: "bad" },
            { value: "88%", caption: "6 чел.", status: "good" },
            { value: "64%", caption: "6 чел.", status: "medium" },
            { value: "72%", caption: "6 чел.", status: "medium" },
          ],
        },
      ]}
    />
  </Surface>
);

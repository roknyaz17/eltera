import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(projectRoot, "public/assets");
const outputPath = path.join(outputDir, "eltera-employees-import-template.xlsx");

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Сотрудники");

sheet.getRange("A1:J1").values = [[
  "ФИО",
  "Телефон",
  "Email",
  "Должность",
  "Отдел",
  "Руководитель",
  "Проект",
  "Тип оценки",
  "Профиль оценки",
  "Комментарий HR"
]];

sheet.getRange("A2:J5").values = [
  ["Иванов Иван Иванович", "+7 900 000-00-00", "ivanov@example.ru", "Менеджер по продажам", "Продажи", "Петров Петр", "B2B", "Сотрудник", "Менеджер по продажам", "Плановая оценка"],
  ["Соколова Анна Сергеевна", "+7 901 000-00-00", "sokolova@example.ru", "HR-рекрутер", "HR", "Князев Роман", "Подбор", "Сотрудник", "Менеджер по подбору персонала", ""],
  ["Орлов Дмитрий Олегович", "+7 902 000-00-00", "orlov@example.ru", "Оператор call-центра", "Контакт-центр", "Иванова Мария", "Поддержка", "Сотрудник", "Оператор call-центра", ""],
  ["", "", "", "", "", "", "", "", "", ""]
];

const guide = workbook.worksheets.add("Инструкция");
guide.getRange("A1:B1").values = [["Поле", "Что заполнить"]];
guide.getRange("A2:B11").values = [
  ["ФИО", "Полностью: фамилия, имя, отчество. Обязательное поле."],
  ["Телефон", "Российский номер в любом удобном формате."],
  ["Email", "Нужен для отправки оценки и отчета."],
  ["Должность", "Фактическая должность сотрудника."],
  ["Отдел", "Отдел или команда для группировки в дашборде."],
  ["Руководитель", "ФИО руководителя сотрудника."],
  ["Проект", "Проект, направление или филиал."],
  ["Тип оценки", "Сотрудник, кандидат, 360, адаптация, review."],
  ["Профиль оценки", "Название готового профиля или кастомного профиля."],
  ["Комментарий HR", "Необязательное поле для внутренней заметки."]
];

for (const worksheet of [sheet, guide]) {
  const used = worksheet === sheet ? "A1:J20" : "A1:B20";
  worksheet.getRange(used).format.setFont({ name: "Manrope" });
  worksheet.getRange(used).format.wrapText = true;
  worksheet.getRange(used).format.verticalAlignment = "top";
  worksheet.getRange("A1:J1").format.fill = "#0A0F1E";
  worksheet.getRange("A1:J1").format.font = { color: "#FFFFFF", bold: true };
}

sheet.getRange("A1:J1").format.rowHeightPx = 34;
sheet.getRange("A:J").format.columnWidthPx = 170;
guide.getRange("A:B").format.columnWidthPx = 260;

await fs.mkdir(outputDir, { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(outputPath);

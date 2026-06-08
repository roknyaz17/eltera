const fs = require('fs');
const path = '/home/ubuntu/eltera/web-app/src/ui/render.js';
let src = fs.readFileSync(path, 'utf8');

const FILTER_OPTIONS = `{
      "Вакансия": ["Менеджер по продажам", "HR-рекрутер", "Frontend-разработчик"],
      "Источник": ["HeadHunter", "SuperJob", "Avito", "Telegram", "Ручная", "API", "Импорт"],
      "Статус": ["Откликнулся", "Оценка отправлена", "Оценка пройдена", "Подходит", "Интервью", "Оффер", "Не подходит"],
      "Результат оценки": ["Высокий (80%+)", "Средний (60-79%)", "Низкий (<60%)"],
      "Тип подбора": ["Внешний", "Внутренний", "Проектный"],
      "Ответственный": ["Иван Петров", "Анна Сергеева", "Ольга Смирнова"],
      "Город": ["Москва", "Санкт-Петербург", "Екатеринбург", "Новосибирск"],
      "Соответствие": ["Высокое (80%+)", "Среднее (60-79%)", "Низкое (<60%)"],
      "Риск": ["Низкий", "Средний", "Высокий"],
      "Отдел": ["Отдел продаж", "Операционный", "Контакт-центр", "Финансы"],
      "Должность": ["Менеджер", "Специалист", "Руководитель"],
      "Руководитель": ["Иван Петров", "Анна Сергеева", "Ольга Смирнова"],
      "Проект": ["Проект A", "Проект B"],
      "Тип сотрудника": ["Стафф", "Аутсорсинг", "Стажёр"],
      "Адаптация": ["На адаптации", "Завершил", "Риск"],
      "Performance Review": ["Пройден", "Не пройден"],
      "360": ["Пройден", "Не пройден"],
      "Сегмент 9-box": ["HiPo", "Звезда", "Лидер", "Стабильный", "Зона риска"],
      "Потенциал": ["Высокий", "Средний", "Низкий"],
      "Результативность": ["Высокая", "Средняя", "Низкая"],
      "Этап адаптации": ["7 дней", "14 дней", "30 дней", "60 дней", "90 дней"],
      "Причина риска": ["Нагрузка", "Конфликт", "Зарплата", "Неясность задач"],
      "Конверсия": ["Высокая (>30%)", "Средняя (10-30%)", "Низкая (<10%)"],
      "Подходящие": ["Есть", "Нет"],
      "Расхождение": ["Высокое", "Среднее", "Низкое"],
      "Компетенция": ["Ответственность", "Коммуникация", "Лидерство", "Аналитика"],
      "Тип": ["Кандидат", "Сотрудник", "Групповая"],
      "Вакансия / отдел": ["Менеджер по продажам", "HR-рекрутер", "Отдел продаж"],
      "Все направления": ["Кандидаты", "Сотрудники", "Групповые"]
    }`;

const FILTERS_MODAL = `
  if (state.modal?.type === "filters") {
    const filters = state.modal.filters || [];
    const active = state.modal.active || {};
    const filterOptions = ${FILTER_OPTIONS};
    const rows = filters.map((f) => {
      const opts = filterOptions[f] || [];
      const cur = active[f] || "";
      return '<div class="elt-fp-row">' +
        '<label class="elt-fp-label">' + f + '</label>' +
        '<div class="elt-fp-opts">' +
          '<button class="elt-fp-opt ' + (!cur ? 'active' : '') + '" data-fp-key="' + f + '" data-fp-val="">Все</button>' +
          opts.map((o) => '<button class="elt-fp-opt ' + (cur === o ? 'active' : '') + '" data-fp-key="' + f + '" data-fp-val="' + o + '">' + o + '</button>').join('') +
        '</div>' +
      '</div>';
    }).join('');
    const activeCount = Object.values(active).filter(Boolean).length;
    return '<div class="modalBackdrop"><div class="modal elt-filters-modal">' +
      mHead('Фильтры', '⧦') +
      '<div class="modal-inner elt-fp-inner">' + rows + '</div>' +
      '<div class="elt-fp-footer">' +
        '<button class="elt-btn-ghost" data-action="clear-filters-modal">Сбросить все' + (activeCount ? ' (' + activeCount + ')' : '') + '</button>' +
        '<button class="blueButton" data-action="apply-filters-modal">Применить</button>' +
      '</div></div></div>';
  }
`;

// Insert before the withdraw modal
src = src.replace(
  '  if (state.modal === "withdraw") {',
  FILTERS_MODAL + '  if (state.modal === "withdraw") {'
);

fs.writeFileSync(path, src, 'utf8');
console.log('Done: filters modal added to renderModal');

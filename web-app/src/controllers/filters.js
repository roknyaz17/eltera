/**
 * Eltera — Filters Controller
 * Handles filter panel open/apply/clear and active filter tag removal.
 * Depends on: getState, setState, render, saveState
 */

const PAGE_FILTER_MAP = {
  candidates:  ["Вакансия", "Источник", "Статус", "Результат оценки", "Тип подбора", "Ответственный", "Город", "Соответствие", "Риск"],
  employees:   ["Отдел", "Должность", "Руководитель", "Проект", "Тип сотрудника", "Риск", "Адаптация", "Performance Review", "360"],
  vacancies:   ["Источник", "Статус", "Тип подбора", "Ответственный", "Город", "Конверсия", "Подходящие"],
  adaptation:  ["Отдел", "Руководитель", "Этап адаптации", "Причина риска", "Статус"],
  "360":       ["Руководитель", "Отдел", "Статус", "Расхождение", "Компетенция"],
  performance: ["Отдел", "Руководитель", "Сегмент 9-box", "Потенциал", "Результативность"],
  reports:     ["Тип", "Статус", "Вакансия / отдел", "Ответственный"],
  dashboard:   ["Все направления", "Статус", "Ответственный"]
};

export function initFiltersController({ getState, setState, render, saveState }) {

  document.addEventListener("click", (event) => {
    const state = getState();

    // Open filters modal.
    // Кнопки на страницах шлют data-open-filters="<page>" (см. render.js),
    // а дашборд — data-action="open-filters"; поддерживаем оба варианта.
    const openBtn = event.target.closest("[data-open-filters], [data-action='open-filters']");
    if (openBtn) {
      const page = openBtn.dataset.openFilters || state.view || "candidates";
      const filters = PAGE_FILTER_MAP[page] || PAGE_FILTER_MAP.candidates;
      setState(s => ({
        ...s,
        modal: { type: "filters", filters, active: s.activeFilters?.[page] || {} }
      }));
      render();
      return;
    }

    // Apply filters
    if (event.target.closest("[data-action='apply-filters-modal']")) {
      const page = state.view || "candidates";
      setState(s => ({
        ...s,
        activeFilters: { ...(s.activeFilters || {}), [page]: s.modal?.active || {} },
        modal: null
      }));
      saveState();
      render();
      return;
    }

    // Clear all filters in modal
    if (event.target.closest("[data-action='clear-filters-modal']")) {
      if (state.modal?.type === "filters") {
        setState(s => ({ ...s, modal: { ...s.modal, active: {} } }));
        render();
      }
      return;
    }

    // Toggle filter option in modal
    const fpBtn = event.target.closest("[data-fp-key]");
    if (fpBtn && state.modal?.type === "filters") {
      const fpKey = fpBtn.dataset.fpKey;
      const fpVal = fpBtn.dataset.fpVal ?? "";
      setState(s => {
        const newActive = { ...s.modal.active };
        if (fpVal === "") delete newActive[fpKey];
        else newActive[fpKey] = fpVal;
        return { ...s, modal: { ...s.modal, active: newActive } };
      });
      render();
      return;
    }

    // Remove active filter tag (×) from toolbar
    const removeFilter = event.target.closest("[data-remove-filter]")?.dataset.removeFilter;
    if (removeFilter) {
      const page = state.view || "candidates";
      setState(s => {
        const pageFilters = { ...(s.activeFilters?.[page] || {}) };
        delete pageFilters[removeFilter];
        return { ...s, activeFilters: { ...(s.activeFilters || {}), [page]: pageFilters } };
      });
      saveState();
      render();
      return;
    }

    // Clear all filters from toolbar
    if (event.target.closest("[data-action='clear-filters']")) {
      const page = state.view || "candidates";
      setState(s => ({
        ...s,
        activeFilters: { ...(s.activeFilters || {}), [page]: {} }
      }));
      saveState();
      render();
      return;
    }
  });
}

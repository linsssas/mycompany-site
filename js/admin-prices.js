/* Редактор цен на услуги в панели мастера.
   Хранит правки через NB_PricesStorage (localStorage, см. js/data.js) —
   действуют в этом браузере: на сайте и в боте записи сразу же. */

(function () {
  const grid = document.getElementById('pricesGrid');
  const saveBtn = document.getElementById('savePricesBtn');
  const savedHint = document.getElementById('pricesSavedHint');

  if (!grid || !saveBtn) return;

  function render() {
    grid.innerHTML = '';
    NB_SERVICES.forEach(s => {
      const row = document.createElement('label');
      row.className = 'price-row';
      row.innerHTML = `
        <span class="price-row-name">${s.name}</span>
        <span class="price-row-input-wrap">
          <input type="number" min="0" step="100" inputmode="numeric" class="price-row-input" data-service-id="${s.id}" value="${s.price}">
          <span class="price-row-currency">${NB_CURRENCY}</span>
        </span>
      `;
      grid.appendChild(row);
    });
  }

  saveBtn.addEventListener('click', () => {
    let changed = false;
    grid.querySelectorAll('.price-row-input').forEach(input => {
      const value = Math.max(0, Math.round(Number(input.value) || 0));
      const service = nbServiceById(input.dataset.serviceId);
      if (service && service.price !== value) {
        NB_PricesStorage.setPrice(input.dataset.serviceId, value);
        changed = true;
      }
    });
    render();
    if (window.nbRefreshCalendar) window.nbRefreshCalendar();

    savedHint.hidden = false;
    savedHint.textContent = changed ? 'Сохранено ✓' : 'Изменений нет';
    clearTimeout(saveBtn._hintTimer);
    saveBtn._hintTimer = setTimeout(() => (savedHint.hidden = true), 2500);
  });

  render();
})();

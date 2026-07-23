/* Управление мастерами во вкладке «Разработчик»: добавление, редактирование,
   удаление, а также персональная цена мастера на каждую услугу.
   Хранится в localStorage (см. NB_MastersStorage / NB_MasterPricesStorage
   в js/data.js) — после сохранения страница перезагружается, чтобы все
   остальные части панели (календарь, фильтры, публичный сайт) увидели
   актуальный список мастеров. */

(function () {
  const listEl = document.getElementById('mastersEditorList');
  const addBtn = document.getElementById('addMasterBtn');
  const saveBtn = document.getElementById('saveMastersBtn');
  const savedHint = document.getElementById('mastersSavedHint');

  if (!listEl || !addBtn || !saveBtn) return;

  const WEEKDAYS = [
    { value: 1, label: 'Пн' },
    { value: 2, label: 'Вт' },
    { value: 3, label: 'Ср' },
    { value: 4, label: 'Чт' },
    { value: 5, label: 'Пт' },
    { value: 6, label: 'Сб' },
    { value: 0, label: 'Вс' },
  ];

  let working = NB_MASTERS.map(m => JSON.parse(JSON.stringify(m)));
  const masterPrices = NB_MasterPricesStorage.getAll();

  function priceKey(masterId, serviceId) {
    return masterId + ':' + serviceId;
  }

  function render() {
    listEl.innerHTML = '';
    working.forEach((master, index) => {
      listEl.appendChild(buildCard(master, index));
    });
  }

  function buildCard(master, index) {
    const card = document.createElement('div');
    card.className = 'master-edit-card';

    const header = document.createElement('div');
    header.className = 'master-edit-row';
    header.innerHTML = `
      <label class="master-edit-field">
        <span>Имя</span>
        <input type="text" class="master-edit-name" value="${escapeAttr(master.name)}" placeholder="Например, Айгерим">
      </label>
      <label class="master-edit-field">
        <span>Специализация (текст)</span>
        <input type="text" class="master-edit-role" value="${escapeAttr(master.role)}" placeholder="Мастер маникюра">
      </label>
      <label class="master-edit-field master-edit-field-narrow">
        <span>Рейтинг</span>
        <input type="number" min="0" max="5" step="0.1" class="master-edit-rating" value="${master.rating}">
      </label>
    `;
    header.querySelector('.master-edit-name').addEventListener('input', e => (master.name = e.target.value));
    header.querySelector('.master-edit-role').addEventListener('input', e => (master.role = e.target.value));
    header.querySelector('.master-edit-rating').addEventListener('input', e => (master.rating = Number(e.target.value) || 0));
    card.appendChild(header);

    const daysLabel = document.createElement('div');
    daysLabel.className = 'master-edit-subtitle';
    daysLabel.textContent = 'Рабочие дни';
    card.appendChild(daysLabel);

    const daysRow = document.createElement('div');
    daysRow.className = 'master-edit-days';
    WEEKDAYS.forEach(d => {
      const chip = document.createElement('label');
      chip.className = 'master-day-chip';
      const checked = master.workDays.includes(d.value);
      chip.innerHTML = `<input type="checkbox" ${checked ? 'checked' : ''}> ${d.label}`;
      chip.querySelector('input').addEventListener('change', e => {
        if (e.target.checked) {
          if (!master.workDays.includes(d.value)) master.workDays.push(d.value);
        } else {
          master.workDays = master.workDays.filter(v => v !== d.value);
        }
      });
      daysRow.appendChild(chip);
    });
    card.appendChild(daysRow);

    const servicesLabel = document.createElement('div');
    servicesLabel.className = 'master-edit-subtitle';
    servicesLabel.textContent = 'Услуги и персональная цена (пусто — базовая цена услуги)';
    card.appendChild(servicesLabel);

    const servicesGrid = document.createElement('div');
    servicesGrid.className = 'master-edit-services';
    NB_SERVICES.forEach(service => {
      const row = document.createElement('div');
      row.className = 'master-service-row';
      const checked = master.specialties.includes(service.id);
      const key = priceKey(master.id, service.id);
      const overrideValue = masterPrices[key];

      row.innerHTML = `
        <label class="master-service-check">
          <input type="checkbox" ${checked ? 'checked' : ''}>
          <span>${service.name}</span>
        </label>
        <span class="master-service-price-wrap">
          <input type="number" min="0" step="100" class="master-service-price"
                 placeholder="${service.price}" value="${overrideValue != null ? overrideValue : ''}">
          <span class="price-row-currency">${NB_CURRENCY}</span>
        </span>
      `;

      row.querySelector('.master-service-check input').addEventListener('change', e => {
        if (e.target.checked) {
          if (!master.specialties.includes(service.id)) master.specialties.push(service.id);
        } else {
          master.specialties = master.specialties.filter(id => id !== service.id);
        }
      });
      row.querySelector('.master-service-price').addEventListener('input', e => {
        const val = e.target.value.trim();
        if (val === '') {
          delete masterPrices[key];
        } else {
          masterPrices[key] = Math.max(0, Math.round(Number(val) || 0));
        }
      });

      servicesGrid.appendChild(row);
    });
    card.appendChild(servicesGrid);

    const footer = document.createElement('div');
    footer.className = 'master-edit-footer';
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn-outline btn-sm btn-danger';
    deleteBtn.textContent = 'Удалить мастера';
    deleteBtn.addEventListener('click', () => {
      if (confirm(`Удалить мастера «${master.name || 'без имени'}»?`)) {
        working.splice(index, 1);
        render();
      }
    });
    footer.appendChild(deleteBtn);
    card.appendChild(footer);

    return card;
  }

  function escapeAttr(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  addBtn.addEventListener('click', () => {
    working.push({
      id: nbGenMasterId(),
      name: '',
      role: '',
      specialties: [],
      rating: 5.0,
      initials: '?',
      workDays: [],
    });
    render();
    listEl.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  saveBtn.addEventListener('click', () => {
    const cleaned = working
      .filter(m => m.name.trim() !== '')
      .map(m => ({
        ...m,
        name: m.name.trim(),
        role: m.role.trim() || 'Мастер',
        initials: (m.name.trim()[0] || '?').toUpperCase(),
      }));

    if (cleaned.length === 0) {
      alert('Должен остаться хотя бы один мастер с именем.');
      return;
    }

    NB_MastersStorage.saveAll(cleaned);
    NB_MasterPricesStorage.saveAll(masterPrices);

    savedHint.hidden = false;
    saveBtn.disabled = true;
    addBtn.disabled = true;
    setTimeout(() => location.reload(), 700);
  });

  render();
})();

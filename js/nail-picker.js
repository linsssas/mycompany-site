/* «Цветущий календарь» — тематический выбор даты/времени для NAILBOT.
   Форма и анимации отсылают к маникюрной тематике (лепестки, растекание
   лака, пилочки, солнце/луна), но в цветах общей тёмной темы сайта. */

(function () {
  const RU_WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const RU_MONTHS = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
  ];
  const BOOKING_HORIZON_DAYS = 30;

  function isoDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function startOfDay(d) {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c;
  }

  function dayStatus(dateIso, candidateMasterIds) {
    const dow = new Date(dateIso + 'T00:00:00').getDay();
    const masters = candidateMasterIds.map(nbMasterById).filter(m => m.workDays.includes(dow));
    if (masters.length === 0) return 'unavailable';
    const hasFree = NB_TIME_SLOTS.some(time => masters.some(m => !NB_Storage.isSlotTaken(m.id, dateIso, time)));
    return hasFree ? 'available' : 'full';
  }

  function polishIconSvg() {
    return (
      '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="9" y="2" width="6" height="4" rx="1" fill="currentColor"/>' +
      '<path d="M8 8h8l1 12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2l1-12z" fill="currentColor"/>' +
      '</svg>'
    );
  }

  function fileIconSvg() {
    return (
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="3" y="10.3" width="15" height="3.4" rx="1.7" transform="rotate(-18 10.5 12)" ' +
      'stroke="currentColor" stroke-width="1.3"/>' +
      '<line x1="6.5" y1="12.6" x2="8" y2="16.3" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>' +
      '<line x1="9.3" y1="11.3" x2="10.8" y2="15" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>' +
      '<line x1="12.1" y1="10" x2="13.6" y2="13.7" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>' +
      '</svg>'
    );
  }

  function sunIconSvg() {
    return (
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.5"/>' +
      '<g stroke="currentColor" stroke-width="1.5" stroke-linecap="round">' +
      '<line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/>' +
      '<line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/>' +
      '<line x1="4.9" y1="4.9" x2="6.3" y2="6.3"/><line x1="17.7" y1="17.7" x2="19.1" y2="19.1"/>' +
      '<line x1="4.9" y1="19.1" x2="6.3" y2="17.7"/><line x1="17.7" y1="6.3" x2="19.1" y2="4.9"/>' +
      '</g></svg>'
    );
  }

  function moonIconSvg() {
    return (
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>' +
      '</svg>'
    );
  }

  function mountDatePicker(container, { candidateMasterIds, onSelect }) {
    const today = startOfDay(new Date());
    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() + 1);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + BOOKING_HORIZON_DAYS);

    let viewYear = minDate.getFullYear();
    let viewMonth = minDate.getMonth();

    function draw() {
      container.innerHTML = '';
      const card = document.createElement('div');
      card.className = 'nb-cal-card';

      const header = document.createElement('div');
      header.className = 'nb-cal-header';
      header.appendChild(navButton('prev'));
      const label = document.createElement('div');
      label.className = 'nb-cal-month-label';
      label.textContent = `${RU_MONTHS[viewMonth]} ${viewYear}`;
      header.appendChild(label);
      header.appendChild(navButton('next'));
      card.appendChild(header);

      const weekdaysRow = document.createElement('div');
      weekdaysRow.className = 'nb-cal-weekdays';
      RU_WEEKDAYS_SHORT.forEach(w => {
        const el = document.createElement('span');
        el.textContent = w;
        weekdaysRow.appendChild(el);
      });
      card.appendChild(weekdaysRow);

      const grid = document.createElement('div');
      grid.className = 'nb-cal-grid';

      const firstOfMonth = new Date(viewYear, viewMonth, 1);
      const startWeekday = (firstOfMonth.getDay() + 6) % 7; // Mon=0..Sun=6
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

      for (let i = 0; i < startWeekday; i++) {
        const pad = document.createElement('div');
        pad.className = 'nb-cal-day nb-cal-day-pad';
        grid.appendChild(pad);
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(viewYear, viewMonth, day);
        const iso = isoDate(d);
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'nb-cal-day';

        const numSpan = document.createElement('span');
        numSpan.className = 'nb-cal-day-num';
        numSpan.textContent = String(day);
        cell.appendChild(numSpan);

        if (isoDate(today) === iso) cell.classList.add('nb-cal-today');

        const inRange = d >= minDate && d <= maxDate;
        if (!inRange) {
          cell.classList.add('nb-cal-disabled');
          cell.disabled = true;
        } else {
          const status = dayStatus(iso, candidateMasterIds);
          if (status === 'unavailable') {
            cell.classList.add('nb-cal-disabled');
            cell.disabled = true;
          } else if (status === 'full') {
            cell.classList.add('nb-cal-full');
            cell.disabled = true;
            const icon = document.createElement('span');
            icon.className = 'nb-cal-full-icon';
            icon.innerHTML = polishIconSvg();
            cell.appendChild(icon);
          } else {
            cell.addEventListener('click', () => {
              grid.querySelectorAll('.nb-cal-selected').forEach(el => el.classList.remove('nb-cal-selected'));
              cell.classList.add('nb-cal-selected');
              cell.disabled = true;
              setTimeout(() => onSelect(iso), 320);
            });
          }
        }
        grid.appendChild(cell);
      }

      card.appendChild(grid);
      container.appendChild(card);
      requestAnimationFrame(() => card.classList.add('nb-cal-open'));
    }

    function navButton(dir) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nb-cal-nav nb-cal-nav-' + dir;
      btn.innerHTML = fileIconSvg();
      btn.setAttribute('aria-label', dir === 'prev' ? 'Предыдущий месяц' : 'Следующий месяц');

      const targetMonthFirst = new Date(viewYear, viewMonth + (dir === 'prev' ? -1 : 1), 1);
      const targetMonthLast = new Date(targetMonthFirst.getFullYear(), targetMonthFirst.getMonth() + 1, 0);
      const outOfRange = dir === 'prev' ? targetMonthLast < minDate : targetMonthFirst > maxDate;

      if (outOfRange) {
        btn.disabled = true;
      } else {
        btn.addEventListener('click', () => {
          viewMonth += dir === 'prev' ? -1 : 1;
          if (viewMonth < 0) { viewMonth = 11; viewYear--; }
          if (viewMonth > 11) { viewMonth = 0; viewYear++; }
          draw();
        });
      }
      return btn;
    }

    draw();
  }

  function clockIconSvg() {
    return (
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.5"/>' +
      '<path d="M12 7.5V12l3 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>'
    );
  }

  function chevronIconSvg() {
    return (
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M5 8.5L12 15.5L19 8.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>'
    );
  }

  // Выпадающий (аккордеон) список времени — вертикальный, без горизонтального скролла
  function mountTimePicker(container, { dateIso, candidateMasterIds, onSelect }) {
    const dow = new Date(dateIso + 'T00:00:00').getDay();
    const workingMasters = candidateMasterIds.map(nbMasterById).filter(m => m.workDays.includes(dow));

    const select = document.createElement('div');
    select.className = 'nb-time-select';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'nb-time-trigger';
    trigger.innerHTML =
      `<span class="nb-time-trigger-icon">${clockIconSvg()}</span>` +
      `<span class="nb-time-trigger-label">Выберите время</span>` +
      `<span class="nb-time-chevron">${chevronIconSvg()}</span>`;

    const panel = document.createElement('div');
    panel.className = 'nb-time-panel';
    const panelInner = document.createElement('div');
    panelInner.className = 'nb-time-panel-inner';

    let chosen = false;

    trigger.addEventListener('click', () => {
      if (chosen) return;
      select.classList.toggle('nb-time-select-open');
      if (select.classList.contains('nb-time-select-open')) {
        setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 200);
      }
    });

    NB_TIME_SLOTS.forEach(time => {
      const hh = Number(time.split(':')[0]);
      const isMorning = hh < 16;
      const free = workingMasters.some(m => !NB_Storage.isSlotTaken(m.id, dateIso, time));

      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'nb-time-option' + (free ? '' : ' nb-time-option-taken');
      option.innerHTML =
        `<span class="nb-time-icon">${isMorning ? sunIconSvg() : moonIconSvg()}</span><span>${time}</span>`;

      if (!free) {
        option.disabled = true;
      } else {
        option.addEventListener('click', () => {
          if (chosen) return;
          chosen = true;
          panelInner.querySelectorAll('.nb-time-option').forEach(el => (el.disabled = true));
          option.classList.add('nb-time-option-selected');
          trigger.querySelector('.nb-time-trigger-label').textContent = time;
          trigger.classList.add('nb-time-trigger-chosen');
          select.classList.remove('nb-time-select-open');
          setTimeout(() => onSelect(time), 420);
        });
      }
      panelInner.appendChild(option);
    });

    panel.appendChild(panelInner);
    select.appendChild(trigger);
    select.appendChild(panel);
    container.appendChild(select);
    requestAnimationFrame(() => select.classList.add('nb-time-select-in'));
  }

  window.NBPicker = { mountDatePicker, mountTimePicker, dayStatus, isoDate };
})();

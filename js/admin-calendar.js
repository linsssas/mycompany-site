/* Визуальный календарь записей: мастера по горизонтали, время по вертикали.
   Показывает занятые интервалы с учётом длительности услуги. */

(function () {
  const CAL_START_HOUR = 10;
  const CAL_END_HOUR = 21;
  const CAL_HOUR_PX = 72;

  const dateInput = document.getElementById('calDateInput');
  const grid = document.getElementById('calendarGrid');
  const emptyState = document.getElementById('calendarEmpty');

  if (!dateInput || !grid) return;

  dateInput.value = todayIso();

  dateInput.addEventListener('change', () => renderCalendar(dateInput.value));
  document.getElementById('calPrevDay').addEventListener('click', () => shiftDay(-1));
  document.getElementById('calNextDay').addEventListener('click', () => shiftDay(1));
  document.getElementById('calTodayBtn').addEventListener('click', () => {
    dateInput.value = todayIso();
    renderCalendar(dateInput.value);
  });

  function shiftDay(delta) {
    const d = new Date(dateInput.value + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    dateInput.value = isoDate(d);
    renderCalendar(dateInput.value);
  }

  function todayIso() {
    return isoDate(new Date());
  }

  function isoDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function minutesToTime(totalMin) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }

  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = String(value);
    return div.innerHTML;
  }

  function renderCalendar(dateIso) {
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `60px repeat(${NB_MASTERS.length}, 1fr)`;

    const corner = document.createElement('div');
    corner.className = 'calendar-corner';
    grid.appendChild(corner);

    NB_MASTERS.forEach(m => {
      const head = document.createElement('div');
      head.className = 'calendar-master-name';
      head.textContent = m.name;
      grid.appendChild(head);
    });

    const totalMinutes = (CAL_END_HOUR - CAL_START_HOUR) * 60;
    const totalPx = (CAL_END_HOUR - CAL_START_HOUR) * CAL_HOUR_PX;

    const axis = document.createElement('div');
    axis.className = 'calendar-time-axis';
    axis.style.height = totalPx + 'px';
    for (let h = CAL_START_HOUR; h <= CAL_END_HOUR; h++) {
      const label = document.createElement('div');
      label.className = 'calendar-hour-label';
      label.style.top = (h - CAL_START_HOUR) * CAL_HOUR_PX + 'px';
      label.textContent = String(h).padStart(2, '0') + ':00';
      axis.appendChild(label);
    }
    grid.appendChild(axis);

    const dayBookings = NB_Storage.getAll().filter(b => b.date === dateIso);

    NB_MASTERS.forEach(m => {
      const col = document.createElement('div');
      col.className = 'calendar-column';
      col.style.height = totalPx + 'px';
      col.style.backgroundSize = `100% ${CAL_HOUR_PX}px`;

      dayBookings
        .filter(b => b.masterId === m.id)
        .forEach(b => {
          const service = nbServiceById(b.serviceId);
          const duration = service ? service.duration : 60;
          const [hh, mm] = b.time.split(':').map(Number);
          const startMin = hh * 60 + mm - CAL_START_HOUR * 60;
          const top = (startMin / totalMinutes) * totalPx;
          const height = (duration / totalMinutes) * totalPx;
          const endLabel = minutesToTime(hh * 60 + mm + duration);

          const block = document.createElement('div');
          block.className = 'calendar-block' + (b.status === 'cancelled' ? ' calendar-block-cancelled' : '');
          block.style.top = Math.max(0, top) + 'px';
          block.style.height = Math.max(26, height) + 'px';
          block.title = `${b.name}, ${b.phone}\n${service ? service.name : ''}\n${b.time}–${endLabel}`;
          block.innerHTML =
            `<strong>${b.time}–${endLabel}</strong>` +
            `${service ? escapeHtml(service.name) : ''}<br>${escapeHtml(b.name)}`;
          col.appendChild(block);
        });

      grid.appendChild(col);
    });

    emptyState.hidden = dayBookings.filter(b => b.status !== 'cancelled').length !== 0;
  }

  renderCalendar(dateInput.value);

  window.nbRefreshCalendar = () => renderCalendar(dateInput.value);
})();

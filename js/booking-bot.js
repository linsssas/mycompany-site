/* NAILBOT — бот записи на маникюр, отслеживающий запись к разным мастерам.
   Хранит записи в localStorage (см. js/data.js -> NB_Storage). */

(function () {
  const fab = document.getElementById('botFab');
  const widget = document.getElementById('botWidget');
  const closeBtn = document.getElementById('botClose');
  const messagesEl = document.getElementById('botMessages');
  const optionsEl = document.getElementById('botOptions');
  const inputForm = document.getElementById('botInputForm');
  const inputEl = document.getElementById('botInput');

  const WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  let ctx = {}; // текущее состояние диалога
  let pendingTextHandler = null;

  function openBot(prefill) {
    widget.hidden = false;
    fab.classList.add('active');
    if (messagesEl.childElementCount === 0) {
      greet();
    }
    if (prefill && prefill.masterId) {
      resetFlow();
      addBot(`Отлично! Начнём запись к мастеру «${nbMasterById(prefill.masterId).name}».`);
      chooseServiceStep(prefill.masterId);
    }
  }

  function closeBot() {
    widget.hidden = true;
    fab.classList.remove('active');
  }

  fab.addEventListener('click', () => (widget.hidden ? openBot() : closeBot()));
  closeBtn.addEventListener('click', closeBot);
  document.getElementById('openBotBtn').addEventListener('click', () => openBot());
  document.getElementById('heroBookBtn').addEventListener('click', () => openBot());
  document.getElementById('contactsBookBtn').addEventListener('click', () => openBot());
  window.addEventListener('nb-open-bot', e => openBot(e.detail));

  inputForm.addEventListener('submit', e => {
    e.preventDefault();
    const val = inputEl.value.trim();
    if (!val) return;
    addUser(val);
    inputEl.value = '';
    const handler = pendingTextHandler;
    pendingTextHandler = null;
    hideInput();
    if (handler) handler(val);
  });

  // ---------- UI helpers ----------

  function addBot(text) {
    const div = document.createElement('div');
    div.className = 'bot-msg bot-msg-bot';
    div.innerHTML = text;
    messagesEl.appendChild(div);
    scrollDown();
  }

  function addUser(text) {
    const div = document.createElement('div');
    div.className = 'bot-msg bot-msg-user';
    div.textContent = text;
    messagesEl.appendChild(div);
    scrollDown();
  }

  function scrollDown() {
    requestAnimationFrame(() => (messagesEl.scrollTop = messagesEl.scrollHeight));
  }

  function setOptions(options) {
    optionsEl.innerHTML = '';
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'bot-option-btn';
      btn.textContent = opt.label;
      btn.addEventListener('click', () => {
        addUser(opt.label);
        clearOptions();
        opt.action();
      });
      optionsEl.appendChild(btn);
    });
  }

  function clearOptions() {
    optionsEl.innerHTML = '';
  }

  function showInput(placeholder, handler) {
    inputEl.placeholder = placeholder;
    inputForm.hidden = false;
    pendingTextHandler = handler;
    inputEl.focus();
  }

  function hideInput() {
    inputForm.hidden = true;
    pendingTextHandler = null;
  }

  function restartOption() {
    return { label: '⟲ Начать заново', action: () => resetFlow() };
  }

  // ---------- Flow ----------

  function greet() {
    addBot(
      `Привет! Я <strong>NAILBOT</strong> 💅 — бот записи салона NAILBLAACK.<br>Я слежу за расписанием всех мастеров и помогу найти свободное время.`
    );
    mainMenu();
  }

  function resetFlow() {
    ctx = {};
    hideInput();
    addBot('Чем могу помочь?');
    mainMenu();
  }

  function mainMenu() {
    setOptions([
      { label: '📅 Записаться на процедуру', action: () => chooseServiceStep() },
      { label: '🔎 Мои записи', action: () => myBookingsStep() },
      { label: '💸 Услуги и цены', action: () => showServicesInfo() },
    ]);
  }

  function showServicesInfo() {
    const list = NB_SERVICES.map(s => `• ${s.name} — <strong>${s.price} ₽</strong> (${s.duration} мин)`).join('<br>');
    addBot('Наши услуги:<br>' + list);
    setOptions([{ label: '📅 Записаться', action: () => chooseServiceStep() }, restartOption()]);
  }

  // Шаг 1: услуга
  function chooseServiceStep(preselectedMasterId) {
    ctx.masterId = preselectedMasterId || null;
    addBot('Какая услуга вас интересует?');
    const options = NB_SERVICES.map(s => ({
      label: `${s.name} — ${s.price} ₽`,
      action: () => chooseMasterStep(s.id),
    }));
    options.push(restartOption());
    setOptions(options);
  }

  // Шаг 2: мастер
  function chooseMasterStep(serviceId) {
    ctx.serviceId = serviceId;
    const service = nbServiceById(serviceId);

    if (ctx.masterId) {
      // мастер уже выбран заранее (например, из карточки мастера)
      const master = nbMasterById(ctx.masterId);
      if (!master.specialties.includes(service.id)) {
        addBot(`У мастера ${master.name} нет такой услуги. Давайте выберем другого мастера.`);
      } else {
        chooseDateStep([master.id]);
        return;
      }
    }

    const suitable = NB_MASTERS.filter(m => m.specialties.includes(service.id));
    if (suitable.length === 0) {
      addBot('К сожалению, для этой услуги пока нет мастеров. Попробуйте другую услугу.');
      setOptions([restartOption()]);
      return;
    }

    addBot(`Услуга: <strong>${service.name}</strong>. Выберите мастера:`);
    const options = suitable.map(m => ({
      label: `${m.name} (${m.role}) ★${m.rating}`,
      action: () => chooseDateStep([m.id]),
    }));
    if (suitable.length > 1) {
      options.push({
        label: '🤝 Любой свободный мастер',
        action: () => chooseDateStep(suitable.map(m => m.id)),
      });
    }
    options.push(restartOption());
    setOptions(options);
  }

  // Шаг 3: дата
  function chooseDateStep(candidateMasterIds) {
    ctx.candidateMasterIds = candidateMasterIds;
    const dates = getAvailableDates(candidateMasterIds, 7);

    if (dates.length === 0) {
      addBot('К сожалению, у выбранных мастеров нет свободных дат в ближайшее время.');
      setOptions([restartOption()]);
      return;
    }

    addBot('Выберите удобную дату:');
    const options = dates.map(d => ({
      label: d.label,
      action: () => chooseTimeStep(d.iso),
    }));
    options.push(restartOption());
    setOptions(options);
  }

  function getAvailableDates(candidateMasterIds, count) {
    const masters = candidateMasterIds.map(nbMasterById);
    const result = [];
    const today = new Date();
    for (let i = 1; result.length < count && i <= 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dow = d.getDay();
      const worksThatDay = masters.some(m => m.workDays.includes(dow));
      if (worksThatDay) {
        result.push({
          iso: isoDate(d),
          label: `${WEEKDAYS[dow]}, ${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`,
        });
      }
    }
    return result;
  }

  function isoDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // Шаг 4: время
  function chooseTimeStep(dateIso) {
    ctx.date = dateIso;
    const dow = new Date(dateIso + 'T00:00:00').getDay();
    const masters = ctx.candidateMasterIds.map(nbMasterById).filter(m => m.workDays.includes(dow));

    const freeSlots = NB_TIME_SLOTS.filter(time =>
      masters.some(m => !NB_Storage.isSlotTaken(m.id, dateIso, time))
    );

    if (freeSlots.length === 0) {
      addBot('На эту дату все окна заняты. Попробуйте другую дату.');
      setOptions([{ label: '← Выбрать другую дату', action: () => chooseDateStep(ctx.candidateMasterIds) }, restartOption()]);
      return;
    }

    addBot('Выберите время:');
    const options = freeSlots.map(time => ({
      label: time,
      action: () => assignMasterAndAskName(time),
    }));
    options.push(restartOption());
    setOptions(options);
  }

  function assignMasterAndAskName(time) {
    const dow = new Date(ctx.date + 'T00:00:00').getDay();
    const masters = ctx.candidateMasterIds.map(nbMasterById).filter(m => m.workDays.includes(dow));
    const assigned = masters.find(m => !NB_Storage.isSlotTaken(m.id, ctx.date, time));

    if (!assigned) {
      addBot('Упс, это время только что заняли. Выберите другое.');
      chooseTimeStep(ctx.date);
      return;
    }

    ctx.masterId = assigned.id;
    ctx.time = time;

    addBot(`Записываю вас к мастеру <strong>${assigned.name}</strong> на ${formatDateLabel(ctx.date)} в ${time}.<br>Как вас зовут?`);
    showInput('Введите ваше имя', name => {
      ctx.name = name;
      addBot('Спасибо! Укажите номер телефона для подтверждения записи:');
      showInput('+7 (___) ___-__-__', phone => askPhone(phone));
    });
  }

  function askPhone(phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      addBot('Похоже, номер введён некорректно. Попробуйте ещё раз, например +7 999 000 11 22:');
      showInput('+7 (___) ___-__-__', p => askPhone(p));
      return;
    }
    ctx.phone = phone;
    confirmStep();
  }

  function confirmStep() {
    const master = nbMasterById(ctx.masterId);
    const service = nbServiceById(ctx.serviceId);
    addBot(
      `Проверьте данные записи:<br>` +
        `👤 Имя: <strong>${escapeHtml(ctx.name)}</strong><br>` +
        `📞 Телефон: <strong>${escapeHtml(ctx.phone)}</strong><br>` +
        `💅 Услуга: <strong>${service.name}</strong> (${service.price} ₽)<br>` +
        `🙋 Мастер: <strong>${master.name}</strong><br>` +
        `📅 Дата: <strong>${formatDateLabel(ctx.date)}</strong><br>` +
        `🕐 Время: <strong>${ctx.time}</strong>`
    );
    setOptions([
      { label: '✅ Подтвердить запись', action: () => finalizeBooking() },
      { label: '✖ Отменить', action: () => resetFlow() },
    ]);
  }

  function finalizeBooking() {
    if (NB_Storage.isSlotTaken(ctx.masterId, ctx.date, ctx.time)) {
      addBot('К сожалению, это время только что заняли другим клиентом. Выберите другое время.<br>Мы уже сообщили администратору — с вами свяжутся, чтобы подобрать удобное время.');
      notifyTelegramConflict();
      chooseTimeStep(ctx.date);
      return;
    }

    const booking = {
      id: nbGenId(),
      masterId: ctx.masterId,
      serviceId: ctx.serviceId,
      date: ctx.date,
      time: ctx.time,
      name: ctx.name,
      phone: ctx.phone,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };
    NB_Storage.add(booking);
    notifyTelegram(booking);

    const master = nbMasterById(ctx.masterId);
    addBot(
      `🎉 Готово! Вы записаны к <strong>${master.name}</strong> на ${formatDateLabel(ctx.date)} в ${ctx.time}.<br>` +
        `Номер записи: <code>${booking.id}</code><br>Мастер свяжется с вами для подтверждения по номеру ${escapeHtml(ctx.phone)}.`
    );
    setOptions([
      { label: '📅 Записаться ещё раз', action: () => chooseServiceStep() },
      restartOption(),
    ]);
  }

  function notifyTelegram(booking) {
    if (!NB_NOTIFY_URL) return;
    const master = nbMasterById(booking.masterId);
    const service = nbServiceById(booking.serviceId);
    fetch(NB_NOTIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'confirmed',
        masterName: master.name,
        serviceName: service.name,
        price: service.price,
        date: booking.date,
        time: booking.time,
        name: booking.name,
        phone: booking.phone,
      }),
    }).catch(() => {});
  }

  // Клиент дошёл до подтверждения, но слот в последний момент заняли —
  // шлём администратору контакты клиента, чтобы связаться с ним вручную
  // (по телефону/WhatsApp) и предложить другое время.
  function notifyTelegramConflict() {
    if (!NB_NOTIFY_URL) return;
    const master = nbMasterById(ctx.masterId);
    const service = nbServiceById(ctx.serviceId);
    fetch(NB_NOTIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'conflict',
        masterName: master ? master.name : '',
        serviceName: service ? service.name : '',
        price: service ? service.price : '',
        date: ctx.date,
        time: ctx.time,
        name: ctx.name,
        phone: ctx.phone,
      }),
    }).catch(() => {});
  }

  // ---------- Мои записи ----------

  function myBookingsStep() {
    addBot('Введите номер телефона, указанный при записи:');
    showInput('+7 (___) ___-__-__', phone => {
      const bookings = NB_Storage.byPhone(phone).filter(b => b.status !== 'cancelled');
      if (bookings.length === 0) {
        addBot('Записей по этому номеру не найдено.');
        setOptions([restartOption()]);
        return;
      }
      addBot(`Найдено записей: ${bookings.length}`);
      bookings
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
        .forEach(b => {
          const master = nbMasterById(b.masterId);
          const service = nbServiceById(b.serviceId);
          addBot(
            `💅 ${service.name} у мастера <strong>${master.name}</strong><br>📅 ${formatDateLabel(b.date)} в ${b.time}<br>Статус: ${statusLabel(b.status)}`
          );
        });
      const options = bookings.map(b => ({
        label: `✖ Отменить запись ${b.time} ${formatDateLabel(b.date)}`,
        action: () => {
          NB_Storage.updateStatus(b.id, 'cancelled');
          addBot('Запись отменена.');
          myBookingsStep();
        },
      }));
      options.push(restartOption());
      setOptions(options);
    });
  }

  function statusLabel(status) {
    return { confirmed: '✅ подтверждена', cancelled: '✖ отменена' }[status] || status;
  }

  function formatDateLabel(iso) {
    const d = new Date(iso + 'T00:00:00');
    return `${WEEKDAYS[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();

/* Общие данные и хранилище записей для NAILBLAACK */

// specialties хранят id услуг из NB_SERVICES (см. ниже), а не их текстовые названия
const NB_MASTERS = [
  {
    id: 'anna',
    name: 'Анна',
    role: 'Топ-мастер маникюра',
    specialties: ['manicure', 'gel', 'design'],
    rating: 4.9,
    initials: 'А',
    workDays: [1, 2, 3, 4, 5], // Пн-Пт
  },
  {
    id: 'victoria',
    name: 'Виктория',
    role: 'Мастер наращивания',
    specialties: ['extension', 'design'],
    rating: 5.0,
    initials: 'В',
    workDays: [2, 3, 4, 5, 6], // Вт-Сб
  },
  {
    id: 'marina',
    name: 'Марина',
    role: 'Мастер педикюра и SPA',
    specialties: ['pedicure', 'spa'],
    rating: 4.8,
    initials: 'М',
    workDays: [1, 3, 4, 5, 6], // Пн, Ср-Сб
  },
  {
    id: 'ksenia',
    name: 'Ксения',
    role: 'Универсальный мастер',
    specialties: ['manicure', 'gel', 'extension', 'pedicure'],
    rating: 4.9,
    initials: 'К',
    workDays: [1, 2, 4, 5, 6], // Пн, Вт, Чт-Сб
  },
];

const NB_CURRENCY = '₸';

const NB_SERVICES = [
  { id: 'manicure', name: 'Маникюр классический', price: 6000, duration: 60 },
  { id: 'gel', name: 'Гель-лак покрытие', price: 9000, duration: 90 },
  { id: 'extension', name: 'Наращивание ногтей', price: 14000, duration: 120 },
  { id: 'design', name: 'Дизайн ногтей', price: 2500, duration: 30 },
  { id: 'pedicure', name: 'Педикюр', price: 11000, duration: 90 },
  { id: 'spa', name: 'SPA-уход', price: 8000, duration: 60 },
];

// Цены, отредактированные в панели мастера, хранятся отдельно и накладываются
// поверх значений выше при каждой загрузке страницы (см. NB_PricesStorage).
const NB_PRICES_KEY = 'nailblaack_prices_v1';

const NB_PricesStorage = {
  getOverrides() {
    try {
      return JSON.parse(localStorage.getItem(NB_PRICES_KEY)) || {};
    } catch (e) {
      return {};
    }
  },
  setPrice(serviceId, price) {
    const overrides = this.getOverrides();
    overrides[serviceId] = price;
    localStorage.setItem(NB_PRICES_KEY, JSON.stringify(overrides));
    const service = nbServiceById(serviceId);
    if (service) service.price = price;
  },
};

(function applyStoredPrices() {
  const overrides = NB_PricesStorage.getOverrides();
  NB_SERVICES.forEach(s => {
    if (typeof overrides[s.id] === 'number') s.price = overrides[s.id];
  });
})();

const NB_TIME_SLOTS = ['10:00', '11:30', '13:00', '14:30', '16:00', '17:30', '19:00', '20:00'];

// URL воркера, который шлёт уведомления о записях в Telegram (см. server/telegram-notify).
const NB_NOTIFY_URL = 'https://nailblaack-notify.linar-caser.workers.dev/';

const NB_STORAGE_KEY = 'nailblaack_bookings_v1';

const NB_Storage = {
  getAll() {
    try {
      const raw = localStorage.getItem(NB_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },
  saveAll(bookings) {
    localStorage.setItem(NB_STORAGE_KEY, JSON.stringify(bookings));
  },
  add(booking) {
    const bookings = this.getAll();
    bookings.push(booking);
    this.saveAll(bookings);
    return booking;
  },
  remove(id) {
    const bookings = this.getAll().filter(b => b.id !== id);
    this.saveAll(bookings);
  },
  updateStatus(id, status) {
    const bookings = this.getAll();
    const b = bookings.find(x => x.id === id);
    if (b) {
      b.status = status;
      this.saveAll(bookings);
    }
  },
  isSlotTaken(masterId, date, time) {
    return this.getAll().some(
      b => b.masterId === masterId && b.date === date && b.time === time && b.status !== 'cancelled'
    );
  },
  byMaster(masterId) {
    return this.getAll().filter(b => b.masterId === masterId);
  },
  byPhone(phone) {
    const normalized = phone.replace(/\D/g, '');
    return this.getAll().filter(b => b.phone.replace(/\D/g, '') === normalized);
  },
};

function nbGenId() {
  return 'nb-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}

function nbMasterById(id) {
  return NB_MASTERS.find(m => m.id === id);
}

function nbServiceById(id) {
  return NB_SERVICES.find(s => s.id === id);
}

/* Рендер статического контента страницы NAILBLAACK */

document.getElementById('year').textContent = new Date().getFullYear();

// Цены услуг (учитывают правки из панели мастера, см. js/data.js -> NB_PricesStorage)
document.querySelectorAll('[data-service-price]').forEach(el => {
  const service = nbServiceById(el.dataset.servicePrice);
  if (service) el.textContent = `от ${service.price} ${NB_CURRENCY}`;
});

// Мастера
const mastersGrid = document.getElementById('mastersGrid');
NB_MASTERS.forEach(m => {
  const el = document.createElement('div');
  el.className = 'card master-card';
  el.innerHTML = `
    <div class="master-avatar">${m.initials}</div>
    <h3>${m.name}</h3>
    <p class="master-role">${m.role}</p>
    <div class="master-tags">
      ${m.specialties.map(id => `<span class="tag">${nbServiceById(id).name}</span>`).join('')}
    </div>
    <div class="master-rating">★ ${m.rating.toFixed(1)}</div>
    <button class="btn btn-outline master-book-btn" data-master="${m.id}">Записаться</button>
  `;
  mastersGrid.appendChild(el);
});

mastersGrid.addEventListener('click', e => {
  const btn = e.target.closest('.master-book-btn');
  if (!btn) return;
  window.dispatchEvent(new CustomEvent('nb-open-bot', { detail: { masterId: btn.dataset.master } }));
});

// Галерея (декоративные плитки без внешних изображений)
const galleryEmojis = ['💅', '✨', '🖤', '💙', '🎨', '🦋', '❄️', '🌙'];
const galleryGrid = document.getElementById('galleryGrid');
galleryEmojis.forEach((em, i) => {
  const tile = document.createElement('div');
  tile.className = 'gallery-tile gallery-tile-' + (i % 4);
  tile.innerHTML = `<span>${em}</span>`;
  galleryGrid.appendChild(tile);
});

// Мобильное меню
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');
burger.addEventListener('click', () => {
  nav.classList.toggle('open');
  burger.classList.toggle('open');
});
nav.querySelectorAll('a').forEach(a =>
  a.addEventListener('click', () => {
    nav.classList.remove('open');
    burger.classList.remove('open');
  })
);

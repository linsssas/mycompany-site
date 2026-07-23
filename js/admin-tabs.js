/* Переключение вкладок «Записи» / «Разработчик» в панели мастера */

(function () {
  const bookingsBtn = document.getElementById('tabBtnBookings');
  const developerBtn = document.getElementById('tabBtnDeveloper');
  const bookingsTab = document.getElementById('tabBookings');
  const developerTab = document.getElementById('tabDeveloper');

  if (!bookingsBtn || !developerBtn) return;

  function show(tab) {
    const isBookings = tab === 'bookings';
    bookingsTab.hidden = !isBookings;
    developerTab.hidden = isBookings;
    bookingsBtn.classList.toggle('admin-tab-active', isBookings);
    developerBtn.classList.toggle('admin-tab-active', !isBookings);
  }

  bookingsBtn.addEventListener('click', () => show('bookings'));
  developerBtn.addEventListener('click', () => show('developer'));
})();

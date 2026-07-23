/* Простая клиентская защита панели мастера паролем.
   Это не серверная авторизация — только скрывает панель от случайных посетителей. */

(function () {
  const ADMIN_PASSWORD = '2026';
  const SESSION_KEY = 'nb_admin_authed';

  const loginEl = document.getElementById('adminLogin');
  const mainEl = document.getElementById('adminMain');
  const form = document.getElementById('adminLoginForm');
  const input = document.getElementById('adminPasswordInput');
  const errorEl = document.getElementById('adminLoginError');

  function grantAccess() {
    sessionStorage.setItem(SESSION_KEY, '1');
    loginEl.hidden = true;
    mainEl.hidden = false;
  }

  if (sessionStorage.getItem(SESSION_KEY) === '1') {
    grantAccess();
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (input.value.trim() === ADMIN_PASSWORD) {
      grantAccess();
    } else {
      errorEl.hidden = false;
      input.value = '';
      input.focus();
    }
  });
})();

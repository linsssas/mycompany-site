/* Панель мастера: просмотр записей, сделанных ботом NAILBOT */

const filterMasterEl = document.getElementById('filterMaster');
const filterStatusEl = document.getElementById('filterStatus');
const bookingsBody = document.getElementById('bookingsBody');
const emptyState = document.getElementById('emptyState');
const summaryEl = document.getElementById('mastersSummary');

NB_MASTERS.forEach(m => {
  const opt = document.createElement('option');
  opt.value = m.id;
  opt.textContent = m.name;
  filterMasterEl.appendChild(opt);
});

filterMasterEl.addEventListener('change', render);
filterStatusEl.addEventListener('change', render);
document.getElementById('refreshBtn').addEventListener('click', render);

function render() {
  const all = NB_Storage.getAll();

  // Сводка по мастерам
  summaryEl.innerHTML = NB_MASTERS.map(m => {
    const count = all.filter(b => b.masterId === m.id && b.status !== 'cancelled').length;
    return `<div class="summary-card"><span class="summary-count">${count}</span><span>${m.name}</span></div>`;
  }).join('');

  let bookings = all;
  if (filterMasterEl.value !== 'all') {
    bookings = bookings.filter(b => b.masterId === filterMasterEl.value);
  }
  if (filterStatusEl.value !== 'all') {
    bookings = bookings.filter(b => b.status === filterStatusEl.value);
  }
  bookings.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  bookingsBody.innerHTML = '';
  emptyState.hidden = bookings.length !== 0;

  bookings.forEach(b => {
    const master = nbMasterById(b.masterId);
    const service = nbServiceById(b.serviceId);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDate(b.date)} · ${b.time}</td>
      <td>${master ? master.name : '—'}</td>
      <td>${service ? service.name : '—'}</td>
      <td>${escapeHtml(b.name)}</td>
      <td>${escapeHtml(b.phone)}</td>
      <td><span class="status-pill status-${b.status}">${statusLabel(b.status)}</span></td>
      <td class="admin-actions"></td>
    `;
    const actionsCell = tr.querySelector('.admin-actions');

    if (b.status !== 'cancelled') {
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-outline btn-sm';
      cancelBtn.textContent = 'Отменить';
      cancelBtn.addEventListener('click', () => {
        NB_Storage.updateStatus(b.id, 'cancelled');
        render();
      });
      actionsCell.appendChild(cancelBtn);
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-outline btn-sm btn-danger';
    deleteBtn.textContent = 'Удалить';
    deleteBtn.addEventListener('click', () => {
      if (confirm('Удалить запись безвозвратно?')) {
        NB_Storage.remove(b.id);
        render();
      }
    });
    actionsCell.appendChild(deleteBtn);

    bookingsBody.appendChild(tr);
  });
}

function statusLabel(status) {
  return { confirmed: 'Подтверждена', cancelled: 'Отменена' }[status] || status;
}

function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

render();

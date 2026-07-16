let customers = [];
let options = {};
let currentCustomerId = null;
let currentMonth = null;

function monthLabel(m) {
  const [y, mo] = m.split('-');
  return `${y}年${parseInt(mo, 10)}月`;
}

function populateMonthSelect() {
  const sel = document.getElementById('monthSelect');
  const now = new Date();
  const opts = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    opts.push(m);
  }
  currentMonth = opts[0];
  sel.innerHTML = opts.map((m) => `<option value="${m}">${monthLabel(m)}${m === opts[0] ? '（本月）' : ''}</option>`).join('');
  sel.value = currentMonth;
}

async function loadOptions() {
  const res = await fetch('/api/options');
  options = await res.json();
  document.querySelectorAll('select[data-options]').forEach((sel) => {
    const cat = sel.dataset.options;
    sel.innerHTML = '<option value="">-- 請選擇 --</option>' +
      (options[cat] || []).map((v) => `<option value="${v}">${v}</option>`).join('');
  });
}

async function loadCustomers() {
  const res = await fetch(`/api/customers?month=${currentMonth}`);
  customers = await res.json();
  renderCustomerList();
}

function renderCustomerList(filter = '') {
  const list = document.getElementById('customerList');
  const f = filter.trim().toLowerCase();
  const filtered = customers.filter((c) =>
    !f || c.customer_name.toLowerCase().includes(f) || c.contact_name.toLowerCase().includes(f)
  );
  list.innerHTML = filtered.map((c) => `
    <div class="customer-list-item ${c.id === currentCustomerId ? 'active' : ''}" data-id="${c.id}">
      <div class="name"><span class="status-dot ${c.record_id ? 'filled' : ''}"></span>${c.contact_name}　<span class="badge">${c.title || ''}</span></div>
      <div class="sub">${c.customer_name}　${c.department || ''}</div>
    </div>
  `).join('') || '<p style="color:#6b7684;">找不到符合的客戶。</p>';

  list.querySelectorAll('.customer-list-item').forEach((el) => {
    el.addEventListener('click', () => selectCustomer(parseInt(el.dataset.id, 10)));
  });
}

function calcDisplays() {
  const form = document.getElementById('recordForm');
  const vol = parseFloat(form.monthly_patient_volume.value) || 0;
  const severePct = parseFloat(form.severe_asthma_pct.value) || 0;
  const xolairPct = parseFloat(form.xolair_pct.value) || 0;
  document.getElementById('severe_asthma_no_display').value = vol && severePct ? Math.round((vol * severePct) / 100) : '';
  document.getElementById('xolair_no_display').value = vol && xolairPct ? Math.round((vol * xolairPct) / 100) : '';
}

async function selectCustomer(id) {
  currentCustomerId = id;
  renderCustomerList(document.getElementById('searchBox').value);

  const res = await fetch(`/api/customers/${id}?month=${currentMonth}`);
  if (!res.ok) return;
  const data = await res.json();

  document.getElementById('formCard').style.display = 'block';
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('formTitle').textContent = `${data.contact_name}（${data.customer_name}）`;
  document.getElementById('formSubtitle').textContent = `${data.specialty || ''}　${data.department || ''}　${data.title || ''}　客戶代號：${data.customer_code}`;

  const hint = document.getElementById('carriedOverHint');
  if (data.carried_over) {
    hint.style.display = 'block';
    hint.textContent = `以下資料帶自 ${monthLabel(data.carried_over_month.slice(0, 7))} 的填寫紀錄，請確認並更新後儲存，會建立 ${monthLabel(currentMonth)} 的新紀錄（不會覆蓋原本的月份）。`;
  } else {
    hint.style.display = 'none';
  }

  const form = document.getElementById('recordForm');
  const fields = [
    'team', 'customer_tier', 'hcp_tier', 'customer_relationship', 'adoption_ladder',
    'monthly_patient_volume', 'current_status', 'severe_asthma_pct', 'xolair_pct',
    'monthly_call_no', 'dupixent_no', 'fasenra_no', 'nucala_no', 'tezspire_no',
    'competitor_activity', 'nurse_support', 'key_barriers', 'objectives', 'action_plan',
  ];
  for (const f of fields) {
    if (form[f]) form[f].value = data[f] != null ? data[f] : '';
  }
  calcDisplays();
  document.getElementById('saveStatus').textContent = '';
}

document.addEventListener('DOMContentLoaded', () => {
  populateMonthSelect();
  loadOptions();
  loadCustomers();

  document.getElementById('monthSelect').addEventListener('change', (e) => {
    currentMonth = e.target.value;
    currentCustomerId = null;
    document.getElementById('formCard').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
    loadCustomers();
  });

  document.getElementById('searchBox').addEventListener('input', (e) => renderCustomerList(e.target.value));

  document.querySelectorAll('.calc-input').forEach((el) => el.addEventListener('input', calcDisplays));

  document.getElementById('recordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentCustomerId) return;
    const form = e.target;
    const body = Object.fromEntries(new FormData(form).entries());
    const res = await fetch(`/api/records/${currentCustomerId}?month=${currentMonth}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const status = document.getElementById('saveStatus');
    if (res.ok) {
      status.style.color = '#1e8a4c';
      status.textContent = '已儲存';
      document.getElementById('carriedOverHint').style.display = 'none';
      await loadCustomers();
      renderCustomerList(document.getElementById('searchBox').value);
    } else {
      const err = await res.json();
      status.style.color = '#c0392b';
      status.textContent = err.error || '儲存失敗';
    }
  });
});

let hospitals = [];
let currentCustomerCode = null;

function isFilled(h) {
  return [h.usage_2026_01, h.usage_2026_02, h.usage_2026_03, h.usage_2026_04, h.usage_2026_05, h.usage_2026_06, h.average_usage]
    .some((v) => v != null);
}

async function loadHospitals() {
  const res = await fetch('/api/hospitals');
  hospitals = await res.json();
  renderHospitalList();
}

function renderHospitalList(filter = '') {
  const list = document.getElementById('hospitalList');
  const f = filter.trim().toLowerCase();
  const filtered = hospitals.filter((h) => !f || h.customer_name.toLowerCase().includes(f));
  list.innerHTML = filtered.map((h) => `
    <div class="customer-list-item ${h.customer_code === currentCustomerCode ? 'active' : ''}" data-code="${h.customer_code}">
      <div class="name"><span class="status-dot ${isFilled(h) ? 'filled' : ''}"></span>${h.customer_name}</div>
      <div class="sub">客戶代號：${h.customer_code}</div>
    </div>
  `).join('') || '<p style="color:#6b7684;">找不到符合的醫院。</p>';

  list.querySelectorAll('.customer-list-item').forEach((el) => {
    el.addEventListener('click', () => selectHospital(el.dataset.code));
  });
}

function updateAutoAvg() {
  const form = document.getElementById('usageForm');
  const vals = ['usage_2026_01', 'usage_2026_02', 'usage_2026_03', 'usage_2026_04', 'usage_2026_05', 'usage_2026_06']
    .map((f) => form[f].value)
    .filter((v) => v !== '')
    .map(Number);
  const display = document.getElementById('autoAvgDisplay');
  display.value = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : '';
}

async function selectHospital(customerCode) {
  currentCustomerCode = customerCode;
  renderHospitalList(document.getElementById('searchBox').value);

  const res = await fetch(`/api/hospital-usage/${encodeURIComponent(customerCode)}`);
  if (!res.ok) return;
  const data = await res.json();

  document.getElementById('formCard').style.display = 'block';
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('formTitle').textContent = data.customer_name;
  document.getElementById('formSubtitle').textContent = `客戶代號：${data.customer_code}`;

  const form = document.getElementById('usageForm');
  const fields = ['usage_2026_01', 'usage_2026_02', 'usage_2026_03', 'usage_2026_04', 'usage_2026_05', 'usage_2026_06', 'average_usage'];
  for (const f of fields) {
    form[f].value = data[f] != null ? data[f] : '';
  }
  updateAutoAvg();
  document.getElementById('saveStatus').textContent = '';
}

document.addEventListener('DOMContentLoaded', () => {
  loadHospitals();

  document.getElementById('searchBox').addEventListener('input', (e) => renderHospitalList(e.target.value));

  document.querySelectorAll('.calc-input').forEach((el) => el.addEventListener('input', updateAutoAvg));

  document.getElementById('usageForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentCustomerCode) return;
    const form = e.target;
    const body = Object.fromEntries(new FormData(form).entries());
    const res = await fetch(`/api/hospital-usage/${encodeURIComponent(currentCustomerCode)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const status = document.getElementById('saveStatus');
    if (res.ok) {
      status.style.color = '#1e8a4c';
      status.textContent = '已儲存';
      await loadHospitals();
      renderHospitalList(document.getElementById('searchBox').value);
    } else {
      const err = await res.json();
      status.style.color = '#c0392b';
      status.textContent = err.error || '儲存失敗';
    }
  });
});

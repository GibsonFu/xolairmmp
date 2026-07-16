function currentFilters() {
  const params = new URLSearchParams();
  const map = {
    f_psr: 'psr_code',
    f_specialty: 'specialty',
    f_tiering: 'tiering',
    f_status: 'current_status',
    f_search: 'search',
  };
  for (const [id, key] of Object.entries(map)) {
    const val = document.getElementById(id).value;
    if (val) params.set(key, val);
  }
  return params;
}

async function loadFilters() {
  const res = await fetch('/api/admin/filters');
  const data = await res.json();
  const psrSel = document.getElementById('f_psr');
  data.psrs.forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p.code;
    opt.textContent = `${p.code} - ${p.name}`;
    psrSel.appendChild(opt);
  });
  fillSelect('f_specialty', data.specialties);
  fillSelect('f_tiering', data.tierings);
  fillSelect('f_status', data.statuses);
}

function fillSelect(id, values) {
  const sel = document.getElementById(id);
  values.forEach((v) => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    sel.appendChild(opt);
  });
}

function esc(v) {
  if (v == null) return '';
  return String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

async function loadTable() {
  const params = currentFilters();
  const res = await fetch(`/api/admin/records?${params.toString()}`);
  const rows = await res.json();
  document.getElementById('summary').textContent = `共 ${rows.length} 筆客戶/醫師資料`;
  document.getElementById('tableBody').innerHTML = rows.map((r) => `
    <tr>
      <td>${esc(r.psr_code)}</td>
      <td>${esc(r.psr_name)}</td>
      <td>${esc(r.customer_name)}</td>
      <td>${esc(r.customer_tier)}</td>
      <td>${esc(r.contact_name)}</td>
      <td>${esc(r.department)}</td>
      <td>${esc(r.title)}</td>
      <td>${esc(r.hcp_tier)}</td>
      <td>${esc(r.customer_relationship)}</td>
      <td>${esc(r.adoption_ladder)}</td>
      <td>${esc(r.monthly_patient_volume)}</td>
      <td>${esc(r.current_status)}</td>
      <td>${esc(r.severe_asthma_pct)}</td>
      <td>${esc(r.severe_asthma_no)}</td>
      <td>${esc(r.xolair_pct)}</td>
      <td>${esc(r.xolair_no)}</td>
      <td>${esc(r.dupixent_no)}</td>
      <td>${esc(r.fasenra_no)}</td>
      <td>${esc(r.nucala_no)}</td>
      <td>${esc(r.tezspire_no)}</td>
      <td>${esc(r.key_barriers)}</td>
      <td>${esc(r.objectives)}</td>
      <td>${esc(r.monthly_call_no)}</td>
      <td>${esc(r.action_plan)}</td>
      <td>${r.updated_at ? new Date(r.updated_at).toLocaleString('zh-TW') : ''}</td>
    </tr>
  `).join('') || '<tr><td colspan="24" style="text-align:center;color:#6b7684;">沒有符合條件的資料</td></tr>';
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadFilters();
  await loadTable();
  ['f_psr', 'f_specialty', 'f_tiering', 'f_status'].forEach((id) =>
    document.getElementById(id).addEventListener('change', loadTable)
  );
  document.getElementById('f_search').addEventListener('input', () => {
    clearTimeout(window._searchTimer);
    window._searchTimer = setTimeout(loadTable, 300);
  });
  document.getElementById('exportBtn').addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = `/api/admin/export?${currentFilters().toString()}`;
  });
});

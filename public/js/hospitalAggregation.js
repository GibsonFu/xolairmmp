// 共用醫院平均用量彙整表格，管理者(/api/admin)與組長(/api/team)頁面共用
// 使用前需先設定 window.HU_API_BASE

function currentFilters() {
  const params = new URLSearchParams();
  const map = { f_psr: 'psr_code', f_search: 'search' };
  for (const [id, key] of Object.entries(map)) {
    const val = document.getElementById(id).value;
    if (val) params.set(key, val);
  }
  return params;
}

function esc(v) {
  if (v == null) return '';
  return String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

async function loadFilters() {
  const res = await fetch(`${window.HU_FILTERS_API}`);
  const data = await res.json();
  const psrSel = document.getElementById('f_psr');
  data.psrs.forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p.code;
    opt.textContent = `${p.code} - ${p.name}`;
    psrSel.appendChild(opt);
  });
}

async function loadTable() {
  const params = currentFilters();
  const res = await fetch(`${window.HU_API_BASE}?${params.toString()}`);
  const rows = await res.json();
  document.getElementById('summary').textContent = `共 ${rows.length} 間醫院`;
  document.getElementById('tableBody').innerHTML = rows.map((r) => `
    <tr>
      <td>${esc(r.psr_code)}</td>
      <td>${esc(r.psr_name)}</td>
      <td>${esc(r.customer_code)}</td>
      <td>${esc(r.customer_name)}</td>
      <td>${esc(r.usage_2026_01)}</td>
      <td>${esc(r.usage_2026_02)}</td>
      <td>${esc(r.usage_2026_03)}</td>
      <td>${esc(r.usage_2026_04)}</td>
      <td>${esc(r.usage_2026_05)}</td>
      <td>${esc(r.usage_2026_06)}</td>
      <td>${esc(r.average_usage)}</td>
      <td>${r.updated_at ? new Date(r.updated_at).toLocaleString('zh-TW') : ''}</td>
    </tr>
  `).join('') || '<tr><td colspan="12" style="text-align:center;color:#6b7684;">沒有符合條件的資料</td></tr>';
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadFilters();
  await loadTable();
  ['f_psr'].forEach((id) => document.getElementById(id).addEventListener('change', loadTable));
  document.getElementById('f_search').addEventListener('input', () => {
    clearTimeout(window._searchTimer);
    window._searchTimer = setTimeout(loadTable, 300);
  });
  document.getElementById('exportBtn').addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = `${window.HU_EXPORT_API}?${currentFilters().toString()}`;
  });
});

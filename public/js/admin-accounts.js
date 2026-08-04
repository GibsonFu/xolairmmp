function esc(v) {
  if (v == null) return '';
  return String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

async function loadAccounts() {
  const res = await fetch('/api/admin/accounts');
  const accounts = await res.json();
  document.getElementById('tableBody').innerHTML = accounts.map((a) => `
    <tr>
      <td>${esc(a.username)}</td>
      <td>${esc(a.display_name)}</td>
      <td>${a.role === 'admin' ? '管理者' : (a.is_team_lead ? '業代（組長）' : '業代')}</td>
      <td>${esc(a.team_group) || ''}</td>
      <td>${a.must_change_password ? '<span style="color:#c0392b;">尚未設定（仍是預設密碼）</span>' : '<span style="color:#1e8a4c;">已設定</span>'}</td>
      <td><button type="button" class="btn-secondary reset-btn" data-username="${esc(a.username)}" style="background:#eef1f4;color:#1c2733;">重設為 0000</button></td>
    </tr>
  `).join('');

  document.querySelectorAll('.reset-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const username = btn.dataset.username;
      if (!confirm(`確定要把 ${username} 的密碼重設為 0000 嗎？該帳號下次登入會被要求重新設定密碼。`)) return;
      const res = await fetch(`/api/admin/accounts/${encodeURIComponent(username)}/reset-password`, { method: 'POST' });
      if (res.ok) {
        alert(`${username} 的密碼已重設為 0000`);
        loadAccounts();
      } else {
        const err = await res.json();
        alert(err.error || '重設失敗');
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', loadAccounts);

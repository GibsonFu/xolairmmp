const MONTH_RE = /^\d{4}-\d{2}$/;

function currentMonthStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// 'YYYY-MM' -> 'YYYY-MM-01'；格式不對就用當月
function normalizeMonth(input) {
  const monthStr = MONTH_RE.test(input || '') ? input : currentMonthStr();
  return `${monthStr}-01`;
}

module.exports = { MONTH_RE, currentMonthStr, normalizeMonth };

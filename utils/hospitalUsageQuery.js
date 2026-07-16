// 醫院平均用量彙整查詢（依客戶代號去重，一間醫院一列）

const BASE_QUERY = `
  SELECT DISTINCT ON (c.psr_code, c.customer_code)
    c.psr_code, p.name AS psr_name, c.customer_code, c.customer_name,
    h.usage_2026_01, h.usage_2026_02, h.usage_2026_03,
    h.usage_2026_04, h.usage_2026_05, h.usage_2026_06,
    h.average_usage, h.updated_at, h.updated_by
  FROM customers c
  JOIN psrs p ON p.code = c.psr_code
  LEFT JOIN hospital_usage h ON h.psr_code = c.psr_code AND h.customer_code = c.customer_code
`;

// options.psrCodes 可限制只查詢某些業代代碼（組長／組員彙整頁面用）
function buildFilters(query, options = {}) {
  const clauses = [];
  const values = [];

  if (options.psrCodes) {
    values.push(options.psrCodes);
    clauses.push(`c.psr_code = ANY($${values.length})`);
  }
  if (query.psr_code) {
    values.push(query.psr_code);
    clauses.push(`c.psr_code = $${values.length}`);
  }
  if (query.search) {
    values.push(`%${query.search}%`);
    clauses.push(`c.customer_name ILIKE $${values.length}`);
  }
  const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
  return { where, values };
}

module.exports = { BASE_QUERY, buildFilters };

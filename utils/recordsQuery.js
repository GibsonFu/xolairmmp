const { normalizeMonth } = require('./month');

const BASE_QUERY = `
  SELECT
    c.id AS customer_id, p.code AS psr_code, p.name AS psr_name,
    c.specialty, c.tiering, c.customer_code, c.customer_name, c.contact_name,
    c.department, c.title,
    r.record_month, r.team, r.customer_tier, c.tiering AS hcp_tier, r.customer_relationship, r.adoption_ladder,
    r.monthly_patient_volume, r.current_status,
    r.severe_asthma_pct, r.severe_asthma_no, r.xolair_pct, r.xolair_no,
    r.dupixent_no, r.fasenra_no, r.nucala_no, r.tezspire_no,
    r.competitor_activity, r.nurse_support, r.key_barriers, r.objectives,
    r.monthly_call_no, r.action_plan, r.updated_at, r.updated_by
  FROM customers c
  JOIN psrs p ON p.code = c.psr_code
  LEFT JOIN records r ON r.customer_id = c.id AND r.record_month = $1
`;

// $1 固定保留給月份，其餘篩選條件從 $2 開始。
// options.psrCodes 可限制只查詢某些業代代碼（組長彙整頁面用）。
function buildFilters(query, options = {}) {
  const clauses = [];
  const values = [normalizeMonth(query.month)];

  if (options.psrCodes) {
    values.push(options.psrCodes);
    clauses.push(`p.code = ANY($${values.length})`);
  }
  if (query.psr_code) {
    values.push(query.psr_code);
    clauses.push(`p.code = $${values.length}`);
  }
  if (query.specialty) {
    values.push(query.specialty);
    clauses.push(`c.specialty = $${values.length}`);
  }
  if (query.tiering) {
    values.push(query.tiering);
    clauses.push(`c.tiering = $${values.length}`);
  }
  if (query.current_status) {
    values.push(query.current_status);
    clauses.push(`r.current_status = $${values.length}`);
  }
  if (query.search) {
    values.push(`%${query.search}%`);
    clauses.push(`(c.customer_name ILIKE $${values.length} OR c.contact_name ILIKE $${values.length})`);
  }
  const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
  return { where, values };
}

module.exports = { BASE_QUERY, buildFilters };

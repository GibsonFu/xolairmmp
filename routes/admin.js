const express = require('express');
const pool = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { currentMonthStr, normalizeMonth, MONTH_RE } = require('../utils/month');
const { sendWorkbook } = require('../utils/exportRecords');

const router = express.Router();

const BASE_QUERY = `
  SELECT
    c.id AS customer_id, p.code AS psr_code, p.name AS psr_name,
    c.specialty, c.tiering, c.customer_code, c.customer_name, c.contact_name,
    c.department, c.title,
    r.record_month, r.team, r.customer_tier, r.hcp_tier, r.customer_relationship, r.adoption_ladder,
    r.monthly_patient_volume, r.current_status,
    r.severe_asthma_pct, r.severe_asthma_no, r.xolair_pct, r.xolair_no,
    r.dupixent_no, r.fasenra_no, r.nucala_no, r.tezspire_no,
    r.competitor_activity, r.nurse_support, r.key_barriers, r.objectives,
    r.monthly_call_no, r.action_plan, r.updated_at, r.updated_by
  FROM customers c
  JOIN psrs p ON p.code = c.psr_code
  LEFT JOIN records r ON r.customer_id = c.id AND r.record_month = $1
`;

// $1 固定保留給月份，其餘篩選條件從 $2 開始
function buildFilters(query) {
  const clauses = [];
  const values = [normalizeMonth(query.month)];
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

router.get('/api/admin/records', requireAdmin, asyncHandler(async (req, res) => {
  const { where, values } = buildFilters(req.query);
  const { rows } = await pool.query(
    `${BASE_QUERY}${where} ORDER BY p.code, c.customer_name, c.contact_name`,
    values
  );
  res.json(rows);
}));

router.get('/api/admin/filters', requireAdmin, asyncHandler(async (req, res) => {
  const [psrs, specialties, tierings, statuses, months] = await Promise.all([
    pool.query('SELECT code, name FROM psrs ORDER BY code'),
    pool.query('SELECT DISTINCT specialty FROM customers WHERE specialty IS NOT NULL ORDER BY specialty'),
    pool.query('SELECT DISTINCT tiering FROM customers WHERE tiering IS NOT NULL ORDER BY tiering'),
    pool.query('SELECT value FROM options WHERE category = $1 ORDER BY sort_order', ['current_status']),
    pool.query('SELECT DISTINCT record_month FROM records ORDER BY record_month DESC'),
  ]);
  const monthSet = new Set(months.rows.map((r) => r.record_month.toISOString().slice(0, 7)));
  monthSet.add(currentMonthStr());
  res.json({
    psrs: psrs.rows,
    specialties: specialties.rows.map((r) => r.specialty),
    tierings: tierings.rows.map((r) => r.tiering),
    statuses: statuses.rows.map((r) => r.value),
    months: [...monthSet].sort().reverse(),
    currentMonth: currentMonthStr(),
  });
}));

router.get('/api/admin/export', requireAdmin, asyncHandler(async (req, res) => {
  const { where, values } = buildFilters(req.query);
  const { rows } = await pool.query(
    `${BASE_QUERY}${where} ORDER BY p.code, c.customer_name, c.contact_name`,
    values
  );
  const monthLabel = (req.query.month && MONTH_RE.test(req.query.month)) ? req.query.month : currentMonthStr();
  await sendWorkbook(res, rows, `Xolair_MMP_彙整_${monthLabel}.xlsx`);
}));

module.exports = router;

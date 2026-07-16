const express = require('express');
const pool = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { currentMonthStr, MONTH_RE } = require('../utils/month');
const { sendWorkbook } = require('../utils/exportRecords');
const { BASE_QUERY, buildFilters } = require('../utils/recordsQuery');
const hospitalUsageQuery = require('../utils/hospitalUsageQuery');
const { sendWorkbook: sendHospitalWorkbook } = require('../utils/exportHospitalUsage');

const router = express.Router();

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

router.get('/api/admin/hospital-usage', requireAdmin, asyncHandler(async (req, res) => {
  const { where, values } = hospitalUsageQuery.buildFilters(req.query);
  const { rows } = await pool.query(
    `${hospitalUsageQuery.BASE_QUERY}${where} ORDER BY c.psr_code, c.customer_code`,
    values
  );
  res.json(rows);
}));

router.get('/api/admin/hospital-usage/export', requireAdmin, asyncHandler(async (req, res) => {
  const { where, values } = hospitalUsageQuery.buildFilters(req.query);
  const { rows } = await pool.query(
    `${hospitalUsageQuery.BASE_QUERY}${where} ORDER BY c.psr_code, c.customer_code`,
    values
  );
  await sendHospitalWorkbook(res, rows, 'Xolair_醫院平均用量_彙整.xlsx');
}));

module.exports = router;

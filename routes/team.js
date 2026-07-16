const express = require('express');
const pool = require('../db/pool');
const { requireTeamLead } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { currentMonthStr, MONTH_RE } = require('../utils/month');
const { sendWorkbook } = require('../utils/exportRecords');
const { BASE_QUERY, buildFilters } = require('../utils/recordsQuery');

const router = express.Router();

async function getGroupMemberCodes(leadPsrCode) {
  const { rows } = await pool.query(
    `SELECT code FROM psrs WHERE team_group = (SELECT team_group FROM psrs WHERE code = $1) ORDER BY code`,
    [leadPsrCode]
  );
  return rows.map((r) => r.code);
}

router.get('/api/team/records', requireTeamLead, asyncHandler(async (req, res) => {
  const psrCodes = await getGroupMemberCodes(req.session.user.psr_code);
  const { where, values } = buildFilters(req.query, { psrCodes });
  const { rows } = await pool.query(
    `${BASE_QUERY}${where} ORDER BY p.code, c.customer_name, c.contact_name`,
    values
  );
  res.json(rows);
}));

router.get('/api/team/filters', requireTeamLead, asyncHandler(async (req, res) => {
  const psrCodes = await getGroupMemberCodes(req.session.user.psr_code);
  const [psrs, specialties, tierings, statuses, months] = await Promise.all([
    pool.query('SELECT code, name FROM psrs WHERE code = ANY($1) ORDER BY code', [psrCodes]),
    pool.query('SELECT DISTINCT specialty FROM customers WHERE psr_code = ANY($1) AND specialty IS NOT NULL ORDER BY specialty', [psrCodes]),
    pool.query('SELECT DISTINCT tiering FROM customers WHERE psr_code = ANY($1) AND tiering IS NOT NULL ORDER BY tiering', [psrCodes]),
    pool.query('SELECT value FROM options WHERE category = $1 ORDER BY sort_order', ['current_status']),
    pool.query('SELECT DISTINCT record_month FROM records WHERE psr_code = ANY($1) ORDER BY record_month DESC', [psrCodes]),
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

router.get('/api/team/export', requireTeamLead, asyncHandler(async (req, res) => {
  const psrCodes = await getGroupMemberCodes(req.session.user.psr_code);
  const { where, values } = buildFilters(req.query, { psrCodes });
  const { rows } = await pool.query(
    `${BASE_QUERY}${where} ORDER BY p.code, c.customer_name, c.contact_name`,
    values
  );
  const monthLabel = (req.query.month && MONTH_RE.test(req.query.month)) ? req.query.month : currentMonthStr();
  await sendWorkbook(res, rows, `Xolair_MMP_組員資料_${monthLabel}.xlsx`);
}));

module.exports = router;

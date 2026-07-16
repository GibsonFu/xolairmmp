const express = require('express');
const pool = require('../db/pool');
const { requireLogin } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { sendWorkbook } = require('../utils/exportHospitalUsage');

const router = express.Router();

function toNumOrNull(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}

// 業代自己負責的醫院清單（依客戶代號去重）
router.get('/api/hospitals', requireLogin, asyncHandler(async (req, res) => {
  if (req.session.user.role !== 'psr') {
    return res.status(403).json({ error: '此帳號無醫院清單，請至彙整頁面查看' });
  }
  const { rows } = await pool.query(
    `SELECT DISTINCT ON (c.customer_code)
       c.customer_code, c.customer_name,
       h.usage_2026_01, h.usage_2026_02, h.usage_2026_03,
       h.usage_2026_04, h.usage_2026_05, h.usage_2026_06,
       h.average_usage, h.updated_at
     FROM customers c
     LEFT JOIN hospital_usage h ON h.psr_code = c.psr_code AND h.customer_code = c.customer_code
     WHERE c.psr_code = $1
     ORDER BY c.customer_code`,
    [req.session.user.psr_code]
  );
  res.json(rows);
}));

router.get('/api/hospital-usage/:customerCode', requireLogin, asyncHandler(async (req, res) => {
  const { rows: custRows } = await pool.query(
    'SELECT DISTINCT customer_code, customer_name, psr_code FROM customers WHERE customer_code = $1 LIMIT 1',
    [req.params.customerCode]
  );
  const hospital = custRows[0];
  if (!hospital) return res.status(404).json({ error: '找不到此醫院資料' });
  if (req.session.user.role === 'psr' && hospital.psr_code !== req.session.user.psr_code) {
    return res.status(403).json({ error: '無權限查看此醫院' });
  }

  const { rows } = await pool.query(
    'SELECT * FROM hospital_usage WHERE psr_code = $1 AND customer_code = $2',
    [hospital.psr_code, hospital.customer_code]
  );
  res.json({ ...hospital, ...(rows[0] || {}) });
}));

router.post('/api/hospital-usage/:customerCode', requireLogin, asyncHandler(async (req, res) => {
  const { rows: custRows } = await pool.query(
    'SELECT DISTINCT customer_code, customer_name, psr_code FROM customers WHERE customer_code = $1 LIMIT 1',
    [req.params.customerCode]
  );
  const hospital = custRows[0];
  if (!hospital) return res.status(404).json({ error: '找不到此醫院資料' });
  if (req.session.user.role === 'psr' && hospital.psr_code !== req.session.user.psr_code) {
    return res.status(403).json({ error: '無權限編輯此醫院' });
  }

  const b = req.body;
  const values = [
    hospital.psr_code,
    hospital.customer_code,
    hospital.customer_name,
    toNumOrNull(b.usage_2026_01),
    toNumOrNull(b.usage_2026_02),
    toNumOrNull(b.usage_2026_03),
    toNumOrNull(b.usage_2026_04),
    toNumOrNull(b.usage_2026_05),
    toNumOrNull(b.usage_2026_06),
    toNumOrNull(b.average_usage),
    req.session.user.username,
  ];

  const { rows } = await pool.query(
    `INSERT INTO hospital_usage (
       psr_code, customer_code, customer_name,
       usage_2026_01, usage_2026_02, usage_2026_03, usage_2026_04, usage_2026_05, usage_2026_06,
       average_usage, created_by, updated_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11)
     ON CONFLICT (psr_code, customer_code) DO UPDATE SET
       usage_2026_01 = EXCLUDED.usage_2026_01,
       usage_2026_02 = EXCLUDED.usage_2026_02,
       usage_2026_03 = EXCLUDED.usage_2026_03,
       usage_2026_04 = EXCLUDED.usage_2026_04,
       usage_2026_05 = EXCLUDED.usage_2026_05,
       usage_2026_06 = EXCLUDED.usage_2026_06,
       average_usage = EXCLUDED.average_usage,
       updated_by = EXCLUDED.updated_by,
       updated_at = now()
     RETURNING *`,
    values
  );

  res.json(rows[0]);
}));

// 業代匯出自己負責醫院的用量
router.get('/api/hospital-usage-export', requireLogin, asyncHandler(async (req, res) => {
  if (req.session.user.role !== 'psr') {
    return res.status(403).json({ error: '請至彙整頁面使用匯出功能' });
  }
  const { rows } = await pool.query(
    `SELECT DISTINCT ON (c.customer_code)
       c.psr_code, p.name AS psr_name, c.customer_code, c.customer_name,
       h.usage_2026_01, h.usage_2026_02, h.usage_2026_03,
       h.usage_2026_04, h.usage_2026_05, h.usage_2026_06,
       h.average_usage, h.updated_at, h.updated_by
     FROM customers c
     JOIN psrs p ON p.code = c.psr_code
     LEFT JOIN hospital_usage h ON h.psr_code = c.psr_code AND h.customer_code = c.customer_code
     WHERE c.psr_code = $1
     ORDER BY c.customer_code`,
    [req.session.user.psr_code]
  );
  await sendWorkbook(res, rows, `Xolair_醫院平均用量_${req.session.user.psr_code}.xlsx`);
}));

module.exports = router;

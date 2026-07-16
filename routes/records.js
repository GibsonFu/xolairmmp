const express = require('express');
const pool = require('../db/pool');
const { requireLogin } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

const OPTION_CATEGORIES = ['customer_relationship', 'adoption_ladder', 'current_status'];
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

router.get('/api/options', requireLogin, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT category, value FROM options WHERE category = ANY($1) ORDER BY category, sort_order',
    [OPTION_CATEGORIES]
  );
  const grouped = {};
  for (const cat of OPTION_CATEGORIES) grouped[cat] = [];
  for (const row of rows) grouped[row.category].push(row.value);
  res.json(grouped);
}));

// 業代自己的客戶清單（含當月是否已填寫）
router.get('/api/customers', requireLogin, asyncHandler(async (req, res) => {
  if (req.session.user.role !== 'psr') {
    return res.status(403).json({ error: '此帳號無客戶清單，請至彙整頁面查看' });
  }
  const month = normalizeMonth(req.query.month);
  const { rows } = await pool.query(
    `SELECT c.id, c.customer_code, c.customer_name, c.contact_name, c.department, c.title,
            c.specialty, c.tiering,
            r.id AS record_id, r.updated_at
     FROM customers c
     LEFT JOIN records r ON r.customer_id = c.id AND r.record_month = $2
     WHERE c.psr_code = $1
     ORDER BY c.customer_name, c.contact_name`,
    [req.session.user.psr_code, month]
  );
  res.json(rows);
}));

router.get('/api/customers/:id', requireLogin, asyncHandler(async (req, res) => {
  const month = normalizeMonth(req.query.month);

  const { rows: custRows } = await pool.query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
  const customer = custRows[0];
  if (!customer) return res.status(404).json({ error: '找不到此客戶資料' });
  if (req.session.user.role === 'psr' && customer.psr_code !== req.session.user.psr_code) {
    return res.status(403).json({ error: '無權限查看此客戶' });
  }

  const { rows: currentRows } = await pool.query(
    'SELECT * FROM records WHERE customer_id = $1 AND record_month = $2',
    [req.params.id, month]
  );

  if (currentRows[0]) {
    return res.json({ ...customer, ...currentRows[0], customer_id: customer.id, carried_over: false });
  }

  const { rows: priorRows } = await pool.query(
    `SELECT * FROM records WHERE customer_id = $1 AND record_month < $2
     ORDER BY record_month DESC LIMIT 1`,
    [req.params.id, month]
  );

  if (priorRows[0]) {
    const prior = priorRows[0];
    return res.json({
      ...customer,
      ...prior,
      id: null,
      customer_id: customer.id,
      record_month: month,
      carried_over: true,
      carried_over_month: prior.record_month,
    });
  }

  res.json({ ...customer, customer_id: customer.id, record_month: month, carried_over: false });
}));

function toIntOrNull(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

function toNumOrNull(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}

router.post('/api/records/:customerId', requireLogin, asyncHandler(async (req, res) => {
  const customerId = req.params.customerId;
  const month = normalizeMonth(req.query.month);
  const { rows: custRows } = await pool.query('SELECT * FROM customers WHERE id = $1', [customerId]);
  const customer = custRows[0];
  if (!customer) return res.status(404).json({ error: '找不到此客戶資料' });
  if (req.session.user.role === 'psr' && customer.psr_code !== req.session.user.psr_code) {
    return res.status(403).json({ error: '無權限編輯此客戶' });
  }

  const b = req.body;
  const monthlyVolume = toIntOrNull(b.monthly_patient_volume);
  const severePct = toNumOrNull(b.severe_asthma_pct);
  const xolairPct = toNumOrNull(b.xolair_pct);
  const severeNo = monthlyVolume != null && severePct != null ? Math.round((monthlyVolume * severePct) / 100) : null;
  const xolairNo = monthlyVolume != null && xolairPct != null ? Math.round((monthlyVolume * xolairPct) / 100) : null;

  const values = [
    customerId,
    month,
    customer.psr_code,
    b.team || null,
    b.customer_tier || null,
    customer.tiering || null,
    b.customer_relationship || null,
    b.adoption_ladder || null,
    monthlyVolume,
    b.current_status || null,
    severePct,
    severeNo,
    xolairPct,
    xolairNo,
    toIntOrNull(b.dupixent_no) || 0,
    toIntOrNull(b.fasenra_no) || 0,
    toIntOrNull(b.nucala_no) || 0,
    toIntOrNull(b.tezspire_no) || 0,
    b.competitor_activity || null,
    b.nurse_support || null,
    b.key_barriers || null,
    b.objectives || null,
    toIntOrNull(b.monthly_call_no) || 0,
    b.action_plan || null,
    req.session.user.username,
  ];

  const { rows } = await pool.query(
    `INSERT INTO records (
       customer_id, record_month, psr_code, team, customer_tier, hcp_tier, customer_relationship, adoption_ladder,
       monthly_patient_volume, current_status, severe_asthma_pct, severe_asthma_no, xolair_pct, xolair_no,
       dupixent_no, fasenra_no, nucala_no, tezspire_no, competitor_activity, nurse_support, key_barriers,
       objectives, monthly_call_no, action_plan, created_by, updated_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$25)
     ON CONFLICT (customer_id, record_month) DO UPDATE SET
       team = EXCLUDED.team,
       customer_tier = EXCLUDED.customer_tier,
       hcp_tier = EXCLUDED.hcp_tier,
       customer_relationship = EXCLUDED.customer_relationship,
       adoption_ladder = EXCLUDED.adoption_ladder,
       monthly_patient_volume = EXCLUDED.monthly_patient_volume,
       current_status = EXCLUDED.current_status,
       severe_asthma_pct = EXCLUDED.severe_asthma_pct,
       severe_asthma_no = EXCLUDED.severe_asthma_no,
       xolair_pct = EXCLUDED.xolair_pct,
       xolair_no = EXCLUDED.xolair_no,
       dupixent_no = EXCLUDED.dupixent_no,
       fasenra_no = EXCLUDED.fasenra_no,
       nucala_no = EXCLUDED.nucala_no,
       tezspire_no = EXCLUDED.tezspire_no,
       competitor_activity = EXCLUDED.competitor_activity,
       nurse_support = EXCLUDED.nurse_support,
       key_barriers = EXCLUDED.key_barriers,
       objectives = EXCLUDED.objectives,
       monthly_call_no = EXCLUDED.monthly_call_no,
       action_plan = EXCLUDED.action_plan,
       updated_by = EXCLUDED.updated_by,
       updated_at = now()
     RETURNING *`,
    values
  );

  res.json(rows[0]);
}));

module.exports = router;

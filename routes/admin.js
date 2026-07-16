const express = require('express');
const ExcelJS = require('exceljs');
const pool = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

const BASE_QUERY = `
  SELECT
    c.id AS customer_id, p.code AS psr_code, p.name AS psr_name,
    c.specialty, c.tiering, c.customer_code, c.customer_name, c.contact_name,
    c.department, c.title,
    r.team, r.customer_tier, r.hcp_tier, r.customer_relationship, r.adoption_ladder,
    r.monthly_patient_volume, r.current_status,
    r.severe_asthma_pct, r.severe_asthma_no, r.xolair_pct, r.xolair_no,
    r.dupixent_no, r.fasenra_no, r.nucala_no, r.tezspire_no,
    r.competitor_activity, r.nurse_support, r.key_barriers, r.objectives,
    r.monthly_call_no, r.action_plan, r.updated_at, r.updated_by
  FROM customers c
  JOIN psrs p ON p.code = c.psr_code
  LEFT JOIN records r ON r.customer_id = c.id
`;

function buildFilters(query) {
  const clauses = [];
  const values = [];
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
  const [psrs, specialties, tierings, statuses] = await Promise.all([
    pool.query('SELECT code, name FROM psrs ORDER BY code'),
    pool.query('SELECT DISTINCT specialty FROM customers WHERE specialty IS NOT NULL ORDER BY specialty'),
    pool.query('SELECT DISTINCT tiering FROM customers WHERE tiering IS NOT NULL ORDER BY tiering'),
    pool.query('SELECT value FROM options WHERE category = $1 ORDER BY sort_order', ['current_status']),
  ]);
  res.json({
    psrs: psrs.rows,
    specialties: specialties.rows.map((r) => r.specialty),
    tierings: tierings.rows.map((r) => r.tiering),
    statuses: statuses.rows.map((r) => r.value),
  });
}));

router.get('/api/admin/export', requireAdmin, asyncHandler(async (req, res) => {
  const { where, values } = buildFilters(req.query);
  const { rows } = await pool.query(
    `${BASE_QUERY}${where} ORDER BY p.code, c.customer_name, c.contact_name`,
    values
  );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('MMP彙整');

  sheet.columns = [
    { header: 'Team', key: 'team', width: 12 },
    { header: 'PSR', key: 'psr_code', width: 10 },
    { header: '業代姓名', key: 'psr_name', width: 12 },
    { header: 'Customer', key: 'customer_name', width: 20 },
    { header: 'Customer Tier', key: 'customer_tier', width: 12 },
    { header: 'HCP', key: 'contact_name', width: 12 },
    { header: '科別', key: 'department', width: 12 },
    { header: '職稱', key: 'title', width: 14 },
    { header: 'HCP Tier', key: 'hcp_tier', width: 10 },
    { header: 'Customer Relationship', key: 'customer_relationship', width: 16 },
    { header: 'Adoption Ladder', key: 'adoption_ladder', width: 14 },
    { header: '月病人量', key: 'monthly_patient_volume', width: 10 },
    { header: 'Current Status', key: 'current_status', width: 12 },
    { header: "Severe asthma P't %", key: 'severe_asthma_pct', width: 16 },
    { header: "Severe asthma P't No.", key: 'severe_asthma_no', width: 16 },
    { header: "Xolair P't %", key: 'xolair_pct', width: 12 },
    { header: "Xolair P't No.", key: 'xolair_no', width: 12 },
    { header: 'Dupixent', key: 'dupixent_no', width: 10 },
    { header: 'Fasenra', key: 'fasenra_no', width: 10 },
    { header: 'Nucala', key: 'nucala_no', width: 10 },
    { header: 'Tezspire', key: 'tezspire_no', width: 10 },
    { header: 'competitor activity', key: 'competitor_activity', width: 24 },
    { header: 'nurse support', key: 'nurse_support', width: 20 },
    { header: 'Key barriers', key: 'key_barriers', width: 24 },
    { header: 'Objectives', key: 'objectives', width: 24 },
    { header: 'monthly call No', key: 'monthly_call_no', width: 12 },
    { header: 'Action Plan', key: 'action_plan', width: 30 },
    { header: '最後更新', key: 'updated_at', width: 18 },
    { header: '更新人', key: 'updated_by', width: 10 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF3F8' } };

  for (const row of rows) {
    sheet.addRow({
      ...row,
      updated_at: row.updated_at ? new Date(row.updated_at).toLocaleString('zh-TW') : '',
    });
  }

  const filename = `Xolair_MMP_彙整_${new Date().toISOString().slice(0, 10)}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="export.xlsx"; filename*=UTF-8''${encodeURIComponent(filename)}`
  );
  await workbook.xlsx.write(res);
  res.end();
}));

module.exports = router;

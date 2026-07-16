const ExcelJS = require('exceljs');

const COLUMNS = [
  { header: '月份', key: 'record_month', width: 10 },
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

async function buildWorkbook(rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('MMP彙整');
  sheet.columns = COLUMNS;
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF3F8' } };

  for (const row of rows) {
    sheet.addRow({
      ...row,
      record_month: row.record_month ? row.record_month.toISOString().slice(0, 7) : '',
      updated_at: row.updated_at ? new Date(row.updated_at).toLocaleString('zh-TW') : '',
    });
  }
  return workbook;
}

async function sendWorkbook(res, rows, filename) {
  const workbook = await buildWorkbook(rows);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="export.xlsx"; filename*=UTF-8''${encodeURIComponent(filename)}`
  );
  await workbook.xlsx.write(res);
  res.end();
}

module.exports = { buildWorkbook, sendWorkbook };

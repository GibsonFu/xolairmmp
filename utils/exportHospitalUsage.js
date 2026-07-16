const ExcelJS = require('exceljs');

const COLUMNS = [
  { header: 'PSR', key: 'psr_code', width: 10 },
  { header: '業代姓名', key: 'psr_name', width: 12 },
  { header: '客戶代號', key: 'customer_code', width: 12 },
  { header: 'Customer', key: 'customer_name', width: 20 },
  { header: '2026年1月用量', key: 'usage_2026_01', width: 14 },
  { header: '2026年2月用量', key: 'usage_2026_02', width: 14 },
  { header: '2026年3月用量', key: 'usage_2026_03', width: 14 },
  { header: '2026年4月用量', key: 'usage_2026_04', width: 14 },
  { header: '2026年5月用量', key: 'usage_2026_05', width: 14 },
  { header: '2026年6月用量', key: 'usage_2026_06', width: 14 },
  { header: '平均用量', key: 'average_usage', width: 12 },
  { header: '最後更新', key: 'updated_at', width: 18 },
  { header: '更新人', key: 'updated_by', width: 10 },
];

async function sendWorkbook(res, rows, filename) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('醫院平均用量');
  sheet.columns = COLUMNS;
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF3F8' } };

  for (const row of rows) {
    sheet.addRow({
      ...row,
      updated_at: row.updated_at ? new Date(row.updated_at).toLocaleString('zh-TW') : '',
    });
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="export.xlsx"; filename*=UTF-8''${encodeURIComponent(filename)}`
  );
  await workbook.xlsx.write(res);
  res.end();
}

module.exports = { sendWorkbook };

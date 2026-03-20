import ExcelJS from 'exceljs';

/**
 * Streams an Excel file to the response.
 * @param {import('express').Response} res
 * @param {Array<Object>} data
 * @param {Array<{ header: string, key: string, width?: number }>} columns
 * @param {string} filename
 * @returns {Promise<void>}
 */
export const exportToExcel = async (res, data, columns, filename = 'report') => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Report');

  worksheet.columns = columns;

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' },
  };

  worksheet.addRows(data);

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);

  await workbook.xlsx.write(res);
  res.end();
};

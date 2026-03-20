import PDFDocument from 'pdfkit';

/**
 * Streams a PDF file to the response.
 * @param {import('express').Response} res
 * @param {Array<Object>} data
 * @param {Array<{ header: string, key: string }>} columns
 * @param {string} filename
 * @returns {void}
 */
export const exportToPDF = (res, data, columns, filename = 'report') => {
  const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);

  doc.pipe(res);

  doc.fontSize(16).font('Helvetica-Bold').text('Report', { align: 'center' });
  doc.moveDown(0.5);

  doc.fontSize(9).font('Helvetica-Bold');
  doc.text(columns.map((c) => c.header).join('   '));
  doc.moveDown(0.3);

  doc.font('Helvetica').fontSize(8);
  for (const row of data) {
    const line = columns.map((c) => String(row[c.key] ?? '')).join('   ');
    doc.text(line);
  }

  doc.end();
};

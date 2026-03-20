import { Transform } from 'stream';

/**
 * Streams a CSV file to the response.
 * @param {import('express').Response} res
 * @param {Array<Object>} data
 * @param {Array<string>} fields - column keys to include
 * @param {string} filename
 * @returns {void}
 */
export const exportToCSV = (res, data, fields, filename = 'report') => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);

  const header = fields.join(',') + '\n';
  res.write(header);

  for (const row of data) {
    const line =
      fields
        .map((f) => {
          const val = row[f] ?? '';
          const str = String(val).replace(/"/g, '""');
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str}"`
            : str;
        })
        .join(',') + '\n';
    res.write(line);
  }

  res.end();
};

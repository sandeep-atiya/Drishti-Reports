/**
 * Builds a PostgreSQL WHERE clause with positional params from a filters object.
 * @param {Object} filters - key/value pairs to filter on
 * @param {number} startIndex - starting positional parameter index ($1, $2 ...)
 * @returns {{ whereClause: string, values: Array }}
 */
export const buildWhereClause = (filters, startIndex = 1) => {
  const conditions = [];
  const values = [];
  let index = startIndex;

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      conditions.push(`${key} = $${index}`);
      values.push(value);
      index++;
    }
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
  };
};

/**
 * Builds date range conditions for PostgreSQL.
 * @param {string} field - column name
 * @param {string|Date} startDate
 * @param {string|Date} endDate
 * @param {number} startIndex
 * @returns {{ conditions: string[], values: Array }}
 */
export const buildDateRangeClause = (field, startDate, endDate, startIndex = 1) => {
  const conditions = [];
  const values = [];
  let index = startIndex;

  if (startDate) {
    conditions.push(`${field} >= $${index++}`);
    values.push(startDate);
  }

  if (endDate) {
    conditions.push(`${field} <= $${index++}`);
    values.push(endDate);
  }

  return { conditions, values };
};

/**
 * Returns limit and offset for a given page/limit.
 * @param {number|string} page
 * @param {number|string} limit
 * @returns {{ limit: number, offset: number }}
 */
export const buildPagination = (page = 1, limit = 50) => {
  const take = parseInt(limit, 10);
  const offset = (parseInt(page, 10) - 1) * take;
  return { limit: take, offset };
};

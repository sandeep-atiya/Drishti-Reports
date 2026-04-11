import Joi from 'joi';

export const selfHangupReportSchema = Joi.object({
  startDate:    Joi.date().iso().required(),
  endDate:      Joi.date().iso().min(Joi.ref('startDate')).required(),
  campaignName: Joi.string().trim().allow('', null).optional(),
});

/**
 * Normalise a date value to a string for the SQL query.
 *
 * - date-only input  (e.g. "2024-01-15")          → "2024-01-15"
 * - datetime input   (e.g. "2024-01-15T10:00")    → "2024-01-15T10:00"
 *   Datetime strings are preserved so the repository can do a timestamp
 *   comparison instead of a date-only cast, enabling Custom Hour Range filtering.
 *
 * We use the RAW query string rather than the Joi-parsed Date object to avoid
 * timezone shifts (Joi parses "2024-01-15T10:00" as UTC which can change the date).
 */
const normaliseDate = (rawStr, parsedDate) => {
  if (typeof rawStr === 'string' && /T\d{2}:\d{2}/.test(rawStr)) {
    // Datetime-local format — preserve YYYY-MM-DDTHH:mm, strip seconds/ms if any
    return rawStr.substring(0, 16);
  }
  // Date-only — normalise via ISO string split
  const d = parsedDate instanceof Date ? parsedDate : new Date(parsedDate);
  return d.toISOString().split('T')[0];
};

export const validate = (schema) => (req, res, next) => {
  const rawStart = req.query.startDate;
  const rawEnd   = req.query.endDate;

  const { error, value } = schema.validate(req.query, {
    abortEarly:   false,
    allowUnknown: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map((d) => d.message);
    return res.status(400).json({ success: false, message: 'Validation error', errors });
  }

  const normalised = {
    ...value,
    startDate: normaliseDate(rawStart, value.startDate),
    endDate:   normaliseDate(rawEnd,   value.endDate),
  };

  // Express 5: req.query is read-only — mutate in place
  Object.keys(req.query).forEach((k) => delete req.query[k]);
  Object.assign(req.query, normalised);
  next();
};

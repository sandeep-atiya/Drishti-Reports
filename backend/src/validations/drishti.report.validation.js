import Joi from 'joi';

export const drishtiReportSchema = Joi.object({
  startDate: Joi.date().iso().required(),
  endDate:   Joi.date().iso().min(Joi.ref('startDate')).required(),
});

// Joi.date() converts inputs to Date objects.
// Normalise back to YYYY-MM-DD strings — required by SQLite bindings and Redis cache keys.
const toDateStr = (d) => (d instanceof Date ? d : new Date(d)).toISOString().split('T')[0];

export const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.query, {
    abortEarly:    false,
    allowUnknown:  false,
    stripUnknown:  true,
  });

  if (error) {
    const errors = error.details.map((d) => d.message);
    return res.status(400).json({ success: false, message: 'Validation error', errors });
  }

  const normalised = {
    ...value,
    startDate: toDateStr(value.startDate),
    endDate:   toDateStr(value.endDate),
  };

  // Express 5: req.query is read-only — mutate in place
  Object.keys(req.query).forEach((k) => delete req.query[k]);
  Object.assign(req.query, normalised);
  next();
};

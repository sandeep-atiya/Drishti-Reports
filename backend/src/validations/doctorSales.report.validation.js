import Joi from 'joi';

export const doctorSalesReportSchema = Joi.object({
  startDate: Joi.date().iso().required(),
  endDate:   Joi.date().iso().min(Joi.ref('startDate')).required(),
});

const normaliseDate = (rawStr, parsedDate) => {
  if (typeof rawStr === 'string' && /T\d{2}:\d{2}/.test(rawStr)) {
    return rawStr.substring(0, 16);
  }
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

  Object.keys(req.query).forEach((k) => delete req.query[k]);
  Object.assign(req.query, normalised);
  next();
};

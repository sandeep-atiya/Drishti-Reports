import Joi from 'joi';

/**
 * Accepts both date-only (YYYY-MM-DD) and datetime (YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss).
 * String-based validation intentionally avoids Joi.date() which silently shifts to UTC,
 * breaking hourly queries for India Standard Time users.
 */
const DT_PATTERN = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/;

export const transferAgentWiseReportSchema = Joi.object({
  startDate: Joi.string().pattern(DT_PATTERN).required().messages({
    'string.pattern.base': 'startDate must be YYYY-MM-DD or YYYY-MM-DDTHH:mm',
    'any.required':        'startDate is required',
  }),
  endDate: Joi.string().pattern(DT_PATTERN).required().messages({
    'string.pattern.base': 'endDate must be YYYY-MM-DD or YYYY-MM-DDTHH:mm',
    'any.required':        'endDate is required',
  }),
});

export const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.query, {
    abortEarly:   false,
    allowUnknown: false,
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors:  error.details.map((d) => d.message),
    });
  }

  // endDate must be strictly after startDate
  if (value.endDate <= value.startDate) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors:  ['endDate must be after startDate'],
    });
  }

  Object.keys(req.query).forEach((k) => delete req.query[k]);
  Object.assign(req.query, value);
  next();
};

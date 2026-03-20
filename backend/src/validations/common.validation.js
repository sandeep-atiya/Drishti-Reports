import Joi from 'joi';

export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(500).default(50),
});

export const dateRangeSchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().when('startDate', {
    is: Joi.exist(),
    then: Joi.date().iso().min(Joi.ref('startDate')).optional(),
    otherwise: Joi.date().iso().optional(),
  }),
});

/**
 * Validates req.query against the given Joi schema.
 * @param {Joi.ObjectSchema} schema
 * @returns {Function} Express middleware
 */
export const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.query, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map((d) => d.message);
    return res.status(400).json({ success: false, message: 'Validation error', errors });
  }

  req.query = value;
  next();
};

/**
 * Validates req.body against the given Joi schema.
 * @param {Joi.ObjectSchema} schema
 * @returns {Function} Express middleware
 */
export const validateBody = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map((d) => d.message);
    return res.status(400).json({ success: false, message: 'Validation error', errors });
  }

  req.body = value;
  next();
};

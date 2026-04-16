import Joi from 'joi';

export const loginSchema = Joi.object({
  login:    Joi.string().trim().min(1).required(),
  password: Joi.string().min(1).required(),
});

export const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly:   false,
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

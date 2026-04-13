import jwt from 'jsonwebtoken';
import env from '../config/env.config.js';

export const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authorization token missing.' });
  }

  try {
    req.user = jwt.verify(authHeader.slice(7), env.jwt.secret);
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError'
      ? 'Session expired. Please log in again.'
      : 'Invalid token.';
    return res.status(401).json({ success: false, message });
  }
};

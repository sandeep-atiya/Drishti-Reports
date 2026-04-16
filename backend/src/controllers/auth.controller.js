import asyncHandler from '../utils/asyncHandler.js';
import { login }    from '../services/auth.service.js';

export const loginHandler = asyncHandler(async (req, res) => {
  const { login: identifier, password } = req.body;
  const { token, user } = await login(identifier, password);

  return res.status(200).json({
    success: true,
    message: 'Login successful.',
    token,
    user,
  });
});

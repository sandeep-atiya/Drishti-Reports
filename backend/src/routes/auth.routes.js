import { Router }                    from 'express';
import { loginHandler }              from '../controllers/auth.controller.js';
import { validate, loginSchema }     from '../validations/auth.validation.js';

const router = Router();

router.post('/login', validate(loginSchema), loginHandler);

export default router;

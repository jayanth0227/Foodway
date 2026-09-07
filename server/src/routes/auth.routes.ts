import { Router } from 'express';
import { login, me, register, updateProfile, logout, forgotPassword, resetPassword } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/login', login);
router.get('/me', authenticate, me);
router.post('/register', register);
router.put('/profile', authenticate, updateProfile);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;

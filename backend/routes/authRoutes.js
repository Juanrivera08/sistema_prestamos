import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  register,
  login,
  getCurrentUser,
  refreshAccessToken,
  logout
} from '../controllers/authController.js';

const router = express.Router();

// Rutas públicas
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshAccessToken);

// Rutas protegidas
router.get('/me', authenticateToken, getCurrentUser);
router.post('/logout', authenticateToken, logout);

export default router;